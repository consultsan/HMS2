import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Stethoscope, 
  Shield, 
  Building, 
  FileText,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { ipdApi } from '@/api/ipd';
import { IPDAdmissionData, IPDQueueEntry, Doctor, Ward, InsuranceCompany } from '@/types/ipd';

interface IPDAdmissionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  queueEntry: IPDQueueEntry | null;
}

export default function IPDAdmissionForm({ 
  isOpen, 
  onClose, 
  onSuccess, 
  queueEntry 
}: IPDAdmissionFormProps) {
  const [formData, setFormData] = useState<IPDAdmissionData>({
    queueId: '',
    assignedDoctorId: '',
    insuranceType: 'NA' as any,
    wardType: 'GENERAL' as any,
  });
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [insuranceCompanies, setInsuranceCompanies] = useState<InsuranceCompany[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen && queueEntry) {
      setFormData({
        queueId: queueEntry.id,
        assignedDoctorId: '',
        insuranceType: 'NA' as any,
        wardType: 'GENERAL' as any,
        insuranceCompany: '',
        policyNumber: '',
        tpaName: '',
        roomNumber: '',
        bedNumber: '',
        chiefComplaint: '',
        admissionNotes: '',
      });
    }
  }, [isOpen, queueEntry]);

  // Fetch required data
  useEffect(() => {
    if (isOpen) {
      fetchDoctors();
      fetchWards();
      fetchInsuranceCompanies();
    }
  }, [isOpen]);

  const fetchDoctors = async () => {
    try {
      const response = await ipdApi.getDoctors();
      setDoctors(response.data.data);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast.error('Failed to fetch doctors');
    }
  };

  const fetchWards = async () => {
    try {
      const response = await ipdApi.getWards();
      setWards(response.data.data);
    } catch (error) {
      console.error('Error fetching wards:', error);
      toast.error('Failed to fetch wards');
    }
  };

  const fetchInsuranceCompanies = async () => {
    try {
      const response = await ipdApi.getInsuranceCompanies();
      setInsuranceCompanies(response.data.data);
    } catch (error) {
      console.error('Error fetching insurance companies:', error);
      toast.error('Failed to fetch insurance companies');
    }
  };

  const handleInputChange = (field: keyof IPDAdmissionData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.assignedDoctorId || !formData.wardType) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await ipdApi.createAdmission(formData);
      
      // Update ward bed count after successful admission
      try {
        // Find the ward that matches the wardType
        const selectedWard = wards.find(ward => ward.type === formData.wardType);
        if (selectedWard) {
          // Calculate new occupied beds (current + 1)
          const newOccupiedBeds = selectedWard.occupiedBeds + 1;
          const newAvailableBeds = selectedWard.totalBeds - newOccupiedBeds;
          
          // Update the ward bed count
          await ipdApi.updateWardBedCount(selectedWard.id, {
            occupiedBeds: newOccupiedBeds,
            availableBeds: newAvailableBeds
          });
        }
      } catch (bedUpdateError) {
        console.error('Error updating bed count:', bedUpdateError);
        // Don't fail the admission if bed update fails
      }
      
      toast.success('Patient admitted successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating admission:', error);
      toast.error(error.response?.data?.message || 'Failed to admit patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWardTypeColor = (type: string) => {
    switch (type) {
      case 'ICU': return 'bg-red-100 text-red-800 border-red-200';
      case 'PRIVATE': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'SEMI_PRIVATE': return 'bg-green-100 text-green-800 border-green-200';
      case 'EMERGENCY': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getInsuranceTypeColor = (type: string) => {
    switch (type) {
      case 'CASHLESS': return 'bg-green-100 text-green-800 border-green-200';
      case 'REIMBURSEMENT': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!queueEntry) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-blue-600" />
            IPD Admission Form
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-4 w-4" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Patient Name</Label>
                  <div className="p-3 bg-gray-50 rounded-md border">
                    <span className="font-medium">{queueEntry.patient.name}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">UHID</Label>
                  <div className="p-3 bg-gray-50 rounded-md border">
                    <span className="font-mono text-sm">{queueEntry.patient.uhid}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Phone</Label>
                  <div className="p-3 bg-gray-50 rounded-md border">
                    <span>{queueEntry.patient.phone}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Gender</Label>
                  <div className="p-3 bg-gray-50 rounded-md border">
                    <span>{queueEntry.patient.gender}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Doctor Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Stethoscope className="h-4 w-4" />
                Doctor Assignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="assignedDoctorId" className="text-sm font-medium text-gray-700">
                    Assigned Doctor <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.assignedDoctorId}
                    onValueChange={(value) => handleInputChange('assignedDoctorId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{doctor.name}</span>
                            <span className="text-sm text-gray-500">{doctor.specialisation}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Insurance Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-4 w-4" />
                Insurance Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="insuranceType" className="text-sm font-medium text-gray-700">
                    Insurance Type <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.insuranceType}
                    onValueChange={(value) => handleInputChange('insuranceType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select insurance type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NA">No Insurance</SelectItem>
                      <SelectItem value="CASHLESS">Cashless</SelectItem>
                      <SelectItem value="REIMBURSEMENT">Reimbursement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.insuranceType !== 'NA' && (
                  <>
                    <div>
                      <Label htmlFor="insuranceCompany" className="text-sm font-medium text-gray-700">
                        Insurance Company
                      </Label>
                      <Select
                        value={formData.insuranceCompany || 'none'}
                        onValueChange={(value) => handleInputChange('insuranceCompany', value === 'none' ? '' : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select insurance company" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Select company</SelectItem>
                          {insuranceCompanies.map((company) => (
                            <SelectItem key={company.id} value={company.name}>
                              <div className="flex items-center gap-2">
                                <span>{company.name}</span>
                                {company.isPartnered && (
                                  <Badge variant="secondary" className="text-xs">
                                    Partnered
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="policyNumber" className="text-sm font-medium text-gray-700">
                        Policy Number
                      </Label>
                      <Input
                        id="policyNumber"
                        value={formData.policyNumber || ''}
                        onChange={(e) => handleInputChange('policyNumber', e.target.value)}
                        placeholder="Enter policy number"
                      />
                    </div>

                    <div>
                      <Label htmlFor="tpaName" className="text-sm font-medium text-gray-700">
                        TPA Name
                      </Label>
                      <Input
                        id="tpaName"
                        value={formData.tpaName || ''}
                        onChange={(e) => handleInputChange('tpaName', e.target.value)}
                        placeholder="Enter TPA name"
                      />
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Ward Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building className="h-4 w-4" />
                Ward Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="wardType" className="text-sm font-medium text-gray-700">
                    Ward Type <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.wardType}
                    onValueChange={(value) => handleInputChange('wardType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select ward type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GENERAL">General</SelectItem>
                      <SelectItem value="ICU">ICU</SelectItem>
                      <SelectItem value="PRIVATE">Private</SelectItem>
                      <SelectItem value="SEMI_PRIVATE">Semi-Private</SelectItem>
                      <SelectItem value="EMERGENCY">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="roomNumber" className="text-sm font-medium text-gray-700">
                    Room Number
                  </Label>
                  <Input
                    id="roomNumber"
                    value={formData.roomNumber || ''}
                    onChange={(e) => handleInputChange('roomNumber', e.target.value)}
                    placeholder="Enter room number"
                  />
                </div>

                <div>
                  <Label htmlFor="bedNumber" className="text-sm font-medium text-gray-700">
                    Bed Number
                  </Label>
                  <Input
                    id="bedNumber"
                    value={formData.bedNumber || ''}
                    onChange={(e) => handleInputChange('bedNumber', e.target.value)}
                    placeholder="Enter bed number"
                  />
                </div>
              </div>

              {/* Available Wards */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Available Wards
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {wards
                    .filter(ward => ward.type === formData.wardType)
                    .map((ward) => (
                      <div
                        key={ward.id}
                        className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          // Auto-fill room and bed if available
                          if (ward.availableBeds > 0) {
                            handleInputChange('roomNumber', ward.name);
                            handleInputChange('bedNumber', `Bed ${ward.occupiedBeds + 1}`);
                          }
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">{ward.name}</div>
                            <div className="text-sm text-gray-500">
                              {ward.availableBeds} of {ward.totalBeds} beds available
                            </div>
                          </div>
                          <Badge 
                            className={getWardTypeColor(ward.type)}
                          >
                            {ward.type}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Medical Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-4 w-4" />
                Medical Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="chiefComplaint" className="text-sm font-medium text-gray-700">
                  Chief Complaint
                </Label>
                <Textarea
                  id="chiefComplaint"
                  value={formData.chiefComplaint || ''}
                  onChange={(e) => handleInputChange('chiefComplaint', e.target.value)}
                  placeholder="Enter chief complaint"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="admissionNotes" className="text-sm font-medium text-gray-700">
                  Admission Notes
                </Label>
                <Textarea
                  id="admissionNotes"
                  value={formData.admissionNotes || ''}
                  onChange={(e) => handleInputChange('admissionNotes', e.target.value)}
                  placeholder="Enter admission notes"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Form Summary */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Admission Summary</h4>
                  <div className="mt-2 space-y-1 text-sm text-blue-800">
                    <div>• Patient: <span className="font-medium">{queueEntry.patient.name}</span></div>
                    <div>• Insurance: <Badge className={getInsuranceTypeColor(formData.insuranceType)}>
                      {formData.insuranceType}
                    </Badge></div>
                    <div>• Ward: <Badge className={getWardTypeColor(formData.wardType)}>
                      {formData.wardType}
                    </Badge></div>
                    {formData.roomNumber && <div>• Room: <span className="font-medium">{formData.roomNumber}</span></div>}
                    {formData.bedNumber && <div>• Bed: <span className="font-medium">{formData.bedNumber}</span></div>}
                  </div>
                </div>
              </div>
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
              disabled={isSubmitting || !formData.assignedDoctorId || !formData.wardType}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Admitting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Admit Patient
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
