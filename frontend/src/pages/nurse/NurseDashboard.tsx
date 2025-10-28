import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Users, 
  Bed, 
  Stethoscope, 
  Building,
  User,
  Calendar,
  Activity
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ipdApi } from '@/api/ipd';
import { IPDAdmission, Ward } from '@/types/ipd';
import { toast } from 'sonner';

export default function NurseDashboard() {
  const { user } = useAuth();
  const [assignedWards, setAssignedWards] = useState<Ward[]>([]);
  const [allPatients, setAllPatients] = useState<IPDAdmission[]>([]); // Store all patients
  const [wardPatients, setWardPatients] = useState<IPDAdmission[]>([]); // Filtered patients
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWardType, setSelectedWardType] = useState<string>('ALL');
  const [selectedRoom, setSelectedRoom] = useState<string>('ALL');
  const [selectedPatient, setSelectedPatient] = useState<IPDAdmission | null>(null);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);

  // Fetch assigned wards (mock data for now - would need backend implementation)
  const fetchAssignedWards = async () => {
    try {
      // TODO: Implement nurse ward assignment API
      // For now, we'll fetch all wards and assume nurse has access to all
      const response = await ipdApi.getWards();
      setAssignedWards(response.data.data);
    } catch (error) {
      console.error('Error fetching assigned wards:', error);
      toast.error('Failed to fetch assigned wards');
    }
  };

  // Fetch patients in assigned wards
  const fetchWardPatients = async () => {
    try {
      setIsLoading(true);
      const response = await ipdApi.getAdmissions({ status: 'ADMITTED' });
      
      // Store all patients for filter options
      setAllPatients(response.data.data);
      
      // Apply filtering to get displayed patients
      applyFilters(response.data.data);
    } catch (error) {
      console.error('Error fetching ward patients:', error);
      toast.error('Failed to fetch ward patients');
    } finally {
      setIsLoading(false);
    }
  };

  // Apply filters to get displayed patients
  const applyFilters = (patients: IPDAdmission[]) => {
    let filteredPatients = patients;
    
    // Step 1: Filter by ward type
    if (selectedWardType !== 'ALL') {
      filteredPatients = patients.filter((admission: IPDAdmission) => 
        admission.wardType === selectedWardType
      );
    }
    
    // Step 2: Filter by room
    if (selectedRoom !== 'ALL') {
      filteredPatients = filteredPatients.filter((admission: IPDAdmission) => 
        admission.roomNumber === selectedRoom
      );
    }
    
    setWardPatients(filteredPatients);
  };

  useEffect(() => {
    fetchAssignedWards();
  }, []);

  useEffect(() => {
    if (assignedWards.length > 0) {
      fetchWardPatients();
    }
  }, [assignedWards]);

  useEffect(() => {
    if (allPatients.length > 0) {
      applyFilters(allPatients);
    }
  }, [selectedWardType, selectedRoom, allPatients]);

  const getWardTypeColor = (type: string) => {
    switch (type) {
      case 'ICU': return 'bg-red-100 text-red-800';
      case 'GENERAL': return 'bg-blue-100 text-blue-800';
      case 'PRIVATE': return 'bg-green-100 text-green-800';
      case 'SEMI_PRIVATE': return 'bg-yellow-100 text-yellow-800';
      case 'EMERGENCY': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ADMITTED': return 'bg-green-100 text-green-800';
      case 'DISCHARGED': return 'bg-gray-100 text-gray-800';
      case 'TRANSFERRED': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get available rooms based on selected ward type
  const getAvailableRooms = () => {
    if (selectedWardType === 'ALL') {
      return Array.from(new Set(allPatients.map(p => p.roomNumber).filter(Boolean)));
    }
    
    // Filter patients by selected ward type first, then get unique rooms
    const wardTypePatients = allPatients.filter(p => p.wardType === selectedWardType);
    return Array.from(new Set(wardTypePatients.map(p => p.roomNumber).filter(Boolean)));
  };

  // Get ward sub type for a specific room
  const getRoomWardSubType = (roomNumber: string) => {
    const patient = allPatients.find(p => p.roomNumber === roomNumber);
    return patient?.wardSubType || '';
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

  const handleViewPatientDetails = (admission: IPDAdmission) => {
    setSelectedPatient(admission);
    setIsPatientModalOpen(true);
  };

  const totalPatients = allPatients.length;
  const criticalPatients = allPatients.filter(p => p.wardType === 'ICU').length;
  const generalPatients = allPatients.filter(p => p.wardType === 'GENERAL').length;
  const emergencyPatients = allPatients.filter(p => p.wardType === 'EMERGENCY').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nurse Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome, Nurse {user?.name}</p>
        </div>
        <div className="text-sm text-gray-500">
          {totalPatients} patients in assigned wards
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{totalPatients}</div>
            <p className="text-xs text-blue-600">In assigned wards</p>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800">Critical Care</CardTitle>
            <Activity className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">{criticalPatients}</div>
            <p className="text-xs text-red-600">ICU patients</p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">General Ward</CardTitle>
            <Building className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{generalPatients}</div>
            <p className="text-xs text-green-600">General patients</p>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">Emergency Patients</CardTitle>
            <Activity className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">{emergencyPatients}</div>
            <p className="text-xs text-orange-600">Emergency ward patients</p>
          </CardContent>
        </Card>
      </div>

      {/* Ward Type Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-blue-600" />
            Ward Type Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 text-sm text-gray-600">
            <p>Step 1: Select ward type to see available rooms</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedWardType === 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSelectedWardType('ALL');
                setSelectedRoom('ALL');
              }}
            >
              All Ward Types ({allPatients.length})
            </Button>
            {Array.from(new Set(allPatients.map(p => p.wardType))).map((wardType) => {
              const wardTypePatientCount = allPatients.filter(p => p.wardType === wardType).length;
              return (
                <Button
                  key={wardType}
                  variant={selectedWardType === wardType ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedWardType(wardType);
                    setSelectedRoom('ALL'); // Reset room selection when ward type changes
                  }}
                >
                  {wardType} ({wardTypePatientCount})
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Room Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-blue-600" />
            Room Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 text-sm text-gray-600">
            <p>Step 2: Select specific room to view patients with bed assignments</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedRoom === 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedRoom('ALL')}
            >
              All Rooms ({(() => {
                if (selectedWardType === 'ALL') {
                  return allPatients.length;
                }
                return allPatients.filter(p => p.wardType === selectedWardType).length;
              })()})
            </Button>
            {getAvailableRooms().map((room) => {
              // Count patients in this room, considering ward type filter
              let roomPatientCount;
              if (selectedWardType === 'ALL') {
                roomPatientCount = allPatients.filter(p => p.roomNumber === room).length;
              } else {
                roomPatientCount = allPatients.filter(p => p.roomNumber === room && p.wardType === selectedWardType).length;
              }
              const wardSubType = getRoomWardSubType(room!);
              return (
                <Button
                  key={room}
                  variant={selectedRoom === room ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedRoom(room!)}
                >
                  {room} {wardSubType ? `(${wardSubType})` : ''} ({roomPatientCount})
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Patients Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-blue-600" />
            {selectedWardType === 'ALL' && selectedRoom === 'ALL'
              ? 'All Patients' 
              : (() => {
                  const wardText = selectedWardType === 'ALL' ? 'All Ward Types' : `${selectedWardType} Ward`;
                  const roomText = selectedRoom === 'ALL' ? '' : ` - ${selectedRoom}`;
                  return `Patients in ${wardText}${roomText}`;
                })()
            }
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading patients...</p>
            </div>
          ) : wardPatients.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {selectedWardType === 'ALL' && selectedRoom === 'ALL' ? 'No patients in assigned wards' : 'No patients found'}
              </h3>
              <p className="text-gray-500">
                {selectedWardType === 'ALL' && selectedRoom === 'ALL'
                  ? 'No patients are currently admitted in your assigned wards' 
                  : (() => {
                      const wardText = selectedWardType === 'ALL' ? 'assigned wards' : `${selectedWardType} ward`;
                      const roomText = selectedRoom === 'ALL' ? '' : ` in ${selectedRoom}`;
                      return `No patients are currently admitted in ${wardText}${roomText}`;
                    })()
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Ward</TableHead>
                    <TableHead>Bed</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Admission Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wardPatients.map((admission) => (
                    <TableRow key={admission.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{admission.queue.patient.name}</div>
                          <div className="text-sm text-gray-500">
                            {admission.queue.patient.gender}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className={getWardTypeColor(admission.wardType)}>
                              {admission.wardType}
                            </Badge>
                            {admission.wardSubType && (
                              <Badge variant="outline" className="text-xs">
                                {admission.wardSubType}
                              </Badge>
                            )}
                          </div>
                          {admission.roomNumber && (
                            <div className="text-xs text-gray-500">
                              {admission.roomNumber}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {admission.bedNumber ? (
                          <div className="flex items-center gap-1">
                            <Bed className="h-4 w-4 text-gray-500" />
                            <span className="text-sm">{admission.bedNumber}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">No bed assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{admission.assignedDoctor.name}</div>
                          <div className="text-sm text-gray-500">{admission.assignedDoctor.specialisation}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{formatDate(admission.admissionDate)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(admission.status)}>
                          {admission.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewPatientDetails(admission)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Stethoscope className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Patient Details Modal */}
      <Dialog open={isPatientModalOpen} onOpenChange={setIsPatientModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-blue-600" />
              Patient Details
            </DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-6">
              {/* Patient Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Patient Information</h4>
                  <div className="space-y-2">
                    <p><span className="font-medium">Name:</span> {selectedPatient.queue.patient.name}</p>
                    <p><span className="font-medium">Gender:</span> {selectedPatient.queue.patient.gender}</p>
                    <p><span className="font-medium">DOB:</span> {formatDate(selectedPatient.queue.patient.dob)}</p>
                    <p><span className="font-medium">Phone:</span> {selectedPatient.queue.patient.phone}</p>
                    <p><span className="font-medium">UHID:</span> {selectedPatient.queue.patient.uhid}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Admission Details</h4>
                  <div className="space-y-2">
                    <p><span className="font-medium">IPD Number:</span> {selectedPatient.queue.ipdNumber}</p>
                    <p><span className="font-medium">Admission Date:</span> {formatDate(selectedPatient.admissionDate)}</p>
                    <p><span className="font-medium">Status:</span> 
                      <Badge className={`ml-2 ${getStatusColor(selectedPatient.status)}`}>
                        {selectedPatient.status}
                      </Badge>
                    </p>
                    <p><span className="font-medium">Ward:</span> {selectedPatient.wardType}</p>
                    {selectedPatient.wardSubType && (
                      <p><span className="font-medium">Ward Sub Type:</span> {selectedPatient.wardSubType}</p>
                    )}
                    <p><span className="font-medium">Room:</span> {selectedPatient.roomNumber || 'Not assigned'}</p>
                    <p><span className="font-medium">Bed:</span> {selectedPatient.bedNumber || 'Not assigned'}</p>
                  </div>
                </div>
              </div>

              {/* Doctor Information */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Assigned Doctor</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p><span className="font-medium">Name:</span> {selectedPatient.assignedDoctor.name}</p>
                  <p><span className="font-medium">Specialization:</span> {selectedPatient.assignedDoctor.specialisation}</p>
                </div>
              </div>

              {/* Medical Information */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Medical Information</h4>
                <div className="space-y-2">
                  {selectedPatient.chiefComplaint && (
                    <p><span className="font-medium">Chief Complaint:</span> {selectedPatient.chiefComplaint}</p>
                  )}
                  {selectedPatient.admissionNotes && (
                    <p><span className="font-medium">Admission Notes:</span> {selectedPatient.admissionNotes}</p>
                  )}
                  {selectedPatient.insuranceType && selectedPatient.insuranceType !== 'NA' && (
                    <div>
                      <p><span className="font-medium">Insurance Type:</span> {selectedPatient.insuranceType}</p>
                      {selectedPatient.insuranceCompany && (
                        <p><span className="font-medium">Insurance Company:</span> {selectedPatient.insuranceCompany}</p>
                      )}
                      {selectedPatient.policyNumber && (
                        <p><span className="font-medium">Policy Number:</span> {selectedPatient.policyNumber}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsPatientModalOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
