import { useQuery, useMutation } from '@tanstack/react-query';
import React, { useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom';
import { Patient } from './interfaces/PatinetInterface'
import PatientBasicDetails from './PatientBasicDetails';
import PrescriptionSection from './PrescriptionSection';
import FollowUpSection from './FollowUpSection';
import Notes from './Notes';
import Diagnosis from './Diagnosis';
import DiagnosisView from './DiagnosisRecord';
import { api } from '@/lib/api';
import { labApi } from '@/api/lab';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import ViewDiagnosisRecordButton from './viewDiagnosisRecord';
import { AppointmentStatus } from '@/types/types';
import { Surgery } from '@/components/patient/types';
import { LabTestStatus } from '@/types/types';
import { CheckCircle, ArrowLeft, Clock, FileText, User, Stethoscope, Calendar, Save } from 'lucide-react';

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
    tests: []
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


    // State management
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [diagnosisText, setDiagnosisText] = useState('');
    const [notesText, setNotesText] = useState('');
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
            const response = await api.post('/api/appointment/book', {
                patientId,
                doctorId,
                visitType: 'FOLLOW_UP',
                scheduledAt: followUpData.followUpDateTime,
                status: AppointmentStatus.PENDING
            });
            console.log("response", response);
            toast.success('Follow-up appointment scheduled');
            return response.data.data.id;
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
            scheduledAt: followUpData.surgeryDate ? new Date(followUpData.surgeryDate).toISOString() : undefined,
            status: followUpData.surgicalStatus,
            description: followUpData.surgicalDescription || 'No description provided'
        };

        const response = await api.post('/api/appointment/add-surgery', surgeryData);

        if (response.data.data.success) {
            toast.success('Surgery appointment scheduled');
            return response.data.data.id;
        }

        throw new Error(response.data.message || 'Failed to schedule surgery');
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

            console.log("updatedData", updatedData);
            return api.post(`/api/diagnosis/add-diagnosis?appointmentId=${appointmentId}`, updatedData);
        },
        onSuccess: async () => {
            await updateAppointmentStatus();
            setIsSubmitted(true);
            toast.success('Diagnosis record added successfully');
        },
        onError: (error: any) => {
            console.error('Error creating diagnosis record:', error);
            toast.error(error.response?.data?.message || error.message || 'Failed to create diagnosis record');
        }
    });

    // Patient data query
    const { data: patient, isLoading: isPatientLoading } = useQuery<Patient>({
        queryKey: ['patient-details', patientId],
        queryFn: async () => {
            const response = await api.get(`/api/patient/get/${patientId}`);
            return response.data.data;
        },
        enabled: !!patientId,
    });

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
        if (!prescriptionData.medicines.length) {
            toast.error('At least one medicine is required');
            return false;
        }
        return true;
    }, [appointmentId, diagnosisText, prescriptionData.medicines]);

    // Form submission
    const handleSubmit = useCallback(() => {
        if (!validateForm()) return;

        const diagnosisData: DiagnosisFormData = {
            diagnosis: diagnosisText,
            notes: notesText || null,
            medicines: prescriptionData.medicines,
            labTests: prescriptionData.tests.map(test => ({ id: test.id })),
            followUpAppointmentId: followUpData.followUpAppointmentId,
            appointmentId
        };
        console.log("diagnosisData", diagnosisData);

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
    if (isPatientLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    <p className="text-gray-600">Loading patient information...</p>
                </div>
            </div>
        );
    }

    // Success state
    if (isSubmitted) {
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
                {patient && (
                    <div className="mb-8">
                        <PatientBasicDetails patient={patient} />
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

                            {/* Notes Section */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                                    <div className="w-8 h-8 bg-amber-50 rounded-full flex items-center justify-center">
                                        <FileText className="w-4 h-4 text-amber-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900">Clinical Notes</h3>
                                        <p className="text-sm text-gray-500">Additional observations and remarks</p>
                                    </div>
                                </div>
                                <div className="pl-11">
                                    <Notes
                                        value={notesText}
                                        onChange={setNotesText}
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
