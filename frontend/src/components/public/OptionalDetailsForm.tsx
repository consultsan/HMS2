import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface OptionalDetailsFormProps {
  initialData?: {
    dob?: string;
    gender?: string;
    registrationSource?: string;
    referralPersonName?: string;
  };
  onNext: (data: {
    dob?: string;
    gender?: string;
    registrationSource?: string;
    referralPersonName?: string;
  }) => void;
  onBack: () => void;
  onSkip: () => void;
}

const OptionalDetailsForm: React.FC<OptionalDetailsFormProps> = ({ 
  initialData, 
  onNext, 
  onBack,
  onSkip 
}) => {
  const [formData, setFormData] = useState({
    dob: initialData?.dob || '',
    gender: initialData?.gender || '',
    registrationSource: initialData?.registrationSource || 'DIGITAL',
    referralPersonName: initialData?.referralPersonName || ''
  });
  const [errors, setErrors] = useState<{ referralPersonName?: string }>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors.referralPersonName && field === 'referralPersonName') {
      setErrors(prev => ({ ...prev, referralPersonName: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { referralPersonName?: string } = {};

    // Referral person name validation (only if registration source is REFERRAL)
    if (formData.registrationSource === 'REFERRAL' && !formData.referralPersonName?.trim()) {
      newErrors.referralPersonName = 'Referral person name is required when source is Referral';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Only include fields that have values
    const dataToSubmit: any = {
      registrationSource: formData.registrationSource
    };

    if (formData.dob) {
      dataToSubmit.dob = formData.dob;
    }
    if (formData.gender) {
      dataToSubmit.gender = formData.gender;
    }
    if (formData.registrationSource === 'REFERRAL' && formData.referralPersonName) {
      dataToSubmit.referralPersonName = formData.referralPersonName;
    }

    onNext(dataToSubmit);
  };

  const handleSkip = () => {
    // Just pass the default registration source
    onSkip();
  };

  return (
    <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-none shadow-2xl bg-gradient-to-br from-white to-indigo-50/30 backdrop-blur-sm">
        <CardHeader className="space-y-2 pb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg animate-in zoom-in duration-700">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <CardTitle className="text-2xl text-center bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Additional Information
          </CardTitle>
          <CardDescription className="text-center text-base">
            Help us serve you better (Optional - You can skip this step)
          </CardDescription>
        </CardHeader>
        <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Date of Birth Field */}
          <div className="space-y-2 group">
            <Label htmlFor="dob" className="text-gray-700 font-medium flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Date of Birth (Optional)
            </Label>
            <Input
              id="dob"
              type="date"
              value={formData.dob ? new Date(formData.dob).toISOString().split('T')[0] : ''}
              onChange={(e) => handleInputChange('dob', e.target.value ? new Date(e.target.value).toISOString() : '')}
              max={new Date().toISOString().split('T')[0]}
              min="1900-01-01"
              className="h-11 border-2 border-gray-200 hover:border-indigo-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all duration-300"
            />
          </div>

          {/* Gender Field */}
          <div className="space-y-2 group">
            <Label htmlFor="gender" className="text-gray-700 font-medium flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Gender (Optional)
            </Label>
            <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
              <SelectTrigger className="h-11 border-2 border-gray-200 hover:border-purple-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-300">
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
          <div className="space-y-2 group">
            <Label htmlFor="registrationSource" className="text-gray-700 font-medium flex items-center gap-2">
              <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              How did you hear about us? (Optional)
            </Label>
            <Select value={formData.registrationSource} onValueChange={(value) => handleInputChange('registrationSource', value)}>
              <SelectTrigger className="h-11 border-2 border-gray-200 hover:border-pink-400 focus:border-pink-500 focus:ring-4 focus:ring-pink-100 transition-all duration-300">
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

          {/* Referral Person Name Field - Only show if REFERRAL is selected */}
          {formData.registrationSource === 'REFERRAL' && (
            <div className="space-y-2 group animate-in slide-in-from-top-2 duration-300">
              <Label htmlFor="referralPersonName" className="text-gray-700 font-medium flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Referral Person Name *
              </Label>
              <Input
                id="referralPersonName"
                type="text"
                value={formData.referralPersonName || ''}
                onChange={(e) => handleInputChange('referralPersonName', e.target.value)}
                placeholder="Enter the name of the person who referred you"
                className={`h-11 border-2 transition-all duration-300 focus:ring-4 ${
                  errors.referralPersonName 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-100' 
                    : 'border-gray-200 hover:border-indigo-400 focus:border-indigo-500 focus:ring-indigo-100'
                }`}
              />
              {errors.referralPersonName && (
                <p className="text-sm text-red-500 animate-in slide-in-from-top-1 duration-200">{errors.referralPersonName}</p>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onBack} 
              className="flex-1 h-11 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-300"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              onClick={handleSkip} 
              className="flex-1 h-11 hover:bg-gray-100 transition-all duration-300"
            >
              Skip
            </Button>
            <Button 
              type="submit" 
              className="flex-1 h-11 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Continue
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

export default OptionalDetailsForm;

