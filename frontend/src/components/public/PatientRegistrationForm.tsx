import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PatientRegistrationFormProps {
  onNext: (data: PatientData) => void;
}

export interface PatientData {
  name: string;
  phone: string;
  dob?: string;
  gender?: string;
  registrationSource?: string;
  referralPersonName?: string;
}

const PatientRegistrationForm: React.FC<PatientRegistrationFormProps> = ({ onNext }) => {
  const [formData, setFormData] = useState<PatientData>({
    name: '',
    phone: '',
    dob: '',
    gender: '',
    registrationSource: 'DIGITAL',
    referralPersonName: ''
  });
  const [errors, setErrors] = useState<Partial<PatientData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<PatientData> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Phone number must be exactly 10 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onNext(formData);
    } catch (error) {
      console.error('Error in form submission:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof PatientData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-none shadow-2xl bg-gradient-to-br from-white to-blue-50/30 backdrop-blur-sm">
        <CardHeader className="space-y-2 pb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg animate-in zoom-in duration-700">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <CardTitle className="text-2xl text-center bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Patient Information
          </CardTitle>
          <CardDescription className="text-center text-base">
            Please provide your name and mobile number to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Field */}
            <div className="space-y-2 group">
              <Label htmlFor="name" className="text-gray-700 font-medium">Full Name *</Label>
              <div className="relative">
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter your full name"
                  className={`pl-10 h-12 border-2 transition-all duration-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${
                    errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-gray-200'
                  }`}
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              {errors.name && (
                <p className="text-sm text-red-500 animate-in slide-in-from-top-1 duration-200">{errors.name}</p>
              )}
            </div>

            {/* Phone Field */}
            <div className="space-y-2 group">
              <Label htmlFor="phone" className="text-gray-700 font-medium">Mobile Number *</Label>
              <div className="relative">
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Enter 10-digit mobile number"
                  maxLength={10}
                  className={`pl-10 h-12 border-2 transition-all duration-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${
                    errors.phone ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-gray-200'
                  }`}
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              {errors.phone && (
                <p className="text-sm text-red-500 animate-in slide-in-from-top-1 duration-200">{errors.phone}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Continue
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientRegistrationForm;
