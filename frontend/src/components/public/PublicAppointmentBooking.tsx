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
import AppointmentSelectionForm from './AppointmentSelectionForm';
import OptionalDetailsForm from './OptionalDetailsForm';

type BookingStep = 'patient' | 'appointment' | 'optional' | 'confirmation';

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
    setCurrentStep('appointment');
  };

  const handleAppointmentSubmit = (
    hospitalId: string,
    hospitalName: string,
    doctorId: string,
    doctorName: string,
    doctorSpecialization: string,
    selectedDate: string,
    selectedSlot: AvailableSlot
  ) => {
    setBookingData(prev => ({ 
      ...prev, 
      hospitalId, 
      hospitalName,
      doctorId, 
      doctorName, 
      doctorSpecialization,
      selectedDate,
      selectedSlot
    } as BookingData));
    setCurrentStep('optional');
  };

  const handleOptionalDetailsSubmit = (optionalData: {
    dob?: string;
    gender?: string;
    registrationSource?: string;
    referralPersonName?: string;
  }) => {
    setBookingData(prev => ({ 
      ...prev, 
      patient: {
        ...prev!.patient,
        ...optionalData
      }
    } as BookingData));
    setCurrentStep('confirmation');
  };

  const handleSkipOptionalDetails = () => {
    // Skip optional details and go directly to confirmation
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
        source: bookingData.patient.registrationSource || 'DIGITAL',
        referralPersonName: bookingData.patient.referralPersonName
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
              timeZone: 'UTC'
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
      case 'appointment':
        setCurrentStep('patient');
        break;
      case 'optional':
        setCurrentStep('appointment');
        break;
      case 'confirmation':
        setCurrentStep('optional');
        break;
      default:
        break;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'patient':
        return <PatientRegistrationForm onNext={handlePatientSubmit} />;
      
      case 'appointment':
        return (
          <AppointmentSelectionForm 
            onNext={handleAppointmentSubmit} 
            onBack={handleBack}
          />
        );
      
      case 'optional':
        return (
          <OptionalDetailsForm 
            initialData={bookingData?.patient}
            onNext={handleOptionalDetailsSubmit} 
            onBack={handleBack}
            onSkip={handleSkipOptionalDetails}
          />
        );
      
      case 'confirmation':
        return (
          <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-none shadow-2xl bg-gradient-to-br from-white to-green-50/30 backdrop-blur-sm">
              <CardHeader className="space-y-2 pb-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg animate-in zoom-in duration-700">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <CardTitle className="text-2xl text-center bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Confirm Appointment
                </CardTitle>
                <CardDescription className="text-center text-base">
                  Please review your appointment details before booking
                </CardDescription>
              </CardHeader>
              <CardContent>
                {bookingData && (
                  <div className="space-y-4">
                    <div className="p-5 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-100">
                      <h4 className="font-semibold text-base mb-4 text-blue-900 flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Patient Information
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-3 p-2 bg-white/60 rounded-lg">
                          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-white" />
                          </div>
                          <span className="font-medium text-gray-700">{bookingData.patient.name}</span>
                        </div>
                        <div className="flex items-center gap-3 p-2 bg-white/60 rounded-lg">
                          <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <span className="font-medium text-gray-700">{bookingData.patient.phone}</span>
                        </div>
                        {bookingData.patient.dob && (
                          <div className="flex items-center gap-3 p-2 bg-white/60 rounded-lg">
                            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Calendar className="h-4 w-4 text-white" />
                            </div>
                            <span className="font-medium text-gray-700">{format(new Date(bookingData.patient.dob), "PPP")}</span>
                          </div>
                        )}
                        {bookingData.patient.gender && (
                          <div className="flex items-center gap-3 p-2 bg-white/60 rounded-lg">
                            <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            <span className="font-medium text-gray-700">{bookingData.patient.gender}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-100">
                      <h4 className="font-semibold text-base mb-4 text-green-900 flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Appointment Details
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-3 p-2 bg-white/60 rounded-lg">
                          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            <MapPin className="h-4 w-4 text-white" />
                          </div>
                          <span className="font-medium text-gray-700">{bookingData.hospitalName}</span>
                        </div>
                        <div className="flex items-center gap-3 p-2 bg-white/60 rounded-lg">
                          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Stethoscope className="h-4 w-4 text-white" />
                          </div>
                          <span className="font-medium text-gray-700">
                            {bookingData.doctorName.startsWith('Dr') ? bookingData.doctorName : `Dr ${bookingData.doctorName}`} {bookingData.doctorSpecialization && `(${bookingData.doctorSpecialization})`}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 p-2 bg-white/60 rounded-lg">
                          <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Calendar className="h-4 w-4 text-white" />
                          </div>
                          <span className="font-medium text-gray-700">{format(new Date(bookingData.selectedDate), "EEEE, MMMM do, yyyy")}</span>
                        </div>
                        <div className="flex items-center gap-3 p-2 bg-white/60 rounded-lg">
                          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Clock className="h-4 w-4 text-white" />
                          </div>
                          <span className="font-medium text-gray-700">{bookingData.selectedSlot.time}</span>
                        </div>
                      </div>
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

                    <div className="flex gap-3 pt-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleBack} 
                        className="flex-1 h-12 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-300"
                      >
                        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                      </Button>
                      <Button 
                        onClick={handleBookingSubmit}
                        className="flex-1 h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]" 
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Booking...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Confirm & Book
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-indigo-400/10 to-purple-400/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>
      
      <PublicHeader />
      <div className="py-12 relative z-10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="inline-block mb-4">
              <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center animate-pulse">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <span className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Quick & Easy Booking
                </span>
              </div>
            </div>
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-in zoom-in duration-700">
              Book Your Appointment
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
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
