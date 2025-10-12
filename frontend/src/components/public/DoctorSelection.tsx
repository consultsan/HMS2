import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, User, Stethoscope } from 'lucide-react';
import { publicAppointmentApi, Doctor } from '@/api/publicAppointment';

interface DoctorSelectionProps {
  hospitalId: string;
  hospitalName: string;
  onNext: (doctorId: string, doctorName: string, doctorSpecialization: string) => void;
  onBack: () => void;
}

const DoctorSelection: React.FC<DoctorSelectionProps> = ({ 
  hospitalId, 
  hospitalName, 
  onNext, 
  onBack 
}) => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchDoctors();
  }, [hospitalId]);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const response = await publicAppointmentApi.getDoctorsByHospital(hospitalId);
      setDoctors(response.data.data.doctors);
    } catch (err: any) {
      console.error('Error fetching doctors:', err);
      setError('Failed to load doctors. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDoctorId) {
      const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);
      if (selectedDoctor) {
        onNext(selectedDoctorId, selectedDoctor.name, selectedDoctor.specialisation);
      }
    }
  };

  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading doctors...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="py-8">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={fetchDoctors} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (doctors.length === 0) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="py-8">
          <div className="text-center">
            <p className="text-gray-500 mb-4">No doctors available at this hospital.</p>
            <Button onClick={onBack} variant="outline">
              Back to Hospital Selection
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Select Doctor</CardTitle>
        <CardDescription>
          Choose a doctor from {hospitalName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Doctor *</label>
            <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a doctor" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{doctor.name}</span>
                      {doctor.specialisation && (
                        <span className="text-gray-500">
                          ({doctor.specialisation})
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedDoctor && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Doctor Details</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 flex-shrink-0" />
                  <span className="font-medium">{selectedDoctor.name}</span>
                </div>
                {selectedDoctor.specialisation && (
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 flex-shrink-0" />
                    <span>{selectedDoctor.specialisation}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onBack} className="flex-1">
              Back
            </Button>
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={!selectedDoctorId}
            >
              Continue to Date Selection
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default DoctorSelection;
