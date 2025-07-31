import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { fomratString } from '@/utils/stringUtils';
import { Button } from '../ui/button';
import { Patient } from './types';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

const RELATIONSHIP_TYPES = [
  'PARENT_CHILD',
  'SPOUSE',
  'SIBLING'
];

interface FamilyLink {
  relative?: {
    id: string;
    name: string;
    phone: string;
  };
  patient?: {
    id: string;
    name: string;
    phone: string;
  };
  relationship: string;
}

export function FamilyLinks({ patientId }: { patientId: string }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedRelationship, setSelectedRelationship] = useState<string>('');
  const [isAddingLink, setIsAddingLink] = useState(false);
  const relativeIdSet: Set<string> = new Set();

  const { data: relatives, isLoading: isLoadingRelatives, refetch: refetchRelatives } = useQuery<FamilyLink[]>({
    queryKey: ['family-links', patientId],
    queryFn: async () => {
      const response = await api.get(`/api/patient/family-links`, {
        params: {
          patientId
        }
      });
      return response.data?.data;
    },
  });
  relatives?.forEach(relative => {
    if (relative.relative) {
      relativeIdSet.add(relative.relative.id);
    }
    if (relative.patient) {
      relativeIdSet.add(relative.patient.id);
    }
  });
  const { data: patients, isLoading: isLoadingPatients } = useQuery<Patient[]>({
    queryKey: ['patients'],
    queryFn: async () => {
      const response = await api.get(`/api/patient/`);
      return response.data?.data;
    },
  });

  const filteredPatients = patients?.filter(patient =>
    patient.id !== patientId && !relativeIdSet.has(patient.id) &&
    patient.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addFamilyLink = async () => {
    if (!selectedPatient || !selectedRelationship) return;

    try {
      setIsAddingLink(true);
      await api.post('/api/patient/add/family-link', {
        patientId,
        relativeId: selectedPatient.id,
        relationship: selectedRelationship
      });

      // Reset form
      setSelectedPatient(null);
      setSelectedRelationship('');
      setSearchQuery('');

      // Refetch family links
      await refetchRelatives();
    } catch (error) {
      console.error('Error adding family link:', error);
    } finally {
      setIsAddingLink(false);
    }
  };

  if (isLoadingRelatives || isLoadingPatients) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Existing Family Links Section */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Existing Family Links</h2>
          <p className="text-sm text-gray-500 mt-1">View and manage your family connections</p>
        </div>

        <div className="p-6">
          {Array.isArray(relatives) && relatives.length > 0 ? (
            <div className="grid gap-4">
              {relatives?.map((relative, idx) => (
                relative.relative && relative.relative.id !== patientId && (
                  <div
                    key={idx}
                    className="p-4 bg-blue-50 border border-blue-100 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-blue-600">
                          {relative?.relative?.name}
                        </h3>
                        <p className="text-sm text-gray-700 mt-1">📞 {relative?.relative?.phone}</p>
                        <p className="text-sm text-gray-700 italic mt-1">{fomratString(relative?.relationship)}</p>
                      </div>
                    </div>
                  </div>
                )
              ))}
              {relatives?.map((relative, idx) => (
                relative.patient && relative.patient.id !== patientId && (
                  <div
                    key={idx}
                    className="p-4 bg-blue-50 border border-blue-100 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-blue-600">
                          {relative?.patient?.name}
                        </h3>
                        <p className="text-sm text-gray-700 mt-1">📞 {relative?.patient?.phone}</p>
                        <p className="text-sm text-gray-700 italic mt-1">{fomratString(relative?.relationship)}</p>
                      </div>
                    </div>
                  </div>
                )
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No family links found</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Family Link Section */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Add New Family Link</h2>
          <p className="text-sm text-gray-500 mt-1">Create a new family connection</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Search Patient</label>
            <Input
              type="text"
              placeholder="Type to search patients..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedPatient(null);
              }
              }
              className="w-full"
            />
            {searchQuery && (
              <div className="max-h-48 overflow-y-auto border rounded-md mt-2 bg-white">
                {selectedPatient ? (
                  <div className="p-3 bg-blue-50 border-t border-blue-100">
                    <div className="font-xs">Selected Patient:</div>
                    <div className="text-sm text-blue-700">
                      {selectedPatient.name} - 📞 {selectedPatient.phone}
                    </div>
                  </div>
                ) : filteredPatients?.length === 0 ? (
                  <div className="p-2 text-sm text-gray-500">No patients found</div>
                ) : (
                  filteredPatients?.map((patient) => (
                    <div
                      key={patient.id}
                      className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setSelectedPatient(patient)}
                    >
                      <div className="font-medium">{patient.name}</div>
                      <div className="text-sm text-gray-500">📞 {patient.phone}</div>
                    </div>
                  ))
                )}
              </div>

            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Relationship Type</label>
            <Select
              value={selectedRelationship}
              onValueChange={setSelectedRelationship}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select relationship type" />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {fomratString(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={addFamilyLink}
            disabled={!selectedPatient || !selectedRelationship || isAddingLink}
            className="w-full"
          >
            {isAddingLink ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Family Link...
              </>
            ) : (
              'Create Family Link'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
