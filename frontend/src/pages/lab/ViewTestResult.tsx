import { useQuery } from '@tanstack/react-query';
import { labApi } from '@/api/lab';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, ExternalLink, Clock, AlertCircle } from "lucide-react";

interface ViewTestResultProps {
    appointmentLabTestId: string;
    testName?: string;
}

export default function ViewTestResult({ appointmentLabTestId, testName }: ViewTestResultProps) {
    // Fetch test results (parameters with values)
    const { data: testResults, isLoading: resultsLoading } = useQuery<any>({
        queryKey: ['test-results', appointmentLabTestId],
        queryFn: async () => {
            const response = await labApi.getResultsByOrder(appointmentLabTestId);
            return response.data?.data;
        },
        enabled: !!appointmentLabTestId,
    });

    // Fetch attached documents
    const { data: attachments, isLoading: attachmentsLoading } = useQuery<any>({
        queryKey: ['lab-test-attachments', appointmentLabTestId],
        queryFn: async () => {
            const response = await labApi.getLabTestAttachments(appointmentLabTestId);
            return response.data?.data;
        },
        enabled: !!appointmentLabTestId,
    });

    const handleOpenAttachment = (url: string) => {
        window.open(url, '_blank');
    };

    const getStatusColor = (value: number, lowerLimit?: number, upperLimit?: number) => {
        if (lowerLimit !== undefined && value < lowerLimit) return 'text-blue-500';
        if (upperLimit !== undefined && value > upperLimit) return 'text-red-500';
        return 'text-green-500';
    };

    const getStatusText = (value: number, lowerLimit?: number, upperLimit?: number) => {
        if (lowerLimit !== undefined && value < lowerLimit) return 'LOW';
        if (upperLimit !== undefined && value > upperLimit) return 'HIGH';
        return 'NORMAL';
    };

    if (resultsLoading || attachmentsLoading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-center py-8">
                    <Clock className="h-6 w-6 animate-spin text-blue-600 mr-2" />
                    <span className="text-gray-600">Loading test results...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {testName && (
                <div className="border-b pb-2">
                    <h2 className="text-xl font-semibold text-gray-900">{testName}</h2>
                </div>
            )}

            {/* Test Parameters and Results */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <span>Test Parameters & Results</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {testResults && testResults.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Parameter Name</TableHead>
                                        <TableHead>Value</TableHead>
                                        <TableHead>Unit</TableHead>
                                        <TableHead>Reference Range</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Notes</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {testResults.map((result: any) => {
                                        const parameter = result.parameter;
                                        const status = getStatusText(result.value, parameter?.lowerLimit, parameter?.upperLimit);
                                        const statusColor = getStatusColor(result.value, parameter?.lowerLimit, parameter?.upperLimit);

                                        return (
                                            <TableRow key={result.id}>
                                                <TableCell className="font-medium">{parameter?.name || 'Unknown Parameter'}</TableCell>
                                                <TableCell className="font-semibold">{result.value}</TableCell>
                                                <TableCell>{result.unitOverride || parameter?.unit || 'N/A'}</TableCell>
                                                <TableCell>
                                                    {parameter?.lowerLimit !== undefined && parameter?.upperLimit !== undefined
                                                        ? `${parameter.lowerLimit} - ${parameter.upperLimit}`
                                                        : parameter?.lowerLimit !== undefined
                                                            ? `> ${parameter.lowerLimit}`
                                                            : parameter?.upperLimit !== undefined
                                                                ? `< ${parameter.upperLimit}`
                                                                : 'N/A'
                                                    }
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`font-medium ${statusColor}`}>
                                                        {status}
                                                    </span>
                                                </TableCell>
                                                <TableCell>{result.notes || '-'}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">No test results found</p>
                            <p className="text-sm text-gray-400">Test parameters may not have been completed yet</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Attached Documents */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        <span>Lab Report Documents</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {attachments && attachments.length > 0 ? (
                        <div className="space-y-2">
                            {attachments.map((attachment: any, index: number) => (
                                <Button
                                    key={attachment.id || index}
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-start text-left"
                                    onClick={() => handleOpenAttachment(attachment.url)}
                                >
                                    <FileText className="h-4 w-4 mr-2" />
                                    <span className="flex-1 text-left">
                                        {attachment.name || `Document ${index + 1}`}
                                    </span>
                                    <ExternalLink className="h-3 w-3 ml-2" />
                                </Button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">No lab report documents found</p>
                            <p className="text-sm text-gray-400">Documents may not have been uploaded yet</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
} 