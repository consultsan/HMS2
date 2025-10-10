import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Calendar, Clock, User, MapPin, Stethoscope, ArrowLeft } from 'lucide-react';
import PublicHeader from '@/components/public/PublicHeader';
import { format } from 'date-fns';

const PublicAppointmentSuccess: React.FC = () => {
  const location = useLocation();
  const appointmentData = location.state?.appointmentData;

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />
      <div className="py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <Card className="text-center">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
                <CardTitle className="text-2xl text-green-600">Appointment Booked Successfully!</CardTitle>
                <CardDescription>
                  Your appointment has been confirmed and you will receive a confirmation message shortly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {appointmentData && (
                  <div className="space-y-4 mb-6">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-sm mb-3 text-green-800">Appointment Details</h4>
                      <div className="space-y-2 text-sm text-green-700">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span><strong>Patient:</strong> {appointmentData.patientName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Stethoscope className="h-4 w-4" />
                          <span><strong>Doctor:</strong> {appointmentData.doctorName} {appointmentData.doctorSpecialization && `(${appointmentData.doctorSpecialization})`}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span><strong>Hospital:</strong> {appointmentData.hospitalName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span><strong>Date:</strong> {format(new Date(appointmentData.scheduledAt), "EEEE, MMMM do, yyyy")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span><strong>Time:</strong> {appointmentData.appointmentTime}</span>
                        </div>
                        {appointmentData.visitId && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm font-medium text-blue-800">Visit ID: {appointmentData.visitId}</p>
                            <p className="text-xs text-blue-600 mt-1">
                              Please keep this ID for your reference
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/book-appointment">
                    <Button className="w-full sm:w-auto">
                      Book Another Appointment
                    </Button>
                  </Link>
                  <Link to="/">
                    <Button variant="outline" className="w-full sm:w-auto">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Home
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicAppointmentSuccess;
