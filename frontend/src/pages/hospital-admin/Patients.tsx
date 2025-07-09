import { useQuery } from '@tanstack/react-query';
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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormDialog } from '@/components/ui/form-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useSearch } from '@/contexts/SearchContext';
import AddAppointment from '@/components/appointment/AddAppointment';
import { Patient, PatientCreateData, User } from '@/types/types';
import { UserRole } from '@/types/types';
import { calculateAge } from '@/utils/dateUtils';
import { patientApi } from '@/api/patient';

// Helper to format date as dd/mm/yyyy

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
  const { searchQuery } = useSearch();
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
  const [searchType, setSearchType] = useState<'phone' | 'uniqueId'>('phone');
  const [searchValue, setSearchValue] = useState('');
  const [searchResult, setSearchResult] = useState<Patient | null>(null);
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
      console.log(data);
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

  const handleSearch = async () => {
    setIsSearching(true);
    console.log("inside seach funtion")
    try {
      let res;
      if (!searchValue || searchValue === '') {
        console.log("Search value is empty");
        setIsSearching(false);
        setSearchAttempted(false);
        setSearchResults([]);
        return;
      }
      console.log("SearchType ", searchType == 'phone');
      if (searchType === 'phone') {
        res = await patientApi.getPatientByPhone(searchValue);
        console.log("Search result", res);
        if (res.length > 0) {
          setSearchResults(res);
          setPatientExists(true);
          setSearchAttempted(true);
          setAddPhone(searchValue);
        } else {
          setSearchResults([]);
          setPatientExists(false);
          setSearchAttempted(true);
          setAddPhone(searchValue);
        }
      } else {
        res = await patientApi.getPatientById(searchValue);
        setPatientExists(false);
        setSearchResult(res);
        setSearchResults([]);
        setSearchAttempted(true);
      }
      setIsSearching(false);
    } catch (err) {
      setSearchResult(null);
      setSearchResults([]);
      setPatientExists(false);
      if (searchType === 'phone') {
        setAddPhone(searchValue);
      }
      setIsSearching(false);
      setSearchAttempted(true);
    }
  };

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
  };
  const filteredPatients = patients?.filter((patient) => {
    if (!searchQuery) return true;
    return patient.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

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
        <h1 className="text-2xl font-semibold text-gray-900">Manage Patients</h1>
        {allowedAddRoles.includes(user?.role || '') && (
          <Button className="text-white bg-blue-800 hover:bg-blue-700" onClick={() => setIsAddDialogOpen(true)}>
            Add New Patient
          </Button>
        )}
      </div>
      {/* Patients list */}
      <div>
        <Table>
          <TableHeader>
            <TableRow >
              <TableHead>Name</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPatients?.map((patient) => (
              <TableRow key={patient.id}>
                <TableCell>
                  <Link
                    to={`/patient/${patient.id}`}
                    className="text-blue-600 underline cursor-pointer"
                  >
                    {patient.name}
                  </Link>
                </TableCell>
                <TableCell>{patient.gender}</TableCell>
                <TableCell>{patient.phone}</TableCell>
                <TableCell>{calculateAge(patient.dob.toString())}</TableCell>
                <TableCell><AddAppointment patientId={patient.id} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add Patient Dialog */}
      <FormDialog
        isOpen={isAddDialogOpen}
        onClose={() => { setIsAddDialogOpen(false); resetForm(); }}
        title="Add New Patient"
        onSubmit={handleAddSubmit}
        isLoading={addPatientMutation.isPending}
        showSubmitButton={true}
      
      >


        <div className="flex space-x-2">
          <Select value={searchType} onValueChange={v => setSearchType(v as 'phone' | 'uniqueId')}>
            <SelectTrigger>
              <SelectValue placeholder="Search by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="uniqueId">Unique ID</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder={searchType === 'phone' ? 'Enter 10-digit phone' : 'Enter Unique ID'}
            value={searchValue}
            onChange={e => { setSearchValue(e.target.value); }}
            maxLength={searchType === 'phone' ? 10 : undefined}
          />
          <Button type="button" onClick={handleSearch} disabled={isSearching}>
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {patientExists && (
          <div className="p-4 bg-yellow-50 rounded border border-yellow-200 space-y-4">
            <div className="font-semibold text-yellow-800">Existing patients found with this number:</div>
            {searchResults.map((patient) => (
              <div
                key={patient.id}
                className="flex flex-col md:flex-row md:items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-2 shadow-sm"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
                  <span className="font-semibold text-blue-900 text-base md:text-lg">{patient.name}</span>
                  <span className="text-gray-500 text-sm md:text-base flex items-center">
                    {patient.gender}
                    <span className="mx-2 text-gray-300">•</span>
                    {calculateAge(patient.dob.toString())} yrs
                    <span className="mx-2 text-gray-300">•</span>
                    {patient.phone}
                  </span>
                </div>
                <div className="mt-2 md:mt-0 md:ml-4">
                  <AddAppointment patientId={patient.id} />
                </div>
              </div>
            ))}
            <div className="mt-4 pt-4 border-t border-yellow-200">
              <div className="text-sm text-yellow-800">
                You can still add a new patient with this number if needed.
              </div>
            </div>
          </div>
        )}

        {searchResult && searchType === 'uniqueId' && (
          <div className="p-2 bg-green-50 rounded border border-green-200">
            <div><b>Patient Found:</b></div>
            <div>Name: {searchResult.name}</div>
            <div>Gender: {searchResult.gender}</div>
            <div>Phone: {searchResult.phone}</div>
            <div>Age: {calculateAge(searchResult.dob.toString())}</div>
            <div>Unique ID: {searchResult.patientUniqueId}</div>
            <div className="mt-4 flex justify-end">
              <AddAppointment patientId={searchResult.id} />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="add-name">Name</Label>
          <Input id="add-name" name="name" value={addName} onChange={e => setAddName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="add-phone">Phone</Label>
          <Input id="phone" name="phone" value={addPhone} onChange={e => setAddPhone(e.target.value.replace(/\D/g, ''))} maxLength={10} required />
          {phoneError && <div className="text-sm text-red-500 mt-1">{phoneError}</div>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="add-gender">Gender</Label>
          <Select name="gender" value={addGender} onValueChange={setAddGender} required>
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
          <Label htmlFor="add-dob">Date of Birth</Label>
          <Input
            id="add-dob"
            name="dob"
            type="date"
            placeholder="dd/mm/yyyy"
            value={addDob}
            onChange={e => setAddDob(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="add-registration-mode">Registration Mode</Label>
          <Select name="registrationMode" value={addRegistrationMode} onValueChange={setAddRegistrationMode} required>
            <SelectTrigger>
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              {REGISTRATION_MODES.map((mode) => (
                <SelectItem key={mode.value} value={mode.value}>{mode.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="add-registration-source">Source of Registration</Label>
          <Select name="registrationSource" value={addRegistrationSource} onValueChange={setAddRegistrationSource} required>
            <SelectTrigger>
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              {REGISTRATION_SOURCES.map((src) => (
                <SelectItem key={src.value} value={src.value}>{src.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Show details input for REFERRAL or AFFILIATE */}
        {(addRegistrationSource === 'REFERRAL' || addRegistrationSource === 'AFFILIATE') && (
          <div className="space-y-2">
            <Label htmlFor="add-registration-source-details">
              {addRegistrationSource === 'REFERRAL' ? 'Referral Details' : 'Affiliate Details'}
            </Label>
            <Input
              id="add-registration-source-details"
              name="registrationSourceDetails"
              value={addRegistrationSourceDetails}
              onChange={e => setAddRegistrationSourceDetails(e.target.value)}
              placeholder={addRegistrationSource === 'REFERRAL' ? 'Enter referral details' : 'Enter affiliate details'}
              required
            />
          </div>
        )}

      </FormDialog>
    </div>
  );
}