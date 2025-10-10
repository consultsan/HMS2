import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Stethoscope } from 'lucide-react';

const PublicHeader: React.FC = () => {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Stethoscope className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">True Hospital</h1>
              <p className="text-sm text-gray-600">Healthcare Management System</p>
            </div>
          </Link>
          
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
  );
};

export default PublicHeader;
