import { Button } from '@/components/ui/button';
import { BasicInformation } from '@/components/patient/BasicInformation';
import { ContactInformation } from '@/components/patient/ContactInformation';
import { MedicalInformation } from '@/components/patient/MedicalInformation';
import { DocumentsList } from '@/components/patient/DocumentsList';
import { FamilyLinks } from '@/components/patient/FamilyLinks';
import { usePatientForm } from '@/components/patient/usePatientForm';

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
                    <p className='font-bold text-2xl'>Patient Details</p>
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

