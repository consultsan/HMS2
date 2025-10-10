import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface PatientRegistrationFormProps {
  onNext: (data: PatientData) => void;
}

export interface PatientData {
  name: string;
  phone: string;
  dob?: string;
  gender?: string;
  registrationSource?: string;
}

const PatientRegistrationForm: React.FC<PatientRegistrationFormProps> = ({ onNext }) => {
    console.log(onNext);
  const [formData, setFormData] = useState<PatientData>({
    name: '',
    phone: '',
    dob: '',
    gender: '',
    registrationSource: 'DIGITAL'
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
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Patient Information</CardTitle>
        <CardDescription>
          Please provide your basic information to book an appointment
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter your full name"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Phone Field */}
          <div className="space-y-2">
            <Label htmlFor="phone">Mobile Number *</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="Enter 10-digit mobile number"
              maxLength={10}
              className={errors.phone ? 'border-red-500' : ''}
            />
            {errors.phone && (
              <p className="text-sm text-red-500">{errors.phone}</p>
            )}
          </div>

          {/* Date of Birth Field */}
          <div className="space-y-2">
            <Label htmlFor="dob">Date of Birth (Optional)</Label>
            <Input
              type="date"
              value={formData.dob ? new Date(formData.dob).toISOString().split('T')[0] : ''}
              onChange={(e) => handleInputChange('dob', e.target.value ? new Date(e.target.value).toISOString() : '')}
              max={new Date().toISOString().split('T')[0]}
              min="1900-01-01"
            />
          </div>

          {/* Gender Field */}
          <div className="space-y-2">
            <Label htmlFor="gender">Gender (Optional)</Label>
            <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Registration Source Field */}
          <div className="space-y-2">
            <Label htmlFor="registrationSource">How did you hear about us? *</Label>
            <Select value={formData.registrationSource} onValueChange={(value) => handleInputChange('registrationSource', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select how you heard about us" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DIGITAL">Online/Website</SelectItem>
                <SelectItem value="WALK_IN">Walk-in</SelectItem>
                <SelectItem value="REFERRAL">Referral</SelectItem>
                <SelectItem value="AFFILIATE">Affiliate Partner</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing...' : 'Continue to Hospital Selection'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default PatientRegistrationForm;
