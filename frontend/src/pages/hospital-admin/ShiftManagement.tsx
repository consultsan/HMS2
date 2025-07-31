import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { FormDialog } from '@/components/ui/form-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pencil, Trash2 } from 'lucide-react';
import { useSearch } from '@/contexts/SearchContext';
import { hospitalAdminApi } from '@/api/hospitalAdmin';
import { Staff, Shift } from '@/types/types';
import ShiftsCalendar from '../../components/shifts/ShiftsCalender';

export default function ShiftManagement() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { searchQuery } = useSearch();

  const { data: shifts, isLoading: isShiftsLoading } = useQuery<Shift[]>({
    queryKey: ['hospital-shifts'],
    queryFn: hospitalAdminApi.getShifts,
  });

  const { data: staffs, isLoading: isStaffLoading } = useQuery<Staff[]>({
    queryKey: ['hospital-staff'],
    queryFn: hospitalAdminApi.getStaff,
  });

  const addShiftMutation = useMutation({
    mutationFn: hospitalAdminApi.createShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospital-shifts'] });
      setIsAddDialogOpen(false);
      toast.success('Shift added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add shift');
      console.error('Add shift error:', error);
    },
  });

  const updateShiftMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data:any}) =>
      hospitalAdminApi.updateShift(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospital-shifts'] });
      setIsEditDialogOpen(false);
      toast.success('Shift updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update shift');
      console.error('Update shift error:', error);
    },
  });

  const cancelShiftMutation = useMutation({
    mutationFn: hospitalAdminApi.deleteShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospital-shifts'] });
      toast.success('Shift cancelled successfully');
    },
    onError: (error) => {
      toast.error('Failed to cancel shift');
      console.error('Cancel shift error:', error);
    },
  });

  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      staffId: formData.get('staffId') as string,
      shiftName: formData.get('shiftName') as 'GENERAL' | 'NIGHT',
      day: formData.get('day') as 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY',
      startTime: formData.get('startTime') as string,
      endTime: formData.get('endTime') as string,
    };
    addShiftMutation.mutate(data);
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedShift) return;

    const formData = new FormData(e.currentTarget);
    const data = {
      staffId: formData.get('staffId') as string,
      shiftName: formData.get('shiftName') as 'GENERAL' | 'NIGHT',
      day: formData.get('day') as 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY',
      startTime: formData.get('startTime') as string,
      endTime: formData.get('endTime') as string,
    };

    updateShiftMutation.mutate({ id: selectedShift.id, data });
  };

  const handleCancel = async (id: string) => {
    if (window.confirm('Are you sure you want to cancel this shift?')) {
      cancelShiftMutation.mutate(id);
    }
  };


  const filteredStaffs = staffs?.filter((staff) => {
    if (!searchQuery) return true;
    return staff.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.phoneNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.email?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (isShiftsLoading || isStaffLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Shift Management</h1>
        <Button onClick={() => setIsAddDialogOpen(true)}>Add New Shift</Button>
      </div>

      <div className="">
        <Table>
          <TableHeader className="">
            <TableRow>
              <TableHead>Staff Name</TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStaffs?.map((staff) => (
              <TableRow key={staff.id} className="">
                <TableCell className="font-medium">{staff.name || '-'}</TableCell>
                <TableCell>{staff?.phoneNumber || '-'}</TableCell>
                <TableCell>{staff.email || '-'}</TableCell>
                <TableCell>{staff.role || '-'}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${staff.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                      }`}
                  >
                    {staff.status || '-'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedStaffId(staff.id);
                        setIsEditDialogOpen(true);
                      }}
                      className="p-1 hover:bg-gray-100 rounded-full"
                    >
                      <Pencil className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleCancel(staff.id)}
                      className="p-1 hover:bg-gray-100 rounded-full"
                      disabled={staff.status !== 'ACTIVE'}
                    >
                      <Trash2 className="w-4 h-4 text-gray-500" />
                    </button>
                    <ShiftsCalendar userId={staff.id} userName={staff.name} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add Shift Dialog */}
      <FormDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        title="Add New Shift"
        onSubmit={handleAddSubmit}
        isLoading={addShiftMutation.isPending}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="staffId">Staff Member</Label>
            <Select name="staffId" required>
              <SelectTrigger>
                <SelectValue placeholder="Select a staff member" />
              </SelectTrigger>
              <SelectContent className="bg-white shadow-lg z-50">
                {staffs?.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name} ({member.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="shiftName">Shift Type</Label>
            <Select name="shiftName" required>
              <SelectTrigger>
                <SelectValue placeholder="Select shift type" />
              </SelectTrigger>
              <SelectContent className="bg-white shadow-lg z-50">
                <SelectItem value="GENERAL">Day</SelectItem>
                <SelectItem value="NIGHT">Night</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="day">Day</Label>
            <Select name="day" required>
              <SelectTrigger>
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent className="bg-white shadow-lg z-50">
                <SelectItem value="MONDAY">Monday</SelectItem>
                <SelectItem value="TUESDAY">Tuesday</SelectItem>
                <SelectItem value="WEDNESDAY">Wednesday</SelectItem>
                <SelectItem value="THURSDAY">Thursday</SelectItem>
                <SelectItem value="FRIDAY">Friday</SelectItem>
                <SelectItem value="SATURDAY">Saturday</SelectItem>
                <SelectItem value="SUNDAY">Sunday</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="startTime">Start Time</Label>
            <Input id="startTime" name="startTime" type="time" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endTime">End Time</Label>
            <Input id="endTime" name="endTime" type="time" required />
          </div>
        </div>
      </FormDialog>

      {/* Edit Shift Dialog */}
      <FormDialog
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setSelectedShift(null);
        }}
        title="Edit Shift"
        onSubmit={handleEditSubmit}
        isLoading={updateShiftMutation.isPending}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-staffId">Staff Member</Label>
            <Select name="staffId" defaultValue={selectedShift?.staffId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a staff member" />
              </SelectTrigger>
              <SelectContent className="bg-white shadow-lg z-50">
                {staffs?.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name} ({member.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-shiftName">Shift Type</Label>
            <Select name="shiftName" defaultValue={selectedShift?.shiftName} required>
              <SelectTrigger>
                <SelectValue placeholder="Select shift type" />
              </SelectTrigger>
              <SelectContent className="bg-white shadow-lg z-50">
                <SelectItem value="GENERAL">Day</SelectItem>
                <SelectItem value="NIGHT">Night</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-day">Day</Label>
            <Select name="day" defaultValue={selectedShift?.day} required>
              <SelectTrigger>
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent className="bg-white shadow-lg z-50">
                <SelectItem value="MONDAY">Monday</SelectItem>
                <SelectItem value="TUESDAY">Tuesday</SelectItem>
                <SelectItem value="WEDNESDAY">Wednesday</SelectItem>
                <SelectItem value="THURSDAY">Thursday</SelectItem>
                <SelectItem value="FRIDAY">Friday</SelectItem>
                <SelectItem value="SATURDAY">Saturday</SelectItem>
                <SelectItem value="SUNDAY">Sunday</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-startTime">Start Time</Label>
            <Input
              id="edit-startTime"
              name="startTime"
              type="time"
              defaultValue={selectedShift?.startTime}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-endTime">End Time</Label>
            <Input
              id="edit-endTime"
              name="endTime"
              type="time"
              defaultValue={selectedShift?.endTime}
              required
            />
          </div>
        </div>
      </FormDialog>
    </div>
  );
} 