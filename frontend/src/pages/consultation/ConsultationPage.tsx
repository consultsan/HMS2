import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate, Await } from 'react-router-dom';
import { Patient } from './interfaces/PatinetInterface'
import PatientBasicDetails from './PatientBasicDetails';
import PrescriptionSection from './PrescriptionSection';
import FollowUpSection from './FollowUpSection';
import Diagnosis from './Diagnosis';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import ViewDiagnosisRecordButton from './viewDiagnosisRecord';
import { AppointmentStatus, Slot, VisitType, SurgicalStatus } from '@/types/types';
import { CheckCircle, ArrowLeft, Clock, FileText, Stethoscope, Calendar, Save } from 'lucide-react';
import { doctorApi } from '@/api/doctor';
import { appointmentApi } from '@/api/appointment';
import { notificationApi } from '@/api/notification';


interface DiagnosisFormData {
    diagnosis: string;
    notes: string | null;
    medicines: { name: string; frequency: string; duration: string }[];
    labTests: { id: string }[];
    appointmentId: string;
    followUpAppointmentId?: string;
}

interface PrescriptionData {
    medicines: { name: string; frequency: string; duration: string }[];
    tests: { name: string; id: string }[];
    clinicalNotes: { note: string; category?: string }[];
}

type FollowUpData = {
    surgicalStatus: 'NOT_CONFIRMED' | 'CONFIRMED' | 'NOT_REQUIRED';
    followUpAppointmentId?: string;
    followUpDateTime?: string;
    surgicalCategory?: string;
    surgicalDescription?: string;
    surgeryDate?: string;
};

const initialPrescriptionData: PrescriptionData = {
    medicines: [],
    tests: [],
    clinicalNotes: []
};

const initialFollowUpData: FollowUpData = {
    surgicalStatus: 'NOT_REQUIRED',
    followUpAppointmentId: undefined,
    followUpDateTime: undefined,
    surgicalCategory: undefined,
    surgicalDescription: undefined,
    surgeryDate: undefined
};

