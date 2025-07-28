import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BasicInformation } from '@/components/patient/BasicInformation';
import { ContactInformation } from '@/components/patient/ContactInformation';
import { MedicalInformation } from '@/components/patient/MedicalInformation';
import { DocumentsList } from '@/components/patient/DocumentsList';
import { FamilyLinks } from '@/components/patient/FamilyLinks';
import { usePatientForm } from '@/components/patient/usePatientForm';
import { useQuery } from '@tanstack/react-query';
import { patientApi } from '@/api/patient';

export default function PatientDetails({ patientId }: { patientId: string }) {

    const {
        formData,
        isEditing,
        setIsEditing,
        handleInputChange,
        handleSelectChange,
        handleSubmit,
        isLoading,
        error
    } = usePatientForm(patientId);

    console.log("Patient ID in PatientDetails:", patientId);
    const { data: documents, isError, error: documentsError } = useQuery({
        queryKey: ['documents', patientId],
        queryFn: async () => {
            if (!patientId) return [];
            try {
                const response = await patientApi.getDocuments(patientId);
                console.log("Documents from API:", response);
                return Array.isArray(response) ? response : [];
            } catch (error) {
                console.error("Error fetching documents:", error);
                throw error;
            }
        },
        enabled: Boolean(patientId),
        initialData: []
    });

    console.log("Documents in component:", documents);
    if (documentsError) console.error("Documents error:", documentsError);


    const backendBaseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg">Loading patient details...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg text-red-500">Error loading patient details. Please try again later.</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-semibold">Patient Details</h1>
                </div>
                {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)}>Edit Details</Button>
                ) : (
                    <div className="space-x-2">
                        <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                        <Button onClick={handleSubmit}>Save Updates</Button>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <BasicInformation
                    formData={formData}
                    isEditing={isEditing}
                    onInputChange={handleInputChange}
                    onSelectChange={handleSelectChange}
                />

                <ContactInformation
                    formData={formData}
                    isEditing={isEditing}
                    onInputChange={handleInputChange}
                    onSelectChange={handleSelectChange}
                />

                <MedicalInformation
                    formData={formData}
                    isEditing={isEditing}
                    onInputChange={handleInputChange}
                    onSelectChange={handleSelectChange}
                />

                <DocumentsList
                    documents={documents || []}
                    backendBaseUrl={backendBaseUrl}
                    patientId={patientId}
                />

                <FamilyLinks
                    patientId={patientId}
                />
            </form>
        </div>
    );
}

