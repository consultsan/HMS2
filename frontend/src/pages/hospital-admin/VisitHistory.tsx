import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useState } from 'react';
import { FormDialog } from '@/components/ui/form-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { format } from 'date-fns';

interface Visit {
  id: string;
  visitDate: string;
  visitType: 'OPD' | 'IPD' | 'ER';
  department: {
    name: string;
  };
  doctor: {
    name: string;
  };
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  clinicalRecord?: {
    diagnosis?: string;
    prescription?: string;
    notes?: string;
  };
  vitals: Array<{
    type: string;
    value: string;
    unit?: string;
    notes?: string;
  }>;
  attachments: Array<{
    id: string;
    type: string;
    url: string;
    fileName: string;
  }>;
}

interface VitalTrend {
  value: string;
  recordedAt: string;
  visit: {
    visitDate: string;
    doctor: {
      name: string;
    };
  };
}

interface Doctor {
  id: string;
  name: string;
  specialisation: string;
  role: string;
}

interface Department {
  id: string;
  name: string;
}

const VISIT_TYPES = [
  { value: 'OPD', label: 'OPD' },
  { value: 'IPD', label: 'IPD' },
  { value: 'ER', label: 'Emergency' },
];

const VITAL_TYPES = [
  { value: 'BP_SYSTOLIC', label: 'BP (Systolic)' },
  { value: 'BP_DIASTOLIC', label: 'BP (Diastolic)' },
  { value: 'HEART_RATE', label: 'Heart Rate' },
  { value: 'TEMPERATURE', label: 'Temperature' },
  { value: 'BLOOD_SUGAR', label: 'Blood Sugar' },
  { value: 'WEIGHT', label: 'Weight' },
  { value: 'HEIGHT', label: 'Height' },
  { value: 'SPO2', label: 'SpO2' },
  { value: 'RESPIRATORY_RATE', label: 'Respiratory Rate' },
];