function ConsultationPage() {
    const { patientId, appointmentId } = useParams() as { patientId: string; appointmentId: string };
    const { user } = useAuth();
    const doctorId = user?.id || '';
    const doctorDept = user?.specialisation || '';
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // State management
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [diagnosisText, setDiagnosisText] = useState('');
    const [notesText] = useState('');
    const [prescriptionData, setPrescriptionData] = useState<PrescriptionData>(initialPrescriptionData);
    const [followUpData, setFollowUpData] = useState<FollowUpData>(initialFollowUpData);
    const [surgicalStatus, setSurgicalStatus] = useState<'NOT_CONFIRMED' | 'CONFIRMED' | 'NOT_REQUIRED'>('NOT_REQUIRED');

    // API mutations
    const updateAppointmentStatus = useCallback(async () => {
        try {
            await api.patch(`/api/appointment/update-status/${appointmentId}`, {
                status: AppointmentStatus.DIAGNOSED
            });
            toast.success('Appointment marked as diagnosed');
        } catch (error: any) {
            console.error('Error updating appointment status:', error);
            toast.error(error.response?.data?.message || 'Failed to update appointment status');
            throw error;
        }
    }, [appointmentId]);

    const createFollowUpAppointment = useCallback(async () => {
        if (!followUpData.followUpDateTime) return null;

        try {
            // First check for existing slots at this time
            const appointmentDate = new Date(followUpData.followUpDateTime);
            const startDate = new Date(appointmentDate);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(appointmentDate);
            endDate.setHours(23, 59, 59, 999);

            const slotsResponse = await doctorApi.getSlots(doctorId, {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            });

            // Find slot that matches the exact time
            const existingSlot = slotsResponse.find((slot: Slot) => {
                const slotTime = new Date(slot.timeSlot);
                return slotTime.getTime() === appointmentDate.getTime();
            });

            // Create the appointment first
            const response = await appointmentApi.bookAppointment({
                patientId,
                doctorId,
                visitType: VisitType.FOLLOW_UP,
                scheduledAt: new Date(followUpData.followUpDateTime),
                status: AppointmentStatus.PENDING
            });

            const appointmentId = response.data.data.id;

            // Handle slot booking logic same as AddAppointment
            if (existingSlot && existingSlot.appointment1Id && !existingSlot.appointment2Id) {
                // Slot is partially booked, update with second appointment
                await doctorApi.updateSlot(existingSlot.id, {
                    appointment2Id: appointmentId,
                    timeSlot: new Date(followUpData.followUpDateTime)
                });
            } else {
                // No existing slot or slot is full, create new slot
                await doctorApi.addSlot(doctorId, {
                    appointment1Id: appointmentId,
                    timeSlot: new Date(followUpData.followUpDateTime)
                });
            }

            toast.success('Follow-up appointment scheduled');
            return appointmentId;
        } catch (error: any) {
            console.error('Error creating follow-up appointment:', error);
            toast.error(error.response?.data?.message || 'Failed to schedule follow-up appointment');
            return null;
        }
    }, [patientId, doctorId, followUpData.followUpDateTime]);

    const createSurgeryAppointment = useCallback(async () => {
        if (!followUpData.surgicalCategory) {
            throw new Error('Surgery category is required');
        }

        const surgeryData = {
            appointmentId,
            category: followUpData.surgicalCategory,
            scheduledAt: followUpData.surgeryDate ? new Date(followUpData.surgeryDate) : undefined,
            status: followUpData.surgicalStatus as SurgicalStatus,
            description: followUpData.surgicalDescription || 'No description provided'
        };

        const response = await appointmentApi.addSurgery(surgeryData);

        // If we get here without an exception, the surgery was created successfully
        if (response.data) {
            toast.success('Surgery appointment scheduled');
            return response.data.id || response.data.data?.id;
        }

        throw new Error('Failed to schedule surgery');
    }, [appointmentId, followUpData]);

    const diagnosisMutation = useMutation({
        mutationFn: async (data: DiagnosisFormData) => {
            let followUpAppointmentId = null;

            if (followUpData.followUpDateTime) {
                followUpAppointmentId = await createFollowUpAppointment();
            }

            if (surgicalStatus === 'NOT_CONFIRMED' || surgicalStatus === 'CONFIRMED') {
                try {
                    await createSurgeryAppointment();
                } catch (error: any) {
                    console.error('Surgery creation failed:', error);
                    toast.error('Failed to create surgery appointment, but proceeding with diagnosis');
                }
            }

            // Update the data with the actual followUpAppointmentId
            const updatedData = {
                ...data,
                followUpAppointmentId: followUpAppointmentId
            };

            const diagnosisResponse = await api.post(`/api/diagnosis/add-diagnosis?appointmentId=${appointmentId}`, updatedData);

            // After creating diagnosis and lab test orders, add lab tests to bill
            return diagnosisResponse;
        },
        onSuccess: async () => {
            await updateAppointmentStatus();
            // Invalidate the diagnosis-record query for this appointment
            await queryClient.invalidateQueries({ queryKey: ['diagnosis-record', appointmentId] });
            setIsSubmitted(true);
            toast.success('Diagnosis record added successfully');
        },
        onError: (error: any) => {
            console.error('Error creating diagnosis record:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to create diagnosis record';

            // Handle specific error cases
            if (error.response?.data?.message?.includes('Unique constraint failed')) {
                toast.error('Diagnosis record already exists for this appointment');
            } else if (error.response?.data?.message?.includes('Foreign key constraint')) {
                toast.error('Some lab tests are not available. Please check and try again.');
            } else {
                toast.error(errorMessage);
            }
        }
    });

    // Patient data query


    // Check if diagnosis already exists
    const getDiagnosis = async () => {
        try {
            const response = await api.get(`/api/diagnosis/get-by-appointment/${appointmentId}`);
            return response.data.data;
        } catch (error: any) {
            return null;
        }
    }
    const [existingDiagnosis, setExistingDiagnosis] = useState<any>(null);
    const [isDiagnosisLoading, setIsDiagnosisLoading] = useState(true);

    useEffect(() => {
        const fetchDiagnosis = async () => {
            setIsDiagnosisLoading(true);
            const diagnosis = await getDiagnosis();
            setExistingDiagnosis(diagnosis);
            setIsDiagnosisLoading(false);
        }
        fetchDiagnosis();
    }, [appointmentId]);


    // Form validation
    const validateForm = useCallback(() => {
        if (!appointmentId) {
            toast.error('No appointment ID provided');
            return false;
        }
        if (!diagnosisText.trim()) {
            toast.error('Diagnosis is required');
            return false;
        }

        else if (!diagnosisText.trim() && !prescriptionData.medicines.length && !prescriptionData.tests.length) {
            toast.error('Fill in at least one diagnosis or prescription');
            return false;
        }

        return true;
    }, [appointmentId, diagnosisText, prescriptionData.medicines]);

    // Form submission
    const handleSubmit = useCallback(() => {
        if (!validateForm()) return;

        // Combine clinical notes from templates into a single notes string
        const combinedNotes = prescriptionData.clinicalNotes
            .map(note => note.category ? `${note.category}: ${note.note}` : note.note)
            .join('\n');

        const diagnosisData: DiagnosisFormData = {
            diagnosis: diagnosisText,
            notes: combinedNotes || notesText || null,
            medicines: prescriptionData.medicines,
            labTests: prescriptionData.tests.map(test => ({ id: test.id })),
            followUpAppointmentId: followUpData.followUpAppointmentId,
            appointmentId
        };

        diagnosisMutation.mutate(diagnosisData);
    }, [validateForm, diagnosisText, notesText, prescriptionData, appointmentId, diagnosisMutation]);

    const handleGoBack = useCallback(() => {
        navigate('/doctor/appointments');
    }, [navigate]);

    const handleFollowUpChange = useCallback((data: FollowUpData) => {
        setSurgicalStatus(data.surgicalStatus);
        setFollowUpData(data);
    }, []);

    // Loading state


    // Check if diagnosis already exists
    if (existingDiagnosis) {
        return (
            <div className="min-h-[60vh] bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full border border-blue-100">
                    <div className="mb-6">
                        <div className="mx-auto w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-4">
                            <FileText className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-blue-800 mb-2">Diagnosis Already Exists</h2>
                        <p className="text-blue-600">A diagnosis record has already been created for this appointment</p>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={handleGoBack}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors font-medium"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Appointments
                        </button>
                        <ViewDiagnosisRecordButton appointmentId={appointmentId} />
                    </div>
                </div>
            </div>
        );
    }

    // Success state
    if (isSubmitted) {
        const sendNotification = async () => {
            try {
                await notificationApi.sendDiagnosisRecord(diagnosisMutation.data?.data?.id);
                toast.success('Notification sent successfully');
            } catch (error: any) {
                console.error('Error sending notification:', error);
                toast.error(error.response?.data?.message || 'Failed to send notification');
            }
        };
        useEffect(() => {
            sendNotification();
        }, [diagnosisMutation.data]);

        return (
            <div className="min-h-[60vh] bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full border border-green-100">
                    <div className="mb-6">
                        <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-green-800 mb-2">Consultation Complete!</h2>
                        <p className="text-green-600">Diagnosis record has been successfully saved</p>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={handleGoBack}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors font-medium"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Appointments
                        </button>
                        <ViewDiagnosisRecordButton appointmentId={appointmentId} />
                    </div>
                </div>
            </div>
        );
    }

    // Main consultation form
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
                <div className="w-full px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleGoBack}
                                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                <span className="font-medium">Back</span>
                            </button>
                            <div className="h-6 w-px bg-gray-300"></div>
                            <div className="flex items-center gap-2">
                                <Stethoscope className="w-6 h-6 text-blue-600" />
                                <h1 className="text-xl font-semibold text-gray-900">Patient Consultation</h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Clock className="w-4 h-4" />
                                <span>{new Date().toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full px-6 py-8">
                {/* Patient Information */}
                {patientId && (
                    <div className="mb-8">
                        <PatientBasicDetails patientId={patientId} />
                    </div>
                )}

                {/* Consultation Form */}
                {!isSubmitted && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="p-8 space-y-12">
                            {/* Diagnosis Section */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                                    <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                                        <FileText className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900">Primary Diagnosis</h3>
                                        <p className="text-sm text-gray-500">Patient's primary condition and assessment</p>
                                    </div>
                                </div>
                                <div className="pl-11">
                                    <Diagnosis
                                        value={diagnosisText}
                                        onChange={setDiagnosisText}
                                    />
                                </div>
                            </div>

                            {/* Prescription Section */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                                    <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center">
                                        <FileText className="w-4 h-4 text-green-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900">Prescription & Lab Tests</h3>
                                        <p className="text-sm text-gray-500">Medications and diagnostic tests</p>
                                    </div>
                                </div>
                                <div className="pl-11">
                                    <PrescriptionSection
                                        onPrescriptionChange={setPrescriptionData}
                                    />
                                </div>
                            </div>

                            {/* Follow-up Section */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                                    <div className="w-8 h-8 bg-purple-50 rounded-full flex items-center justify-center">
                                        <Calendar className="w-4 h-4 text-purple-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900">Follow-up & Surgery Planning</h3>
                                        <p className="text-sm text-gray-500">Schedule follow-up appointments and surgical procedures</p>
                                    </div>
                                </div>
                                <div className="pl-11">
                                    <FollowUpSection
                                        doctorId={doctorId || ''}
                                        doctorDept={doctorDept || ''}
                                        onFollowUpChange={handleFollowUpChange}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Submit Section */}
                        <div className="border-t border-gray-100 p-6 bg-gray-50/50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-medium text-gray-900">Complete Consultation</h3>
                                    <p className="text-sm text-gray-500 mt-1">Review all sections before saving</p>
                                </div>
                                <button
                                    onClick={handleSubmit}
                                    disabled={diagnosisMutation.isPending}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                >
                                    {diagnosisMutation.isPending ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            Save Consultation
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ConsultationPage;
