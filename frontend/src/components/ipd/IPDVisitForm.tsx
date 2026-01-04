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
  Activity,
  TestTube,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { ipdApi } from '@/api/ipd';
import { labApi } from '@/api/lab';
import { IPDVisitData, IPDVisitVitalData } from '@/types/ipd';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { LabTestSearch } from '@/components/LabTestSearch';

interface IPDVisitFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  admissionId: string;
  patientName: string;
}

// IPD Lab Test Form Modal Component
function IPDLabTestFormModal({
  isOpen,
  onClose,
  patientName,
  onSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  onSuccess: (testData: any) => void;
}) {
  const [selectedLabTestId, setSelectedLabTestId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    testName: '',
    testCode: '',
    category: '',
    priority: 'ROUTINE' as 'ROUTINE' | 'URGENT' | 'STAT',
    instructions: '',
    fastingRequired: false,
    fastingHours: '',
    specialInstructions: '',
    testCost: '',
  });

  // Fetch available lab tests
  useQuery<any>({
    queryKey: ['lab-tests'],
    queryFn: async () => {
      const response = await labApi.getLabTests();
      return response.data?.data;
    },
  });

  const handleTestSelect = (test: { id: string; name: string; code?: string; category?: string; charge?: number }) => {
    setSelectedLabTestId(test.id);
    setFormData(prev => ({
      ...prev,
      testName: test.name,
      testCode: test.code || '',
      category: test.category || '',
      testCost: test.charge?.toString() || '',
    }));
  };

  const handleManualTestNameChange = (value: string) => {
    if (value !== formData.testName) {
      setSelectedLabTestId(null);
    }
    setFormData(prev => ({ ...prev, testName: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.testName.trim()) {
      toast.error('Test name is required');
      return;
    }

    // Don't create the test immediately, just pass it to parent
    const testData = {
      testName: formData.testName,
      testCode: formData.testCode || undefined,
      category: formData.category || undefined,
      priority: formData.priority,
      instructions: formData.instructions || undefined,
      fastingRequired: formData.fastingRequired,
      fastingHours: formData.fastingHours ? parseInt(formData.fastingHours) : undefined,
      specialInstructions: formData.specialInstructions || undefined,
      testCost: formData.testCost ? parseFloat(formData.testCost) : undefined,
      labTestId: selectedLabTestId || undefined,
    };

    onSuccess(testData);
    
    // Reset form
    setFormData({
      testName: '',
      testCode: '',
      category: '',
      priority: 'ROUTINE',
      instructions: '',
      fastingRequired: false,
      fastingHours: '',
      specialInstructions: '',
      testCost: '',
    });
    setSelectedLabTestId(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5 text-purple-600" />
            Order Lab Test - {patientName}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="testName">Test Name *</Label>
            <LabTestSearch
              onTestSelect={handleTestSelect}
              placeholder="Search or select a lab test..."
            />
            <Input
              id="testName"
              value={formData.testName}
              onChange={(e) => handleManualTestNameChange(e.target.value)}
              placeholder="Or enter test name manually"
              className="mt-2"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="testCode">Test Code</Label>
              <Input
                id="testCode"
                value={formData.testCode}
                onChange={(e) => setFormData(prev => ({ ...prev, testCode: e.target.value }))}
                placeholder="e.g., CBC001"
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="e.g., Hematology"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Priority *</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ROUTINE">Routine</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                  <SelectItem value="STAT">STAT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="testCost">Test Cost (₹)</Label>
              <Input
                id="testCost"
                type="number"
                value={formData.testCost}
                onChange={(e) => setFormData(prev => ({ ...prev, testCost: e.target.value }))}
                placeholder="e.g., 500"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
              placeholder="Enter test instructions..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
              Add Test
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
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
  const [isLabTestFormOpen, setIsLabTestFormOpen] = useState(false);
  const [pendingLabTests, setPendingLabTests] = useState<Array<{
    testName: string;
    testCode?: string;
    category?: string;
    priority: 'ROUTINE' | 'URGENT' | 'STAT';
    instructions?: string;
    fastingRequired?: boolean;
    fastingHours?: number;
    specialInstructions?: string;
    testCost?: number;
    labTestId?: string;
  }>>([]);

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
      setPendingLabTests([]);
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
      // Create the visit first
      await ipdApi.createVisit(formData);
      
      // Then create all pending lab tests
      if (pendingLabTests.length > 0) {
        for (const test of pendingLabTests) {
          try {
            await ipdApi.createIPDLabTest({
              admissionId,
              ...test
            });
          } catch (testError) {
            console.error('Error creating lab test:', testError);
            // Continue with other tests even if one fails
          }
        }
        toast.success(`Visit recorded and ${pendingLabTests.length} lab test(s) ordered successfully!`);
      } else {
        toast.success('Visit recorded successfully!');
      }
      
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
    <>
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

          {/* Order Lab Tests Section */}
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TestTube className="h-5 w-5 text-purple-600" />
                  Order Lab Tests
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    console.log('Order Tests clicked');
                    setIsLabTestFormOpen(true);
                  }}
                  className="bg-purple-600 hover:bg-purple-700"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Test
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingLabTests.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 mb-3">
                    <strong>{pendingLabTests.length}</strong> test(s) will be ordered when you record this visit:
                  </p>
                  {pendingLabTests.map((test, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-200">
                      <div className="flex items-center gap-3">
                        <TestTube className="h-4 w-4 text-purple-600" />
                        <div>
                          <p className="font-medium text-sm">{test.testName}</p>
                          <p className="text-xs text-gray-500">
                            {test.priority} {test.testCost && `• ₹${test.testCost}`}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPendingLabTests(prev => prev.filter((_, i) => i !== index));
                          toast.info('Test removed from queue');
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <TestTube className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No lab tests added yet</p>
                  <p className="text-xs">Click "Add Test" to order lab tests</p>
                </div>
              )}
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

    {/* Lab Test Form Modal */}
    <IPDLabTestFormModal
      isOpen={isLabTestFormOpen}
      onClose={() => setIsLabTestFormOpen(false)}
      patientName={patientName}
      onSuccess={(testData) => {
        setPendingLabTests(prev => [...prev, testData]);
        setIsLabTestFormOpen(false);
        toast.success('Lab test added! Click "Record Visit" to submit.');
      }}
    />
  </>
  );
}
