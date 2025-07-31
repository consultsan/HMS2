import { labApi } from "@/api/lab";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search, Upload, FileText, X } from "lucide-react";
import { useSearch } from "@/contexts/SearchContext";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LabTestStatus, AppointmentAttachType } from "@/types/types";
import ViewTestResult from "./ViewTestResult";
import TestParameters from "./TestParamters";


export default function LabTestManager({ filter }: { filter: string }) {
    const queryClient = useQueryClient();
    const [tentativeDates, setTentativeDates] = useState<{ [key: string]: { date: string, status: string } }>({});
    const [editingTestId, setEditingTestId] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isExternalLabDialogOpen, setIsExternalLabDialogOpen] = useState(false);
    const [externalLabName, setExternalLabName] = useState('');
    const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
    const [isParametersDialogOpen, setIsParametersDialogOpen] = useState(false);
    const [isViewParametersDialogOpen, setIsViewParametersDialogOpen] = useState(false);
    const [selectedTestForCompletion, setSelectedTestForCompletion] = useState<{ id: string, labTestId: string } | null>(null);
    const [selectedTestForView, setSelectedTestForView] = useState<{ id: string, labTestId: string, testName: string } | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [uploadedFiles, setUploadedFiles] = useState<Array<{ id: string, name: string, url: string }>>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [parametersComplete, setParametersComplete] = useState(false);
    const { searchQuery, setSearchQuery } = useSearch();

    const { data: labOrders } = useQuery<any>({
        queryKey: ['lab-orders', filter],
        queryFn: async () => {
            if (filter === "FromDoctor") {
                const response = await labApi.getInternalLabOrders();
                return response.data?.data;
            }
            else if (filter === "FromReceptionist") {
                const response = await labApi.getExternalLabOrders();
                return response.data?.data;
            }
            return [];
        },
    });

    const updateTestStatusMutation = useMutation({
        mutationFn: async ({ testId, status, tentativeReportDate }: { testId: string; status: LabTestStatus; tentativeReportDate?: string }) => {
            const response = await labApi.updateLabTestOrder(testId, {
                status,
                tentativeReportDate: tentativeReportDate ? new Date(tentativeReportDate) : undefined
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lab-orders'] });
            toast.success('Test status updated successfully');
        },
        onError: (error) => {
            toast.error('Failed to update test status');
            console.error('Error updating test status:', error);
        },
    });

    const markAsExternalMutation = useMutation({
        mutationFn: async ({ testId, labName }: { testId: string; labName: string }) => {
            const response = await labApi.markTestSentExternal(testId, labName);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lab-orders'] });
            setIsExternalLabDialogOpen(false);
            setExternalLabName('');
            setSelectedTestId(null);
            toast.success('Test marked as sent to external lab');
        },
        onError: (error) => {
            toast.error('Failed to mark test as external');
            console.error('Error marking test as external:', error);
        },
    });

    const updateTentativeDateMutation = useMutation({
        mutationFn: async ({ testId, tentativeDate, status }: { testId: string; tentativeDate: string; status: LabTestStatus }) => {
            const response = await labApi.updateLabTestOrder(testId, {
                status,
                tentativeReportDate: new Date(tentativeDate)
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lab-orders'] });
            setIsDialogOpen(false);
            setEditingTestId(null);
            toast.success('Tentative date updated successfully');
        },
        onError: (error) => {
            toast.error('Failed to update tentative date');
            console.error('Error updating tentative date:', error);
        },
    });

    const updateExternalStatusMutation = useMutation({
        mutationFn: async ({ testId, isExternal }: { testId: string; isExternal: boolean }) => {
            // Find the test across all lab orders
            const allTests = labOrders?.flatMap((order: any) =>
                order.appointmentLabTests?.map((test: any) => ({ ...test, labOrderId: order.id }))
            ) || [];
            const test = allTests.find((t: any) => t.id === testId);
            if (!test) throw new Error('Test not found');

            let status = test.status;
            if (!isExternal) {
                if (test.tentativeReportDate) {
                    status = LabTestStatus.PROCESSING;
                } else {
                    status = LabTestStatus.PENDING;
                }
            }
            const response = await labApi.updateLabTestOrder(testId, {
                status,
                isSentExternal: isExternal
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lab-orders'] });
            toast.success('External status updated successfully');
        },
        onError: (error) => {
            toast.error('Failed to update external status');
            console.error('Error updating external status:', error);
        },
    });

    const uploadDocumentMutation = useMutation({
        mutationFn: async ({ file, appointmentLabTestId }: { file: File; appointmentLabTestId: string }) => {
            const response = await labApi.uploadLabTestAttachment({
                file,
                appointmentLabTestId
            } as any);
            return response.data;
        },
        onSuccess: (data) => {
            const attachment = data.data;
            setUploadedFiles(prev => [...prev, {
                id: attachment.id,
                name: attachment.url.split('/').pop() || 'Unknown',
                url: attachment.url
            }]);
            setIsUploading(false);
            toast.success('Document uploaded successfully');
        },
        onError: (error) => {
            setIsUploading(false);
            toast.error('Failed to upload document');
            console.error('Error uploading document:', error);
        },
    });

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]; 
        if (!file) return;

        const allTests = labOrders?.flatMap((order: any) => order.appointmentLabTests) || [];
        const test = allTests.find((t: any) => t.id === selectedTestForCompletion?.id);
        if (!test) {
            toast.error('No test found');
            return;
        }

        setIsUploading(true);
        uploadDocumentMutation.mutate({ file, appointmentLabTestId: selectedTestForCompletion?.id || '' });
    };

    const handleRemoveFile = (fileId: string) => {
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    };

    const handleStatusUpdate = (testId: string) => {
        const allTests = labOrders?.flatMap((order: any) => order.appointmentLabTests) || [];
        const test = allTests.find((t: any) => t.id === testId);
        if (!test) return;

        if (test.status === 'PENDING') {
            updateTestStatusMutation.mutate({
                testId,
                status: LabTestStatus.PROCESSING,
                tentativeReportDate: test.tentativeReportDate
            });
        } else if (test.status === 'PROCESSING' || test.status === 'SENT_EXTERNAL') {
            setSelectedTestForCompletion({ id: testId, labTestId: test.labTestId });
            setIsParametersDialogOpen(true);
        }
    };

    const handleTentativeDateChange = (testId: string, date: string, status: string) => {
        const allTests = labOrders?.flatMap((order: any) => order.appointmentLabTests) || [];
        const test = allTests.find((t: any) => t.id === testId);
        if (!test) return;

        if (test.status === "PENDING") {
            test.status = "PROCESSING"
        }
        setTentativeDates(prev => ({
            ...prev,
            [testId]: {
                date,
                status: status
            }
        }));
    };

    const handleTentativeDateSubmit = (testId: string) => {
        const { date } = tentativeDates[testId];
        if (!date) {
            toast.error('Please select a tentative date');
            return;
        }
        const allTests = labOrders?.flatMap((order: any) => order.appointmentLabTests) || [];
        const test = allTests.find((t: any) => t.id === testId);
        if (!test) return;

        if (test.status === "PENDING") {
            test.status = "PROCESSING"
        }

        updateTentativeDateMutation.mutate({
            testId,
            tentativeDate: date,
            status: test.status
        });
    };

    const handleEditClick = (testId: string) => {
        setEditingTestId(testId);
        setIsDialogOpen(true);
        const allTests = labOrders?.flatMap((order: any) => order.appointmentLabTests) || [];
        const test = allTests.find((t: any) => t.id === testId);
        if (test?.tentativeReportDate) {
            setTentativeDates(prev => ({
                ...prev,
                [testId]: { date: test.tentativeReportDate, status: test.status }
            }));
        }
    };

    const handleDialogClose = () => {
        setIsDialogOpen(false);
        setEditingTestId(null);
        setTentativeDates(prev => {
            if (editingTestId) {
                const newDates = { ...prev };
                delete newDates[editingTestId];
                return newDates;
            }
            return prev;
        });
    };

    const handleExternalChange = (testId: string, value: string) => {
        const isExternal = value === 'yes';
        if (isExternal) {
            setSelectedTestId(testId);
            setIsExternalLabDialogOpen(true);
        } else {
            updateExternalStatusMutation.mutate({ testId, isExternal });
        }
    };

    const handleExternalLabSubmit = () => {
        if (!externalLabName.trim()) {
            toast.error('Please enter the external lab name');
            return;
        }
        if (selectedTestId) {
            markAsExternalMutation.mutate({ testId: selectedTestId, labName: externalLabName });
        }
    };

    const handleCompleteTest = () => {
        if (selectedTestForCompletion) {
            const allTests = labOrders?.flatMap((order: any) => order.appointmentLabTests) || [];
            const test = allTests.find((t: any) => t.id === selectedTestForCompletion.id);
            if (!test) return;

            // Check if parameters are complete and at least one document is uploaded
            if (!parametersComplete) {
                toast.error('Please complete all test parameters before marking as complete');
                return;
            }

            if (uploadedFiles.length === 0) {
                toast.error('Please upload at least one document before completing the test');
                return;
            }

            updateTestStatusMutation.mutate({
                testId: selectedTestForCompletion.id,
                status: LabTestStatus.COMPLETED,
                tentativeReportDate: test.tentativeReportDate
            });
            setIsParametersDialogOpen(false);
            setSelectedTestForCompletion(null);
            setUploadedFiles([]);
            setParametersComplete(false);
        }
    };

    const handleViewParameters = (testId: string, labTestId: string) => {
        const allTests = labOrders?.flatMap((order: any) => order.appointmentLabTests) || [];
        const test = allTests.find((t: any) => t.id === testId);
        setSelectedTestForView({ id: testId, labTestId, testName: test?.labTest?.name });
        setIsViewParametersDialogOpen(true);
    };

    const handleParametersDialogClose = () => {
        setIsParametersDialogOpen(false);
        setSelectedTestForCompletion(null);
        setUploadedFiles([]);
        setParametersComplete(false);
    };

    // Filter lab orders based on search and status
    const filteredLabOrders = labOrders?.filter((order: any) => {
        if (!order.appointmentLabTests || order.appointmentLabTests.length === 0) return false;

        // Apply filter based on test type
        let relevantTests = order.appointmentLabTests;
        if (filter === "FromDoctor") {
            relevantTests = order.appointmentLabTests.filter((test: any) => !test.referredFromOutside);
        } else if (filter === "FromReceptionist") {
            relevantTests = order.appointmentLabTests.filter((test: any) => test.referredFromOutside);
        }

        if (relevantTests.length === 0) return false;

        // Apply status filter
        if (statusFilter !== 'all') {
            relevantTests = relevantTests.filter((test: any) => test.status === statusFilter);
            if (relevantTests.length === 0) return false;
        }

        // Apply search filter
        if (searchQuery && searchQuery.trim()) {
            const searchLower = searchQuery.toLowerCase();
            const patientMatch = order.patient?.name?.toLowerCase().includes(searchLower) ||
                order.patient?.phone?.toLowerCase().includes(searchLower);
            const testMatch = relevantTests.some((test: any) =>
                test.labTest?.name?.toLowerCase().includes(searchLower) ||
                test.status?.toLowerCase().includes(searchLower)
            );

            if (!patientMatch && !testMatch) return false;
        }

        // Update the order to only include relevant tests
        order.filteredTests = relevantTests;
        return true;
    }) || [];

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-gray-900">{filter === "FromDoctor" ? "Tests From Doctors" : "Tests From Receptionist"}</h1>
            </div>

            <div className="flex gap-4 mb-6">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                        type="text"
                        placeholder="Search by patient name, test name, or status..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Tests</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="PROCESSING">Processing</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="SENT_EXTERNAL">External</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-6">
                {filteredLabOrders.length > 0 ? (
                    filteredLabOrders.map((labOrder: any) => (
                        <div key={labOrder.id} className="bg-white rounded-lg shadow border border-gray-200">
                            {/* Lab Order Header */}
                            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            {labOrder.patient?.name}
                                        </h3>
                                        <div className="flex items-center gap-4 text-sm text-gray-600">
                                            <span>📞 {labOrder.patient?.phone || 'N/A'}</span>
                                            <span>🆔 {labOrder.patient?.patientUniqueId || 'N/A'}</span>
                                            <span>📅 {new Date(labOrder.createdAt).toLocaleDateString()}</span>
                                            <span>🏷️ Order: {labOrder.id}</span>
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {labOrder.filteredTests?.length || 0} test{(labOrder.filteredTests?.length || 0) !== 1 ? 's' : ''}
                                    </div>
                                </div>
                            </div>

                            {/* Tests Table */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tentative Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">External</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {labOrder.filteredTests?.map((test: any) => (
                                            <tr key={test?.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">{test?.labTest?.name}</div>
                                                    <div className="text-sm text-gray-500">{test?.labTest?.sampleType || 'N/A'}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${test?.status === 'COMPLETED'
                                                        ? 'bg-green-100 text-green-800'
                                                        : test?.status === 'PROCESSING'
                                                            ? 'bg-blue-100 text-blue-800'
                                                            : test?.status === 'SENT_EXTERNAL'
                                                                ? 'bg-purple-100 text-purple-800'
                                                                : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                        {test?.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {test?.tentativeReportDate
                                                        ? new Date(test?.tentativeReportDate).toLocaleDateString()
                                                        : (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleEditClick(test?.id)}
                                                                className="text-blue-600 hover:text-blue-700"
                                                                disabled={test?.status === 'COMPLETED' || test?.status === 'PENDING'}
                                                            >
                                                                Set Date
                                                            </Button>
                                                        )
                                                    }
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <select
                                                        value={test?.isSentExternal ? 'yes' : 'no'}
                                                        onChange={(e) => handleExternalChange(test?.id, e.target.value)}
                                                        className="text-sm border border-gray-300 rounded px-2 py-1"
                                                        disabled={test?.status === 'COMPLETED' || test?.status === 'PENDING'}
                                                    >
                                                        <option value="no">Internal</option>
                                                        <option value="yes">External</option>
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <div className="flex gap-2">
                                                        {test?.status === 'PENDING' && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleStatusUpdate(test?.id)}
                                                                disabled={updateTestStatusMutation.isPending || test?.status === 'PENDING'}
                                                            >
                                                                Start Processing
                                                            </Button>
                                                        )}
                                                        {(test?.status === 'PROCESSING' || test?.status==='SENT_EXTERNAL') && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleStatusUpdate(test?.id)}
                                                                disabled={updateTestStatusMutation.isPending}
                                                            >
                                                                Complete Test
                                                            </Button>
                                                        )}
                                                        {test?.status === 'COMPLETED' && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleViewParameters(test?.id, test?.labTestId)}
                                                            >
                                                                View Report
                                                            </Button>
                                                        )}
                                                        {test?.tentativeReportDate && test?.status !== 'COMPLETED' && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleEditClick(test?.id)}
                                                                className="text-gray-600"
                                                            >
                                                                Edit Date
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12">
                        <div className="text-gray-500">No lab orders found matching your criteria</div>
                    </div>
                )}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Tentative Report Date</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            type="date"
                            value={editingTestId ? tentativeDates[editingTestId]?.date || '' : ''}
                            onChange={(e) => editingTestId && handleTentativeDateChange(editingTestId, e.target.value, tentativeDates[editingTestId]?.status || 'PENDING')}
                            className="w-full"
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={handleDialogClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => editingTestId && handleTentativeDateSubmit(editingTestId)}
                            disabled={updateTentativeDateMutation.isPending}
                        >
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isExternalLabDialogOpen} onOpenChange={setIsExternalLabDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Enter External Lab Details</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder="Enter external lab name"
                            value={externalLabName}
                            onChange={(e) => setExternalLabName(e.target.value)}
                            className="w-full"
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsExternalLabDialogOpen(false);
                                setExternalLabName('');
                                setSelectedTestId(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleExternalLabSubmit}
                            disabled={markAsExternalMutation.isPending}
                        >
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isParametersDialogOpen} onOpenChange={setIsParametersDialogOpen}>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Complete Test - Enter Parameters & Upload Documents</DialogTitle>
                    </DialogHeader>
                    {selectedTestForCompletion && (
                        <div className="space-y-6">
                            {/* Test Information */}
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                                    Test: {labOrders?.flatMap((order: any) => order.appointmentLabTests)
                                        .find((t: any) => t?.id === selectedTestForCompletion?.id)?.labTest?.name}
                                </h3>
                                <p className="text-sm text-blue-700">
                                    Please enter all test parameter values and upload the lab report documents to complete this test.
                                </p>
                            </div>

                            {/* Test Parameters Section */}
                            <div className="border rounded-lg p-4">
                                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                    📊 Test Parameters
                                </h3>
                                <TestParameters
                                    testId={selectedTestForCompletion?.labTestId}
                                    appointmentLabTestId={selectedTestForCompletion?.id}
                                    canEdit={true}
                                    onParametersComplete={setParametersComplete}
                                />
                                {!parametersComplete && (
                                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 mt-3">
                                        <p className="text-sm text-amber-700">
                                            ⚠️ Please enter values for all parameters above to complete the test.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Document Upload Section */}
                            <div className="border rounded-lg p-4">
                                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    Upload Lab Report Documents
                                </h3>

                                <div className="space-y-3">
                                    {/* Upload Button */}
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="file"
                                            id="document-upload"
                                            className="hidden"
                                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                            onChange={handleFileUpload}
                                            disabled={isUploading}
                                        />
                                        <label
                                            htmlFor="document-upload"
                                            className="cursor-pointer"
                                        >
                                            <Button
                                                type="button"
                                                variant="outline"
                                                disabled={isUploading}
                                                asChild
                                            >
                                                <span className="flex items-center gap-2">
                                                    <Upload className="w-4 h-4" />
                                                    {isUploading ? 'Uploading...' : 'Upload Document'}
                                                </span>
                                            </Button>
                                        </label>
                                        <span className="text-sm text-gray-500">
                                            Support: PDF, DOC, DOCX, JPG, PNG
                                        </span>
                                    </div>

                                    {/* Uploaded Files List */}
                                    {uploadedFiles.length > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="text-sm font-medium">Uploaded Documents:</h4>
                                            {uploadedFiles.map((file) => (
                                                <div
                                                    key={file.id}
                                                    className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="w-4 h-4 text-blue-500" />
                                                        <span className="text-sm">{file.name}</span>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRemoveFile(file.id)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Upload Requirement Note */}
                                    {uploadedFiles.length === 0 && (
                                        <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                                            <p className="text-sm text-amber-700">
                                                ⚠️ Please upload at least one document to complete the test.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Completion Status */}
                            {parametersComplete && uploadedFiles.length > 0 && (
                                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                    <p className="text-sm text-green-700">
                                        ✅ All requirements met. You can now complete the test.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={handleParametersDialogClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCompleteTest}
                            disabled={!parametersComplete || uploadedFiles.length === 0}
                        >
                            Complete Test
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isViewParametersDialogOpen} onOpenChange={setIsViewParametersDialogOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Test Result</DialogTitle>
                    </DialogHeader>
                    {selectedTestForView && (
                        <ViewTestResult
                            appointmentLabTestId={selectedTestForView.id}
                            testName={selectedTestForView.testName}
                        />
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsViewParametersDialogOpen(false);
                                setSelectedTestForView(null);
                            }}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
} 