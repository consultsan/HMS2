import React, { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  FileText, 
  User, 
  Stethoscope,
  CheckCircle,
  IndianRupee,
  Receipt
} from 'lucide-react';
import { toast } from 'sonner';
import { ipdApi } from '@/api/ipd';
import { IPDQueueEntry, IPDBillCalculation } from '@/types/ipd';

interface ReceptionistDischargeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  queueEntry: IPDQueueEntry | null;
}

export default function ReceptionistDischargeForm({ 
  isOpen, 
  onClose, 
  onSuccess, 
  queueEntry 
}: ReceptionistDischargeFormProps) {
  const [formData, setFormData] = useState({
    dischargeDate: '',
    finalDiagnosis: '',
    treatmentSummary: '',
    proceduresPerformed: '',
    medicationsPrescribed: '',
    followUpInstructions: '',
    doctorSignature: '',
    hospitalStamp: ''
  });
  const [billData, setBillData] = useState<IPDBillCalculation | null>(null);
  const [isBillLoading, setIsBillLoading] = useState(false);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default discharge date and fetch bill calculation
  useEffect(() => {
    if (isOpen && queueEntry) {
      const now = new Date();
      const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      
      setFormData(prev => ({
        ...prev,
        dischargeDate: localDateTime
      }));

      // Fetch bill calculation
      fetchBillCalculation();
    }
  }, [isOpen, queueEntry]);

  const fetchBillCalculation = async () => {
    if (!queueEntry?.admission?.id) return;

    try {
      setIsBillLoading(true);
      const response = await ipdApi.calculateDischargeBill(queueEntry.admission.id);
      setBillData(response.data.data);
      // Set paid amount to amount due by default
      setPaidAmount(response.data.data.amountAfterAdvance);
    } catch (error) {
      console.error('Error fetching bill calculation:', error);
      toast.error('Failed to calculate bill');
    } finally {
      setIsBillLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!queueEntry || !queueEntry.admission) {
      toast.error('No admission data available');
      return;
    }

    // Validation
    if (!formData.dischargeDate || !formData.finalDiagnosis || !formData.treatmentSummary || 
        !formData.medicationsPrescribed || !formData.followUpInstructions) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);

      // Create discharge summary
      await ipdApi.createDischargeSummary({
        admissionId: queueEntry.admission.id,
        dischargeDate: formData.dischargeDate,
        finalDiagnosis: formData.finalDiagnosis,
        treatmentSummary: formData.treatmentSummary,
        proceduresPerformed: formData.proceduresPerformed,
        medicationsPrescribed: formData.medicationsPrescribed,
        followUpInstructions: formData.followUpInstructions,
        doctorSignature: formData.doctorSignature,
        hospitalStamp: formData.hospitalStamp
      });

      // Generate discharge bill
      try {
        const billResponse = await ipdApi.generateDischargeBill(queueEntry.admission.id, {
          paidAmount: paidAmount,
          notes: `Discharge bill for ${queueEntry.patient.name}`
        });
        
        toast.success(
          `Patient discharged successfully! Bill generated: ${billResponse.data.data.bill.billNumber}`,
          { duration: 5000 }
        );
      } catch (billError) {
        console.error('Error generating bill:', billError);
        toast.warning('Patient discharged but bill generation failed. Please generate manually.');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error discharging patient:', error);
      toast.error('Failed to discharge patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateStayDuration = () => {
    if (!queueEntry?.admission || !formData.dischargeDate) return 0;
    const admissionDate = new Date(queueEntry.admission.admissionDate);
    const dischargeDate = new Date(formData.dischargeDate);
    const diffTime = Math.abs(dischargeDate.getTime() - admissionDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (!queueEntry || !queueEntry.admission) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-red-600" />
            Discharge Patient
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bill Summary */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Receipt className="h-5 w-5 text-blue-600" />
                Bill Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isBillLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Calculating bill...</span>
                </div>
              ) : billData ? (
                <div className="space-y-3">
                  {/* Room Charges */}
                  <div className="flex justify-between items-center py-2 border-b">
                    <div>
                      <div className="font-medium text-gray-900">Room Charges</div>
                      <div className="text-sm text-gray-500">
                        {billData.billBreakdown.roomCharges.days} days × ₹{billData.billBreakdown.roomCharges.ratePerDay}/day
                      </div>
                    </div>
                    <div className="font-semibold text-gray-900">
                      ₹{billData.billBreakdown.roomCharges.amount.toFixed(2)}
                    </div>
                  </div>

                  {/* Surgery Charges */}
                  {billData.billBreakdown.surgeryCharges.count > 0 && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <div>
                        <div className="font-medium text-gray-900">Surgery Charges</div>
                        <div className="text-sm text-gray-500">
                          {billData.billBreakdown.surgeryCharges.count} procedure(s)
                        </div>
                        {billData.billBreakdown.surgeryCharges.items.map((surgery: any, idx: number) => (
                          <div key={idx} className="text-xs text-gray-500 ml-2 mt-1">
                            • {surgery.name} - ₹{surgery.cost.toFixed(2)}
                          </div>
                        ))}
                      </div>
                      <div className="font-semibold text-gray-900">
                        ₹{billData.billBreakdown.surgeryCharges.amount.toFixed(2)}
                      </div>
                    </div>
                  )}

                  {/* Lab Test Charges (IPD Tests) */}
                  {billData.billBreakdown.labTestCharges.count > 0 && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <div>
                        <div className="font-medium text-gray-900">Lab Test Charges (IPD Tests)</div>
                        <div className="text-sm text-gray-500">
                          {billData.billBreakdown.labTestCharges.count} test(s)
                        </div>
                        {billData.billBreakdown.labTestCharges.items.map((test: any, idx: number) => (
                          <div key={idx} className="text-xs text-gray-500 ml-2 mt-1">
                            • {test.name} - ₹{test.cost.toFixed(2)}
                          </div>
                        ))}
                      </div>
                      <div className="font-semibold text-gray-900">
                        ₹{billData.billBreakdown.labTestCharges.amount.toFixed(2)}
                      </div>
                    </div>
                  )}

                  {/* Subtotal */}
                  <div className="flex justify-between items-center py-2 bg-gray-100 px-3 rounded">
                    <div className="font-semibold text-gray-900">Subtotal</div>
                    <div className="font-semibold text-gray-900">
                      ₹{billData.totalAmount.toFixed(2)}
                    </div>
                  </div>

                  {/* Advance Payment */}
                  {billData.advanceAmount > 0 && (
                    <div className="flex justify-between items-center py-2 text-green-600">
                      <div>
                        <div className="font-medium">Advance Paid</div>
                        <div className="text-sm">
                          Bill: {billData.admission.advanceBillNumber || 'N/A'}
                        </div>
                      </div>
                      <div className="font-semibold">
                        -₹{billData.advanceAmount.toFixed(2)}
                      </div>
                    </div>
                  )}

                  {/* Amount Due */}
                  <div className="flex justify-between items-center py-3 bg-blue-100 px-3 rounded-lg border-2 border-blue-300">
                    <div className="font-bold text-blue-900 text-lg">Amount Due</div>
                    <div className="font-bold text-blue-900 text-xl">
                      ₹{billData.amountAfterAdvance.toFixed(2)}
                    </div>
                  </div>

                  {/* Payment Input */}
                  <div className="pt-3 border-t">
                    <Label htmlFor="paidAmount" className="text-gray-700 font-medium">
                      Amount Paid
                    </Label>
                    <div className="relative mt-1">
                      <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="paidAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                        className="pl-10"
                      />
                    </div>
                    {paidAmount < billData.amountAfterAdvance && (
                      <p className="text-sm text-orange-600 mt-1">
                        ⚠️ Partial payment: ₹{(billData.amountAfterAdvance - paidAmount).toFixed(2)} remaining
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No billing data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Patient Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Patient Name</div>
                  <div className="font-medium">{queueEntry.patient.name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">IPD Number</div>
                  <div className="font-medium">{queueEntry.ipdNumber}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Ward</div>
                  <Badge className="bg-blue-100 text-blue-800">
                    {queueEntry.admission.wardType}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Room/Bed</div>
                  <div className="font-medium">
                    {queueEntry.admission.roomNumber || 'N/A'} / {queueEntry.admission.bedNumber || 'N/A'}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <div className="text-sm text-gray-500">Admission Date</div>
                  <div className="font-medium">{formatDate(queueEntry.admission.admissionDate)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Stay Duration</div>
                  <div className="font-medium">{calculateStayDuration()} days</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Discharge Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Discharge Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dischargeDate" className="text-red-600">
                    Discharge Date & Time *
                  </Label>
                  <Input
                    id="dischargeDate"
                    name="dischargeDate"
                    type="datetime-local"
                    value={formData.dischargeDate}
                    onChange={handleInputChange}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="finalDiagnosis" className="text-red-600">
                    Final Diagnosis *
                  </Label>
                  <Input
                    id="finalDiagnosis"
                    name="finalDiagnosis"
                    value={formData.finalDiagnosis}
                    onChange={handleInputChange}
                    placeholder="Enter final diagnosis"
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="treatmentSummary" className="text-red-600">
                  Treatment Summary *
                </Label>
                <Textarea
                  id="treatmentSummary"
                  name="treatmentSummary"
                  value={formData.treatmentSummary}
                  onChange={handleInputChange}
                  placeholder="Summarize the treatment provided during the stay"
                  required
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="proceduresPerformed">
                  Procedures Performed
                </Label>
                <Textarea
                  id="proceduresPerformed"
                  name="proceduresPerformed"
                  value={formData.proceduresPerformed}
                  onChange={handleInputChange}
                  placeholder="List any procedures or surgeries performed"
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="medicationsPrescribed" className="text-red-600">
                  Medications Prescribed *
                </Label>
                <Textarea
                  id="medicationsPrescribed"
                  name="medicationsPrescribed"
                  value={formData.medicationsPrescribed}
                  onChange={handleInputChange}
                  placeholder="List all medications prescribed for discharge"
                  required
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="followUpInstructions" className="text-red-600">
                  Follow-up Instructions *
                </Label>
                <Textarea
                  id="followUpInstructions"
                  name="followUpInstructions"
                  value={formData.followUpInstructions}
                  onChange={handleInputChange}
                  placeholder="Provide follow-up care instructions"
                  required
                  rows={3}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Doctor Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Doctor Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="doctorSignature">
                    Doctor Signature
                  </Label>
                  <Input
                    id="doctorSignature"
                    name="doctorSignature"
                    value={formData.doctorSignature}
                    onChange={handleInputChange}
                    placeholder="Doctor's signature"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="hospitalStamp">
                    Hospital Stamp
                  </Label>
                  <Input
                    id="hospitalStamp"
                    name="hospitalStamp"
                    value={formData.hospitalStamp}
                    onChange={handleInputChange}
                    placeholder="Hospital stamp/approval"
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
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
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Discharge & Generate Bill
                </div>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
