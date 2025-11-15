import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  ArrowLeft,
  FileText,
  TestTube,
  Scissors,
  Calendar,
  Stethoscope,
  User,
  Eye,
  Plus,
  Clock,
  AlertCircle,
  Activity,
  Heart,
  Thermometer
} from 'lucide-react';
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
import { toast } from 'sonner';
import { ipdApi } from '@/api/ipd';
import { IPDAdmission } from '@/types/ipd';
import IPDVisitForm from '@/components/ipd/IPDVisitForm';
import ViewTestResult from '@/pages/lab/ViewTestResult';
import { labApi } from '@/api/lab';
import { useQuery } from '@tanstack/react-query';
import { LabTestSearch } from '@/components/LabTestSearch';

export default function IPDPatientDetail() {
  const { admissionId } = useParams<{ admissionId: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isVisitFormOpen, setIsVisitFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedVisit, setSelectedVisit] = useState<any | null>(null);
  const [isVisitDetailOpen, setIsVisitDetailOpen] = useState(false);
  const [selectedTestForView, setSelectedTestForView] = useState<{ id: string; name: string } | null>(null);
  const [isViewTestResultOpen, setIsViewTestResultOpen] = useState(false);
  const [selectedIPDTest, setSelectedIPDTest] = useState<any | null>(null);
  const [isViewIPDTestOpen, setIsViewIPDTestOpen] = useState(false);
  const [isAddTestFormOpen, setIsAddTestFormOpen] = useState(false);

  const [patientData, setPatientData] = useState<{
    admission: IPDAdmission;
    ipdDocuments: any[];
    ipdVisits: any[];
    ipdLabTests: any[];
    ipdSurgeries: any[];
    opdLabTests: any[];
    opdSurgeries: any[];
    patientDocuments: any[];
  } | null>(null);

  // Fetch patient details
  const fetchPatientDetails = async () => {
    if (!admissionId) return;
    
    try {
      setIsLoading(true);
      const response = await ipdApi.getPatientDetails(admissionId);
      setPatientData(response.data.data);
    } catch (error) {
      console.error('Error fetching patient details:', error);
      toast.error('Failed to fetch patient details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientDetails();
  }, [admissionId]);

  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return 'Invalid Date';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'Invalid Date';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'ADMITTED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
      case 'NOT_CONFIRMED':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleVisitAdded = () => {
    fetchPatientDetails();
    setIsVisitFormOpen(false);
  };


  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/doctor/ipd-management')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading patient details...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!patientData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/doctor/ipd-management')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Patient details not found</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { admission, ipdDocuments, ipdVisits, ipdLabTests, ipdSurgeries, opdLabTests, opdSurgeries, patientDocuments } = patientData;
  const patient = admission.queue.patient;

  // Group visits by date
  const visitsByDate = ipdVisits.reduce((acc: any, visit: any) => {
    if (!visit) return acc;
    // Handle both visitDate and createdAt fields
    const visitDate = visit.visitDate || visit.createdAt;
    if (!visitDate) return acc;
    try {
      const dateObj = new Date(visitDate);
      if (isNaN(dateObj.getTime())) return acc;
      const date = dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      if (!acc[date]) acc[date] = [];
      acc[date].push(visit);
    } catch (error) {
      console.error('Error grouping visit by date:', error, visit);
    }
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/doctor/ipd-management')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
            <p className="text-sm text-gray-500">
              {admission.queue.ipdNumber} • {admission.wardType} • Room {admission.roomNumber || 'N/A'} • Bed {admission.bedNumber || 'N/A'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(admission.status)}>
            {admission.status}
          </Badge>
        </div>
      </div>

      {/* Patient Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            Patient Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-500">UHID</div>
              <div className="font-medium">{patient.uhid}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Age</div>
              <div className="font-medium">
                {patient.dob ? `${new Date().getFullYear() - new Date(patient.dob).getFullYear()} years` : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Gender</div>
              <div className="font-medium">{patient.gender}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Phone</div>
              <div className="font-medium">{patient.phone}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Admission Date</div>
              <div className="font-medium">{formatDate(admission.admissionDate)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Assigned Doctor</div>
              <div className="font-medium">
                {admission.assignedDoctor?.name || 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Chief Complaint</div>
              <div className="font-medium">{admission.chiefComplaint || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Insurance</div>
              <div className="font-medium">{admission.insuranceType || 'N/A'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="opd-tests">OPD Tests</TabsTrigger>
          <TabsTrigger value="opd-surgeries">OPD Surgeries</TabsTrigger>
          <TabsTrigger value="ipd-visits">IPD Visits</TabsTrigger>
          <TabsTrigger value="ipd-tests">IPD Tests</TabsTrigger>
          <TabsTrigger value="ipd-surgeries">IPD Surgeries</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ipdDocuments.length + patientDocuments.length}</div>
                <p className="text-sm text-gray-500">Total documents</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Tests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{opdLabTests.length + ipdLabTests.length}</div>
                <p className="text-sm text-gray-500">OPD: {opdLabTests.length} | IPD: {ipdLabTests.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Scissors className="h-5 w-5" />
                  Surgeries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{opdSurgeries.length + ipdSurgeries.length}</div>
                <p className="text-sm text-gray-500">OPD: {opdSurgeries.length} | IPD: {ipdSurgeries.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Visits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Recent Visits
                </span>
                <Button size="sm" onClick={() => setIsVisitFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Visit
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ipdVisits.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No visits recorded yet</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(visitsByDate).slice(0, 3).map(([date, visits]: [string, any]) => (
                    <div key={date} className="border-l-2 border-blue-500 pl-4">
                      <div className="font-medium text-gray-900">{date}</div>
                      {visits.map((visit: any) => (
                        <div 
                          key={visit.id} 
                          className="mt-2 text-sm text-gray-600 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                          onClick={() => {
                            setSelectedVisit(visit);
                            setIsVisitDetailOpen(true);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {formatDate(visit.visitDate || visit.createdAt)}
                            {visit.doctor && (
                              <>
                                <span className="mx-1">•</span>
                                <span className="text-blue-600">Dr. {visit.doctor.name}</span>
                              </>
                            )}
                          </div>
                          <p className="mt-1 line-clamp-2">{visit.visitNotes || 'No notes available'}</p>
                          {visit.vitals && visit.vitals.length > 0 && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                              <Activity className="h-3 w-3" />
                              {visit.vitals.length} vital(s) recorded
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                IPD Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ipdDocuments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No IPD documents uploaded</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Uploaded Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ipdDocuments.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.fileName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{doc.category}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(doc.uploadedAt)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(doc.fileUrl, '_blank')}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Patient Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Patient Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patientDocuments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No patient documents</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Uploaded Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patientDocuments.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.fileName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{doc.category}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(doc.uploadedAt)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(doc.fileUrl, '_blank')}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* OPD Tests Tab */}
        <TabsContent value="opd-tests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                OPD Lab Tests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {opdLabTests.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No OPD lab tests found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test Name</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {opdLabTests.map((test) => (
                      <TableRow key={test.id}>
                        <TableCell className="font-medium">
                          {test.labTest?.name || test.testName || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {test.appointment?.scheduledAt
                            ? formatDate(test.appointment.scheduledAt)
                            : formatDate(test.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(test.status)}>
                            {test.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {test.appointment?.doctor?.name || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {test.results && test.results.length > 0 && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedTestForView({
                                  id: test.id,
                                  name: test.labTest?.name || test.testName || 'Test'
                                });
                                setIsViewTestResultOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Results
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* OPD Surgeries Tab */}
        <TabsContent value="opd-surgeries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scissors className="h-5 w-5" />
                OPD Surgeries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {opdSurgeries.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No OPD surgeries found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Scheduled Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Doctor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {opdSurgeries.map((surgery) => (
                      <TableRow key={surgery.id}>
                        <TableCell className="font-medium">{surgery.category}</TableCell>
                        <TableCell>{surgery.description || 'N/A'}</TableCell>
                        <TableCell>
                          {surgery.scheduledAt ? formatDate(surgery.scheduledAt) : 'Not scheduled'}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(surgery.status)}>
                            {surgery.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {surgery.appointment?.doctor?.name || 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* IPD Visits Tab */}
        <TabsContent value="ipd-visits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5" />
                  IPD Visits
                </span>
                <Button size="sm" onClick={() => setIsVisitFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Visit
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.entries(visitsByDate).length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No visits recorded</h3>
                  <p className="text-gray-500">Record the first visit for this patient</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(visitsByDate).map(([date, visits]: [string, any]) => (
                    <div key={date} className="border-l-4 border-blue-500 pl-4">
                      <div className="font-bold text-lg text-gray-900 mb-3">{date}</div>
                      <div className="space-y-3">
                        {visits.map((visit: any) => (
                          <Card 
                            key={visit.id}
                            className="cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => {
                              setSelectedVisit(visit);
                              setIsVisitDetailOpen(true);
                            }}
                          >
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                                    <Clock className="h-4 w-4" />
                                    {formatDate(visit.visitDate || visit.createdAt)}
                                    {visit.doctor && (
                                      <>
                                        <span>•</span>
                                        <span className="text-blue-600 font-medium">Dr. {visit.doctor.name}</span>
                                      </>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    {visit.visitNotes && (
                                      <div>
                                        <div className="text-sm font-medium text-gray-700 mb-1">Notes:</div>
                                        <div className="text-sm text-gray-600 line-clamp-2">{visit.visitNotes}</div>
                                      </div>
                                    )}
                                    {visit.clinicalObservations && (
                                      <div>
                                        <div className="text-sm font-medium text-gray-700 mb-1">Clinical Observations:</div>
                                        <div className="text-sm text-gray-600 line-clamp-2">{visit.clinicalObservations}</div>
                                      </div>
                                    )}
                                    {visit.treatmentGiven && (
                                      <div>
                                        <div className="text-sm font-medium text-gray-700 mb-1">Treatment Given:</div>
                                        <div className="text-sm text-gray-600 line-clamp-2">{visit.treatmentGiven}</div>
                                      </div>
                                    )}
                                    {visit.vitals && visit.vitals.length > 0 && (
                                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                                        <Activity className="h-3 w-3" />
                                        {visit.vitals.length} vital(s) recorded
                                      </div>
                                    )}
                                    <div className="text-xs text-blue-600 mt-2 font-medium">
                                      Click to view full details →
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* IPD Tests Tab */}
        <TabsContent value="ipd-tests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  IPD Lab Tests
                </span>
                <Button size="sm" onClick={() => setIsAddTestFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Test
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ipdLabTests.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No IPD lab tests ordered</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test Name</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ordered Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ipdLabTests.map((test) => (
                      <TableRow key={test.id}>
                        <TableCell className="font-medium">{test.testName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{test.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(test.status)}>
                            {test.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(test.orderedAt)}</TableCell>
                        <TableCell>
                          {test.resultValue ? (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedIPDTest(test);
                                setIsViewIPDTestOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Results
                            </Button>
                          ) : (
                            <span className="text-gray-400 text-sm">No results yet</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* IPD Surgeries Tab */}
        <TabsContent value="ipd-surgeries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Scissors className="h-5 w-5" />
                  IPD Surgeries
                </span>
                <Button size="sm" onClick={() => navigate(`/doctor/ipd/${admissionId}/surgeries/create`)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Surgery
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ipdSurgeries.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No IPD surgeries scheduled</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Surgery Name</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Scheduled Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ipdSurgeries.map((surgery) => (
                      <TableRow key={surgery.id}>
                        <TableCell className="font-medium">{surgery.surgeryName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{surgery.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(surgery.status)}>
                            {surgery.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {surgery.scheduledAt ? formatDate(surgery.scheduledAt) : 'Not scheduled'}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Visit Form */}
      <IPDVisitForm
        isOpen={isVisitFormOpen}
        onClose={() => setIsVisitFormOpen(false)}
        onSuccess={handleVisitAdded}
        admissionId={admissionId!}
        patientName={patient.name}
      />

      {/* Visit Detail Dialog */}
      <Dialog open={isVisitDetailOpen} onOpenChange={setIsVisitDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-blue-600" />
              Visit Details
            </DialogTitle>
          </DialogHeader>
          {selectedVisit && (
            <div className="space-y-4">
              {/* Visit Header */}
              <div className="flex items-center justify-between pb-4 border-b">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      {formatDate(selectedVisit.visitDate || selectedVisit.createdAt)}
                    </div>
                    {selectedVisit.doctor && (
                      <div className="flex items-center gap-2 mt-1">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{selectedVisit.doctor.name}</span>
                        {selectedVisit.doctor.specialisation && (
                          <span className="text-sm text-gray-500">
                            ({selectedVisit.doctor.specialisation})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Visit Notes */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Visit Notes</h4>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                  {selectedVisit.visitNotes || 'No notes available'}
                </p>
              </div>

              {/* Clinical Observations */}
              {selectedVisit.clinicalObservations && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Clinical Observations</h4>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                    {selectedVisit.clinicalObservations}
                  </p>
                </div>
              )}

              {/* Treatment Given */}
              {selectedVisit.treatmentGiven && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Treatment Given</h4>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                    {selectedVisit.treatmentGiven}
                  </p>
                </div>
              )}

              {/* Medication Changes */}
              {selectedVisit.medicationChanges && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Medication Changes</h4>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                    {selectedVisit.medicationChanges}
                  </p>
                </div>
              )}

              {/* Patient Response */}
              {selectedVisit.patientResponse && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Patient Response</h4>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                    {selectedVisit.patientResponse}
                  </p>
                </div>
              )}

              {/* Next Visit Plan */}
              {selectedVisit.nextVisitPlan && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Next Visit Plan</h4>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                    {selectedVisit.nextVisitPlan}
                  </p>
                </div>
              )}

              {/* Vitals */}
              {selectedVisit.vitals && selectedVisit.vitals.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Vitals</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {selectedVisit.vitals.map((vital: any, index: number) => {
                      const getVitalIcon = (type: string) => {
                        switch (type) {
                          case 'BP_SYSTOLIC':
                          case 'BP_DIASTOLIC':
                            return <Activity className="h-4 w-4 text-blue-600" />;
                          case 'HEART_RATE':
                            return <Heart className="h-4 w-4 text-red-600" />;
                          case 'TEMPERATURE':
                            return <Thermometer className="h-4 w-4 text-orange-600" />;
                          default:
                            return <Activity className="h-4 w-4 text-gray-600" />;
                        }
                      };

                      const getVitalLabel = (type: string) => {
                        switch (type) {
                          case 'BP_SYSTOLIC': return 'BP Systolic';
                          case 'BP_DIASTOLIC': return 'BP Diastolic';
                          case 'HEART_RATE': return 'Heart Rate';
                          case 'TEMPERATURE': return 'Temperature';
                          case 'WEIGHT': return 'Weight';
                          case 'HEIGHT': return 'Height';
                          case 'SPO2': return 'SpO2';
                          case 'RESPIRATORY_RATE': return 'Respiratory Rate';
                          default: return type;
                        }
                      };

                      return (
                        <div key={index} className="bg-blue-50 p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            {getVitalIcon(vital.type)}
                            <span className="text-xs font-medium text-gray-700">
                              {getVitalLabel(vital.type)}
                            </span>
                          </div>
                          <div className="text-sm font-semibold text-gray-900">
                            {vital.value} {vital.unit || ''}
                          </div>
                          {vital.notes && (
                            <div className="text-xs text-gray-500 mt-1">{vital.notes}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* OPD Test Results Dialog */}
      <Dialog open={isViewTestResultOpen} onOpenChange={setIsViewTestResultOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Test Result - {selectedTestForView?.name}</DialogTitle>
          </DialogHeader>
          {selectedTestForView && (
            <ViewTestResult
              appointmentLabTestId={selectedTestForView.id}
              testName={selectedTestForView.name}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* IPD Test Results Dialog */}
      <Dialog open={isViewIPDTestOpen} onOpenChange={setIsViewIPDTestOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5 text-blue-600" />
              Test Result - {selectedIPDTest?.testName || 'IPD Lab Test'}
            </DialogTitle>
          </DialogHeader>
          {selectedIPDTest && (
            <div className="space-y-4">
              {/* Test Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-500">Test Name</div>
                  <div className="text-base font-semibold text-gray-900">{selectedIPDTest.testName}</div>
                </div>
                {selectedIPDTest.testCode && (
                  <div>
                    <div className="text-sm font-medium text-gray-500">Test Code</div>
                    <div className="text-base text-gray-900">{selectedIPDTest.testCode}</div>
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium text-gray-500">Status</div>
                  <Badge className={getStatusColor(selectedIPDTest.status)}>
                    {selectedIPDTest.status}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Priority</div>
                  <Badge variant="outline">{selectedIPDTest.priority}</Badge>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Ordered Date</div>
                  <div className="text-base text-gray-900">{formatDate(selectedIPDTest.orderedAt)}</div>
                </div>
                {selectedIPDTest.completedAt && (
                  <div>
                    <div className="text-sm font-medium text-gray-500">Completed Date</div>
                    <div className="text-base text-gray-900">{formatDate(selectedIPDTest.completedAt)}</div>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Results</h3>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm font-medium text-gray-500 mb-1">Result Value</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {selectedIPDTest.resultValue}
                        {selectedIPDTest.resultUnit && ` ${selectedIPDTest.resultUnit}`}
                      </div>
                    </div>
                    {selectedIPDTest.normalRange && (
                      <div>
                        <div className="text-sm font-medium text-gray-500 mb-1">Normal Range</div>
                        <div className="text-base text-gray-700">{selectedIPDTest.normalRange}</div>
                      </div>
                    )}
                  </div>
                  {selectedIPDTest.abnormalFlag && (
                    <div className="mt-2">
                      <Badge variant="destructive" className="mb-2">Abnormal Result</Badge>
                    </div>
                  )}
                  {selectedIPDTest.resultNotes && (
                    <div className="mt-4">
                      <div className="text-sm font-medium text-gray-500 mb-1">Notes</div>
                      <div className="text-sm text-gray-700 bg-white p-3 rounded">
                        {selectedIPDTest.resultNotes}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Test Instructions */}
              {(selectedIPDTest.instructions || selectedIPDTest.specialInstructions || selectedIPDTest.fastingRequired) && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Instructions</h3>
                  <div className="space-y-2">
                    {selectedIPDTest.instructions && (
                      <div>
                        <div className="text-sm font-medium text-gray-500 mb-1">Instructions</div>
                        <div className="text-sm text-gray-700">{selectedIPDTest.instructions}</div>
                      </div>
                    )}
                    {selectedIPDTest.fastingRequired && (
                      <div>
                        <div className="text-sm font-medium text-gray-500 mb-1">Fasting Required</div>
                        <div className="text-sm text-gray-700">
                          Yes
                          {selectedIPDTest.fastingHours && ` (${selectedIPDTest.fastingHours} hours)`}
                        </div>
                      </div>
                    )}
                    {selectedIPDTest.specialInstructions && (
                      <div>
                        <div className="text-sm font-medium text-gray-500 mb-1">Special Instructions</div>
                        <div className="text-sm text-gray-700">{selectedIPDTest.specialInstructions}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Attachments */}
              {selectedIPDTest.attachments && selectedIPDTest.attachments.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h3>
                  <div className="space-y-2">
                    {selectedIPDTest.attachments.map((attachment: any) => (
                      <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-700">{attachment.fileName}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(attachment.fileUrl, '_blank')}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add IPD Lab Test Dialog */}
      <Dialog open={isAddTestFormOpen} onOpenChange={setIsAddTestFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5 text-blue-600" />
              Add IPD Lab Test
            </DialogTitle>
          </DialogHeader>
          <IPDLabTestForm
            admissionId={admissionId!}
            patientName={patient?.name || ''}
            onSuccess={() => {
              setIsAddTestFormOpen(false);
              fetchPatientDetails();
            }}
            onCancel={() => setIsAddTestFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// IPD Lab Test Form Component
function IPDLabTestForm({
  admissionId,
  patientName: _patientName,
  onSuccess,
  onCancel
}: {
  admissionId: string;
  patientName: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [selectedLabTestId, setSelectedLabTestId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    testName: '',
    testCode: '',
    category: '',
    priority: 'ROUTINE' as 'ROUTINE' | 'URGENT' | 'STAT',
    instructions: '',
    fastingRequired: false,
    fastingHours: '',
    specialInstructions: '',
    testCost: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch available lab tests (for LabTestSearch component to use)
  useQuery<any>({
    queryKey: ['lab-tests'],
    queryFn: async () => {
      const response = await labApi.getLabTests();
      return response.data?.data;
    },
  });

  // Handle test selection from dropdown
  const handleTestSelect = (test: { id: string; name: string; code?: string; category?: string; charge?: number }) => {
    setSelectedLabTestId(test.id);
    setFormData(prev => ({
      ...prev,
      testName: test.name,
      testCode: test.code || '',
      category: test.category || '',
      testCost: test.charge?.toString() || '',
    }));
  };

  // Handle manual test name input
  const handleManualTestNameChange = (value: string) => {
    // If user manually changes test name, clear the selected test ID
    if (value !== formData.testName) {
      setSelectedLabTestId(null);
    }
    setFormData(prev => ({ ...prev, testName: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.testName.trim()) {
      toast.error('Test name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await ipdApi.createIPDLabTest({
        admissionId,
        testName: formData.testName,
        testCode: formData.testCode || undefined,
        category: formData.category || undefined,
        priority: formData.priority,
        instructions: formData.instructions || undefined,
        fastingRequired: formData.fastingRequired,
        fastingHours: formData.fastingHours ? parseInt(formData.fastingHours) : undefined,
        specialInstructions: formData.specialInstructions || undefined,
        testCost: formData.testCost ? parseFloat(formData.testCost) : undefined,
        labTestId: selectedLabTestId || undefined,
      });
      toast.success('Lab test ordered successfully');
      onSuccess();
    } catch (error: any) {
      console.error('Error creating IPD lab test:', error);
      toast.error(error.response?.data?.message || 'Failed to create lab test');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        <div>
          <Label>Select Test from Catalog</Label>
          <LabTestSearch
            onTestSelect={handleTestSelect}
            placeholder="Search and select a test..."
            className="w-full"
          />
          {selectedLabTestId && (
            <p className="text-sm text-green-600 mt-1">
              ✓ Test selected from catalog
            </p>
          )}
        </div>

        <div className="text-sm text-gray-500 text-center">OR</div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="testName">Test Name *</Label>
            <Input
              id="testName"
              value={formData.testName}
              onChange={(e) => handleManualTestNameChange(e.target.value)}
              placeholder="Enter test name manually"
              required
              disabled={isSubmitting}
            />
          </div>
        <div>
          <Label htmlFor="testCode">Test Code</Label>
          <Input
            id="testCode"
            value={formData.testCode}
            onChange={(e) => setFormData(prev => ({ ...prev, testCode: e.target.value }))}
            placeholder="Enter test code"
            disabled={isSubmitting}
          />
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            placeholder="e.g., Blood Test, Urine Test"
            disabled={isSubmitting}
          />
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
          <Label htmlFor="testCost">Test Cost</Label>
          <Input
            id="testCost"
            type="number"
            step="0.01"
            value={formData.testCost}
            onChange={(e) => setFormData(prev => ({ ...prev, testCost: e.target.value }))}
            placeholder="0.00"
            disabled={isSubmitting}
          />
        </div>
        <div className="flex items-center gap-4 pt-6">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="fastingRequired"
              checked={formData.fastingRequired}
              onChange={(e) => setFormData(prev => ({ ...prev, fastingRequired: e.target.checked }))}
              disabled={isSubmitting}
              className="rounded"
            />
            <Label htmlFor="fastingRequired" className="font-normal cursor-pointer">
              Fasting Required
            </Label>
          </div>
          {formData.fastingRequired && (
            <div className="flex-1">
              <Input
                type="number"
                value={formData.fastingHours}
                onChange={(e) => setFormData(prev => ({ ...prev, fastingHours: e.target.value }))}
                placeholder="Hours"
                disabled={isSubmitting}
                className="w-24"
              />
            </div>
          )}
        </div>
        </div>
      </div>

      <div>
        <Label htmlFor="instructions">Instructions</Label>
        <Textarea
          id="instructions"
          value={formData.instructions}
          onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
          placeholder="General instructions for the test"
          rows={3}
          disabled={isSubmitting}
        />
      </div>

      <div>
        <Label htmlFor="specialInstructions">Special Instructions</Label>
        <Textarea
          id="specialInstructions"
          value={formData.specialInstructions}
          onChange={(e) => setFormData(prev => ({ ...prev, specialInstructions: e.target.value }))}
          placeholder="Any special instructions or notes"
          rows={2}
          disabled={isSubmitting}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Ordering...' : 'Order Test'}
        </Button>
      </div>
    </form>
  );
}

