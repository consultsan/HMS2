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
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { ipdApi } from '@/api/ipd';
import { CreateIPDQueueData } from '@/types/ipd';
import { Patient } from '@/types/types';

interface AddQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddQueueModal({ isOpen, onClose, onSuccess }: AddQueueModalProps) {
  const [formData, setFormData] = useState<CreateIPDQueueData>({
    patientId: '',
    notes: ''
  });
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);


  // Fetch all patients on component mount (same as AddAppointment)
  useEffect(() => {
    const fetchAllPatients = async () => {
      try {
        const response = await ipdApi.getPatients();
        setPatients(response.data.data);
      } catch (error) {
        console.error('Error fetching patients:', error);
        setPatients([]);
      }
    };

    if (isOpen) {
      fetchAllPatients();
    }
  }, [isOpen]);

  // Filter patients based on search query (same as AddAppointment)
  const filteredPatients = patients?.filter(patient =>
    patient.name.toLowerCase().includes(patientSearchQuery.toLowerCase()) ||
    patient.patientUniqueId.toLowerCase().includes(patientSearchQuery.toLowerCase()) ||
    patient.phone.includes(patientSearchQuery)
  );

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setFormData(prev => ({ ...prev, patientId: patient.id }));
    setPatientSearchQuery(patient.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.patientId) {
      toast.error('Please select a patient');
      return;
    }

    setIsSubmitting(true);
    try { 
      await ipdApi.createQueue(formData);
      toast.success('IPD queue entry created successfully');
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error creating IPD queue:', error);
      toast.error(error.response?.data?.message || 'Failed to create IPD queue entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      patientId: '',
      notes: ''
    });
    setSelectedPatient(null);
    setPatientSearchQuery('');
    setPatients([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add IPD Queue Entry</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Selection */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Select Patient</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search patients by name, ID or phone..."
                value={patientSearchQuery}
                onChange={(e) => setPatientSearchQuery(e.target.value)}
                className="pl-8"
                disabled={isSubmitting}
              />
            </div>
            
            {/* Patient Search Results */}
            {patientSearchQuery && (
              <div className="rounded-md border bg-white shadow-sm max-h-48 overflow-y-auto">
                {filteredPatients?.map((patient) => (
                  <div
                    key={patient.id}
                    onClick={() => handlePatientSelect(patient)}
                    className="cursor-pointer p-2 hover:bg-gray-100 transition"
                  >
                    <div className="font-medium">{patient.name}</div>
                    <div className="text-sm text-gray-500">
                      {patient.phone}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Patient Display */}
            {selectedPatient && (
              <div className="text-sm text-green-700 mt-5 p-4 pl-0">
                Selected: <strong>{selectedPatient.name}</strong> • <span className="text-gray-600">{selectedPatient.phone}</span>
              </div>
            )}
          </div>


          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Notes (Optional)</Label>
            <Textarea
              placeholder="Add any additional notes..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="min-h-[100px]"
              disabled={isSubmitting}
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.patientId}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? 'Creating...' : 'Create Queue Entry'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
