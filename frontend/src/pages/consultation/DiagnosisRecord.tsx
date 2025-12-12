import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { useParams, useNavigate } from 'react-router-dom';
import { labApi } from '@/api/lab';
import { Button } from "@/components/ui/button";
import { Eye, ArrowLeft, Clock, CheckCircle, AlertCircle, Download, FileText } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import ViewTestResult from "../lab/ViewTestResult";
import { useState } from "react";
import { toast } from "sonner";
import { appointmentApi } from '@/api/appointment';
import { calculateAge } from '@/utils/dateUtils';
import { hospitalApi } from '@/api/hospital';
import { Hospital } from '@/types/types';

function DiagnosisRecord() {
    const { appointmentId } = useParams();
    const navigate = useNavigate();
    const [selectedTestForView, setSelectedTestForView] = useState<{ id: string, name: string } | null>(null);
    const [isViewTestResultDialogOpen, setIsViewTestResultDialogOpen] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Fetch diagnosis record using useQuery
    const { data: diagnosisRecord, isLoading } = useQuery<any>({
        queryKey: ['diagnosis-record', appointmentId],
        queryFn: async () => {
            if (!appointmentId) throw new Error('Appointment ID is required');
            const response = await api.get(`/api/diagnosis/get-by-appointment/${appointmentId}`);
            return response.data.data;
        },
        enabled: !!appointmentId,
    });

    const { data: labTests } = useQuery<any>({
        queryKey: ['lab-tests', appointmentId],
        queryFn: async () => {
            if (!appointmentId) throw new Error('Appointment ID is required');
            const response = await labApi.getOrderedTestsByAppointment(appointmentId);
            return response.data?.data;
        },
    });

    // Fetch surgical information
    const { data: surgicalInfo } = useQuery<any>({
        queryKey: ['surgical-info', appointmentId],
        queryFn: async () => {
            if (!appointmentId) throw new Error('Appointment ID is required');
            const response = await appointmentApi.getSurgeryByAppointmentId(appointmentId);
            return response.data?.data;
        },
        enabled: !!appointmentId,
    });

    // Fetch hospital information
    const { data: hospital, isLoading: isHospitalLoading } = useQuery<Hospital>({
        queryKey: ['hospital', diagnosisRecord?.appointment?.hospitalId],
        queryFn: async () => {
            if (!diagnosisRecord?.appointment?.hospitalId) {
                throw new Error('Hospital ID is required');
            }
            const response = await hospitalApi.getHospitalById(diagnosisRecord.appointment.hospitalId);
            return response;
        },
        enabled: !!diagnosisRecord?.appointment?.hospitalId,
    });

    const handlePrint = async () => {
        if (!appointmentId) return;

        try {
            const response = await api.get(`/api/diagnosis/get-html/${appointmentId}`, {
                responseType: 'text'
            });

            // Create a new window for printing
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                toast.error('Please allow popups to print');
                return;
            }

            // Write the HTML content to the new window
            printWindow.document.write(response.data);
            printWindow.document.close();

            // Wait for all images to load before printing
            printWindow.onload = function () {
                printWindow.focus();
                printWindow.print();
                // Close the window after printing (optional)
                printWindow.onafterprint = function () {
                    printWindow.close();
                };
            };
        } catch (error) {
            console.error('Error getting print template:', error);
            toast.error('Failed to prepare document for printing');
        }
    };
    
    const handleDownloadPDF = async () => {
        if (!appointmentId) return;

        setIsDownloading(true);
        try {
            const response = await api.get(`/api/diagnosis/download-pdf/${appointmentId}`, {
                responseType: 'blob'
            });

            // Create a blob from the PDF Stream
            const file = new Blob([response.data], { type: 'application/pdf' });

            // Create a link element and trigger download
            const fileURL = URL.createObjectURL(file);
            const link = document.createElement('a');
            link.href = fileURL;
            link.download = `diagnosis-record-${appointmentId}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(fileURL);

            toast.success('PDF downloaded successfully');
        } catch (error) {
            console.error('Error downloading PDF:', error);
            toast.error('Failed to download PDF');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleViewTestResult = (testId: string, testName: string) => {
        setSelectedTestForView({ id: testId, name: testName });
        setIsViewTestResultDialogOpen(true);
    };

    if (isLoading || isHospitalLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Clock className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading diagnosis record...</p>
                </div>
            </div>
        );
    }

    if (!diagnosisRecord) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-4" />
                    <p className="text-gray-600">No diagnosis record found for this appointment.</p>
                    <Button
                        onClick={() => navigate(-1)}
                        variant="outline"
                        className="mt-4"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Go Back
                    </Button>
                </div>
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        const colors = {
            PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
            PROCESSING: 'bg-blue-50 text-blue-700 border-blue-200',
            COMPLETED: 'bg-green-50 text-green-700 border-green-200',
            default: 'bg-gray-50 text-gray-700 border-gray-200'
        };
        return colors[status as keyof typeof colors] || colors.default;
    };


    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
                {/* Header with Back Button and Download Button */}
                <div className="flex items-center justify-between mb-8 print:hidden">
                    <div className="flex items-center gap-4">
                        <Button
                            onClick={() => navigate(-1)}
                            variant="outline"
                            className="flex items-center text-gray-600 hover:text-gray-900"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={handleDownloadPDF}
                                variant="outline"
                                className="flex items-center text-blue-600 hover:text-blue-700"
                                disabled={isDownloading}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                {isDownloading ? 'Downloading...' : 'Download PDF'}
                            </Button>
                            <Button
                                onClick={handlePrint}
                                variant="outline"
                                className="flex items-center text-green-600 hover:text-green-700 print:hidden"
                                title="Print using the formatted template"
                            >
                                <FileText className="h-4 w-4 mr-2" />
                                Print Record
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Print Styles */}
                <style type="text/css" media="print">{`
                    @page {
                        margin: 0;
                        size: A4;
                    }
                    body {
                        margin: 1.6cm;
                    }
                    .print:hidden {
                        display: none !important;
                    }
                    nav, footer, .no-print {
                        display: none !important;
                    }
                    .bg-gradient-to-tr {
                        background: linear-gradient(to top right, #1e3a8a, #60a5fa) !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .shadow-lg {
                        box-shadow: none !important;
                    }
                    table {
                        break-inside: auto !important;
                    }
                    tr {
                        break-inside: avoid !important;
                        break-after: auto !important;
                    }
                    thead {
                        display: table-header-group;
                    }
                    tfoot {
                        display: table-footer-group;
                    }
                `}</style>

                {/* Medical Record Document */}
                <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                    {/* Hospital Header - Matching Bill Template */}
                    <div className="bg-gradient-to-tr from-blue-900 to-blue-400 text-white rounded-t-lg p-2">
                        <div className="flex justify-between items-center">
                            {/* Logo */}
                            <div>
                                <img 
                                    src="/Logo11.jpeg" 
                                    alt="Hospital Logo" 
                                    className="h-16 object-contain" 
                                />
                            </div>

                            {/* Hospital Info */}
                            <div className="text-right text-sm leading-tight">
                                {hospital?.name && (
                                    <div className="text-2xl font-bold mb-1">{hospital.name}</div>
                                )}
                                {hospital?.address && (
                                    <div className="text-gray-200 text-xs">{hospital.address}</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Patient Information Section - Matching Bill Template */}
                    <div className="break-inside-avoid mb-3 p-3">
                        <h2 className="text-lg font-semibold text-gray-800 mb-1 border-b pb-0.5">
                            Patient Information
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50 p-2 rounded-md border">
                            <div>
                                <p className="mb-0.5">
                                    <span className="text-gray-600">Patient Name:</span> {diagnosisRecord.appointment?.patient?.name}
                                </p>
                                <p className="mb-0.5">
                                    <span className="text-gray-600">Patient ID:</span> {diagnosisRecord.appointment?.patient?.uhid}
                                </p>
                                <p className="mb-0.5">
                                    <span className="text-gray-600">Phone:</span> {diagnosisRecord.appointment?.patient?.phone}
                                </p>
                                <p className="mb-0.5">
                                    <span className="text-gray-600">Gender:</span> {diagnosisRecord.appointment?.patient?.gender}
                                </p>
                            </div>
                            <div>
                                <p className="mb-0.5">
                                    <span className="text-gray-600">Age:</span> {diagnosisRecord.appointment?.patient?.dob ? `${calculateAge(diagnosisRecord.appointment.patient.dob)} years` : 'N/A'}
                                </p>
                                <p className="mb-0.5">
                                    <span className="text-gray-600">Registration Mode:</span> {diagnosisRecord.appointment?.patient?.registrationMode || 'OPD'}
                                </p>
                                <p className="mb-0.5">
                                    <span className="text-gray-600">Registration Source:</span> {diagnosisRecord.appointment?.patient?.registrationSource || 'WALK_IN'}
                                </p>
                                <p className="mb-0.5">
                                    <span className="text-gray-600">Status:</span> {diagnosisRecord.appointment?.patient?.status || 'ACTIVE'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Primary Diagnosis Section */}
                    <div className="break-inside-avoid mb-3 px-3">
                        <h2 className="text-lg font-semibold text-gray-800 mb-1 border-b pb-0.5">Primary Diagnosis</h2>
                        <div className="bg-gray-50 p-2 rounded-md border">
                            <p className="text-gray-800 text-sm whitespace-pre-wrap">{diagnosisRecord.diagnosis}</p>
                        </div>
                    </div>

                    {/* Medical History Section */}
                    {(diagnosisRecord.appointment?.patient?.allergy ||
                        diagnosisRecord.appointment?.patient?.chronicDisease ||
                        diagnosisRecord.appointment?.patient?.preExistingCondition) && (
                            <div className="break-inside-avoid mb-3 px-3">
                                <h2 className="text-lg font-semibold text-gray-800 mb-1 border-b pb-0.5">Medical History</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    {diagnosisRecord.appointment?.patient?.allergy && (
                                        <div className="bg-red-50 p-2 rounded-md border border-red-100">
                                            <h4 className="font-medium text-red-900 text-sm mb-1">Allergies</h4>
                                            <p className="text-xs text-red-700">{diagnosisRecord.appointment.patient.allergy}</p>
                                        </div>
                                    )}
                                    {diagnosisRecord.appointment?.patient?.chronicDisease && (
                                        <div className="bg-orange-50 p-2 rounded-md border border-orange-100">
                                            <h4 className="font-medium text-orange-900 text-sm mb-1">Chronic Diseases</h4>
                                            <p className="text-xs text-orange-700">{diagnosisRecord.appointment.patient.chronicDisease}</p>
                                        </div>
                                    )}
                                    {diagnosisRecord.appointment?.patient?.preExistingCondition && (
                                        <div className="bg-yellow-50 p-2 rounded-md border border-yellow-100">
                                            <h4 className="font-medium text-yellow-900 text-sm mb-1">Pre-existing Conditions</h4>
                                            <p className="text-xs text-yellow-700">{diagnosisRecord.appointment.patient.preExistingCondition}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                    {/* Prescribed Medicines Section - Matching Bill Template Table Style */}
                    <div className="break-inside-avoid mb-3 px-3">
                        <h2 className="text-lg font-semibold text-gray-800 mb-1 border-b pb-0.5">Prescribed Medicines</h2>
                        {diagnosisRecord.medicines.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full border border-gray-200">
                                    <thead>
                                        <tr className="bg-gray-100 text-sm text-gray-700">
                                            <th className="py-0.5 px-2 text-left">S.No</th>
                                            <th className="py-0.5 px-2 text-left">Medicine Name</th>
                                            <th className="py-0.5 px-2 text-left">Frequency</th>
                                            <th className="py-0.5 px-2 text-left">Duration (Days)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {diagnosisRecord.medicines.map((medicine: any, index: number) => (
                                            <tr key={index} className="even:bg-white odd:bg-gray-50 border-t border-gray-200">
                                                <td className="py-0.5 px-2 text-sm">{index + 1}</td>
                                                <td className="py-0.5 px-2 text-sm font-medium">{medicine.name}</td>
                                                <td className="py-0.5 px-2 text-sm">{medicine.frequency}</td>
                                                <td className="py-0.5 px-2 text-sm">{medicine.duration}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center p-2 italic text-sm bg-gray-50 rounded-md">No medicines prescribed</p>
                        )}
                    </div>

                    {/* Lab Tests Section - Matching Bill Template Table Style */}
                    {labTests && labTests.length > 0 && (
                        <div className="break-inside-avoid mb-3 px-3">
                            <h2 className="text-lg font-semibold text-gray-800 mb-1 border-b pb-0.5">Lab Tests</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full border border-gray-200">
                                    <thead>
                                        <tr className="bg-gray-100 text-sm text-gray-700">
                                            <th className="py-0.5 px-2 text-left">Test Name</th>
                                            <th className="py-0.5 px-2 text-left">Status</th>
                                            <th className="py-0.5 px-2 text-left">Report Date</th>
                                            <th className="py-0.5 px-2 text-left print:hidden">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {labTests.map((test: any, index: number) => (
                                            <tr key={index} className="even:bg-white odd:bg-gray-50 border-t border-gray-200">
                                                <td className="py-0.5 px-2 text-sm">{test.labTest.name}</td>
                                                <td className="py-0.5 px-2">
                                                    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full ${getStatusColor(test.status)}`}>
                                                        {test.status === 'COMPLETED' && <CheckCircle className="w-3 h-3 mr-1" />}
                                                        {test.status === 'PROCESSING' && <Clock className="w-3 h-3 mr-1 animate-spin" />}
                                                        {test.status}
                                                    </span>
                                                </td>
                                                <td className="py-0.5 px-2 text-sm">
                                                    {test.tentativeReportDate ? format(new Date(test.tentativeReportDate), 'dd MMM yyyy') : 'Not Updated'}
                                                </td>
                                                <td className="py-0.5 px-2 print:hidden">
                                                    {test.status === 'COMPLETED' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="flex items-center text-xs h-6"
                                                            onClick={() => handleViewTestResult(test.id, test.labTest.name)}
                                                        >
                                                            <Eye className="h-3 w-3 mr-1" />
                                                            View
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Follow-up and Surgical Information - Compact Style */}
                    <div className="break-inside-avoid mb-3 px-3">
                        <h2 className="text-lg font-semibold text-gray-800 mb-1 border-b pb-0.5">Follow-up & Surgical Information</h2>
                        <div className="bg-gray-50 rounded-md p-2 border">
                            <div className="flex mb-0.5">
                                <span className="font-medium text-gray-600 text-sm w-32">Follow-ups:</span>
                                <span className="text-gray-900 text-sm">
                                    {diagnosisRecord.followUpAppointment
                                        ? new Date(diagnosisRecord.followUpAppointment.scheduledAt)
                                            .toLocaleString('en-IN', {
                                                day: '2-digit',
                                                month: 'long',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: true,
                                                timeZone: 'UTC',
                                            })
                                        : 'No Follow-Up Required'
                                    }
                                </span>
                            </div>
                            <div className="flex">
                                <span className="font-medium text-gray-600 text-sm w-32">Surgical Status:</span>
                                <span className="text-gray-900 text-sm">
                                    {surgicalInfo && surgicalInfo.length > 0 && surgicalInfo[0].status !== 'NOT_REQUIRED'
                                        ? surgicalInfo.map((surgery: any) => (
                                            `${surgery.category} - ${surgery.status === 'CONFIRMED' ? 'Confirmed' : 'Pending'}${surgery.scheduledAt ? ` (${format(new Date(surgery.scheduledAt), 'dd MMM yyyy')})` : ''}`
                                        )).join(', ')
                                        : 'Non-Surgical Treatment'
                                    }
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Notes Section - Matching Bill Template */}
                    {diagnosisRecord.notes && (
                        <div className="break-inside-avoid mb-3 px-3">
                            <h2 className="text-lg font-semibold text-gray-800 mb-1 border-b pb-0.5">Clinical Notes</h2>
                            <div className="bg-yellow-50 p-2 border-l-4 border-yellow-400 rounded-md text-gray-700 text-sm">
                                {diagnosisRecord.notes}
                            </div>
                        </div>
                    )}

                    {/* Footer Section - Matching Bill Template */}
                    <div className="footer pt-2 border-t mt-2 text-xs text-gray-500 px-3 pb-3">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-2">
                            <div>
                                <div>Created on: {format(new Date(diagnosisRecord.createdAt), 'dd MMMM yyyy, hh:mm a')}</div>
                                <div>Hospital: {hospital?.name}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-gray-700">Authorized Signature</div>
                                <div className="border-b border-gray-400 w-36 mt-1 ml-auto"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* View Test Result Dialog */}
                <Dialog open={isViewTestResultDialogOpen} onOpenChange={setIsViewTestResultDialogOpen}>
                    <DialogContent className="max-w-4xl">
                        <DialogHeader>
                            <DialogTitle>Test Result</DialogTitle>
                        </DialogHeader>
                        {selectedTestForView && (
                            <ViewTestResult
                                appointmentLabTestId={selectedTestForView.id}
                                testName={selectedTestForView.name}
                            />
                        )}
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsViewTestResultDialogOpen(false);
                                    setSelectedTestForView(null);
                                }}
                            >
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}

export default DiagnosisRecord;