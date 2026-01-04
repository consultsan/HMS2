import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Stethoscope, Search } from 'lucide-react';
import { toast } from 'sonner';
import { ipdApi } from '@/api/ipd';
import { useQuery } from '@tanstack/react-query';
import { surgeriesBySpecialisation } from '@/constants/doctorSpecialization';

interface IPDSurgeryFormProps {
  admissionId: string;
  patientName: string;
  onSuccess: () => void;
  onCancel: () => void;
  opdSurgery?: any; // Optional OPD surgery data for pre-filling
}

export default function IPDSurgeryForm({
  admissionId,
  patientName: _patientName,
  onSuccess,
  onCancel,
  opdSurgery
}: IPDSurgeryFormProps) {
  const [formData, setFormData] = useState({
    surgeryName: opdSurgery?.category || '',
    surgeryCode: '',
    category: opdSurgery?.category || '',
    priority: 'ROUTINE' as 'ROUTINE' | 'URGENT' | 'STAT',
    scheduledAt: opdSurgery?.scheduledAt ? new Date(opdSurgery.scheduledAt).toISOString().slice(0, 16) : '',
    estimatedDuration: '',
    procedureDescription: opdSurgery?.description || '',
    preoperativeDiagnosis: '',
    postoperativeDiagnosis: '',
    anesthesiaType: '',
    anesthesiaNotes: '',
    surgicalNotes: '',
    complications: '',
    bloodLoss: '',
    bloodTransfusion: false,
    bloodUnits: '',
    primarySurgeon: '',
    assistantSurgeon: '',
    anesthesiologist: '',
    scrubNurse: '',
    circulatingNurse: '',
    surgeryCost: '',
    anesthesiaCost: '',
    totalCost: '',
    primarySurgeonId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [surgerySearch, setSurgerySearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [showSurgeryDropdown, setShowSurgeryDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [isCustomSurgery, setIsCustomSurgery] = useState(false);
  const [isCustomSurgeon, setIsCustomSurgeon] = useState(false);
  const [isCustomAnesthesiologist, setIsCustomAnesthesiologist] = useState(false);
  
  const surgeryDropdownRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (surgeryDropdownRef.current && !surgeryDropdownRef.current.contains(event.target as Node)) {
        setShowSurgeryDropdown(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch doctors for surgeon selection
  const { data: doctors } = useQuery<any[]>({
    queryKey: ['doctors'],
    queryFn: async () => {
      const response = await ipdApi.getDoctors();
      return response.data?.data || [];
    },
  });

  // Get all unique surgeries from all specializations
  const allSurgeries = useMemo(() => {
    const surgerySet = new Set<string>();
    Object.values(surgeriesBySpecialisation).forEach(surgeries => {
      surgeries.forEach(surgery => surgerySet.add(surgery));
    });
    return Array.from(surgerySet).sort();
  }, []);

  // Filter surgeries based on search
  const filteredSurgeries = useMemo(() => {
    if (!surgerySearch) return allSurgeries;
    return allSurgeries.filter(surgery =>
      surgery.toLowerCase().includes(surgerySearch.toLowerCase())
    );
  }, [allSurgeries, surgerySearch]);

  // Get all unique categories (specializations)
  const allCategories = useMemo(() => {
    return Object.keys(surgeriesBySpecialisation).sort();
  }, []);

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!categorySearch) return allCategories;
    return allCategories.filter(category =>
      category.toLowerCase().includes(categorySearch.toLowerCase())
    );
  }, [allCategories, categorySearch]);

  // Get anesthesiologists only
  const anesthesiologists = useMemo(() => {
    return doctors?.filter(doctor => 
      doctor.specialisation?.toLowerCase().includes('anesthesiology') ||
      doctor.specialization?.toLowerCase().includes('anesthesiology')
    ) || [];
  }, [doctors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.surgeryName.trim()) {
      toast.error('Surgery name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await ipdApi.createIPDSurgery({
        admissionId,
        surgeryName: formData.surgeryName,
        surgeryCode: formData.surgeryCode || undefined,
        category: formData.category || undefined,
        priority: formData.priority,
        scheduledAt: formData.scheduledAt || undefined,
        estimatedDuration: formData.estimatedDuration ? parseInt(formData.estimatedDuration) : undefined,
        procedureDescription: formData.procedureDescription || undefined,
        preoperativeDiagnosis: formData.preoperativeDiagnosis || undefined,
        postoperativeDiagnosis: formData.postoperativeDiagnosis || undefined,
        anesthesiaType: formData.anesthesiaType || undefined,
        anesthesiaNotes: formData.anesthesiaNotes || undefined,
        surgicalNotes: formData.surgicalNotes || undefined,
        complications: formData.complications || undefined,
        bloodLoss: formData.bloodLoss ? parseInt(formData.bloodLoss) : undefined,
        bloodTransfusion: formData.bloodTransfusion,
        bloodUnits: formData.bloodUnits ? parseInt(formData.bloodUnits) : undefined,
        primarySurgeon: formData.primarySurgeon || undefined,
        assistantSurgeon: formData.assistantSurgeon || undefined,
        anesthesiologist: formData.anesthesiologist || undefined,
        scrubNurse: formData.scrubNurse || undefined,
        circulatingNurse: formData.circulatingNurse || undefined,
        surgeryCost: formData.surgeryCost ? parseFloat(formData.surgeryCost) : undefined,
        anesthesiaCost: formData.anesthesiaCost ? parseFloat(formData.anesthesiaCost) : undefined,
        totalCost: formData.totalCost ? parseFloat(formData.totalCost) : undefined,
        primarySurgeonId: formData.primarySurgeonId || undefined,
        originalOpdSurgeryId: opdSurgery?.id, // Link to original OPD surgery if exists
      });
      toast.success('Surgery scheduled successfully');
      onSuccess();
    } catch (error: any) {
      console.error('Error creating IPD surgery:', error);
      toast.error(error.response?.data?.message || 'Failed to schedule surgery');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {opdSurgery && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-blue-900">
              Pre-filled from OPD Surgery
            </span>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            This form has been pre-filled with data from the OPD surgery prescription. 
            Please review and update as needed.
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="relative" ref={surgeryDropdownRef}>
            <Label htmlFor="surgeryName">
              Surgery Name * {isCustomSurgery && <span className="text-blue-600 text-xs">(Custom)</span>}
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="surgeryName"
                value={surgerySearch || formData.surgeryName}
                onChange={(e) => {
                  setSurgerySearch(e.target.value);
                  setFormData(prev => ({ ...prev, surgeryName: e.target.value }));
                  setShowSurgeryDropdown(true);
                  setIsCustomSurgery(false);
                }}
                onFocus={() => setShowSurgeryDropdown(true)}
                placeholder={isCustomSurgery ? "Enter custom surgery name..." : "Search surgery name..."}
                required
                disabled={isSubmitting}
                className="pl-9"
              />
            </div>
            {showSurgeryDropdown && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {/* Custom Surgery Option */}
                <div
                  className="px-3 py-2 bg-blue-50 hover:bg-blue-100 cursor-pointer text-sm font-medium text-blue-700 border-b border-blue-200 sticky top-0"
                  onClick={() => {
                    setIsCustomSurgery(true);
                    setFormData(prev => ({ ...prev, surgeryName: '' }));
                    setSurgerySearch('');
                    setShowSurgeryDropdown(false);
                  }}
                >
                  ✏️ Add Custom Surgery
                </div>
                {/* Predefined Surgeries */}
                {filteredSurgeries.length > 0 ? (
                  filteredSurgeries.slice(0, 50).map((surgery) => (
                    <div
                      key={surgery}
                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, surgeryName: surgery }));
                        setSurgerySearch(surgery);
                        setShowSurgeryDropdown(false);
                        setIsCustomSurgery(false);
                      }}
                    >
                      {surgery}
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500 italic">
                    No matching surgeries found
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="surgeryCode">Surgery Code</Label>
            <Input
              id="surgeryCode"
              value={formData.surgeryCode}
              onChange={(e) => setFormData(prev => ({ ...prev, surgeryCode: e.target.value }))}
              placeholder="Enter surgery code"
              disabled={isSubmitting}
            />
          </div>
          <div className="relative" ref={categoryDropdownRef}>
            <Label htmlFor="category">Category</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="category"
                value={categorySearch || formData.category}
                onChange={(e) => {
                  setCategorySearch(e.target.value);
                  setFormData(prev => ({ ...prev, category: e.target.value }));
                  setShowCategoryDropdown(true);
                }}
                onFocus={() => setShowCategoryDropdown(true)}
                placeholder="Search category..."
                disabled={isSubmitting}
                className="pl-9"
              />
            </div>
            {showCategoryDropdown && filteredCategories.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {filteredCategories.map((category) => (
                  <div
                    key={category}
                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, category }));
                      setCategorySearch(category);
                      setShowCategoryDropdown(false);
                    }}
                  >
                    {category}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="priority">Priority *</Label>
            <Select
              value={formData.priority}
              onValueChange={(value: 'ROUTINE' | 'URGENT' | 'STAT') =>
                setFormData(prev => ({ ...prev, priority: value }))
              }
              disabled={isSubmitting}
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
            <Label htmlFor="scheduledAt">Scheduled Date & Time</Label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              value={formData.scheduledAt}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduledAt: e.target.value }))}
              disabled={isSubmitting}
            />
          </div>
          <div>
            <Label htmlFor="estimatedDuration">Estimated Duration (minutes)</Label>
            <Input
              id="estimatedDuration"
              type="number"
              value={formData.estimatedDuration}
              onChange={(e) => setFormData(prev => ({ ...prev, estimatedDuration: e.target.value }))}
              placeholder="e.g., 120"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <Label htmlFor="primarySurgeonId">
              Primary Surgeon {isCustomSurgeon && <span className="text-blue-600 text-xs">(Custom)</span>}
            </Label>
            {!isCustomSurgeon ? (
              <Select
                value={formData.primarySurgeonId}
                onValueChange={(value) => {
                  if (value === 'custom') {
                    setIsCustomSurgeon(true);
                    setFormData(prev => ({ ...prev, primarySurgeonId: '', primarySurgeon: '' }));
                  } else {
                    setFormData(prev => ({ ...prev, primarySurgeonId: value }));
                    const doctor = doctors?.find(d => d.id === value);
                    if (doctor) {
                      const doctorName = doctor.name.startsWith('Dr.') || doctor.name.startsWith('Dr ') 
                        ? doctor.name 
                        : `Dr. ${doctor.name}`;
                      setFormData(prev => ({ ...prev, primarySurgeon: doctorName }));
                    }
                  }
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select surgeon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom" className="text-blue-700 font-medium bg-blue-50">
                    ✏️ Add Custom Surgeon
                  </SelectItem>
                  {doctors?.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {doctor.name.startsWith('Dr.') || doctor.name.startsWith('Dr ') ? doctor.name : `Dr. ${doctor.name}`} - {doctor.specialisation || doctor.specialization || 'General'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={formData.primarySurgeon}
                  onChange={(e) => setFormData(prev => ({ ...prev, primarySurgeon: e.target.value }))}
                  placeholder="Enter custom surgeon name"
                  disabled={isSubmitting}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsCustomSurgeon(false);
                    setFormData(prev => ({ ...prev, primarySurgeon: '', primarySurgeonId: '' }));
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="anesthesiologist">
              Anesthesiologist {isCustomAnesthesiologist && <span className="text-blue-600 text-xs">(Custom)</span>}
            </Label>
            {!isCustomAnesthesiologist ? (
              <Select
                value={formData.anesthesiologist}
                onValueChange={(value) => {
                  if (value === 'custom') {
                    setIsCustomAnesthesiologist(true);
                    setFormData(prev => ({ ...prev, anesthesiologist: '' }));
                  } else {
                    // Add Dr. prefix if not already present
                    const doctorName = value.startsWith('Dr.') || value.startsWith('Dr ') 
                      ? value 
                      : `Dr. ${value}`;
                    setFormData(prev => ({ ...prev, anesthesiologist: doctorName }));
                  }
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select anesthesiologist" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom" className="text-blue-700 font-medium bg-blue-50">
                    ✏️ Add Custom Anesthesiologist
                  </SelectItem>
                  {anesthesiologists.length > 0 ? (
                    anesthesiologists.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.name}>
                        {doctor.name.startsWith('Dr.') || doctor.name.startsWith('Dr ') ? doctor.name : `Dr. ${doctor.name}`} - {doctor.specialisation || doctor.specialization || 'Anesthesiology'}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled className="text-gray-400 italic">
                      No anesthesiologists registered
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={formData.anesthesiologist}
                  onChange={(e) => setFormData(prev => ({ ...prev, anesthesiologist: e.target.value }))}
                  placeholder="Enter custom anesthesiologist name"
                  disabled={isSubmitting}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsCustomAnesthesiologist(false);
                    setFormData(prev => ({ ...prev, anesthesiologist: '' }));
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="procedureDescription">Procedure Description</Label>
          <Textarea
            id="procedureDescription"
            value={formData.procedureDescription}
            onChange={(e) => setFormData(prev => ({ ...prev, procedureDescription: e.target.value }))}
            placeholder="Describe the surgical procedure"
            rows={3}
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="preoperativeDiagnosis">Preoperative Diagnosis</Label>
            <Textarea
              id="preoperativeDiagnosis"
              value={formData.preoperativeDiagnosis}
              onChange={(e) => setFormData(prev => ({ ...prev, preoperativeDiagnosis: e.target.value }))}
              placeholder="Preoperative diagnosis"
              rows={2}
              disabled={isSubmitting}
            />
          </div>
          <div>
            <Label htmlFor="postoperativeDiagnosis">Postoperative Diagnosis</Label>
            <Textarea
              id="postoperativeDiagnosis"
              value={formData.postoperativeDiagnosis}
              onChange={(e) => setFormData(prev => ({ ...prev, postoperativeDiagnosis: e.target.value }))}
              placeholder="Postoperative diagnosis (if available)"
              rows={2}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="anesthesiaType">Anesthesia Type</Label>
            <Input
              id="anesthesiaType"
              value={formData.anesthesiaType}
              onChange={(e) => setFormData(prev => ({ ...prev, anesthesiaType: e.target.value }))}
              placeholder="e.g., General, Local, Regional"
              disabled={isSubmitting}
            />
          </div>
          <div className="flex items-center gap-4 pt-6">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="bloodTransfusion"
                checked={formData.bloodTransfusion}
                onChange={(e) => setFormData(prev => ({ ...prev, bloodTransfusion: e.target.checked }))}
                disabled={isSubmitting}
                className="rounded"
              />
              <Label htmlFor="bloodTransfusion" className="font-normal cursor-pointer">
                Blood Transfusion Required
              </Label>
            </div>
            {formData.bloodTransfusion && (
              <div className="flex-1">
                <Input
                  type="number"
                  value={formData.bloodUnits}
                  onChange={(e) => setFormData(prev => ({ ...prev, bloodUnits: e.target.value }))}
                  placeholder="Units"
                  disabled={isSubmitting}
                  className="w-24"
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="assistantSurgeon">Assistant Surgeon</Label>
            <Input
              id="assistantSurgeon"
              value={formData.assistantSurgeon}
              onChange={(e) => setFormData(prev => ({ ...prev, assistantSurgeon: e.target.value }))}
              placeholder="Enter assistant surgeon name"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <Label htmlFor="scrubNurse">Scrub Nurse</Label>
            <Input
              id="scrubNurse"
              value={formData.scrubNurse}
              onChange={(e) => setFormData(prev => ({ ...prev, scrubNurse: e.target.value }))}
              placeholder="Enter scrub nurse name"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <Label htmlFor="circulatingNurse">Circulating Nurse</Label>
            <Input
              id="circulatingNurse"
              value={formData.circulatingNurse}
              onChange={(e) => setFormData(prev => ({ ...prev, circulatingNurse: e.target.value }))}
              placeholder="Enter circulating nurse name"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <Label htmlFor="bloodLoss">Blood Loss (ml)</Label>
            <Input
              id="bloodLoss"
              type="number"
              value={formData.bloodLoss}
              onChange={(e) => setFormData(prev => ({ ...prev, bloodLoss: e.target.value }))}
              placeholder="e.g., 200"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="surgeryCost">Surgery Cost</Label>
            <Input
              id="surgeryCost"
              type="number"
              step="0.01"
              value={formData.surgeryCost}
              onChange={(e) => setFormData(prev => ({ ...prev, surgeryCost: e.target.value }))}
              placeholder="0.00"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <Label htmlFor="anesthesiaCost">Anesthesia Cost</Label>
            <Input
              id="anesthesiaCost"
              type="number"
              step="0.01"
              value={formData.anesthesiaCost}
              onChange={(e) => setFormData(prev => ({ ...prev, anesthesiaCost: e.target.value }))}
              placeholder="0.00"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <Label htmlFor="totalCost">Total Cost</Label>
            <Input
              id="totalCost"
              type="number"
              step="0.01"
              value={formData.totalCost}
              onChange={(e) => setFormData(prev => ({ ...prev, totalCost: e.target.value }))}
              placeholder="0.00"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="anesthesiaNotes">Anesthesia Notes</Label>
          <Textarea
            id="anesthesiaNotes"
            value={formData.anesthesiaNotes}
            onChange={(e) => setFormData(prev => ({ ...prev, anesthesiaNotes: e.target.value }))}
            placeholder="Any notes about anesthesia"
            rows={2}
            disabled={isSubmitting}
          />
        </div>

        <div>
          <Label htmlFor="surgicalNotes">Surgical Notes</Label>
          <Textarea
            id="surgicalNotes"
            value={formData.surgicalNotes}
            onChange={(e) => setFormData(prev => ({ ...prev, surgicalNotes: e.target.value }))}
            placeholder="Any additional surgical notes"
            rows={2}
            disabled={isSubmitting}
          />
        </div>

        <div>
          <Label htmlFor="complications">Complications</Label>
          <Textarea
            id="complications"
            value={formData.complications}
            onChange={(e) => setFormData(prev => ({ ...prev, complications: e.target.value }))}
            placeholder="Any complications (if any)"
            rows={2}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Scheduling...' : 'Schedule Surgery'}
        </Button>
      </div>
    </form>
  );
}

