import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Building, 
  Bed, 
  FileText,
  Eye,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { ipdApi } from '@/api/ipd';
import { IPDAdmission } from '@/types/ipd';
import IPDVisitsList from '@/components/ipd/IPDVisitsList';

export default function IPDManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [admissions, setAdmissions] = useState<IPDAdmission[]>([]);
  const [filteredAdmissions, setFilteredAdmissions] = useState<IPDAdmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAdmission, setSelectedAdmission] = useState<IPDAdmission | null>(null);
  const [isVisitsModalOpen, setIsVisitsModalOpen] = useState(false);
  const [selectedWard, setSelectedWard] = useState<string>('ALL');

  // Fetch admissions
  const fetchAdmissions = async () => {
    try {
      setIsLoading(true);
      const response = await ipdApi.getAdmissions({ status: 'ADMITTED' });
      console.log(response.data.data);
      
      // Filter admissions to show only those assigned to the current doctor
      const doctorAdmissions = response.data.data.filter(
        (admission: IPDAdmission) => admission.assignedDoctorId === user?.id
      );
      
      setAdmissions(doctorAdmissions);
      setFilteredAdmissions(doctorAdmissions);
    } catch (error) {
      console.error('Error fetching admissions:', error);
      toast.error('Failed to fetch admissions');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter admissions by ward
  const filterAdmissionsByWard = (wardType: string) => {
    if (wardType === 'ALL') {
      setFilteredAdmissions(admissions);
    } else {
      const filtered = admissions.filter(admission => admission.wardType === wardType);
      setFilteredAdmissions(filtered);
    }
  };

  // Handle ward filter change
  const handleWardFilterChange = (wardType: string) => {
    setSelectedWard(wardType);
    filterAdmissionsByWard(wardType);
  };

  useEffect(() => {
    if (user?.id) {
      fetchAdmissions();
    }
  }, [user?.id]);

  const handleViewVisits = (admission: IPDAdmission) => {
    setSelectedAdmission(admission);
    setIsVisitsModalOpen(true);
  };

  const handleVisitAdded = () => {
    // Refresh admissions if needed
    fetchAdmissions();
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

  const getWardTypeColor = (type: string) => {
    switch (type) {
      case 'ICU': return 'bg-red-100 text-red-800 border-red-200';
      case 'PRIVATE': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'SEMI_PRIVATE': return 'bg-green-100 text-green-800 border-green-200';
      case 'EMERGENCY': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">IPD Management</h1>
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading admissions...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My IPD Patients</h1>
          <p className="text-sm text-gray-500 mt-1">Patients assigned to Dr. {user?.name}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            {filteredAdmissions.length} of {admissions.length} assigned patients
          </div>
          <Select value={selectedWard} onValueChange={handleWardFilterChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by ward" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Wards</SelectItem>
              <SelectItem value="ICU">ICU</SelectItem>
              <SelectItem value="PRIVATE">Private</SelectItem>
              <SelectItem value="SEMI_PRIVATE">Semi-Private</SelectItem>
              <SelectItem value="GENERAL">General</SelectItem>
              <SelectItem value="EMERGENCY">Emergency</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-blue-600" />
            My Assigned Patients
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAdmissions.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {selectedWard === 'ALL' ? 'No assigned patients' : `No assigned patients in ${selectedWard} ward`}
              </h3>
              <p className="text-gray-500">
                {selectedWard === 'ALL' 
                  ? 'No patients are currently assigned to you in IPD' 
                  : `No patients assigned to you are currently in ${selectedWard} ward`
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
                    <TableHead>Room/Bed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Admitted</TableHead>
                    <TableHead>Visits</TableHead>
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
                            {admission.queue.ipdNumber}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getWardTypeColor(admission.wardType)}>
                          {admission.wardType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Building className="h-4 w-4 text-gray-500" />
                          <span>{admission.roomNumber || 'N/A'}</span>
                          <Bed className="h-4 w-4 text-gray-500 ml-2" />
                          <span>{admission.bedNumber || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(admission.status)}>
                          {admission.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{formatDate(admission.admissionDate)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4 text-gray-500" />
                          <span>{admission.visits?.length || 0} visits</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/doctor/ipd/${admission.id}`)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
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
        <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-blue-600" />
              Patient Visits - {selectedAdmission?.queue.patient.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedAdmission && (
            <div className="space-y-4">
              {/* Patient Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Patient Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-gray-500">Name</div>
                      <div className="font-medium">{selectedAdmission.queue.patient.name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">UHID</div>
                      <div className="font-medium">{selectedAdmission.queue.patient.uhid}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Ward</div>
                      <Badge className={getWardTypeColor(selectedAdmission.wardType)}>
                        {selectedAdmission.wardType}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Room/Bed</div>
                      <div className="font-medium">
                        {selectedAdmission.roomNumber || 'N/A'} / {selectedAdmission.bedNumber || 'N/A'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Visits List */}
              <IPDVisitsList
                admissionId={selectedAdmission.id}
                patientName={selectedAdmission.queue.patient.name}
                onVisitAdded={handleVisitAdded}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
