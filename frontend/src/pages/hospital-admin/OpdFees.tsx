import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormDialog } from '@/components/ui/form-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';
import { useSearch } from '@/contexts/SearchContext';
import { hospitalAdminApi } from '@/api/hospitalAdmin';
import { Doctor, OpdFee } from '@/types/types';

export default function OpdFees() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [fee, setFee] = useState('');
  const [editOpdFeeId, setEditOpdFeeId] = useState<string | null>(null);
  const [editFeeObj, setEditFeeObj] = useState<OpdFee | null>(null);
  const [editFee, setEditFee] = useState('');
  const queryClient = useQueryClient();
  const { searchQuery } = useSearch();

  const { data: opdFees, isLoading, isError } = useQuery<OpdFee[]>({
    queryKey: ['hospital-opd-fees'],
    queryFn: hospitalAdminApi.getOpdFees,
  });

  const { data: staff, isLoading: isStaffLoading, isError: isStaffError } = useQuery<Doctor[]>({
    queryKey: ['hospital-staff'],
    queryFn: hospitalAdminApi.getDoctors,
  });
  const doctors = staff?.filter((s) => s.role === 'DOCTOR') || [];

  const addFeeMutation = useMutation({
    mutationFn: hospitalAdminApi.createOpdFee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospital-opd-fees'] });
      setIsAddDialogOpen(false);
      setSelectedDoctorId('');
      setFee('');
      toast.success('OPD Fee added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add OPD Fee');
      console.error('Add OPD Fee error:', error);
    },
  });

  const updateFeeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { amount: number } }) =>
      hospitalAdminApi.updateOpdFee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospital-opd-fees'] });
      setIsEditDialogOpen(false);
      setEditOpdFeeId(null);
      setEditFeeObj(null);
      toast.success('OPD Fee updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update OPD Fee');
      console.error('Update OPD Fee error:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: hospitalAdminApi.deleteOpdFee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospital-opd-fees'] });
      toast.success('OPD Fee deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete OPD Fee');
      console.error('Delete OPD Fee error:', error);
    },
  });

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedDoctorId || !fee) return;
    addFeeMutation.mutate({ doctorId: selectedDoctorId, amount: parseFloat(fee) });
  };

  const handleEditClick = (fee: OpdFee) => {
    setEditOpdFeeId(fee.id);
    setEditFeeObj(fee);
    setEditFee(fee.amount.toString());
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editOpdFeeId || !editFee) return;
    updateFeeMutation.mutate({ id: editOpdFeeId, data: { amount: parseFloat(editFee) } });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this OPD fee?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isError || isStaffError || !opdFees || !staff) return <div>Error loading data</div>;

  if (isLoading || isStaffLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }
  const filteredOpdFees = opdFees?.filter((opdfee) => {
    if (!searchQuery) return true;
    try {
      const searchLower = searchQuery.toLowerCase();
      return (
        opdfee?.doctor?.name?.toLowerCase()?.includes(searchLower) ||
        opdfee?.doctor?.specialisation?.toLowerCase()?.includes(searchLower)
      );
    } catch (error) {
      console.error('Error filtering OPD fees:', error);
      return true; // Include the item if there's an error filtering
    }
  }) || [];

  // console.log(opdFees);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Doctor OPD Fees</h1>
        <Button className="text-white bg-blue-800 hover:bg-blue-700" onClick={() => setIsAddDialogOpen(true)}>Add New Fee</Button>
      </div>

      <div className="rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Doctor Name</TableHead>
              <TableHead>Specialisation</TableHead>
              <TableHead>Fee</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          {Array.isArray(filteredOpdFees) && filteredOpdFees.length > 0 && (
            <TableBody>
              {filteredOpdFees.map((fee) => (
                <TableRow key={fee.id}>
                  <TableCell className="font-medium">{fee.doctor.name}</TableCell>
                  <TableCell>{fee.doctor.specialisation}</TableCell>
                  <TableCell>₹{fee.amount.toString()}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs 
                        font-medium ${fee.doctor.status === 'ACTIVE'
                          ? 'bg-green-50 text-green-600'
                          : 'bg-red-50 text-red-600'
                        }`}
                    >
                      {fee.doctor.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleEditClick(fee);
                        }}
                        className="p-1 hover:bg-gray-100 rounded-full"
                      >
                        <Pencil className="w-4 h-4 text-gray-500" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleDelete(fee.id);
                        }}
                        className="p-1 hover:bg-gray-100 rounded-full"
                      >
                        <Trash2 className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          )}
        </Table>
      </div>

      {/* Add New Fee Dialog */}
      <FormDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        title="Add New OPD Fee"
        onSubmit={handleAddSubmit}
        isLoading={addFeeMutation.isPending}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="doctorId">Doctor</Label>
            <Select name="doctorId" value={selectedDoctorId} onValueChange={setSelectedDoctorId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a doctor" />
              </SelectTrigger>
              <SelectContent className="bg-white shadow-lg z-50">
                {doctors.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>
                    {doc.name} ({doc.specialisation})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="doctorId" value={selectedDoctorId} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fee">OPD Fee</Label>
            <Input id="fee" name="fee" type="number" min="0" value={fee} onChange={e => setFee(e.target.value)} required />
          </div>
        </div>
      </FormDialog>

      {/* Edit Fee Dialog */}
      <FormDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        title="Edit OPD Fee"
        onSubmit={handleEditSubmit}
        isLoading={updateFeeMutation.isPending}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Doctor</Label>
            <Input value={editFeeObj?.doctor.name || ''} disabled readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-fee">OPD Fee</Label>
            <Input id="edit-fee" name="fee" type="number" min="0" value={editFee} onChange={e => setEditFee(e.target.value)} required />
          </div>
        </div>
      </FormDialog>
    </div>
  );
} 