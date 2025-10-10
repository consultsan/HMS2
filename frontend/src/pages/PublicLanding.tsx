import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, Stethoscope, Clock, Shield, Heart } from 'lucide-react';

const PublicLanding: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Stethoscope className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">True Hospital</h1>
                <p className="text-sm text-gray-600">Healthcare Management System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/login">
                <Button variant="outline" size="sm">
                  Staff Login
                </Button>
              </Link>
              <Link to="/book-appointment">
                <Button size="sm">
                  Book Appointment
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Quality Healthcare
            <span className="text-blue-600 block">Made Simple</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Book your appointment online in just a few clicks. No registration required. 
            Choose your hospital, doctor, and preferred time slot.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/book-appointment">
              <Button size="lg" className="w-full sm:w-auto">
                <Calendar className="mr-2 h-5 w-5" />
                Book Appointment Now
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              <Users className="mr-2 h-5 w-5" />
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Why Choose Our Healthcare System?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle>Easy Booking</CardTitle>
                <CardDescription>
                  Book appointments online in minutes without any registration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Simply provide your name and mobile number, select your preferred hospital, 
                  doctor, and time slot. It's that simple!
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle>Real-time Availability</CardTitle>
                <CardDescription>
                  See available time slots in real-time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Our system shows you all available time slots for your chosen doctor, 
                  so you can pick the time that works best for you.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-purple-600" />
                </div>
                <CardTitle>Secure & Reliable</CardTitle>
                <CardDescription>
                  Your data is safe with us
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  We use industry-standard security measures to protect your personal 
                  information and ensure your privacy.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">1</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Enter Your Details</h3>
              <p className="text-gray-600">
                Provide your name and mobile number. Other details are optional.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">2</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Choose Hospital</h3>
              <p className="text-gray-600">
                Select from our network of hospitals and healthcare centers.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">3</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Select Doctor</h3>
              <p className="text-gray-600">
                Choose your preferred doctor and see their specialization.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">4</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Pick Time Slot</h3>
              <p className="text-gray-600">
                Select your preferred date and time from available slots.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Book Your Appointment?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Get started in just a few minutes. No registration required.
          </p>
          <Link to="/book-appointment">
            <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-gray-100">
              <Calendar className="mr-2 h-5 w-5" />
              Book Appointment Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Stethoscope className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold">True Hospital</h3>
              </div>
              <p className="text-gray-400">
                Providing quality healthcare services with modern technology and compassionate care.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link to="/book-appointment" className="text-gray-400 hover:text-white">Book Appointment</Link></li>
                <li><Link to="/login" className="text-gray-400 hover:text-white">Staff Login</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-gray-400">
                <li>General Medicine</li>
                <li>Specialist Consultations</li>
                <li>Emergency Care</li>
                <li>Laboratory Services</li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-gray-400">
                <li>📞 +91 9876543210</li>
                <li>✉️ info@truehospital.com</li>
                <li>📍 Multiple Locations</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 True Hospital. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLanding;
