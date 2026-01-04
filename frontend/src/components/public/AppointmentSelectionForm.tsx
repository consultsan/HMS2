import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Loader2, MapPin, Stethoscope } from 'lucide-react';
import { publicAppointmentApi, Hospital, Doctor, AvailableSlot } from '@/api/publicAppointment';
import { format } from 'date-fns';

interface AppointmentSelectionFormProps {
  onNext: (
    hospitalId: string,
    hospitalName: string,
    doctorId: string,
    doctorName: string,
    doctorSpecialization: string,
    selectedDate: string,
    selectedSlot: AvailableSlot
  ) => void;
  onBack: () => void;
}

const AppointmentSelectionForm: React.FC<AppointmentSelectionFormProps> = ({ onNext, onBack }) => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [selectedHospitalName, setSelectedHospitalName] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDoctorName, setSelectedDoctorName] = useState('');
  const [selectedDoctorSpecialization, setSelectedDoctorSpecialization] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  
  const [isLoadingHospitals, setIsLoadingHospitals] = useState(false);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [error, setError] = useState('');

  // Fetch hospitals on component mount
  useEffect(() => {
    fetchHospitals();
  }, []);

  // Fetch doctors when hospital is selected
  useEffect(() => {
    if (selectedHospitalId) {
      fetchDoctors(selectedHospitalId);
    } else {
      setDoctors([]);
      setSelectedDoctorId('');
      setSelectedDoctorName('');
      setSelectedDoctorSpecialization('');
    }
  }, [selectedHospitalId]);

  // Fetch slots when doctor and date are selected
  useEffect(() => {
    if (selectedDoctorId && selectedDate) {
      fetchSlots(selectedDoctorId, selectedDate);
    } else {
      setAvailableSlots([]);
      setSelectedSlot(null);
    }
  }, [selectedDoctorId, selectedDate]);

  const fetchHospitals = async () => {
    setIsLoadingHospitals(true);
    setError('');
    try {
      const response = await publicAppointmentApi.getHospitals();
      setHospitals(response.data.data || []);
    } catch (err: any) {
      console.error('Error fetching hospitals:', err);
      setError('Failed to load hospitals. Please try again.');
    } finally {
      setIsLoadingHospitals(false);
    }
  };

  const fetchDoctors = async (hospitalId: string) => {
    setIsLoadingDoctors(true);
    setError('');
    try {
      const response = await publicAppointmentApi.getDoctorsByHospital(hospitalId);
      setDoctors(response.data.data.doctors || []);
    } catch (err: any) {
      console.error('Error fetching doctors:', err);
      setError('Failed to load doctors. Please try again.');
    } finally {
      setIsLoadingDoctors(false);
    }
  };

  const fetchSlots = async (doctorId: string, date: string) => {
    setIsLoadingSlots(true);
    setError('');
    try {
      const response = await publicAppointmentApi.getAvailableSlots(doctorId, date);
      setAvailableSlots(response.data.data.slots || []);
    } catch (err: any) {
      console.error('Error fetching slots:', err);
      setError('No available slots for this date. Please select another date.');
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleHospitalChange = (hospitalId: string) => {
    const hospital = hospitals.find(h => h.id === hospitalId);
    setSelectedHospitalId(hospitalId);
    setSelectedHospitalName(hospital?.name || '');
    // Reset dependent fields
    setSelectedDoctorId('');
    setSelectedDoctorName('');
    setSelectedDoctorSpecialization('');
    setSelectedDate('');
    setSelectedSlot(null);
  };

  const handleDoctorChange = (doctorId: string) => {
    const doctor = doctors.find(d => d.id === doctorId);
    const doctorName = doctor?.name ? (doctor.name.startsWith('Dr') ? doctor.name : `Dr ${doctor.name}`) : '';
    setSelectedDoctorId(doctorId);
    setSelectedDoctorName(doctorName);
    setSelectedDoctorSpecialization(doctor?.specialisation || '');
    // Reset dependent fields
    setSelectedDate('');
    setSelectedSlot(null);
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleSlotClick = (slot: AvailableSlot) => {
    setSelectedSlot(slot);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedHospitalId) {
      setError('Please select a hospital');
      return;
    }
    if (!selectedDoctorId) {
      setError('Please select a doctor');
      return;
    }
    if (!selectedDate) {
      setError('Please select a date');
      return;
    }
    if (!selectedSlot) {
      setError('Please select a time slot');
      return;
    }

    onNext(
      selectedHospitalId,
      selectedHospitalName,
      selectedDoctorId,
      selectedDoctorName,
      selectedDoctorSpecialization,
      selectedDate,
      selectedSlot
    );
  };

  // Get min and max dates for date picker (today to 30 days from now)
  const today = new Date();
  const minDate = today.toISOString().split('T')[0];
  const maxDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return (
    <div className="w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-none shadow-2xl bg-gradient-to-br from-white to-purple-50/30 backdrop-blur-sm">
        <CardHeader className="space-y-2 pb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg animate-in zoom-in duration-700">
              <Calendar className="w-7 h-7 text-white" />
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg animate-in zoom-in duration-700 delay-100">
              <Stethoscope className="w-7 h-7 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Select Appointment Details
          </CardTitle>
          <CardDescription className="text-center text-base">
            Choose your preferred hospital, doctor, date, and time slot
          </CardDescription>
        </CardHeader>
        <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Hospital Selection */}
          <div className="space-y-2 group">
            <Label htmlFor="hospital" className="text-gray-700 font-medium">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-white" />
                </div>
                <span>Hospital *</span>
              </div>
            </Label>
            {isLoadingHospitals ? (
              <div className="flex items-center justify-center p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                <Loader2 className="h-6 w-6 animate-spin text-green-600" />
              </div>
            ) : (
              <Select value={selectedHospitalId} onValueChange={handleHospitalChange}>
                <SelectTrigger className="h-12 border-2 border-gray-200 hover:border-green-400 focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all duration-300">
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
            )}
          </div>

          {/* Doctor Selection */}
          <div className="space-y-2 group">
            <Label htmlFor="doctor" className="text-gray-700 font-medium">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-lg flex items-center justify-center">
                  <Stethoscope className="h-4 w-4 text-white" />
                </div>
                <span>Doctor *</span>
              </div>
            </Label>
            {isLoadingDoctors ? (
              <div className="flex items-center justify-center p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : (
              <Select 
                value={selectedDoctorId} 
                onValueChange={handleDoctorChange}
                disabled={!selectedHospitalId}
              >
                <SelectTrigger className="h-12 border-2 border-gray-200 hover:border-blue-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                  <SelectValue placeholder={selectedHospitalId ? "Select a doctor" : "Select hospital first"} />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => {
                    const doctorName = doctor.name.startsWith('Dr') ? doctor.name : `Dr ${doctor.name}`;
                    return (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        {doctorName} {doctor.specialisation && `(${doctor.specialisation})`}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Date Selection */}
          <div className="space-y-2 group">
            <Label htmlFor="date" className="text-gray-700 font-medium">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-white" />
                </div>
                <span>Date *</span>
              </div>
            </Label>
            <input
              type="date"
              id="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              min={minDate}
              max={maxDate}
              disabled={!selectedDoctorId}
              className="w-full h-12 px-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:border-purple-400"
            />
          </div>

          {/* Time Slot Selection */}
          <div className="space-y-3 group">
            <Label className="text-gray-700 font-medium">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                <span>Time Slot *</span>
              </div>
            </Label>
            {isLoadingSlots ? (
              <div className="flex items-center justify-center p-8 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border-2 border-orange-200">
                <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
              </div>
            ) : availableSlots.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-72 overflow-y-auto p-4 bg-gradient-to-br from-gray-50 to-orange-50/30 rounded-xl border-2 border-gray-100">
                {availableSlots.map((slot, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant="outline"
                    className={`h-11 font-medium transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                      selectedSlot?.time === slot.time
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white border-transparent shadow-lg hover:from-orange-600 hover:to-red-600'
                        : 'border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50'
                    }`}
                    onClick={() => handleSlotClick(slot)}
                  >
                    <Clock className="w-4 h-4 mr-1" />
                    {slot.time}
                  </Button>
                ))}
              </div>
            ) : selectedDate && selectedDoctorId ? (
              <div className="p-6 text-center bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl">
                <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-600 font-medium">No available slots for this date</p>
              </div>
            ) : (
              <div className="p-6 text-center bg-gradient-to-r from-gray-50 to-blue-50 border-2 border-dashed border-gray-300 rounded-xl">
                <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-500">Select a doctor and date to see available slots</p>
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onBack} 
              className="flex-1 h-12 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-300"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Button>
            <Button 
              type="submit" 
              className="flex-1 h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Continue
              <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
    </div>
  );
};

export default AppointmentSelectionForm;

