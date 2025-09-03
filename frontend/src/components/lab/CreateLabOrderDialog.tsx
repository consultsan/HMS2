import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { useMutation, UseMutationResult, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { labApi } from "@/api/lab";
import { patientApi } from "@/api/patient";
import { Patient } from "@/types/types";




interface CreateLabOrderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function CreateLabOrderDialog({
    open,
    onOpenChange,
}: CreateLabOrderDialogProps) {
    const [batchOrderPatient, setBatchOrderPatient] = useState<string>('');
    const [selectedLabTests, setSelectedLabTests] = useState<string[]>([]);
    const [orderNotes, setOrderNotes] = useState<string>('');
    const [urgentOrder, setUrgentOrder] = useState<boolean>(false);
    const [batchPatientSearchQuery, setBatchPatientSearchQuery] = useState('');

    const { data: patients, isLoading } = useQuery<Patient[]>({
        queryKey: ['hospital-patients'],
        queryFn: async () => {
            const response = await patientApi.getAllPatients();
            return response;
        },
    });

    const { data: labTests } = useQuery<any>({
        queryKey: ['lab-tests'],
        queryFn: async () => {
            const response = await labApi.getLabTests();
            return response.data?.data;
        },
    });

    const queryClient = useQueryClient();

    const createExternalLabOrderMutation = useMutation({
        mutationFn: async (orderData: {
            patientId: string;
            labTestIds: string[];
            notes?: string;
            urgentOrder: boolean;
        }) => {
            const response = await labApi.createExternalLabOrder(orderData);
            return response.data?.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-test-appointments'] });
            queryClient.invalidateQueries({ queryKey: ['external-lab-orders'] });
            onOpenChange(false);
            toast.success('Lab order created successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to create lab order');
        },
    });
    // Filter patients for batch order
    const filteredBatchPatients = patients?.filter(patient =>
        patient.name.toLowerCase().includes(batchPatientSearchQuery.toLowerCase()) ||
        patient.patientUniqueId?.toLowerCase().includes(batchPatientSearchQuery.toLowerCase()) ||
        patient.phone?.includes(batchPatientSearchQuery)
    ) ?? [];

    // Handler for lab test selection
    const handleLabTestSelection = (testId: string, checked: boolean) => {
        if (checked) {
            setSelectedLabTests(prev => [...prev, testId]);
        } else {
            setSelectedLabTests(prev => prev.filter(id => id !== testId));
        }
    };

    // Handler for creating lab order
    const handleCreateLabOrder = () => {
        if (!batchOrderPatient) {
            toast.error('Please select a patient');
            return;
        }
        if (selectedLabTests.length === 0) {
            toast.error('Please select at least one lab test');
            return;
        }
        createExternalLabOrderMutation.mutate({
            patientId: batchOrderPatient,
            labTestIds: selectedLabTests,
            notes: orderNotes || undefined,
            urgentOrder: urgentOrder
        });

        setBatchOrderPatient('');
        setSelectedLabTests([]);
        setOrderNotes('');
        setUrgentOrder(false);
        setBatchPatientSearchQuery('');


    };

    // Reset form when dialog closes
    const handleClose = () => {
        onOpenChange(false);
        setBatchOrderPatient('');
        setSelectedLabTests([]);
        setOrderNotes('');
        setUrgentOrder(false);
        setBatchPatientSearchQuery('');
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create Lab Order</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                    {/* Patient Selection */}
                    <div>
                        <Label className="text-base font-semibold">Select Patient</Label>
                        <div className="space-y-2">
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                                <Input
                                    placeholder="Search patients by name, ID or phone..."
                                    value={batchPatientSearchQuery}
                                    onChange={(e) => setBatchPatientSearchQuery(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                            {batchPatientSearchQuery && (
                                <div className="border rounded-md max-h-40 overflow-y-auto">
                                    {filteredBatchPatients.length > 0 ? (
                                        filteredBatchPatients.slice(0, 10).map((patient) => (
                                            <div
                                                key={patient.id}
                                                className={`p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 ${batchOrderPatient === patient.id ? 'bg-blue-50' : ''
                                                    }`}
                                                onClick={() => {
                                                    setBatchOrderPatient(patient.id);
                                                    setBatchPatientSearchQuery(patient.name);
                                                }}
                                            >
                                                <div className="font-medium">{patient.name}</div>
                                                <div className="text-sm text-gray-500">
                                                    ID: {patient?.uhid} | Phone: {patient.phone}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-2 text-gray-500">No patients found</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Lab Tests Selection */}
                    <div>
                        <Label className="text-base font-semibold">Select Lab Tests</Label>
                        <div className="border rounded-md max-h-64 overflow-y-auto mt-2">
                            {labTests?.map((test: any) => (
                                <div key={test.id} className="p-3 border-b last:border-b-0 hover:bg-gray-50">
                                    <div className="flex items-center space-x-3">
                                        <input
                                            type="checkbox"
                                            id={`test-${test.id}`}
                                            checked={selectedLabTests.includes(test.id)}
                                            onChange={(e) => handleLabTestSelection(test.id, e.target.checked)}
                                            className="h-4 w-4 rounded border border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                                        />
                                        <label htmlFor={`test-${test.id}`} className="flex-1 cursor-pointer">
                                            <div className="font-medium">{test.name}</div>
                                            <div className="text-sm text-gray-500">
                                                Code: {test.code} | Sample: {test.sampleType} | ₹{test.charge}
                                            </div>
                                            {test.description && (
                                                <div className="text-sm text-gray-600 mt-1">{test.description}</div>
                                            )}
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {selectedLabTests.length > 0 && (
                            <div className="mt-2 text-sm text-blue-600">
                                {selectedLabTests.length} test(s) selected
                            </div>
                        )}
                    </div>

                    {/* Additional Options */}
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="orderNotes" className="text-base font-semibold">Notes (Optional)</Label>
                            <Textarea
                                id="orderNotes"
                                placeholder="Enter any notes for this lab order..."
                                value={orderNotes}
                                onChange={(e) => setOrderNotes(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="urgentOrder"
                                checked={urgentOrder}
                                onChange={(e) => setUrgentOrder(e.target.checked)}
                                className="h-4 w-4 rounded border border-gray-300 text-red-600 focus:ring-red-500 focus:ring-2"
                            />
                            <Label htmlFor="urgentOrder" className="text-red-600 font-medium">
                                Mark as Urgent Order
                            </Label>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreateLabOrder}
                        disabled={createExternalLabOrderMutation.isPending || !batchOrderPatient || selectedLabTests.length === 0}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {createExternalLabOrderMutation.isPending ? 'Creating...' : 'Create Order'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 