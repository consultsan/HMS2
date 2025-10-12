import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, MapPin, Stethoscope } from 'lucide-react';
import { publicAppointmentApi, AppointmentBookingData, AvailableSlot } from '@/api/publicAppointment';
import { format } from 'date-fns';
import PublicHeader from './PublicHeader';

// Import all the step components
import PatientRegistrationForm, { PatientData } from './PatientRegistrationForm';
import HospitalSelection from './HospitalSelection';
import DoctorSelection from './DoctorSelection';
import DateSelection from './DateSelection';
import TimeSlotSelection from './TimeSlotSelection';

type BookingStep = 'patient' | 'hospital' | 'doctor' | 'date' | 'time' | 'confirmation';

interface BookingData {
  patient: PatientData;
  hospitalId: string;
  hospitalName: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialization: string;
  selectedDate: string;
  selectedSlot: AvailableSlot;
  appointmentId?: string;
  visitId?: string;
}

const PublicAppointmentBooking: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<BookingStep>('patient');
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  const handlePatientSubmit = (patientData: PatientData) => {
    setBookingData(prev => ({ ...prev, patient: patientData } as BookingData));
    setCurrentStep('hospital');
  };

  const handleHospitalSubmit = (hospitalId: string, hospitalName: string) => {
    setBookingData(prev => ({ 
      ...prev, 
      hospitalId, 
      hospitalName 
    } as BookingData));
    setCurrentStep('doctor');
  };

  const handleDoctorSubmit = (doctorId: string, doctorName: string, doctorSpecialization: string) => {
    setBookingData(prev => ({ 
      ...prev, 
      doctorId, 
      doctorName, 
      doctorSpecialization 
    } as BookingData));
    setCurrentStep('date');
  };

  const handleDateSubmit = (date: string) => {
    setBookingData(prev => ({ ...prev, selectedDate: date } as BookingData));
    setCurrentStep('time');
  };

  const handleTimeSlotSubmit = (slot: AvailableSlot) => {
    setBookingData(prev => ({ ...prev, selectedSlot: slot } as BookingData));
    setCurrentStep('confirmation');
  };

  const handleBookingSubmit = async () => {
    if (!bookingData) return;

    setIsSubmitting(true);
    setError('');

    try {
      const appointmentData: AppointmentBookingData = {
        name: bookingData.patient.name,
        phone: bookingData.patient.phone,
        dob: bookingData.patient.dob,
        gender: bookingData.patient.gender,
        hospitalId: bookingData.hospitalId,
        doctorId: bookingData.doctorId,
        scheduledAt: bookingData.selectedSlot.datetime,
        source: bookingData.patient.registrationSource || 'DIGITAL'
      };
      console.log(appointmentData);

      const response = await publicAppointmentApi.bookAppointment(appointmentData);
      
      const appointmentResponse = response.data.data.appointment;
      //schedule date
      console.log(appointmentResponse.scheduledAt);
      
      // Navigate to success page with appointment data
      navigate('/appointment-success', {
        state: {
          appointmentData: {
            patientName: appointmentResponse.patientName,
            doctorName: appointmentResponse.doctorName,
            doctorSpecialization: appointmentResponse.doctorSpecialization,
            hospitalName: appointmentResponse.hospitalName,
            scheduledAt: appointmentResponse.scheduledAt,
            appointmentTime: new Date(appointmentResponse.scheduledAt).toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Asia/Kolkata'
            }),
            visitId: appointmentResponse.visitId
          }
        }
      });
    } catch (err: any) {
      console.error('Error booking appointment:', err);
      setError(err.response?.data?.message || 'Failed to book appointment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'hospital':
        setCurrentStep('patient');
        break;
      case 'doctor':
        setCurrentStep('hospital');
        break;
      case 'date':
        setCurrentStep('doctor');
        break;
      case 'time':
        setCurrentStep('date');
        break;
      case 'confirmation':
        setCurrentStep('time');
        break;
      default:
        break;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'patient':
        return <PatientRegistrationForm onNext={handlePatientSubmit} />;
      
      case 'hospital':
        return (
          <HospitalSelection 
            onNext={(hospitalId, hospitalName) => handleHospitalSubmit(hospitalId, hospitalName)} 
            onBack={handleBack}
          />
        );
      
      case 'doctor':
        return (
          <DoctorSelection 
            hospitalId={bookingData?.hospitalId || ''}
            hospitalName={bookingData?.hospitalName || ''}
            onNext={(doctorId, doctorName, doctorSpecialization) => handleDoctorSubmit(doctorId, doctorName, doctorSpecialization)} 
            onBack={handleBack}
          />
        );
      
      case 'date':
        return (
          <DateSelection 
            doctorName={bookingData?.doctorName || ''}
            doctorSpecialization={bookingData?.doctorSpecialization || ''}
            onNext={handleDateSubmit} 
            onBack={handleBack}
          />
        );
      
      case 'time':
        return (
          <TimeSlotSelection 
            doctorId={bookingData?.doctorId || ''}
            doctorName={bookingData?.doctorName || ''}
            doctorSpecialization={bookingData?.doctorSpecialization || ''}
            selectedDate={bookingData?.selectedDate || ''}
            onNext={handleTimeSlotSubmit} 
            onBack={handleBack}
          />
        );
      
      case 'confirmation':
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Confirm Appointment</CardTitle>
              <CardDescription>
                Please review your appointment details before booking
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bookingData && (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-sm mb-3">Patient Information</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{bookingData.patient.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>📱 {bookingData.patient.phone}</span>
                      </div>
                      {bookingData.patient.dob && (
                        <div className="flex items-center gap-2">
                          <span>📅 {format(new Date(bookingData.patient.dob), "PPP")}</span>
                        </div>
                      )}
                      {bookingData.patient.gender && (
                        <div className="flex items-center gap-2">
                          <span>👤 {bookingData.patient.gender}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-sm mb-3">Appointment Details</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{bookingData.hospitalName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Stethoscope className="h-4 w-4" />
                        <span>{bookingData.doctorName} {bookingData.doctorSpecialization && `(${bookingData.doctorSpecialization})`}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(bookingData.selectedDate), "EEEE, MMMM do, yyyy")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{bookingData.selectedSlot.time}</span>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={handleBack} className="flex-1">
                      Back
                    </Button>
                    <Button 
                      onClick={handleBookingSubmit}
                      className="flex-1" 
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Booking...' : 'Confirm & Book'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />
      <div className="py-8">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Book Your Appointment</h1>
            <p className="text-gray-600">
              Quick and easy appointment booking for your healthcare needs
            </p>
          </div>
          
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

export default PublicAppointmentBooking;
