import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormDialog } from '@/components/ui/form-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import AddAppointment from '@/components/appointment/AddAppointment';
import { Patient, PatientCreateData, User } from '@/types/types';
import { UserRole } from '@/types/types';
import { calculateAge } from '@/utils/dateUtils';
import { patientApi } from '@/api/patient';
import PatientDetails from './PatientDetails';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  UserPlus,
  Search,
  Phone,
  Calendar,
  Users,
  AlertCircle,
  User as UserIcon,
} from 'lucide-react';
import { Description, DialogTitle } from '@radix-ui/react-dialog';

// Registration mode and source enums
const REGISTRATION_MODES = [
  { value: 'OPD', label: 'OPD' },
  { value: 'IPD', label: 'IPD' },
  { value: 'EMERGENCY', label: 'Emergency' },
];

const REGISTRATION_SOURCES = [
  { value: 'WALK_IN', label: 'Walk-in' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'DIGITAL', label: 'Digital' },
  { value: 'AFFILIATE', label: 'Affiliate' },
];

export default function Patients() {
  // const { user } = useAuth();
  const user: User = {
    id: 'dummy-receptionist-1',
    email: 'receptionist@example.com',
    name: 'Dummy Receptionist',
    role: UserRole.RECEPTIONIST,
    hospitalId: 'hospital-001',
  };
  const allowedAddRoles = ['HOSPITAL_ADMIN', 'RECEPTIONIST', 'SALES_PERSON'];
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [searchValue, setSearchValue] = useState('');
  const [, setSearchResult] = useState<Patient | null>(null);
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addGender, setAddGender] = useState('');
  const [addDob, setAddDob] = useState('');
  const [addRegistrationMode, setAddRegistrationMode] = useState('OPD');
  const [addRegistrationSource, setAddRegistrationSource] = useState('WALK_IN');
  const [addRegistrationSourceDetails, setAddRegistrationSourceDetails] = useState('');
  const queryClient = useQueryClient();
  const [patientExists, setPatientExists] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  const { data: patients, isLoading } = useQuery<Patient[]>({
    queryKey: ['hospital-patients'],
    queryFn: async () => {
      const response = await patientApi.getAllPatients();
      return response;
    },
  });

  const addPatientMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      phone: string;
      gender: string;
      dob: string;
      registrationMode: string;
      registrationSource: string;
      registrationSourceDetails?: string;
    }) => {
      const response = await patientApi.createPatient(data as unknown as PatientCreateData);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospital-patients'] });
      setIsAddDialogOpen(false);
      resetForm();
      toast.success('Patient added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add patient');
      console.error('Add patient error:', error);
    },
  });

  const performSearch = useCallback(async (searchTerm: string) => {
    if (!searchTerm || searchTerm.trim() === '') {
      setSearchAttempted(false);
      setSearchResults([]);
      setPatientExists(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      let res;
      if (searchTerm.length === 10 && !isNaN(Number(searchTerm))) {
        res = await patientApi.getPatientByPhone(searchTerm);
        if (res.length > 0) {
          setSearchResults(res);
          setPatientExists(true);
          setSearchAttempted(true);
          setIsSearching(false);
          setAddPhone(searchTerm);
        } else {
          setSearchResults([]);
          setPatientExists(false);
          setSearchAttempted(true);
          setIsSearching(false);
          setAddPhone(searchTerm);
        }
      } else {
        res = await patientApi.getPatientByName(searchTerm);
        if (res.length > 0) {
          setSearchResults(res);
          setPatientExists(true);
          setSearchAttempted(true);
          setIsSearching(false);
        } else {
          setSearchResults([]);
          setPatientExists(false);
          setSearchAttempted(true);
          setAddName(searchTerm);
          setIsSearching(false);
        }
        setSearchResult(null);
      }
    } catch (err) {
      setSearchResult(null);
      setSearchResults([]);
      setPatientExists(false);
      if (searchTerm.length === 10 && !isNaN(Number(searchTerm))) {
        setAddPhone(searchTerm);
      } else {
        setAddName(searchTerm);
      }
      setSearchAttempted(true);
    } finally {
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchValue.trim().length >= 2) { // Only search if at least 2 characters
        performSearch(searchValue.trim());
      } else if (searchValue.trim().length === 0) {
        // Clear results when search is empty
        setSearchAttempted(false);
        setSearchResults([]);
        setPatientExists(false);
        setIsSearching(false);
      }
    }, 500); // 500ms debounce delay

    return () => clearTimeout(timeoutId);
  }, [searchValue, performSearch]);


  const handleAddSubmit = () => {
    // e.preventDefault();
    // Phone validation: must be exactly 10 digits
    if (!/^\d{10}$/.test(addPhone)) {
      setPhoneError('Phone number must be exactly 10 digits');
      return;
    } else {
      setPhoneError('');
    }
    addPatientMutation.mutate({
      name: addName,
      phone: addPhone,
      gender: addGender,
      dob: (() => {
        const [day, month, year] = addDob.split('/');
        return new Date(`${year}-${month}-${day}`).toISOString();
      })(),
      registrationMode: addRegistrationMode,
      registrationSource: addRegistrationSource,
      registrationSourceDetails: addRegistrationSourceDetails || undefined,
    });
  };

  // Helper to reset form fields
  const resetForm = () => {
    setAddName('');
    setAddPhone('');
    setAddGender('');
    setAddDob('');
    setAddRegistrationMode('OPD');
    setAddRegistrationSource('WALK_IN');
    setAddRegistrationSourceDetails('');
    setSearchValue('');
    setSearchResult(null);
    setPatientExists(false);
    setPhoneError('');
    setSearchAttempted(false);
    setIsSearching(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">
          <div className="text-lg text-gray-600">Loading patients...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="h-8 w-8 text-blue-600" />
              Patient Management
            </h1>
            <p className="text-gray-600 mt-1">Manage and track all patient records</p>
          </div>
          {allowedAddRoles.includes(user?.role || '') && (
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
              size="lg"
            >
              <UserPlus className="mr-2 h-5 w-5" />
              Add New Patient
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Patients</p>
                  <p className="text-2xl font-bold text-gray-900">{patients?.length || 0}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Recent Registrations</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {patients?.filter(p => {
                      const today = new Date();
                      const patientDate = new Date(p.createdAt || '');
                      return today.toDateString() === patientDate.toDateString();
                    }).length || 0}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <UserPlus className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Emergency Patients</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {patients?.filter(p => p.registrationMode === 'EMERGENCY').length || 0}
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Patients
            </CardTitle>
            <CardDescription>
              Search for existing patients - enter a 10-digit phone number or patient name
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <Input
                placeholder="Enter phone number (10 digits) or patient name"
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                className="flex-1"
              />
            </div>

            {/* Loading indicator */}
            {isSearching && searchValue.trim().length >= 2 && (
              <div className="flex items-center gap-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">Searching...</span>
              </div>
            )}

            {/* Search Results */}
            {patientExists && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 font-semibold text-amber-800 mb-3">
                  <span className="text-sm">Search Results</span>
                </div>
                <div className="space-y-3">
                  {searchResults.map((patient) => (
                    <div
                      key={patient.id}
                      className="flex flex-col md:flex-row md:items-center justify-between bg-white border border-amber-200 rounded-lg px-4 py-3 shadow-sm"
                    >
                      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-5 w-5 text-gray-500" />
                          <span
                            className="font-semibold text-blue-900 text-lg cursor-pointer hover:underline"
                            onClick={() => {
                              setSelectedPatientId(patient.id);
                              setIsDetailsDialogOpen(true);
                            }}
                          >
                            {patient.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <Badge variant="outline">{patient.gender}</Badge>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {calculateAge(patient.dob.toString())} yrs
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {patient.phone}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 md:mt-0">
                        <AddAppointment patientId={patient.id} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-amber-200">
                  <p className="text-sm text-amber-700">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>Add New Patient</Button>
                  </p>
                </div>
              </div>
            )}



            {searchAttempted && !patientExists && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">No patient found. You can add a new patient below.</span>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>Add New Patient</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Patient Form */}
        <FormDialog
          isOpen={isAddDialogOpen}
          onClose={() => { setIsAddDialogOpen(false); resetForm(); }}
          title="Add New Patient"
          onSubmit={handleAddSubmit}
          isLoading={addPatientMutation.isPending}
          showSubmitButton={false}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Full Name *</Label>
              <Input
                id="add-name"
                value={addName}
                onChange={e => setAddName(e.target.value)}
                placeholder="Enter patient's full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-phone">Phone Number *</Label>
              <Input
                id="add-phone"
                value={addPhone}
                onChange={e => setAddPhone(e.target.value.replace(/\D/g, ''))}
                maxLength={10}
                placeholder="Enter 10-digit phone number"
                required
              />
              {phoneError && (
                <div className="flex items-center gap-1 text-sm text-red-500">
                  <AlertCircle className="h-4 w-4" />
                  {phoneError}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-gender">Gender *</Label>
              <Select value={addGender} onValueChange={setAddGender} required>
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

            <div className="space-y-2">
              <Label htmlFor="add-dob">Date of Birth *</Label>
              <Input
                id="add-dob"
                type="date"
                value={addDob}
                onChange={e => setAddDob(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-registration-mode">Registration Mode *</Label>
              <Select value={addRegistrationMode} onValueChange={setAddRegistrationMode} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select registration mode" />
                </SelectTrigger>
                <SelectContent>
                  {REGISTRATION_MODES.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-registration-source">Registration Source *</Label>
              <Select value={addRegistrationSource} onValueChange={setAddRegistrationSource} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select registration source" />
                </SelectTrigger>
                <SelectContent>
                  {REGISTRATION_SOURCES.map((src) => (
                    <SelectItem key={src.value} value={src.value}>
                      {src.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(addRegistrationSource === 'REFERRAL' || addRegistrationSource === 'AFFILIATE') && (
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="add-registration-source-details">
                  {addRegistrationSource === 'REFERRAL' ? 'Referral Details *' : 'Affiliate Details *'}
                </Label>
                <Input
                  id="add-registration-source-details"
                  value={addRegistrationSourceDetails}
                  onChange={e => setAddRegistrationSourceDetails(e.target.value)}
                  placeholder={addRegistrationSource === 'REFERRAL' ? 'Enter referral details' : 'Enter affiliate details'}
                  required
                />
              </div>
            )}
          </div>

          <Separator className="my-4" />

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setIsAddDialogOpen(false); resetForm(); }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddSubmit}
              disabled={addPatientMutation.isPending || !addName || !addPhone || !addGender || !addDob}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {addPatientMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Adding Patient...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Patient
                </>
              )}
            </Button>
          </div>
        </FormDialog>
        {/* Patient Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <DialogTitle>
            </DialogTitle>
            {isDetailsDialogOpen && selectedPatientId && (
              <PatientDetails patientId={selectedPatientId} />
            )}
          </DialogContent>
          <Description>
          </Description>
        </Dialog>
      </div>
    </div>
  );
}