export default function VisitHistory({ patientId }: { patientId: string }) {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [selectedVitalType, setSelectedVitalType] = useState('BP_SYSTOLIC');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  // Form states
  const [visitType, setVisitType] = useState('OPD');
  const [departmentId, setDepartmentId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [prescription, setPrescription] = useState('');
  const [notes, setNotes] = useState('');
  const [vitals, setVitals] = useState<Array<{ type: string; value: string; unit?: string }>>([]);

  // Fetch visits
  const { data: visits, isLoading } = useQuery<Visit[]>({
    queryKey: ['patient-visits', patientId],
    queryFn: async () => {
      const response = await api.get(`/api/hospital-admin/patients/${patientId}/visits`);
      return response.data;
    },
  });

  // Fetch departments
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await api.get('/api/hospital-admin/departments');
      return response.data;
    },
  });

  // Fetch doctors
  const { data: doctors } = useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      const response = await api.get('/api/hospital-admin/staff');
      // Filter only doctors from the response
      return response.data.filter((staff: any) => staff.role === 'DOCTOR');
    },
  });

  // Fetch vitals trend
  const { data: vitalsTrend } = useQuery<VitalTrend[]>({
    queryKey: ['vitals-trend', patientId, selectedVitalType, dateRange],
    queryFn: async () => {
      const response = await api.get(`/api/hospital-admin/patients/${patientId}/vitals-trend`, {
        params: {
          type: selectedVitalType,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      });
      return response.data;
    },
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  });

  // Add visit mutation
  const addVisitMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post(`/api/hospital-admin/patients/${patientId}/visits`, {
        ...data,
        patientId,
        vitals: data.vitals.filter((vital: any) => vital.type && vital.value)
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-visits', patientId] });
      setIsAddDialogOpen(false);
      toast.success('Visit added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add visit');
      console.error('Add visit error:', error);
    },
  });

  // Handle form submission
  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    addVisitMutation.mutate({
      visitType,
      departmentId,
      doctorId,
      diagnosis,
      prescription,
      notes,
      vitals,
    });
  };

  // Handle file upload
  const handleFileUpload = async (file: File, visitId: string, type: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      await api.post(`/api/hospital-admin/visits/${visitId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      queryClient.invalidateQueries({ queryKey: ['patient-visits', patientId] });
      toast.success('File uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload file');
      console.error('File upload error:', error);
    }
  };

  // Handle clinical summary generation
  const handleGenerateSummary = async (visitId: string) => {
    try {
      const response = await api.get(`/api/hospital-admin/visits/${visitId}/clinical-summary`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `clinical-summary-${visitId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Failed to generate clinical summary');
      console.error('Summary generation error:', error);
    }
  };

  // Update event handlers with proper types
  const handleDiagnosisChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDiagnosis(e.target.value);
  };

  const handlePrescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrescription(e.target.value);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  };

  // Add this function to handle doctor selection
  const handleDoctorChange = (selectedDoctorId: string) => {
    setDoctorId(selectedDoctorId);
    const selectedDoctor = doctors?.find((doc: Doctor) => doc.id === selectedDoctorId);
    if (selectedDoctor?.specialisation) {
      // Find department that matches the doctor's specialization
      const matchingDepartment = departments?.find((dept: Department) =>
        dept.name.toLowerCase() === selectedDoctor.specialisation.toLowerCase()
      );
      if (matchingDepartment) {
        setDepartmentId(matchingDepartment.id);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Visit History</h1>
        <Button onClick={() => setIsAddDialogOpen(true)}>Add New Visit</Button>
      </div>

      {/* Vitals Trend Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Vitals Trend</h2>
        <div className="flex space-x-4 mb-4">
          <Select value={selectedVitalType} onValueChange={setSelectedVitalType}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select vital type" />
            </SelectTrigger>
            <SelectContent>
              {VITAL_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            className="w-[200px]"
          />
          <Input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            className="w-[200px]"
          />
        </div>
        {vitalsTrend && vitalsTrend.length > 0 && (
          <div className="h-[400px]">
            <LineChart
              width={800}
              height={400}
              data={vitalsTrend.map(vital => ({
                date: format(new Date(vital.recordedAt), 'MMM dd, yyyy'),
                value: parseFloat(vital.value),
                doctor: vital.visit.doctor.name,
              }))}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#8884d8" />
            </LineChart>
          </div>
        )}
      </div>

      {/* Visits Table */}
      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visits?.map((visit) => (
              <TableRow key={visit.id}>
                <TableCell>{format(new Date(visit.visitDate), 'MMM dd, yyyy')}</TableCell>
                <TableCell>{visit.visitType}</TableCell>
                <TableCell>{visit.department.name}</TableCell>
                <TableCell>{visit.doctor.name}</TableCell>
                <TableCell>{visit.status}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedVisit(visit);
                        setIsViewDialogOpen(true);
                      }}
                    >
                      View Details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateSummary(visit.id)}
                    >
                      Generate Summary
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add Visit Dialog */}
      <FormDialog
        isOpen={isAddDialogOpen}
        onClose={() => {
          setIsAddDialogOpen(false);
          // Reset form state when dialog is closed
          setVisitType('OPD');
          setDepartmentId('');
          setDoctorId('');
          setDiagnosis('');
          setPrescription('');
          setNotes('');
          setVitals([]);
        }}
        title="Add New Visit"
        onSubmit={handleAddSubmit}
        isLoading={addVisitMutation.isPending}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="visit-type">Visit Type</Label>
            <Select value={visitType} onValueChange={setVisitType}>
              <SelectTrigger>
                <SelectValue placeholder="Select visit type" />
              </SelectTrigger>
              <SelectContent>
                {VISIT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="doctor">Doctor</Label>
            <Select value={doctorId} onValueChange={handleDoctorChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select doctor" />
              </SelectTrigger>
              <SelectContent>
                {doctors?.map((doctor: any) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {doctor.name} ({doctor.specialisation})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments?.map((dept: any) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="diagnosis">Diagnosis</Label>
            <Textarea
              id="diagnosis"
              value={diagnosis}
              onChange={handleDiagnosisChange}
              placeholder="Enter diagnosis"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prescription">Prescription</Label>
            <Textarea
              id="prescription"
              value={prescription}
              onChange={handlePrescriptionChange}
              placeholder="Enter prescription"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={handleNotesChange}
              placeholder="Enter additional notes"
            />
          </div>

          {/* Vitals Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Vitals</h3>
            {vitals.map((vital, index) => (
              <div key={index} className="flex space-x-2">
                <Select
                  value={vital.type}
                  onValueChange={(value) => {
                    const newVitals = [...vitals];
                    newVitals[index].type = value;
                    setVitals(newVitals);
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select vital type" />
                  </SelectTrigger>
                  <SelectContent>
                    {VITAL_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={vital.value}
                  onChange={(e) => {
                    const newVitals = [...vitals];
                    newVitals[index].value = e.target.value;
                    setVitals(newVitals);
                  }}
                  placeholder="Value"
                  className="w-[100px]"
                />
                <Input
                  value={vital.unit || ''}
                  onChange={(e) => {
                    const newVitals = [...vitals];
                    newVitals[index].unit = e.target.value;
                    setVitals(newVitals);
                  }}
                  placeholder="Unit"
                  className="w-[100px]"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const newVitals = [...vitals];
                    newVitals.splice(index, 1);
                    setVitals(newVitals);
                  }}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => setVitals([...vitals, { type: '', value: '', unit: '' }])}
            >
              Add Vital
            </Button>
          </div>
        </div>
      </FormDialog>

      {/* View Visit Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Visit Details</DialogTitle>
          </DialogHeader>
          {selectedVisit && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date</Label>
                    <p>{format(new Date(selectedVisit.visitDate), 'MMM dd, yyyy')}</p>
                  </div>
                  <div>
                    <Label>Type</Label>
                    <p>{selectedVisit.visitType}</p>
                  </div>
                  <div>
                    <Label>Department</Label>
                    <p>{selectedVisit.department.name}</p>
                  </div>
                  <div>
                    <Label>Doctor</Label>
                    <p>{selectedVisit.doctor.name}</p>
                  </div>
                </div>
              </div>

              {selectedVisit.clinicalRecord && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Clinical Record</h3>
                  <div className="space-y-4">
                    <div>
                      <Label>Diagnosis</Label>
                      <p className="whitespace-pre-wrap">{selectedVisit.clinicalRecord.diagnosis || '-'}</p>
                    </div>
                    <div>
                      <Label>Prescription</Label>
                      <p className="whitespace-pre-wrap">{selectedVisit.clinicalRecord.prescription || '-'}</p>
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <p className="whitespace-pre-wrap">{selectedVisit.clinicalRecord.notes || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedVisit.vitals.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Vitals</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedVisit.vitals.map((vital, index) => (
                      <div key={index}>
                        <Label>{VITAL_TYPES.find(t => t.value === vital.type)?.label || vital.type}</Label>
                        <p>{vital.value} {vital.unit}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedVisit.attachments.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Attachments</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedVisit.attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span>{attachment.fileName}</span>
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          View
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        handleFileUpload(file, selectedVisit.id, 'PRESCRIPTION');
                      }
                    };
                    input.click();
                  }}
                >
                  Upload File
                </Button>
                <Button onClick={() => handleGenerateSummary(selectedVisit.id)}>
                  Generate Summary
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 