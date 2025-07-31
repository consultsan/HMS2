import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useSearch } from '@/contexts/SearchContext';
import { Pencil } from 'lucide-react';

interface Hospital {
  id: string;
  name: string;
  address: string;
  contactNumber: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export default function Hospitals() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const { searchQuery } = useSearch();
  const queryClient = useQueryClient();

  const { data: hospitals, isLoading } = useQuery<Hospital[]>({
    queryKey: ['hospitals'],
    queryFn: async () => {
      const response = await api.get('/api/super-admin/hospital/fetch-all');
      return response.data?.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<Hospital, 'id' | 'status'>) => {
      const response = await api.post('/api/super-admin/hospital/create', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospitals'] });
      setIsAddDialogOpen(false);
      toast.success('Hospital created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create hospital');
      console.error('Error creating hospital:', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Hospital> & { id: string }) => {
      const response = await api.patch(`/api/super-admin/hospital/update/${data.id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospitals'] });
      setIsEditDialogOpen(false);
      toast.success('Hospital updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update hospital');
      console.error('Error updating hospital:', error);
    },
  });

  const toggleHospitalStatus = (hospital: Hospital) => {
    const newStatus = hospital.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (window.confirm(`Are you sure you want to ${hospital.status === 'ACTIVE' ? 'disable' : 'enable'} this hospital?`)) {
      updateMutation.mutate({
        id: hospital.id,
        status: newStatus
      });
    }
  };

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      name: formData.get('name') as string,
      address: formData.get('address') as string,
      contactNumber: formData.get('contactNumber') as string,
      email: formData.get('email') as string,
    });
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedHospital) return;

    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: selectedHospital.id,
      name: formData.get('name') as string,
      address: formData.get('address') as string,
      contactNumber: formData.get('contactNumber') as string,
      email: formData.get('email') as string,
    });
  };

  const filteredHospitals = hospitals?.filter((hospital: Hospital) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      hospital.name.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Hospital</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="text-white bg-blue-800 hover:bg-blue-700"
              disabled={createMutation.isPending}
            >
              Add Hospital
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Hospital</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name" className=" font-semibold">Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div>
                <Label htmlFor="address" className="font-semibold">Address</Label>
                <Input id="address" name="address" required />
              </div>
              <div>
                <Label htmlFor="contactNumber" className=" font-semibold">Contact Number</Label>
                <Input
                  id="contactNumber"
                  name="contactNumber"
                  required
                  pattern="[0-9]{10}"
                  maxLength={10}
                  title="Please enter a valid 10-digit phone number"
                  onKeyPress={(e) => {
                    // Allow only numbers
                    if (!/[0-9]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    // Remove any non-numeric characters
                    e.target.value = e.target.value.replace(/\D/g, '');
                    // Limit to 10 digits
                    if (e.target.value.length > 10) {
                      e.target.value = e.target.value.slice(0, 10);
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">Enter a 10-digit phone number</p>
              </div>
              <div>
                <Label htmlFor="email" className=" font-semibold">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <Button type="submit" className="w-full">
                Add Hospital
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div>
        <Table numberOfRows={9}>
          <TableHeader>
            <TableRow >
              <TableHead>Hospitals Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Mobile Number</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredHospitals?.map((hospital) => (
              <TableRow key={hospital.id}>
                <TableCell className="font-medium">{hospital.name}</TableCell>
                <TableCell>{hospital.address}</TableCell>
                <TableCell>{hospital.email}</TableCell>
                <TableCell>{hospital.contactNumber}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs 
                      font-medium ${hospital.status === 'ACTIVE'
                        ? 'bg-green-50 text-green-600'
                        : 'bg-red-50 text-red-600'
                      }`}
                  >

                    {hospital.status}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedHospital(hospital);
                        setIsEditDialogOpen(true);
                      }}
                      className="p-1 hover:bg-gray-100 rounded-full"
                    >
                      <Pencil className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => toggleHospitalStatus(hospital)}
                      className={`px-2 py-1 rounded-md text-xs font-medium ${hospital.status === 'ACTIVE'
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                    >
                      {hospital.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Hospital</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={selectedHospital?.name}
                required
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                defaultValue={selectedHospital?.address}
                required
              />
            </div>
            <div>
              <Label htmlFor="contactNumber">Contact Number</Label>
              <Input
                id="contactNumber"
                name="contactNumber"
                defaultValue={selectedHospital?.contactNumber}
                required
                pattern="[0-9]{10}"
                maxLength={10}
                title="Please enter a valid 10-digit phone number"
                onKeyPress={(e) => {
                  // Allow only numbers
                  if (!/[0-9]/.test(e.key)) {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => {
                  // Remove any non-numeric characters
                  e.target.value = e.target.value.replace(/\D/g, '');
                  // Limit to 10 digits
                  if (e.target.value.length > 10) {
                    e.target.value = e.target.value.slice(0, 10);
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-1">Enter a 10-digit phone number</p>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={selectedHospital?.email}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Update Hospital
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 