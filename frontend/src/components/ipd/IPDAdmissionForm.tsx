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
  CheckCircle,
  Upload,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { ipdApi } from '@/api/ipd';
import { IPDAdmissionData, IPDQueueEntry, Doctor, Ward, WardSubType, Bed, InsuranceCompany } from '@/types/ipd';

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
  const [beds, setBeds] = useState<Bed[]>([]);
  const [insuranceCompanies, setInsuranceCompanies] = useState<InsuranceCompany[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  const [insuranceCardFile, setInsuranceCardFile] = useState<File | null>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen && queueEntry) {
      setFormData({
        queueId: queueEntry.id,
        assignedDoctorId: '',
        insuranceType: 'NA' as any,
        wardType: 'GENERAL' as any,
        wardSubType: undefined,
        wardId: '',
        bedId: '',
        insuranceCompany: '',
        policyNumber: '',
        insuranceNumber: '',
        tpaName: '',
        roomNumber: '',
        bedNumber: '',
        chiefComplaint: '',
        admissionNotes: '',
      });
      setInsuranceCardFile(null);
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

  const fetchBeds = async (wardId: string) => {
    try {
      const response = await ipdApi.getAvailableBeds(wardId);
      setBeds(response.data.data);
    } catch (error) {
      console.error('Error fetching beds:', error);
      toast.error('Failed to fetch beds');
    }
  };

  const handleInputChange = (field: keyof IPDAdmissionData, value: string | WardSubType | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Reset ward and bed selection when ward type or sub type changes
    if (field === 'wardType' || field === 'wardSubType') {
      setFormData(prev => ({
        ...prev,
        wardId: '',
        bedId: '',
        bedNumber: '',
        roomNumber: ''
      }));
      setSelectedWard(null);
      setBeds([]);
    }

    // If ward is selected, fetch beds for that ward and set ward name
    if (field === 'wardId' && value) {
      const ward = wards.find(w => w.id === value);
      if (ward) {
        setSelectedWard(ward);
        // Auto-set ward name in form data
        setFormData(prev => ({
          ...prev,
          roomNumber: ward.name
        }));
        fetchBeds(value);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.assignedDoctorId || !formData.wardType || !formData.wardId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      
      // Create FormData for file upload
      const formDataToSend = new FormData();
      
      // Add all form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formDataToSend.append(key, value.toString());
        }
      });
      
      // Add insurance card file if provided
      if (insuranceCardFile) {
        formDataToSend.append('insuranceCard', insuranceCardFile);
      }
      
      console.log('Sending admission data:', formData);
      console.log('FormData entries:', [...formDataToSend.entries()]);
      
      await ipdApi.createAdmission(formDataToSend);
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
                      <Label htmlFor="insuranceNumber" className="text-sm font-medium text-gray-700">
                        Insurance Number
                      </Label>
                      <Input
                        id="insuranceNumber"
                        value={formData.insuranceNumber || ''}
                        onChange={(e) => handleInputChange('insuranceNumber', e.target.value)}
                        placeholder="Enter insurance number"
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

                    <div>
                      <Label htmlFor="insuranceCard" className="text-sm font-medium text-gray-700">
                        Insurance Card Document
                      </Label>
                      <div className="space-y-2">
                        {!insuranceCardFile ? (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                            <input
                              type="file"
                              id="insuranceCard"
                              accept="image/*,.pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setInsuranceCardFile(file);
                                }
                              }}
                              className="hidden"
                            />
                            <label
                              htmlFor="insuranceCard"
                              className="cursor-pointer flex flex-col items-center gap-2"
                            >
                              <Upload className="h-8 w-8 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                Click to upload insurance card
                              </span>
                              <span className="text-xs text-gray-500">
                                Supports: JPG, PNG, PDF
                              </span>
                            </label>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-green-800">
                                {insuranceCardFile.name}
                              </span>
                              <span className="text-xs text-green-600">
                                ({(insuranceCardFile.size / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setInsuranceCardFile(null)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <Label htmlFor="wardSubType" className="text-sm font-medium text-gray-700">
                    Ward Sub Type
                  </Label>
                  <Select
                    value={formData.wardSubType || 'none'}
                    onValueChange={(value) => handleInputChange('wardSubType', value === 'none' ? undefined : value as WardSubType)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select ward sub type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value={WardSubType.AC}>AC</SelectItem>
                      <SelectItem value={WardSubType.NON_AC}>Non-AC</SelectItem>
                      <SelectItem value={WardSubType.SINGLE}>Single</SelectItem>
                      <SelectItem value={WardSubType.DOUBLE}>Double</SelectItem>
                      <SelectItem value={WardSubType.TRIPLE}>Triple</SelectItem>
                      <SelectItem value={WardSubType.QUADRUPLE}>Quadruple</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="wardId" className="text-sm font-medium text-gray-700">
                    Select Ward <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.wardId || 'none'}
                    onValueChange={(value) => handleInputChange('wardId', value === 'none' ? '' : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a ward" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select ward</SelectItem>
                      {wards
                        .filter(ward => {
                          // Filter by ward type
                          if (ward.type !== formData.wardType) return false;
                          
                          // Filter by ward sub type if specified
                          if (formData.wardSubType && ward.subType !== formData.wardSubType) return false;
                          
                          return true;
                        })
                        .map((ward) => (
                          <SelectItem key={ward.id} value={ward.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{ward.name}</span>
                              <span className="text-sm text-gray-500">
                                {ward.availableBeds} of {ward.totalBeds} beds available
                                {ward.subType && ` • ${ward.subType}`}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Bed Selection Grid */}
              {selectedWard && beds.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Select Bed - {selectedWard.name}
                  </Label>
                  <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                    {beds.map((bed) => (
                      <div
                        key={bed.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          formData.bedId === bed.id
                            ? 'bg-blue-100 border-blue-300 text-blue-800'
                            : 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200'
                        }`}
                        onClick={() => {
                          handleInputChange('bedId', bed.id);
                          handleInputChange('bedNumber', bed.bedNumber);
                        }}
                      >
                        <div className="text-center">
                          <div className="font-medium text-sm">Bed {bed.bedNumber}</div>
                          {bed.pricePerDay && (
                            <div className="text-xs text-gray-600">₹{bed.pricePerDay}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                      <span>Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
                      <span>Selected</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Manual Room/Bed Entry */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    {formData.insuranceNumber && <div>• Insurance Number: <span className="font-medium">{formData.insuranceNumber}</span></div>}
                    {insuranceCardFile && <div>• Insurance Card: <span className="font-medium text-green-600">Uploaded</span></div>}
                    <div>• Ward: <Badge className={getWardTypeColor(formData.wardType)}>
                      {formData.wardType}
                    </Badge></div>
                    {formData.wardSubType && <div>• Sub Type: <span className="font-medium">{formData.wardSubType}</span></div>}
                    {selectedWard && <div>• Ward: <span className="font-medium">{selectedWard.name}</span></div>}
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
              disabled={isSubmitting || !formData.assignedDoctorId || !formData.wardType || !formData.wardId}
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
