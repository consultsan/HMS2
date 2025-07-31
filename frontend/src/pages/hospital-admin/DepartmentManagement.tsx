import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useSearch } from '@/contexts/SearchContext';
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
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { hospitalAdminApi } from '@/api/hospitalAdmin';
import { Department } from '@/types/types';

export default function DepartmentManagement() {
    const { searchQuery, setSearchQuery } = useSearch();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [departmentName, setDepartmentName] = useState('');
    const [departmentDescription, setDepartmentDescription] = useState('');

    const { data: departments, isLoading, refetch } = useQuery<Department[]>({
        queryKey: ['departments'],
        queryFn: hospitalAdminApi.getDepartments,
    });

    const addDepartmentMutation = useMutation({
        mutationFn: hospitalAdminApi.createDepartment,
        onSuccess: () => {
            toast.success('Department added successfully');
            setIsAddDialogOpen(false);
            setDepartmentName('');
            setDepartmentDescription('');
            refetch();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to add department');
        },
    });


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!departmentName.trim()) {
            toast.error('Department name is required');
            return;
        }
        addDepartmentMutation.mutate({
            name: departmentName.trim(),
            description: departmentDescription.trim(),
        });
    };

    if (isLoading) {
        return <div>Loading departments...</div>;
    }

    const filteredDepartments = departments?.filter(department =>{
        if(!searchQuery) {  
        return true;
    }
        return department.name.toLowerCase().includes(searchQuery.toLowerCase())
    });
    return (
        <div className="container mx-auto py-10">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Department Management</h1>
                <Button
                    onClick={() => setIsAddDialogOpen(true)}
                    className="bg-blue-800 text-white hover:bg-blue-700"
                >
                    Add Department
                </Button>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Department Name</TableHead>
                        <TableHead>Created At</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredDepartments?.map((department) => (
                        <TableRow key={department.id}>
                            <TableCell>{department.name}</TableCell>
                            <TableCell>
                                {new Date(department.createdAt).toLocaleDateString()}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Add New Department</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Department Name</Label>
                            <Input
                                id="name"
                                value={departmentName}
                                onChange={(e) => setDepartmentName(e.target.value)}
                                placeholder="Enter department name"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                value={departmentDescription}
                                onChange={(e) => setDepartmentDescription(e.target.value)}
                                placeholder="Enter department description"
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={addDepartmentMutation.isPending}
                                className="bg-blue-800 text-white hover:bg-blue-700"
                            >
                                {addDepartmentMutation.isPending ? 'Adding...' : 'Add Department'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}