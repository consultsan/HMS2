import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { labApi } from '@/api/lab';
import { toast } from 'sonner';
import { FormDialog } from '@/components/ui/form-dialog';
import { Button } from '@/components/ui/button';
import { Plus, Settings } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearch } from '@/contexts/SearchContext';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface LabTestFormData {
    code: string;
    name: string;
    description: string;
    unit: string;
    sampleType: string;
    charge: number;
}

interface LabTestParameter {
    id?: string;
    name: string;
    unit: string;
    lowerLimit: number;
    upperLimit: number;
    labTestId?: string;
}

export default function CreateLabTest() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isParametersDialogOpen, setIsParametersDialogOpen] = useState(false);
    const [selectedTest, setSelectedTest] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { searchQuery, setSearchQuery } = useSearch();
    const [formData, setFormData] = useState<LabTestFormData>({
        code: '',
        name: '',
        description: '',
        unit: '',
        sampleType: '',
        charge: 0
    });

    const [parameters, setParameters] = useState<LabTestParameter[]>([]);
    const [newParameter, setNewParameter] = useState<LabTestParameter>({
        name: '',
        unit: '',
        lowerLimit: 0,
        upperLimit: 0
    });

    const [editTestCharge, setEditTestCharge] = useState<number>(0);
    const updateLabTestMutation = useMutation({
        mutationFn: (data: { id: string; charge: number }) => labApi.updateLabTest(data.id, { charge: data.charge } as any),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['labTests', 'all'] });
            toast.success('Lab test price updated successfully');
        },
        onError: () => {
            toast.error('Failed to update lab test price');
        }
    });

    const { data: labTests, isLoading: isLabTestsLoading } = useQuery({
        queryKey: ['labTests', 'all'],
        queryFn: () => labApi.getLabTests(),
        select: (data) => data.data.data
    });

    const { data: existingParameters, isLoading: isParametersLoading } = useQuery({
        queryKey: ['labTestParameters', selectedTest?.id],
        queryFn: () => labApi.getParametersByLabTest(selectedTest?.id),
        select: (data) => data.data.data,
        enabled: !!selectedTest?.id
    });

    const createParameterMutation = useMutation({
        mutationFn: (parameter: LabTestParameter) => labApi.createParameter({
            ...parameter,
            labTestId: selectedTest?.id
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['labTestParameters', selectedTest?.id] });
            toast.success('Parameter added successfully');
        },
        onError: () => {
            toast.error('Failed to add parameter');
        }
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            if (formData.sampleType === '' || formData.unit === '' || formData.name === '' || formData.code === '' || formData.description === '' || formData.charge <= 0) {
                toast.error('Please fill all the fields and enter a valid charge amount');
                return;
            }
            const response = await labApi.createLabTest({
                code: formData.code,
                name: formData.name,
                description: formData.description,
                sampleType: formData.sampleType,
                charge: formData.charge
            });
            if (response.status === 201) {
                setFormData({
                    code: '',
                    name: '',
                    description: '',
                    unit: '',
                    sampleType: '',
                    charge: 0
                });
                setIsDialogOpen(false);
                toast.success('Lab test created successfully');
                queryClient.invalidateQueries({ queryKey: ['labTests', 'all'] });
            }
        } catch (error) {
            console.error('Error creating lab test:', error);
            toast.error('Failed to create lab test');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddParameter = () => {
        if (newParameter.name && newParameter.unit) {
            createParameterMutation.mutate(newParameter);
            setNewParameter({
                name: '',
                unit: '',
                lowerLimit: 0,
                upperLimit: 0
            });
        }
    };

    const handleRemoveParameter = (index: number) => {
        setParameters(parameters.filter((_, i) => i !== index));
    };

    const handleEditParameters = (test: any) => {
        setSelectedTest(test);
        setEditTestCharge(test.charge || 0);
        setIsParametersDialogOpen(true);
    };

    const searchFilteredTests = labTests?.filter((test: any) => {
        if (!searchQuery || searchQuery === '') { return true; }
        const searchLower = searchQuery.toLowerCase();
        return test.name.toLowerCase().includes(searchLower) || test.code.toLowerCase().includes(searchLower);
    });

    // Update parameters when existing parameters are loaded
    useEffect(() => {
        if (existingParameters) {
            setParameters(existingParameters);
        }
    }, [existingParameters]);

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Lab Tests</h1>
                <Button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Create Lab Test
                </Button>
            </div>

            {/* Lab Tests Table */}
            <div className="bg-white rounded-lg shadow">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Test Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead>Sample Type</TableHead>
                            <TableHead>Charge (₹)</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLabTestsLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-4">Loading...</TableCell>
                            </TableRow>
                        ) : labTests?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-4">No lab tests found</TableCell>
                            </TableRow>
                        ) : (
                            searchFilteredTests?.map((test: any) => (
                                <TableRow key={test.id}>
                                    <TableCell>{test.code}</TableCell>
                                    <TableCell>{test.name}</TableCell>
                                    <TableCell>{test.description}</TableCell>
                                    <TableCell>{test.unit}</TableCell>
                                    <TableCell>{test.sampleType}</TableCell>
                                    <TableCell>₹{test.charge?.toFixed(2) || '0.00'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEditParameters(test)}
                                            className="flex items-center gap-2"
                                        >
                                            <Settings className="h-4 w-4" />
                                            Edit
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Create Lab Test Dialog */}
            <FormDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                title="Create New Lab Test"
                onSubmit={handleSubmit}
                isLoading={isLoading}
            >
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Test Code</label>
                        <input
                            type="text"
                            value={formData.code}
                            onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2"
                            required
                            disabled={isLoading}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Test Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Sample Type</label>
                        <input
                            type="text"
                            value={formData.sampleType}
                            onChange={(e) => setFormData(prev => ({ ...prev, sampleType: e.target.value }))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Charge (₹)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.charge}
                            onChange={(e) => setFormData(prev => ({ ...prev, charge: parseFloat(e.target.value) || 0 }))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2"
                            required
                            disabled={isLoading}
                            placeholder="Enter amount in rupees"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2"
                        rows={3}
                        disabled={isLoading}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Unit</label>
                    <input
                        type="text"
                        value={formData.unit}
                        onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2"
                        disabled={isLoading}
                    />
                </div>
            </FormDialog>

            {/* Edit Parameters Dialog */}
            <Dialog open={isParametersDialogOpen} onOpenChange={(open: boolean) => {
                if (!open) {
                    setIsParametersDialogOpen(false);
                    setSelectedTest(null);
                    setParameters([]);
                }
            }}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>{`Edit - ${selectedTest?.name}`}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {/* Edit Price */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Test Price (₹)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editTestCharge}
                                onChange={e => setEditTestCharge(Number(e.target.value))}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2"
                                disabled={updateLabTestMutation.isPending}
                            />
                            <Button
                                type="button"
                                className="mt-2"
                                disabled={updateLabTestMutation.isPending || editTestCharge === selectedTest?.charge}
                                onClick={() => {
                                    if (selectedTest?.id && editTestCharge >= 0) {
                                        updateLabTestMutation.mutate({ id: selectedTest.id, charge: editTestCharge });
                                    }
                                }}
                            >
                                {updateLabTestMutation.isPending ? 'Saving...' : 'Save Price'}
                            </Button>
                        </div>
                        {/* Existing Parameters */}
                        <div className="space-y-2">
                            {isParametersLoading ? (
                                <div className="text-center py-4">Loading parameters...</div>
                            ) : parameters.length === 0 ? (
                                <div className="text-center py-4 text-gray-500">No parameters added yet</div>
                            ) : (
                                parameters.map((param, index) => (
                                    <div key={param.id || index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                                        <div className="flex-1">
                                            <p className="font-medium">{param.name}</p>
                                            <p className="text-sm text-gray-500">
                                                Range: {param.lowerLimit} - {param.upperLimit} {param.unit}
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleRemoveParameter(index)}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Add New Parameter Form */}
                        <div className="grid grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Parameter Name</label>
                                <input
                                    type="text"
                                    value={newParameter.name}
                                    onChange={(e) => setNewParameter(prev => ({ ...prev, name: e.target.value }))}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2"
                                    disabled={createParameterMutation.isPending}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Unit</label>
                                <input
                                    type="text"
                                    value={newParameter.unit}
                                    onChange={(e) => setNewParameter(prev => ({ ...prev, unit: e.target.value }))}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2"
                                    disabled={createParameterMutation.isPending}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Lower Limit</label>
                                <input
                                    type="number"
                                    value={newParameter.lowerLimit}
                                    onChange={(e) => setNewParameter(prev => ({ ...prev, lowerLimit: Number(e.target.value) }))}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2"
                                    disabled={createParameterMutation.isPending}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Upper Limit</label>
                                <input
                                    type="number"
                                    value={newParameter.upperLimit}
                                    onChange={(e) => setNewParameter(prev => ({ ...prev, upperLimit: Number(e.target.value) }))}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2"
                                    disabled={createParameterMutation.isPending}
                                />
                            </div>
                        </div>

                        <Button
                            type="button"
                            onClick={handleAddParameter}
                            className="w-full"
                            disabled={createParameterMutation.isPending}
                        >
                            {createParameterMutation.isPending ? 'Adding...' : 'Add Parameter'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
} 