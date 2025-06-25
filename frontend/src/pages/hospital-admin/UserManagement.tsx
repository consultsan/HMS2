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
import { useAuth } from '@/contexts/AuthContext';
import { Pencil, Trash2 } from 'lucide-react';
import { useSearch } from '@/contexts/SearchContext';
import { hospitalAdminApi, Staff, StaffFormData } from '@/api/hospitalAdmin';
import { fomratString } from '@/utils/stringUtils';
import { surgeriesBySpecialisation } from '@/constants/doctorSpecialization';
import ShiftsCalendar from '@/components/shifts/ShiftsCalender';
export default function UserManagement() {
  const allowedRoles = ['HOSPITAL_ADMIN', 'RECEPTIONIST', 'SALES_PERSON'];
  // if (!allowedRoles.includes(user?.role ?? '')) return <div>Not authorized</div>;

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const queryClient = useQueryClient();
  const [role, setRole] = useState('DOCTOR');
  const [specialisation, setSpecialisation] = useState('');
  const [editRole, setEditRole] = useState('DOCTOR');
  const [editSpecialisation, setEditSpecialisation] = useState('');
  const { searchQuery } = useSearch();
  const [departmentId, setDepartmentId] = useState('');
  const [editDepartmentId, setEditDepartmentId] = useState('');

  const { data: staffs, isLoading } = useQuery<Staff[]>({
    queryKey: ['hospital-staff'],
    queryFn: hospitalAdminApi.getStaff,
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: hospitalAdminApi.getDepartments,
  });

  const filteredStaffs = staffs?.filter((staff) => {
    if (!searchQuery) return true;
    return staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (staff.specialisation || '').toLowerCase().includes(searchQuery.toLowerCase());
  });
  const addStaffMutation = useMutation({
    mutationFn: hospitalAdminApi.createStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospital-staff'] });
      setIsAddDialogOpen(false);
      toast.success('Staff member added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add staff member');
      console.error('Add staff error:', error);
    },
  });

  const updateStaffMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StaffFormData> }) =>
      hospitalAdminApi.updateStaff(id, data),
    onSuccess: (data) => {
      console.log("updated", data)
      queryClient.invalidateQueries({ queryKey: ['hospital-staff'] });
      setIsEditDialogOpen(false);
      toast.success('Staff member updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update staff member');
      console.error('Update staff error:', error);
    },
  });

  const toggleStaffStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' }) =>
      hospitalAdminApi.updateStaff(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospital-staff'] });
      toast.success('Staff status updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update staff status');
      console.error('Update staff status error:', error);
    },
  });

  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (role === 'DOCTOR' && specialisation === '') {
      toast.error('Please select a specialisation');
      return;
    }
    if (!departmentId) {
      toast.error('Please select a department');
      return;
    }

    const data: StaffFormData = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      role: formData.get('role') as string,
      specialisation: role === 'DOCTOR' ? specialisation : '',
      deptId: departmentId,
    };
    addStaffMutation.mutate(data);
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedStaff) return;

    const formData = new FormData(e.currentTarget);
    const data: Partial<StaffFormData> = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      role: editRole,
      specialisation: editRole === 'DOCTOR' ? editSpecialisation : '',
      deptId: editDepartmentId,
    };
    // Only include password if it's not empty
    const password = formData.get('password') as string;
    if (password) {
      data.password = password;
    }

    updateStaffMutation.mutate({ id: selectedStaff.id, data });
  };

  const handleToggleStatus = async (id: string, currentStatus: 'ACTIVE' | 'INACTIVE') => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const action = newStatus === 'ACTIVE' ? 'enable' : 'disable';

    if (window.confirm(`Are you sure you want to ${action} this staff member?`)) {
      toggleStaffStatusMutation.mutate({ id, status: newStatus });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const specializations = Object.keys(surgeriesBySpecialisation) as string[];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
        <Button
          className="text-white bg-blue-800 hover:bg-blue-700"
          onClick={() => {
            setRole('DOCTOR');
            setSpecialisation('');
            setIsAddDialogOpen(true);
          }}
        >
          Add New User
        </Button>
      </div>

      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
              <TableHead>Shifts</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStaffs?.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{fomratString(user.role)}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${user.status === 'ACTIVE'
                      ? 'bg-green-50 text-green-600'
                      : 'bg-red-50 text-red-600'
                      }`}
                  >
                    {user.status}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedStaff(user);
                        setEditRole(user.role);
                        setEditSpecialisation(user.specialisation || '');
                        setIsEditDialogOpen(true);
                      }}
                      className="p-1 hover:bg-gray-100 rounded-full"
                    >
                      <Pencil className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(user.id, user.status)}
                      className={`p-1 hover:bg-gray-100 rounded-full ${user.status === 'ACTIVE' ? 'text-red-500' : 'text-green-500'
                        }`}
                    >
                      {user.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </TableCell>
                <TableCell>
                  <ShiftsCalendar userId={user.id} userName={user.name} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add User Dialog */}
      <FormDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        title="Add New User"
        onSubmit={handleAddSubmit}
        isLoading={addStaffMutation.isPending}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select name="role" value={role} onValueChange={setRole} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent className="bg-white shadow-lg z-50 max-h-[200px] overflow-y-auto">
                <SelectItem value="DOCTOR">Doctor</SelectItem>
                <SelectItem value="NURSE">Nurse</SelectItem>
                <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                <SelectItem value="SALES_PERSON">Sales Person</SelectItem>
                <SelectItem value="LAB_TECHNICIAN">Lab Technician</SelectItem>
                <SelectItem value="PHARMACIST">Pharmacist</SelectItem>
                <SelectItem value="FINANCE_MANAGER">Finance Manager</SelectItem>
                <SelectItem value="TPA">TPA Manager</SelectItem>
              </SelectContent>
            </Select>
            <input type="hidden" name="role" value={role} />
          </div>
          {role === 'DOCTOR' && (
            <div className="space-y-2">
              <Label htmlFor="specialisation">Specialisation</Label>
              <Select name="specialisation" value={specialisation} onValueChange={setSpecialisation} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a specialisation" />
                </SelectTrigger>
                <SelectContent className="bg-white shadow-lg z-50 max-h-[200px] overflow-y-auto">
                  {specializations.map((spec) => (
                    <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="specialisation" value={specialisation} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Select name="department" value={departmentId} onValueChange={setDepartmentId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a department" />
              </SelectTrigger>
              <SelectContent className="bg-white shadow-lg z-50 max-h-[200px] overflow-y-auto">
                {departments?.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormDialog>

      {/* Edit User Dialog */}
      <FormDialog
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setSelectedStaff(null);
        }}
        title="Edit User"
        onSubmit={handleEditSubmit}
        isLoading={updateStaffMutation.isPending}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              name="name"
              defaultValue={selectedStaff?.name}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              name="email"
              type="email"
              defaultValue={selectedStaff?.email}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-password">New Password (leave blank to keep current)</Label>
            <Input id="edit-password" name="password" type="password" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-role">Role</Label>
            <Select name="role" value={editRole} onValueChange={setEditRole} disabled>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent className="bg-white shadow-lg z-50">
                <SelectItem value="DOCTOR">Doctor</SelectItem>
                <SelectItem value="NURSE">Nurse</SelectItem>
                <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                <SelectItem value="SALES_PERSON">Sales Person</SelectItem>
                <SelectItem value="LAB_TECHNICIAN">Lab Technician</SelectItem>
                <SelectItem value="PHARMACIST">Pharmacist</SelectItem>
                <SelectItem value="FINANCE_MANAGER">Finance Manager</SelectItem>
                <SelectItem value="TPA">TPA Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {editRole === 'DOCTOR' && (
            <div className="space-y-2">
              <Label htmlFor="edit-specialisation">Specialisation</Label>
              <Select name="specialisation" value={editSpecialisation} onValueChange={setEditSpecialisation} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a specialisation" />
                </SelectTrigger>
                <SelectContent className="bg-white shadow-lg z-50">
                  {specializations.map((spec) => (
                    <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="edit-department">Department</Label>
            <Select name="department" value={editDepartmentId} onValueChange={setEditDepartmentId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a department" />
              </SelectTrigger>
              <SelectContent className="bg-white shadow-lg z-50">
                {departments?.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormDialog>
    </div>
  );
} 