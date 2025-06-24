import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Patient, PatientFormData } from './types';
import { formatDateDMY, parseDateDMY } from './utils';

export function usePatientForm(patientId: string) {
    const [isEditing, setIsEditing] = useState(false);
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState<PatientFormData>({
        id: '',
        patientUniqueId: '',
        name: '',
        dob: '',
        gender: '',
        phone: '',
        registrationMode: 'OPD',
        registrationSource: 'WALK_IN',
        status: '',
        hospitalId: '',
        maritalStatus: '',
        email: '',
        address: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        allergy: '',
        bloodGroup: '',
        preExistingCondition: '',
        chronicDisease: '',
        documents: [],
        relativesAdded: [],
        relativeOfOthers: [],
    });

    // Fetch patient details
    const { data: patient, isLoading, error } = useQuery<Patient>({
        queryKey: ['patient', patientId],
        queryFn: async () => {
            const response = await api.get(`/api/patient/get/${patientId}`);
            console.log(response.data?.data)
            return response.data?.data;
        },

    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: async (data: PatientFormData) => {
            const { documents, hospitalId, relativesAdded, relativeOfOthers, ...rest } = data;
            const payload = {
                ...rest,
                dob: parseDateDMY(data.dob),
            };
            const response = await api.patch(`/api/patient/update/${patientId}`, payload);
            return response.data?.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
            setIsEditing(false);
            toast.success('Patient details updated successfully');
        },
        onError: (error: any) => {
            if (error.response?.status === 403) {
                toast.error('You are not authorized to update patient details');
            } else {
                toast.error(error.response?.data?.message || 'Failed to update patient details');
            }
            setIsEditing(false);
        },
    });

    useEffect(() => {
        if (patient) {
            setFormData({
                ...patient,
                dob: formatDateDMY(patient.dob),
                documents: (patient.documents || []).map(doc => ({
                    id: doc.id || '',
                    type: doc.type || '',
                    url: doc.url || ''
                })),
                relativesAdded: patient.relativesAdded || [],
                relativeOfOthers: patient.relativeOfOthers || []
            });
        }
    }, [patient]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: string, value: string | any[]) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateMutation.mutate(formData);
    };

    return {
        formData,
        isEditing,
        setIsEditing,
        handleInputChange,
        handleSelectChange,
        handleSubmit,
        isLoading,
        error
    };
} 