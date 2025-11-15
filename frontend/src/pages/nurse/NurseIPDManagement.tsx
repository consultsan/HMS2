import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Stethoscope, 
  User, 
  Calendar, 
  Bed, 
  FileText,
  Eye,
  Activity,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { ipdApi } from '@/api/ipd';
import { IPDAdmission, Ward } from '@/types/ipd';
import IPDVisitsList from '@/components/ipd/IPDVisitsList';

export default function NurseIPDManagement() {
  const [allAdmissions, setAllAdmissions] = useState<IPDAdmission[]>([]); // Store all admissions
  const [admissions, setAdmissions] = useState<IPDAdmission[]>([]);
  const [filteredAdmissions, setFilteredAdmissions] = useState<IPDAdmission[]>([]);
  const [assignedWards, setAssignedWards] = useState<Ward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAdmission, setSelectedAdmission] = useState<IPDAdmission | null>(null);
  const [isVisitsModalOpen, setIsVisitsModalOpen] = useState(false);
  const [selectedWardType, setSelectedWardType] = useState<string>('ALL');
  const [selectedRoom, setSelectedRoom] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Fetch assigned wards
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

  // Fetch admissions in assigned wards
  const fetchAdmissions = async () => {
    try {
      setIsLoading(true);
      const response = await ipdApi.getAdmissions({ status: 'ADMITTED' });
      console.log(response.data.data);
      
      // Store all admissions for filter options
      setAllAdmissions(response.data.data);
      
      // Filter admissions to show only those in assigned wards
      const wardAdmissions = response.data.data.filter(
        () => {
          // If no ward assignment system, show all admissions
          // TODO: Implement proper nurse ward assignment filtering
          return true;
        }
      );
      
      setAdmissions(wardAdmissions);
      setFilteredAdmissions(wardAdmissions);
    } catch (error) {
      console.error('Error fetching admissions:', error);
      toast.error('Failed to fetch admissions');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter admissions by ward and status
  const filterAdmissions = () => {
    let filtered = admissions;

    // Filter by ward type
    if (selectedWardType !== 'ALL') {
      filtered = filtered.filter(admission => 
        admission.wardType === selectedWardType
      );
    }

    // Filter by room
    if (selectedRoom !== 'ALL') {
      filtered = filtered.filter(admission => 
        admission.roomNumber === selectedRoom
      );
    }

    // Filter by status
    if (selectedStatus !== 'ALL') {
      filtered = filtered.filter(admission => 
        admission.status === selectedStatus
      );
    }

    setFilteredAdmissions(filtered);
  };

  const handleWardTypeFilterChange = (wardType: string) => {
    setSelectedWardType(wardType);
    setSelectedRoom('ALL'); // Reset room selection when ward type changes
  };

  const handleStatusFilterChange = (status: string) => {
    setSelectedStatus(status);
  };

  // Get available rooms based on selected ward type
  const getAvailableRooms = () => {
    if (selectedWardType === 'ALL') {
      return Array.from(new Set(allAdmissions.map(p => p.roomNumber).filter(Boolean)));
    }
    
    // Filter patients by selected ward type first, then get unique rooms
    const wardTypePatients = allAdmissions.filter(p => p.wardType === selectedWardType);
    return Array.from(new Set(wardTypePatients.map(p => p.roomNumber).filter(Boolean)));
  };

  // Get ward sub type for a specific room
  const getRoomWardSubType = (roomNumber: string) => {
    const patient = allAdmissions.find(p => p.roomNumber === roomNumber);
    return patient?.wardSubType || '';
  };

  useEffect(() => {
    fetchAssignedWards();
  }, []);

  useEffect(() => {
    if (assignedWards.length > 0) {
      fetchAdmissions();
    }
  }, [assignedWards]);

  useEffect(() => {
    filterAdmissions();
  }, [selectedWardType, selectedRoom, selectedStatus, admissions]);

  const handleViewVisits = (admission: IPDAdmission) => {
    setSelectedAdmission(admission);
    setIsVisitsModalOpen(true);
  };

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading patient data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nurse IPD Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage patients in your assigned wards</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            {filteredAdmissions.length} of {admissions.length} patients
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 text-sm text-gray-600">
            <p>Step 1: Select ward type → Step 2: Select room → View patients with bed assignments</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Ward Type:</label>
              <Select value={selectedWardType} onValueChange={handleWardTypeFilterChange}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by ward type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Ward Types</SelectItem>
                  {Array.from(new Set(allAdmissions.map(a => a.wardType))).map((wardType) => (
                    <SelectItem key={wardType} value={wardType}>
                      {wardType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Room:</label>
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All Rooms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Rooms</SelectItem>
                  {getAvailableRooms().map((room) => {
                    const wardSubType = getRoomWardSubType(room!);
                    return (
                      <SelectItem key={room} value={room!}>
                        {room} {wardSubType ? `(${wardSubType})` : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Status:</label>
              <Select value={selectedStatus} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="ADMITTED">Admitted</SelectItem>
                  <SelectItem value="DISCHARGED">Discharged</SelectItem>
                  <SelectItem value="TRANSFERRED">Transferred</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-blue-600" />
            Ward Patients
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAdmissions.length === 0 ? (
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
                  {filteredAdmissions.map((admission) => (
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
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewVisits(admission)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            Visits
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/ipd/patient/${admission.id}`, '_blank')}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visits Modal */}
      <Dialog open={isVisitsModalOpen} onOpenChange={setIsVisitsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Patient Visits - {selectedAdmission?.queue.patient.name}
            </DialogTitle>
          </DialogHeader>
          {selectedAdmission && (
            <IPDVisitsList 
              admissionId={selectedAdmission.id}
              patientName={selectedAdmission.queue.patient.name}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
