import { ipdApi } from "@/api/ipd";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useState, useRef } from "react";
import { Search, Upload, FileText, X, Eye, TestTube } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function IPDLabTestManager() {
    const queryClient = useQueryClient();
    const [selectedTest, setSelectedTest] = useState<any | null>(null);
    const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [uploadedFiles, setUploadedFiles] = useState<Array<{ id: string; name: string; url: string; file?: File }>>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [resultData, setResultData] = useState({
        resultValue: '',
        resultUnit: '',
        normalRange: '',
        abnormalFlag: false,
        resultNotes: '',
    });

    const { data: ipdLabTests, isLoading, error } = useQuery<any>({
        queryKey: ['ipd-lab-tests', statusFilter],
        queryFn: async () => {
            console.log('Fetching IPD lab tests with status filter:', statusFilter);
            const response = await ipdApi.getIPDLabTestsByHospital({ status: statusFilter !== 'all' ? statusFilter : undefined });
            console.log('IPD lab tests response:', response.data);
            return response.data?.data || [];
        },
    });

    if (error) {
        console.error('Error fetching IPD lab tests:', error);
    }

    const updateTestStatusMutation = useMutation({
        mutationFn: async ({ testId, status }: { testId: string; status: string }) => {
            const response = await ipdApi.updateIPDLabTest(testId, { status });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ipd-lab-tests'] });
            toast.success('Test status updated successfully');
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.message || error.message || 'Failed to update test status';
            toast.error(errorMessage);
            console.error('Error updating test status:', error);
        },
    });

    const updateTestResultMutation = useMutation({
        mutationFn: async ({ testId, data }: { testId: string; data: any }) => {
            const userId = localStorage.getItem('userId');
            const response = await ipdApi.updateIPDLabTest(testId, {
                ...data,
                resultDate: new Date().toISOString(),
                completedAt: new Date().toISOString(),
                status: 'COMPLETED',
                performedById: userId || undefined,
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ipd-lab-tests'] });
            toast.success('Test result saved successfully');
            setIsResultDialogOpen(false);
            setSelectedTest(null);
            setResultData({
                resultValue: '',
                resultUnit: '',
                normalRange: '',
                abnormalFlag: false,
                resultNotes: '',
            });
            setUploadedFiles([]);
            setIsUploading(false);
        },
        onError: (error) => {
            toast.error('Failed to save test result');
            console.error('Error saving test result:', error);
        },
    });

    const uploadAttachmentMutation = useMutation({
        mutationFn: async ({ file, labTestId }: { file: File; labTestId: string }) => {
            console.log('Uploading attachment for lab test:', labTestId, 'File:', file.name);
            const response = await ipdApi.uploadIPDLabTestAttachment(labTestId, file);
            console.log('Upload response:', response);
            return response.data;
        },
        onSuccess: (data) => {
            const attachment = data.data;
            // Update the file in state to mark it as uploaded (remove the File object)
            setUploadedFiles(prev => prev.map(f => 
                f.name === attachment.fileName && f.file 
                    ? { id: attachment.id, name: attachment.fileName || 'Unknown', url: attachment.fileUrl }
                    : f
            ));
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data?.message || error.message || 'Failed to upload document';
            toast.error(errorMessage);
            console.error('Error uploading document:', error);
            console.error('Error response:', error.response?.data);
        },
    });

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !selectedTest) return;

        // Add file to local state only (not uploaded yet)
        const tempId = `temp-${Date.now()}-${Math.random()}`;
        setUploadedFiles(prev => [...prev, {
            id: tempId,
            name: file.name,
            url: '',
            file: file
        }]);
        
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleRemoveFile = (fileId: string) => {
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    };

    const handleStatusUpdate = (test: any) => {
        if (test.status === 'ORDERED') {
            updateTestStatusMutation.mutate({
                testId: test.id,
                status: 'IN_PROGRESS'
            });
        } else if (test.status === 'IN_PROGRESS' || test.status === 'SCHEDULED') {
            setSelectedTest(test);
            setResultData({
                resultValue: test.resultValue || '',
                resultUnit: test.resultUnit || '',
                normalRange: test.normalRange || '',
                abnormalFlag: test.abnormalFlag || false,
                resultNotes: test.resultNotes || '',
            });
            setUploadedFiles(test.attachments?.map((att: any) => ({
                id: att.id,
                name: att.fileName,
                url: att.fileUrl
            })) || []);
            setIsResultDialogOpen(true);
        }
    };

    const handleSubmitResult = async () => {
        if (!selectedTest) return;

        if (!resultData.resultValue.trim()) {
            toast.error('Result value is required');
            return;
        }

        // Upload all files that haven't been uploaded yet (have a File object)
        const filesToUpload = uploadedFiles.filter(f => f.file);
        
        if (filesToUpload.length > 0) {
            setIsUploading(true);
            try {
                // Upload all files in parallel
                await Promise.all(
                    filesToUpload.map(fileEntry => 
                        uploadAttachmentMutation.mutateAsync({ 
                            file: fileEntry.file!, 
                            labTestId: selectedTest.id 
                        })
                    )
                );
                setIsUploading(false);
            } catch (error) {
                setIsUploading(false);
                toast.error('Failed to upload some documents');
                console.error('Error uploading documents:', error);
                return; // Don't proceed with saving test results if file uploads fail
            }
        }

        // Now save the test results
        updateTestResultMutation.mutate({
            testId: selectedTest.id,
            data: resultData
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ORDERED': return 'bg-yellow-100 text-yellow-800';
            case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
            case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
            case 'COMPLETED': return 'bg-green-100 text-green-800';
            case 'CANCELLED': return 'bg-red-100 text-red-800';
            case 'FAILED': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'URGENT': return 'bg-red-100 text-red-800';
            case 'STAT': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // Filter tests based on search
    const filteredTests = ipdLabTests?.filter((test: any) => {
        if (!searchQuery.trim()) return true;
        const searchLower = searchQuery.toLowerCase();
        return (
            test.testName?.toLowerCase().includes(searchLower) ||
            test.admission?.queue?.patient?.name?.toLowerCase().includes(searchLower) ||
            test.admission?.queue?.patient?.uhid?.toLowerCase().includes(searchLower) ||
            test.status?.toLowerCase().includes(searchLower)
        );
    }) || [];

    if (isLoading) {
        return (
            <div className="p-6">
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-500 mt-2">Loading IPD lab tests...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                    <TestTube className="h-6 w-6 text-blue-600" />
                    IPD Lab Tests
                </h1>
            </div>

            <div className="flex gap-4 mb-6">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                        type="text"
                        placeholder="Search by patient name, test name, or UHID..."
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
                        <SelectItem value="ORDERED">Ordered</SelectItem>
                        <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        <SelectItem value="FAILED">Failed</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {filteredTests.length === 0 ? (
                <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center">
                    <TestTube className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No IPD lab tests found</h3>
                    <p className="text-gray-500">There are no IPD lab tests matching your criteria.</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Patient Name</TableHead>
                                <TableHead>UHID</TableHead>
                                <TableHead>Test Name</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Ordered Date</TableHead>
                                <TableHead>Doctor</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTests.map((test: any) => (
                                <TableRow key={test.id}>
                                    <TableCell className="font-medium">
                                        {test.admission?.queue?.patient?.name || 'N/A'}
                                    </TableCell>
                                    <TableCell>{test.admission?.queue?.patient?.uhid || 'N/A'}</TableCell>
                                    <TableCell className="font-medium">{test.testName}</TableCell>
                                    <TableCell>
                                        <Badge className={getPriorityColor(test.priority)}>
                                            {test.priority}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={getStatusColor(test.status)}>
                                            {test.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {new Date(test.orderedAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        {test.orderedBy?.name || 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        {test.status === 'ORDERED' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleStatusUpdate(test)}
                                            >
                                                Start Processing
                                            </Button>
                                        )}
                                        {(test.status === 'IN_PROGRESS' || test.status === 'SCHEDULED') && (
                                            <Button
                                                size="sm"
                                                onClick={() => handleStatusUpdate(test)}
                                            >
                                                Enter Results
                                            </Button>
                                        )}
                                        {test.status === 'COMPLETED' && test.resultValue && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                    setSelectedTest(test);
                                                    setIsResultDialogOpen(true);
                                                    setResultData({
                                                        resultValue: test.resultValue || '',
                                                        resultUnit: test.resultUnit || '',
                                                        normalRange: test.normalRange || '',
                                                        abnormalFlag: test.abnormalFlag || false,
                                                        resultNotes: test.resultNotes || '',
                                                    });
                                                    setUploadedFiles(test.attachments?.map((att: any) => ({
                                                        id: att.id,
                                                        name: att.fileName,
                                                        url: att.fileUrl
                                                    })) || []);
                                                }}
                                            >
                                                <Eye className="h-4 w-4 mr-1" />
                                                View Results
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Result Entry Dialog */}
            <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Enter Test Results - {selectedTest?.testName}</DialogTitle>
                    </DialogHeader>
                    {selectedTest && (
                        <div className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="font-medium text-gray-700">Patient:</span>
                                        <span className="ml-2 text-gray-900">{selectedTest.admission?.queue?.patient?.name}</span>
                                    </div>
                                    <div>
                                        <span className="font-medium text-gray-700">UHID:</span>
                                        <span className="ml-2 text-gray-900">{selectedTest.admission?.queue?.patient?.uhid}</span>
                                    </div>
                                    <div>
                                        <span className="font-medium text-gray-700">Test Name:</span>
                                        <span className="ml-2 text-gray-900">{selectedTest.testName}</span>
                                    </div>
                                    <div>
                                        <span className="font-medium text-gray-700">Priority:</span>
                                        <Badge className={getPriorityColor(selectedTest.priority)}>
                                            {selectedTest.priority}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="resultValue">Result Value *</Label>
                                    <Input
                                        id="resultValue"
                                        value={resultData.resultValue}
                                        onChange={(e) => setResultData(prev => ({ ...prev, resultValue: e.target.value }))}
                                        placeholder="Enter result value"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="resultUnit">Result Unit</Label>
                                    <Input
                                        id="resultUnit"
                                        value={resultData.resultUnit}
                                        onChange={(e) => setResultData(prev => ({ ...prev, resultUnit: e.target.value }))}
                                        placeholder="e.g., mg/dL, %"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="normalRange">Normal Range</Label>
                                    <Input
                                        id="normalRange"
                                        value={resultData.normalRange}
                                        onChange={(e) => setResultData(prev => ({ ...prev, normalRange: e.target.value }))}
                                        placeholder="e.g., 70-100"
                                    />
                                </div>
                                <div className="flex items-center gap-4 pt-6">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="abnormalFlag"
                                            checked={resultData.abnormalFlag}
                                            onChange={(e) => setResultData(prev => ({ ...prev, abnormalFlag: e.target.checked }))}
                                            className="rounded"
                                        />
                                        <Label htmlFor="abnormalFlag" className="font-normal cursor-pointer">
                                            Abnormal Result
                                        </Label>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="resultNotes">Result Notes</Label>
                                <Textarea
                                    id="resultNotes"
                                    value={resultData.resultNotes}
                                    onChange={(e) => setResultData(prev => ({ ...prev, resultNotes: e.target.value }))}
                                    placeholder="Additional notes or observations"
                                    rows={3}
                                />
                            </div>

                            {/* File Upload Section */}
                            <div>
                                <Label>Upload Reports/Documents</Label>
                                <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-4">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="w-full"
                                    >
                                        <Upload className="h-4 w-4 mr-2" />
                                        {isUploading ? 'Uploading...' : 'Select File'}
                                    </Button>
                                    {uploadedFiles.length > 0 && (
                                        <div className="mt-4 space-y-2">
                                            {uploadedFiles.map((file) => (
                                                <div key={file.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="h-4 w-4 text-gray-500" />
                                                        <span className="text-sm text-gray-700">{file.name}</span>
                                                        {file.file && (
                                                            <Badge variant="outline" className="text-xs">
                                                                Pending Upload
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {file.url && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => window.open(file.url, '_blank')}
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleRemoveFile(file.id)}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {uploadedFiles.length > 0 && uploadedFiles.some(f => f.file) && (
                                        <p className="mt-2 text-xs text-gray-500">
                                            Files will be uploaded when you click "Save & Complete Test"
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsResultDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmitResult}>
                            Save & Complete Test
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

