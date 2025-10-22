import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Stethoscope, 
  FileText, 
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { ipdApi } from '@/api/ipd';
import { IPDVisitData, IPDVisitVitalData } from '@/types/ipd';

interface IPDVisitFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  admissionId: string;
  patientName: string;
}

export default function IPDVisitForm({
  isOpen,
  onClose,
  onSuccess,
  admissionId,
  patientName
}: IPDVisitFormProps) {
  const [formData, setFormData] = useState<IPDVisitData>({
    admissionId,
    visitNotes: '',
    clinicalObservations: '',
    treatmentGiven: '',
    medicationChanges: '',
    patientResponse: '',
    nextVisitPlan: '',
    vitals: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        admissionId,
        visitNotes: '',
        clinicalObservations: '',
        treatmentGiven: '',
        medicationChanges: '',
        patientResponse: '',
        nextVisitPlan: '',
        vitals: []
      });
    }
  }, [isOpen, admissionId]);

  // Handle form input changes
  const handleInputChange = (field: keyof IPDVisitData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle vitals input changes
  const handleVitalChange = (index: number, field: keyof IPDVisitVitalData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      vitals: prev.vitals?.map((vital, i) => 
        i === index ? { ...vital, [field]: value } : vital
      ) || []
    }));
  };

  // Add new vital
  const addVital = () => {
    setFormData(prev => ({
      ...prev,
      vitals: [...(prev.vitals || []), {
        type: 'BP_SYSTOLIC',
        value: 0,
        unit: '',
        notes: ''
      }]
    }));
  };

  // Remove vital
  const removeVital = (index: number) => {
    setFormData(prev => ({
      ...prev,
      vitals: prev.vitals?.filter((_, i) => i !== index) || []
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.visitNotes.trim()) {
      toast.error('Visit notes are required');
      return;
    }

    setIsSubmitting(true);
    try {
      await ipdApi.createVisit(formData);
      toast.success('Visit recorded successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating visit:', error);
      toast.error(error.response?.data?.message || 'Failed to record visit');
    } finally {
      setIsSubmitting(false);
    }
  };


  const getVitalUnit = (type: string) => {
    switch (type) {
      case 'BP_SYSTOLIC':
      case 'BP_DIASTOLIC':
        return 'mmHg';
      case 'HEART_RATE':
        return 'bpm';
      case 'TEMPERATURE':
        return '°C';
      case 'WEIGHT':
        return 'kg';
      case 'HEIGHT':
        return 'cm';
      case 'SPO2':
        return '%';
      case 'RESPIRATORY_RATE':
        return 'breaths/min';
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-blue-600" />
            Record IPD Visit - {patientName}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Visit Notes */}
          <div>
            <Label htmlFor="visitNotes" className="text-sm font-medium text-gray-700">
              Visit Notes <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="visitNotes"
              value={formData.visitNotes}
              onChange={(e) => handleInputChange('visitNotes', e.target.value)}
              placeholder="Enter detailed visit notes..."
              rows={4}
              required
            />
          </div>

          {/* Clinical Observations */}
          <div>
            <Label htmlFor="clinicalObservations" className="text-sm font-medium text-gray-700">
              Clinical Observations
            </Label>
            <Textarea
              id="clinicalObservations"
              value={formData.clinicalObservations || ''}
              onChange={(e) => handleInputChange('clinicalObservations', e.target.value)}
              placeholder="Enter clinical observations..."
              rows={3}
            />
          </div>

          {/* Treatment Given */}
          <div>
            <Label htmlFor="treatmentGiven" className="text-sm font-medium text-gray-700">
              Treatment Given
            </Label>
            <Textarea
              id="treatmentGiven"
              value={formData.treatmentGiven || ''}
              onChange={(e) => handleInputChange('treatmentGiven', e.target.value)}
              placeholder="Enter treatment details..."
              rows={3}
            />
          </div>

          {/* Medication Changes */}
          <div>
            <Label htmlFor="medicationChanges" className="text-sm font-medium text-gray-700">
              Medication Changes
            </Label>
            <Textarea
              id="medicationChanges"
              value={formData.medicationChanges || ''}
              onChange={(e) => handleInputChange('medicationChanges', e.target.value)}
              placeholder="Enter medication changes..."
              rows={3}
            />
          </div>

          {/* Patient Response */}
          <div>
            <Label htmlFor="patientResponse" className="text-sm font-medium text-gray-700">
              Patient Response
            </Label>
            <Textarea
              id="patientResponse"
              value={formData.patientResponse || ''}
              onChange={(e) => handleInputChange('patientResponse', e.target.value)}
              placeholder="Enter patient response to treatment..."
              rows={3}
            />
          </div>

          {/* Next Visit Plan */}
          <div>
            <Label htmlFor="nextVisitPlan" className="text-sm font-medium text-gray-700">
              Next Visit Plan
            </Label>
            <Textarea
              id="nextVisitPlan"
              value={formData.nextVisitPlan || ''}
              onChange={(e) => handleInputChange('nextVisitPlan', e.target.value)}
              placeholder="Enter next visit plan..."
              rows={3}
            />
          </div>

          {/* Vitals Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-600" />
                Patient Vitals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.vitals?.map((vital, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Vital Type</Label>
                    <select
                      value={vital.type}
                      onChange={(e) => handleVitalChange(index, 'type', e.target.value)}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="BP_SYSTOLIC">BP Systolic</option>
                      <option value="BP_DIASTOLIC">BP Diastolic</option>
                      <option value="HEART_RATE">Heart Rate</option>
                      <option value="TEMPERATURE">Temperature</option>
                      <option value="WEIGHT">Weight</option>
                      <option value="HEIGHT">Height</option>
                      <option value="SPO2">SpO2</option>
                      <option value="RESPIRATORY_RATE">Respiratory Rate</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Value</Label>
                    <Input
                      type="number"
                      value={vital.value}
                      onChange={(e) => handleVitalChange(index, 'value', parseFloat(e.target.value) || 0)}
                      placeholder="Enter value"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Unit</Label>
                    <Input
                      value={vital.unit || getVitalUnit(vital.type)}
                      onChange={(e) => handleVitalChange(index, 'unit', e.target.value)}
                      placeholder={getVitalUnit(vital.type)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeVital(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              
              <Button
                type="button"
                variant="outline"
                onClick={addVital}
                className="w-full"
              >
                <Activity className="h-4 w-4 mr-2" />
                Add Vital
              </Button>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Recording...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Record Visit
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
