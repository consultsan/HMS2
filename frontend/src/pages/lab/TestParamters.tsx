import { labApi } from "@/api/lab";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Parameter {
    id: string;
    name: string;
    unit?: string;
    referenceRange?: string;
    lowerLimit?: number;
    upperLimit?: number;
    value?: number;
    labTestId: string;
}

interface TestResult {
    id?: string;
    parameterId: string;
    value: number;
    unitOverride?: string;
    appointmentLabTestId?: string;
    notes?: string;
}

interface TestParametersProps {
    testId: string;
    appointmentLabTestId: string;
    canEdit: boolean;
    onParametersComplete?: (isComplete: boolean) => void;
}

const TestParameters = forwardRef<any, TestParametersProps>(({ testId, appointmentLabTestId, canEdit, onParametersComplete }, ref) => {
    const [editedParameters, setEditedParameters] = useState<TestResult[]>([]);
    const queryClient = useQueryClient();

    const { data: parameters, isLoading, error } = useQuery<Parameter[]>({
        queryKey: ['test-parameters', testId],
        queryFn: async () => {
            if (!testId) throw new Error('Test ID is required');
            const response = await labApi.getParametersByLabTest(testId);
            return response.data?.data;
        },
        enabled: !!testId
    });


    const { data: existingResults } = useQuery<TestResult[]>({
        queryKey: ['test-results', appointmentLabTestId],
        queryFn: async () => {
            if (!appointmentLabTestId) throw new Error('Appointment Lab Test ID is required');
            const response = await labApi.getResultsByOrder(appointmentLabTestId);
            return response.data?.data;
        },
        enabled: !!appointmentLabTestId
    });

    useEffect(() => {
        if (existingResults) {
            setEditedParameters(existingResults);
        }
    }, [existingResults]);

    useEffect(() => {
        if (parameters && onParametersComplete) {
            const allParametersHaveValues = parameters.every(param => {
                const result = editedParameters.find(p => p.parameterId === param.id);
                return result?.value !== undefined;
            });
            onParametersComplete(allParametersHaveValues);
        }
    }, [parameters, editedParameters, onParametersComplete]);

    const updateParameterMutation = useMutation({
        mutationFn: async (result: TestResult) => {
            if (result.id) {
                return labApi.updateTestResult(result.id, {
                    value: result.value,
                    unitOverride: result.unitOverride,
                    notes: result.notes
                });
            } else {
                return labApi.recordTestResult({
                    appointmentLabTestId,
                    parameterId: result.parameterId,
                    value: result.value,
                    unitOverride: result.unitOverride || '',
                    notes: result.notes || ''
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['test-results', appointmentLabTestId] });
            toast.success('Test result updated successfully');
        },
        onError: () => {
            toast.error('Failed to update test result');
        }
    });

    const handleValueChange = (parameterId: string, value: string) => {
        setEditedParameters(prev => {
            const existing = prev.find(p => p.parameterId === parameterId);
            if (existing) {
                return prev.map(p => p.parameterId === parameterId ? { ...p, value: Number(value) } : p);
            }
            return [...prev, { parameterId, value: Number(value) }];
        });
    };

    const handleUpdate = async (parameterId: string) => {
        const result = editedParameters.find(p => p.parameterId === parameterId);
        if (result) {
            await updateParameterMutation.mutateAsync(result);
        }
    };

    const saveAllParameters = async () => {
        const promises = editedParameters.map(result => {
            if (result.value !== undefined) {
                return updateParameterMutation.mutateAsync(result);
            }
            return Promise.resolve();
        });
        await Promise.all(promises);
    };

    // Expose saveAllParameters function to parent component via ref
    useImperativeHandle(ref, () => ({
        saveAllParameters
    }), [editedParameters]);

    const getValueStatus = (parameter: Parameter) => {
        const result = editedParameters.find(p => p.parameterId === parameter.id);
        if (!result?.value) return 'pending';
        if (parameter.lowerLimit !== undefined && result.value < parameter.lowerLimit) return 'low';
        if (parameter.upperLimit !== undefined && result.value > parameter.upperLimit) return 'high';
        return 'normal';
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'low': return 'text-blue-500';
            case 'high': return 'text-red-500';
            case 'normal': return 'text-green-500';
            case 'pending': return 'text-gray-500';
            default: return '';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'low': return 'LOW';
            case 'high': return 'HIGH';
            case 'normal': return 'NORMAL';
            case 'pending': return 'PENDING';
            default: return '';
        }
    };

    if (!testId) {
        return (
            <div className="text-center text-red-500">
                No test ID provided. Please select a test to view its parameters.
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="text-center">Loading parameters...</div>
        );
    }

    if (error) {
        return (
            <div className="text-center text-red-500">
                Error loading parameters. Please try again.
            </div>
        );
    }

    return (
        <div className="mt-4">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Parameter Name</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead>Lower Limit</TableHead>
                            <TableHead>Upper Limit</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Status</TableHead>
                            {canEdit && <TableHead>Action</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {parameters?.map((parameter) => {
                            const result = editedParameters.find(p => p.parameterId === parameter.id);
                            const value = result?.value;
                            const status = getValueStatus(parameter);
                            const hasValue = value !== undefined;

                            return (
                                <TableRow key={parameter.id}>
                                    <TableCell className="font-medium">{parameter.name}</TableCell>
                                    <TableCell>{parameter.unit || 'N/A'}</TableCell>
                                    <TableCell>{parameter.lowerLimit || 'N/A'}</TableCell>
                                    <TableCell>{parameter.upperLimit || 'N/A'}</TableCell>
                                    <TableCell>
                                        {canEdit ? (
                                            <Input
                                                type="number"
                                                value={value || ''}
                                                onChange={(e) => handleValueChange(parameter.id, e.target.value)}
                                                className={`w-24 ${!hasValue ? 'border-red-500' : ''}`}
                                                placeholder="Required"
                                            />
                                        ) : (
                                            <span className="font-medium">
                                                {value !== undefined ? value : 'Not Set'}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <span className={`font-medium ${getStatusColor(status)}`}>
                                            {getStatusText(status)}
                                        </span>
                                    </TableCell>
                                    {canEdit && (
                                        <TableCell>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleUpdate(parameter.id)}
                                                disabled={!result}
                                            >
                                                Update
                                            </Button>
                                        </TableCell>
                                    )}
                                </TableRow>
                            );
                        })}
                        {(!parameters || parameters.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={canEdit ? 7 : 6} className="text-center">
                                    No parameters found for this test
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
});

TestParameters.displayName = 'TestParameters';

export default TestParameters;
