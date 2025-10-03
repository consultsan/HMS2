import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { FlaskConical, Clock, Send } from "lucide-react";
import { labApi } from "@/api/lab";
import ViewTestResult from "@/pages/lab/ViewTestResult";
import { formatDate } from "@/utils/dateUtils";
import { notificationApi } from "@/api/notification";
import { toast } from "sonner";

export default function ViewAppointmentLabtests({ 
    appointmentId, 
    labTestsData 
}: { 
    appointmentId?: string;
    labTestsData?: any[];
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedLabTestId, setSelectedLabTestId] = useState<string>("");
    const [isResultOpen, setIsResultOpen] = useState(false);
    const [sendingReport, setSendingReport] = useState(false);

    const { data: labTests, isLoading, isError } = useQuery({
        queryKey: ["appointment-lab-tests", appointmentId],
        queryFn: async () => {
            if (labTestsData) {
                return labTestsData;
            }
            const response = await labApi.getOrderedTestsByAppointment(appointmentId!);
            return response.data?.data || [];
        },
        enabled: !!appointmentId || !!labTestsData,
        initialData: labTestsData,
    });

    const handleViewResult = (testId: string) => {
        setSelectedLabTestId(testId);
        setIsResultOpen(true);
    };

    const handleSendLabReport = async (testId: string) => {
        try {
            setSendingReport(true);
            await notificationApi.sendLabReport(testId);
            toast.success("Lab report sent successfully");
            setSendingReport(false);


        } catch (error) {
            console.error("Failed to send lab report:", error);
            alert("Failed to send lab report. Please try again.");
        }
    };

    return (
        <>
            <Button onClick={() => setIsOpen(true)} className="bg-transparent hover:bg-gray-100 rounded-full shadow-none border-none">
                <FlaskConical className="w-4 h-4 text-black" />
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                            Lab Tests
                        </DialogTitle>
                    </DialogHeader>
                    {isLoading && (
                        <div className="flex items-center justify-center py-8 text-gray-500">
                            <Clock className="animate-spin mr-2" /> Loading lab tests...
                        </div>
                    )}
                    {isError && (
                        <div className="text-red-500 py-4">Failed to load lab tests.</div>
                    )}
                    {labTests && labTests.length === 0 && !isLoading && (
                        <div className="text-gray-500 py-4">No lab tests found for this appointment.</div>
                    )}
                    {labTests && labTests.length > 0 && (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {labTests.map((test: any) => (
                                    <tr key={test.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{test.labTest.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${test.status === 'COMPLETED'
                                                ? 'bg-green-100 text-green-800'
                                                : test.status === 'PROCESSING'
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : test.status === 'SENT_EXTERNAL'
                                                        ? 'bg-purple-100 text-purple-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {test.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <div className="flex gap-2">
                                                {test.status === 'COMPLETED' && (
                                                    <div className="flex gap-2">

                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleViewResult(test.id)}
                                                        >
                                                            View Report
                                                        </Button>
                                                        <Button variant="outline" size="sm" disabled={sendingReport} onClick={() => handleSendLabReport(test.id)}>
                                                            <Send className="w-4 h-" />
                                                        </Button>
                                                    </div>
                                                )}
                                                {test.status !== 'COMPLETED' && (
                                                    <div>{formatDate(test?.tentativeReportDate)}</div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </DialogContent>
            </Dialog>
            <Dialog open={isResultOpen} onOpenChange={setIsResultOpen}>
                <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                    <ViewTestResult
                        appointmentLabTestId={selectedLabTestId}
                        testName={labTests?.find((test: any) => test.id === selectedLabTestId)?.labTest?.name}
                    />
                </DialogContent>
            </Dialog>

        </>
    );
} 