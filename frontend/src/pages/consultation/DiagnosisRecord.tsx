import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { useParams, useNavigate } from 'react-router-dom';
import { labApi } from '@/api/lab';
import { Button } from "@/components/ui/button";
import { Eye, ArrowLeft, Clock, CheckCircle, AlertCircle, Download, FileText, ExternalLink, Handshake } from "lucide-react";
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
console.log('diagnosisRecord', diagnosisRecord);
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
                    .bg-gradient-to-r {
                        background: white !important;
                        -webkit-print-color-adjust: exact;
                    }
                    .shadow-lg {
                        box-shadow: none !important;
                    }
                    .bg-gray-50, .bg-gray-100 {
                        background-color: white !important;
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
                    {/* Hospital Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-3">
                                    <img src="/True-Hospital-Logo(White).png" className='h-16' />
                                </div>
                            </div>
                            <div className="text-right text-sm">
                                <p className="text-blue-100">{hospital?.address}</p>
                                <p className="text-white font-medium">{hospital?.contactNumber}</p>
                            </div>
                        </div>
                    </div>

                    {/* Patient Information Section */}
                    <div className="p-6 border-b border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <div className="flex">
                                    <span className="font-medium text-gray-700 w-32">Patient Name:</span>
                                    <span className="text-gray-900">{diagnosisRecord.appointment?.patient?.name}</span>
                                </div>
                                <div className="flex">
                                    <span className="font-medium text-gray-700 w-32">Phone:</span>
                                    <span className="text-gray-900">{diagnosisRecord.appointment?.patient?.phone}</span>
                                </div>
                                <div className="flex">
                                    <span className="font-medium text-gray-700 w-32">Patient ID:</span>
                                    <span className="text-gray-900">{diagnosisRecord.appointment?.patient?.patientUniqueId}</span>
                                </div>
                                <div className="flex">
                                    <span className="font-medium text-gray-700 w-32">Gender:</span>
                                    <span className="text-gray-900">{diagnosisRecord.appointment?.patient?.gender}</span>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex">
                                    <span className="font-medium text-gray-700 w-40">Registration Mode:</span>
                                    <span className="text-gray-900">{diagnosisRecord.appointment?.patient?.registrationMode || 'OPD'}</span>
                                </div>
                                <div className="flex">
                                    <span className="font-medium text-gray-700 w-40">Registration Source:</span>
                                    <span className="text-gray-900">{diagnosisRecord.appointment?.patient?.registrationSource || 'WALK_IN'}</span>
                                </div>
                                <div className="flex">
                                    <span className="font-medium text-gray-700 w-40">Status:</span>
                                    <span className="text-gray-900">{diagnosisRecord.appointment?.patient?.status || 'ACTIVE'}</span>
                                </div>
                                <div className="flex">
                                    <span className="font-medium text-gray-700 w-40">Age:</span>
                                    <span className="text-gray-900">
                                        {diagnosisRecord.appointment?.patient?.dob ? `${calculateAge(diagnosisRecord.appointment.patient.dob)} years` : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Primary Diagnosis Section */}
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Primary Diagnosis</h2>
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-gray-800 whitespace-pre-wrap">{diagnosisRecord.diagnosis}</p>
                        </div>
                    </div>

                    {/* Medical History Section */}
                    {(diagnosisRecord.appointment?.patient?.allergies ||
                        diagnosisRecord.appointment?.patient?.chronicDiseases ||
                        diagnosisRecord.appointment?.patient?.preExistingConditions) && (
                            <div className="p-6 border-b border-gray-200">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Medical History</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {diagnosisRecord.appointment?.patient?.allergies && (
                                        <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                                            <h4 className="font-medium text-red-900 mb-2">Allergies</h4>
                                            <p className="text-sm text-red-700">{diagnosisRecord.appointment.patient.allergies}</p>
                                        </div>
                                    )}
                                    {diagnosisRecord.appointment?.patient?.chronicDiseases && (
                                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                                            <h4 className="font-medium text-orange-900 mb-2">Chronic Diseases</h4>
                                            <p className="text-sm text-orange-700">{diagnosisRecord.appointment.patient.chronicDiseases}</p>
                                        </div>
                                    )}
                                    {diagnosisRecord.appointment?.patient?.preExistingConditions && (
                                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                                            <h4 className="font-medium text-yellow-900 mb-2">Pre-existing Conditions</h4>
                                            <p className="text-sm text-yellow-700">{diagnosisRecord.appointment.patient.preExistingConditions}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                    {/* Prescribed Medicines Section */}
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Prescribed Medicines</h2>
                        {diagnosisRecord.medicines.length > 0 ? (
                            <div className="bg-gray-50 rounded-lg overflow-hidden">
                                <table className="min-w-full">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">S.No</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Medicine Name</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Frequency</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Duration in Days</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {diagnosisRecord.medicines.map((medicine: any, index: number) => (
                                            <tr key={index} className="bg-white">
                                                <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900 font-medium">{medicine.name}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600">{medicine.frequency}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600">{medicine.duration}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-gray-500 bg-gray-50 p-4 rounded-lg">No medicines prescribed</p>
                        )}
                    </div>

                    {/* Lab Tests Section */}
                    {labTests && labTests.length > 0 && (
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Lab Tests</h2>
                            <div className="bg-gray-50 rounded-lg overflow-hidden">
                                <table className="min-w-full">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Test Name</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Report Date</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {labTests.map((test: any, index: number) => (
                                            <tr key={index} className="bg-white hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm text-gray-900">{test.labTest.name}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(test.status)}`}>
                                                        {test.status === 'COMPLETED' && <CheckCircle className="w-3 h-3 mr-1" />}
                                                        {test.status === 'PROCESSING' && <Clock className="w-3 h-3 mr-1 animate-spin" />}
                                                        {test.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                    {test.tentativeReportDate ? format(new Date(test.tentativeReportDate), 'dd MMM yyyy') : 'Not Updated'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {test.status === 'COMPLETED' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="flex items-center"
                                                            onClick={() => handleViewTestResult(test.id, test.labTest.name)}
                                                        >
                                                            <Eye className="h-4 w-4 mr-1" />
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

                    {/* Follow-up Appointments Section */}
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex">
                            <span className="font-medium text-gray-700 w-32">FollowUps:</span>
                            <span className="text-gray-900">
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
                    </div>

                    {/* Surgical Information Section */}
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex">
                            <span className="font-medium text-gray-700 w-32">Surgical Status:</span>
                            <span className="text-gray-900">
                                {surgicalInfo && surgicalInfo.length > 0 && surgicalInfo[0].status !== 'NOT_REQUIRED'
                                    ? surgicalInfo.map((surgery: any, index: number) => (
                                        `${surgery.category} - ${surgery.status === 'CONFIRMED' ? 'Confirmed' : 'Pending'}${surgery.scheduledAt ? ` (${format(new Date(surgery.scheduledAt), 'dd MMM yyyy')})` : ''}`
                                    )).join(', ')
                                    : 'Non-Surgical Treatment'
                                }
                            </span>
                        </div>
                    </div>

                    {/* Notes Section */}
                    {diagnosisRecord.notes && (
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Clinical Notes</h2>
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-gray-800 whitespace-pre-wrap">{diagnosisRecord.notes}</p>
                            </div>
                        </div>
                    )}

                    {/* Footer Section */}
                    <div className="p-6 bg-gray-50">
                        <div className="flex justify-between items-end">
                            <div className="text-sm text-gray-600">
                                <p>Created on: {format(new Date(diagnosisRecord.createdAt), 'dd MMMM yyyy, hh:mm a')}</p>
                                <p className="mt-1">Doctor: {diagnosisRecord.appointment?.doctor?.name || 'Dr. Smith'}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-gray-600 mb-2">Authorized Sign</div>
                                <div className="w-32 h-16 border-b-2 border-gray-300"></div>
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