import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MapPin, Phone, Mail } from 'lucide-react';
import { publicAppointmentApi, Hospital } from '@/api/publicAppointment';

interface HospitalSelectionProps {
  onNext: (hospitalId: string, hospitalName: string) => void;
  onBack: () => void;
}

const HospitalSelection: React.FC<HospitalSelectionProps> = ({ onNext, onBack }) => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      const response = await publicAppointmentApi.getHospitals();
      console.log(response.data.data);
      setHospitals(response.data.data);
    } catch (err: any) {
      console.error('Error fetching hospitals:', err);
      setError('Failed to load hospitals. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedHospitalId) {
      const selectedHospital = hospitals.find(h => h.id === selectedHospitalId);
      if (selectedHospital) {
        onNext(selectedHospitalId, selectedHospital.name);
      }
    }
  };

  const selectedHospital = hospitals.find(h => h.id === selectedHospitalId);

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading hospitals...</span>
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
            <Button onClick={fetchHospitals} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Select Hospital</CardTitle>
        <CardDescription>
          Choose the hospital where you'd like to book your appointment
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Hospital *</label>
            <Select value={selectedHospitalId} onValueChange={setSelectedHospitalId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a hospital" />
              </SelectTrigger>
              <SelectContent>
                {hospitals.map((hospital) => (
                  <SelectItem key={hospital.id} value={hospital.id}>
                    {hospital.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedHospital && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Hospital Details</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{selectedHospital.address}</span>
                </div>
                {selectedHospital.contactNumber && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 flex-shrink-0" />
                    <span>{selectedHospital.contactNumber}</span>
                  </div>
                )}
                {selectedHospital.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <span>{selectedHospital.email}</span>
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
              disabled={!selectedHospitalId}
            >
              Continue to Doctor Selection
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default HospitalSelection;
