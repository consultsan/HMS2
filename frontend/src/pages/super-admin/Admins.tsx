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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useSearch } from '@/contexts/SearchContext';
import { Pencil } from 'lucide-react';

interface Hospital {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
}

interface Admin {
  id: string;
  name: string;
  email: string;
  hospital: {
    id: string;
    name: string;
  };
  status: 'ACTIVE' | 'INACTIVE';
}

export default function Admins() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const { searchQuery } = useSearch();
  const queryClient = useQueryClient();

  const { data: admins, isLoading: isLoadingAdmins } = useQuery<Admin[]>({
    queryKey: ['admins'],
    queryFn: async () => {
      const response = await api.get('/api/super-admin/admin/fetch-all');
      return response.data?.data;
    },
  });

  const { data: hospitals, isLoading: isLoadingHospitals } = useQuery<Hospital[]>({
    queryKey: ['hospitals'],
    queryFn: async () => {
      const response = await api.get('/api/super-admin/hospital/fetch-all');
      console.log('Hospitals response:', response.data);
      return response.data?.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      email: string;
      password: string;
      hospitalId: string;
    }) => {
      const response = await api.post('/api/super-admin/admin/create', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      setIsAddDialogOpen(false);
      toast.success('Admin created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create admin');
      console.error('Error creating admin:', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      name?: string;
      password?: string;
      status?: 'ACTIVE' | 'INACTIVE';
    }) => {
      const response = await api.patch(`/api/super-admin/admin/update/${data.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      setIsEditDialogOpen(false);
      toast.success('Admin updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update admin');
      console.error('Error updating admin:', error);
    },
  });

  // const deleteMutation = useMutation({
  //   mutationFn: async (id: string) => {
  //     await api.delete(`/api/super-admin/admin/delete/${id}`);
  //   },
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ['admins'] });
  //     toast.success('Admin deleted successfully');
  //   },
  //   onError: (error) => {
  //     toast.error('Failed to delete admin');
  //     console.error('Error deleting admin:', error);
  //   },
  // });

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      hospitalId: formData.get('hospitalId') as string,
    });
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedAdmin) return;

    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: selectedAdmin.id,
      name: formData.get('name') as string,
      password: formData.get('password') as string,
    });
  };


  const toggleAdminStatus = (admin: Admin) => {
    const newStatus = admin.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (window.confirm(`Are you sure you want to ${admin.status === 'ACTIVE' ? 'disable' : 'enable'} this admin?`)) {
      updateMutation.mutate({
        id: admin.id,
        status: newStatus
      });
    }
  };

  const filteredAdmins = admins?.filter((admin) => {
    if (!searchQuery) { return true; }
    const searchLower = searchQuery.toLowerCase();
    return (
      admin.name.toLowerCase().includes(searchLower) ||
      admin.email.toLowerCase().includes(searchLower) ||
      admin.hospital.name.toLowerCase().includes(searchLower)
    );
  });

  if (isLoadingAdmins || isLoadingHospitals) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Hospital Admins</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={createMutation.isPending}>Add Admin</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Admin</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name" className="font-semibold text-gray-500">Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div>
                <Label htmlFor="email" className="font-semibold text-gray-500">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div>
                <Label htmlFor="password" className="font-semibold text-gray-500">Password</Label>
                <Input id="password" name="password" type="password" required />
              </div>
              <div>
                <Label htmlFor="hospitalId" className="font-semibold text-gray-500">Hospital</Label>
                <Select name="hospitalId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a hospital" />
                  </SelectTrigger>
                  <SelectContent>
                    {hospitals?.filter((hospital) => hospital.status !== 'INACTIVE').map((hospital) => (
                      <SelectItem key={hospital.id} value={hospital.id}>
                        {hospital.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                Add Admin
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>


      <div>
        <Table numberOfRows={9}>
          <TableHeader>
            <TableRow >
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Hospital</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAdmins?.map((admin) => (
              <TableRow key={admin.id}>
                <TableCell className="font-medium">{admin.name}</TableCell>
                <TableCell >{admin.email}</TableCell>
                <TableCell >{admin.hospital.name}</TableCell>
                <TableCell >
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${admin.status === 'ACTIVE'
                      ? 'bg-green-50 text-green-600'
                      : 'bg-red-50 text-red-600'
                      }`}
                  >
                    {admin.status}
                  </span>
                </TableCell>
                <TableCell >
                  <div className="flex items-center gap-2">
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                      <button
                        onClick={() => {
                          setSelectedAdmin(admin);
                          setIsEditDialogOpen(true);
                        }}
                        className="p-1 hover:bg-gray-100 rounded-full"
                      >
                        <Pencil className="w-4 h-4 text-gray-500" />
                      </button>

                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Admin</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleEditSubmit} className="space-y-4">
                          <div>
                            <Label htmlFor="name" >Name</Label>
                            <Input
                              id="name"
                              name="name"
                              defaultValue={admin.name}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              defaultValue={admin.email}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="password">New Password (leave blank to keep current)</Label>
                            <Input
                              id="password"
                              name="password"
                              type="password"
                            />
                          </div>
                          <div>
                            <Label htmlFor="hospitalId" className="font-semibold">Hospital</Label>
                            <Select
                              name="hospitalId"
                              defaultValue={admin.hospital.id}
                              required
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a hospital" />
                              </SelectTrigger>
                              <SelectContent>
                                {hospitals?.map((hospital) => (
                                  <SelectItem key={hospital.id} value={hospital.id}>
                                    {hospital.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button type="submit" className="w-full">
                            Update Admin
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                    <button
                      onClick={() => toggleAdminStatus(admin)}
                      className={`px-2 py-1 rounded-md text-xs font-medium ${admin.status === 'ACTIVE'
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                    >
                      {admin.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 