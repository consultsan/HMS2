import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Users, 
  UserCheck, 
  Clock, 
  Eye, 
  RefreshCw,
  Stethoscope,
  Building,
  Bed,
  MapPin,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { ipdApi } from '@/api/ipd';
import { IPDQueueEntry, IPDDashboardStats } from '@/types/ipd';
import { useWebSocket } from '@/hooks/useWebSocket';
import AddQueueModal from '@/components/ipd/AddQueueModal';
import IPDAdmissionForm from '@/components/ipd/IPDAdmissionForm';
import ReceptionistDischargeForm from '@/components/ipd/ReceptionistDischargeForm';
import IPDPatientDocumentUpload from '@/components/ipd/IPDPatientDocumentUpload';

export default function IPDQueuePage() {
  const [queueEntries, setQueueEntries] = useState<IPDQueueEntry[]>([]);
  const [activeTab, setActiveTab] = useState<string>('queued');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<IPDQueueEntry | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<IPDDashboardStats | null>(null);
  const [isAdmissionModalOpen, setIsAdmissionModalOpen] = useState(false);
  const [selectedQueueEntry, setSelectedQueueEntry] = useState<IPDQueueEntry | null>(null);
  const [isDischargeModalOpen, setIsDischargeModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [selectedAdmissionForDocuments, setSelectedAdmissionForDocuments] = useState<IPDQueueEntry | null>(null);
  const [selectedQueueEntryForDischarge, setSelectedQueueEntryForDischarge] = useState<IPDQueueEntry | null>(null);

  // WebSocket connection for real-time updates (disabled for now)
  // To enable: Set VITE_ENABLE_WEBSOCKET=true in .env file
  const { isConnected } = useWebSocket({
    url: (() => {
      if (import.meta.env.VITE_ENABLE_WEBSOCKET === 'true') {
        const apiBase = import.meta.env.VITE_API_BASE_URL || window.location.origin;
        const wsUrlObj = new URL('/api/ipd/ward-monitoring', apiBase);
        wsUrlObj.protocol = wsUrlObj.protocol === 'https:' ? 'wss:' : 'ws:';
        console.log('WebSocket enabled, connecting to:', wsUrlObj.toString());
        return wsUrlObj.toString();
      } else {
        // console.log('WebSocket disabled - set VITE_ENABLE_WEBSOCKET=true to enable');
        return 'ws://disabled'; // Dummy URL when disabled
      }
    })(),
    onMessage: (message) => {
      if (message.type === 'IPD_UPDATE' || message.type === 'WARD_UPDATE' || 
          message.type === 'ADMISSION_UPDATE' || message.type === 'DISCHARGE_UPDATE') {
        // Update the queue list and stats with new data
        fetchQueueEntries();
        fetchDashboardStats();
        toast.success('IPD status updated in real-time');
      }
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
      // Don't show error to user, just log it
    },
    maxReconnectAttempts: import.meta.env.VITE_ENABLE_WEBSOCKET === 'true' ? 3 : 0,
    reconnectInterval: 5000
  });

  // Fetch queue entries
  const fetchQueueEntries = async () => {
    try {
      setIsLoading(true);
      const params: { status?: string } = {};
      
      // Set status based on active tab
      if (activeTab === 'queued') {
        params.status = 'QUEUED';
      } else if (activeTab === 'admitted') {
        params.status = 'ADMITTED';
      } else if (activeTab === 'discharged') {
        params.status = 'DISCHARGED';
      }
      
      const response = await ipdApi.getQueue(params); 
      console.log(response.data.data);
      setQueueEntries(response.data.data);
    } catch (error) {
      console.error('Error fetching queue entries:', error);
      // Show mock data for development/testing
      setQueueEntries([]);
      toast.error('IPD Queue API not available. Using mock data.');
    } finally {
      setIsLoading(false);
    }
  };


  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
    try {
      const response = await ipdApi.getDashboardStats();
      console.log(response.data.data);
      setDashboardStats(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Don't show error toast for stats, just log it
      // The page can still function without stats
    }
  };




  // Handle admit patient
  const handleAdmitPatient = (queueEntry: IPDQueueEntry) => {
    setSelectedQueueEntry(queueEntry);
    setIsAdmissionModalOpen(true);
  };

  // Handle admission success
  const handleAdmissionSuccess = () => {
    // Refresh data to show updated status
    fetchQueueEntries();
    fetchDashboardStats();
    toast.success('Patient admitted successfully!');
  };

  // Handle discharge patient
  const handleDischargePatient = (entry: IPDQueueEntry) => {
    if (!entry.admission) {
      toast.error('No admission data found for this patient');
      return;
    }
    
    setSelectedQueueEntryForDischarge(entry);
    setIsDischargeModalOpen(true);
  };

  // Handle discharge success
  const handleDischargeSuccess = () => {
    fetchQueueEntries();
    fetchDashboardStats();
    toast.success('Patient discharged successfully!');
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'QUEUED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ADMITTED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DISCHARGED':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Render queue table (for queued patients)
  const renderQueueTable = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-pulse">
            <div className="text-lg text-gray-600">Loading queue entries...</div>
          </div>
        </div>
      );
    }

    if (queueEntries.length === 0) {
      return (
        <div className="text-center py-8">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No patients in queue</h3>
          <p className="text-gray-500">No IPD queue entries found for the selected criteria.</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Queue #</TableHead>
              <TableHead>Patient Name</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queueEntries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="font-medium">{entry.ipdNumber}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{entry.patient.name}</div>
                    <div className="text-sm text-gray-500">ID: {entry.patient.uhid}</div>
                  </div>
                </TableCell>
                <TableCell>
                  {new Date(entry.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge className={getStatusBadgeColor(entry.status)}>
                    {entry.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedEntry(entry);
                        setIsDetailsModalOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleAdmitPatient(entry)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Stethoscope className="h-4 w-4 mr-1" />
                      Admit
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  // Render admitted table (for admitted patients)
  const renderAdmittedTable = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-pulse">
            <div className="text-lg text-gray-600">Loading admitted patients...</div>
          </div>
        </div>
      );
    }

    if (queueEntries.length === 0) {
      return (
        <div className="text-center py-8">
          <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No admitted patients</h3>
          <p className="text-gray-500">No admitted patients found for the selected criteria.</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>IPD #</TableHead>
              <TableHead>Patient Name</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Ward Details</TableHead>
              <TableHead>Admitted At</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queueEntries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="font-medium">{entry.ipdNumber}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{entry.patient.name}</div>
                    <div className="text-sm text-gray-500">ID: {entry.patient.uhid}</div>
                  </div>
                </TableCell>
                <TableCell>
                  {entry.admission?.assignedDoctor ? (
                    <div>
                      <div className="font-medium">{entry.admission.assignedDoctor.name}</div>
                      <div className="text-sm text-gray-500">{entry.admission.assignedDoctor.specialisation}</div>
                    </div>
                  ) : (
                    <span className="text-gray-400">Not assigned</span>
                  )}
                </TableCell>
                <TableCell>
                  {entry.admission ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <Building className="h-3 w-3 text-blue-600" />
                        <span className="text-sm font-medium">{entry.admission.wardType}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-green-600" />
                        <span className="text-sm text-gray-600">{entry.admission.roomNumber}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Bed className="h-3 w-3 text-purple-600" />
                        <span className="text-sm text-gray-600">{entry.admission.bedNumber}</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400">No ward assigned</span>
                  )}
                </TableCell>
                <TableCell>
                  {entry.admission?.admissionDate 
                    ? new Date(entry.admission.admissionDate).toLocaleString()
                    : new Date(entry.createdAt).toLocaleString()
                  }
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedEntry(entry);
                        setIsDetailsModalOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedAdmissionForDocuments(entry);
                        setIsDocumentModalOpen(true);
                      }}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Documents
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleDischargePatient(entry)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Discharge
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  // Render discharged table (for discharged patients)
  const renderDischargedTable = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-pulse">
            <div className="text-lg text-gray-600">Loading discharged patients...</div>
          </div>
        </div>
      );
    }

    if (queueEntries.length === 0) {
      return (
        <div className="text-center py-8">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No discharged patients</h3>
          <p className="text-gray-500">No discharged patients found for the selected criteria.</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>IPD #</TableHead>
              <TableHead>Patient Name</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Ward Details</TableHead>
              <TableHead>Discharged At</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queueEntries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="font-medium">{entry.ipdNumber}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{entry.patient.name}</div>
                    <div className="text-sm text-gray-500">ID: {entry.patient.uhid}</div>
                  </div>
                </TableCell>
                <TableCell>
                  {entry.admission?.assignedDoctor ? (
                    <div>
                      <div className="font-medium">{entry.admission.assignedDoctor.name}</div>
                      <div className="text-sm text-gray-500">{entry.admission.assignedDoctor.specialisation}</div>
                    </div>
                  ) : (
                    <span className="text-gray-400">Not assigned</span>
                  )}
                </TableCell>
                <TableCell>
                  {entry.admission ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <Building className="h-3 w-3 text-blue-600" />
                        <span className="text-sm font-medium">{entry.admission.wardType}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-green-600" />
                        <span className="text-sm text-gray-600">{entry.admission.roomNumber}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Bed className="h-3 w-3 text-purple-600" />
                        <span className="text-sm text-gray-600">{entry.admission.bedNumber}</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400">No ward assigned</span>
                  )}
                </TableCell>
                <TableCell>
                  {entry.admission?.dischargeDate 
                    ? new Date(entry.admission.dischargeDate).toLocaleString()
                    : entry.dischargedAt 
                    ? new Date(entry.dischargedAt).toLocaleString()
                    : 'N/A'
                  }
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedEntry(entry);
                        setIsDetailsModalOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  // Use real dashboard stats or fallback to calculated stats
  const stats = dashboardStats ? {
    inQueue: dashboardStats.totalQueued,
    admitted: dashboardStats.totalAdmitted,
    discharged: dashboardStats.totalDischarged,
  } : {
    inQueue: queueEntries.filter(entry => entry.status === 'QUEUED').length,
    admitted: queueEntries.filter(entry => entry.status === 'ADMITTED').length,
    discharged: queueEntries.filter(entry => entry.status === 'DISCHARGED').length,
  };

  useEffect(() => {
    fetchQueueEntries();
    fetchDashboardStats();
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="h-8 w-8 text-blue-600" />
              Queue Management
            </h1>
            <p className="text-gray-600 mt-1">Manage today's IPD patient queue and confirmations</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
              size="lg"
            >
              <Plus className="mr-2 h-5 w-5" />
              Add Queue
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-yellow-50 border-yellow-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-800">In Queue</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-900">{stats.inQueue}</div>
              <p className="text-xs text-yellow-700">Patients waiting</p>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-800">Admitted</CardTitle>
              <UserCheck className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">{stats.admitted}</div>
              <p className="text-xs text-blue-700">Currently admitted</p>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-800">Discharged</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">{stats.discharged}</div>
              <p className="text-xs text-green-700">Recently discharged</p>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">IPD Management</h3>
                <Badge variant="outline" className="text-sm">
                  {activeTab === 'queued' && 'Queue Management'}
                  {activeTab === 'admitted' && 'Admitted Patients'}
                  {activeTab === 'discharged' && 'Discharged Patients'}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  fetchQueueEntries();
                  fetchDashboardStats();
                }}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* IPD Management Tabs */}
        <Card>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="queued" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Queue ({stats.inQueue})
                </TabsTrigger>
                <TabsTrigger value="admitted" className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Admitted ({stats.admitted})
                </TabsTrigger>
                <TabsTrigger value="discharged" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Discharged ({stats.discharged})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="queued" className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Queue Management</h3>
                    <Button
                      onClick={() => setIsAddModalOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Queue
                    </Button>
                  </div>
                  {renderQueueTable()}
                </div>
              </TabsContent>

              <TabsContent value="admitted" className="p-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Admitted Patients</h3>
                  {renderAdmittedTable()}
                </div>
              </TabsContent>

              <TabsContent value="discharged" className="p-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Discharged Patients</h3>
                  {renderDischargedTable()}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* WebSocket Status */}
        <div className="flex items-center justify-center">
          <div className={`flex items-center gap-2 text-sm ${
            import.meta.env.VITE_ENABLE_WEBSOCKET === 'true' 
              ? (isConnected ? 'text-green-600' : 'text-red-600')
              : 'text-gray-500'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              import.meta.env.VITE_ENABLE_WEBSOCKET === 'true'
                ? (isConnected ? 'bg-green-500' : 'bg-red-500')
                : 'bg-gray-400'
            }`}></div>
            {import.meta.env.VITE_ENABLE_WEBSOCKET === 'true' 
              ? (isConnected ? 'Connected to real-time updates' : 'Disconnected from real-time updates')
              : 'Real-time updates disabled (set VITE_ENABLE_WEBSOCKET=true to enable)'
            }
          </div>
        </div>
      </div>

      {/* Add Queue Modal */}
      <AddQueueModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          fetchQueueEntries();
          fetchDashboardStats();
        }}
      />

        {/* IPD Admission Form Modal */}
        <IPDAdmissionForm
          isOpen={isAdmissionModalOpen}
          onClose={() => setIsAdmissionModalOpen(false)}
          onSuccess={handleAdmissionSuccess}
          queueEntry={selectedQueueEntry}
        />

        {/* Discharge Modal */}
        <ReceptionistDischargeForm
          isOpen={isDischargeModalOpen}
          onClose={() => setIsDischargeModalOpen(false)}
          onSuccess={handleDischargeSuccess}
          queueEntry={selectedQueueEntryForDischarge}
        />

      {/* Queue Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Queue Entry Details</DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Queue Number</label>
                  <p className="text-lg font-semibold">{selectedEntry.ipdNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <Badge className={getStatusBadgeColor(selectedEntry.status)}>
                    {selectedEntry.status}
                  </Badge>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Patient Information</label>
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">{selectedEntry.patient.name}</p>
                  <p className="text-sm text-gray-600">ID: {selectedEntry.patient.uhid}</p>
                  <p className="text-sm text-gray-600">Phone: {selectedEntry.patient.phone}</p>
                  <p className="text-sm text-gray-600">Gender: {selectedEntry.patient.gender}</p>
                </div>
              </div>

              {selectedEntry.admission?.assignedDoctor && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Assigned Doctor</label>
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium">{selectedEntry.admission.assignedDoctor.name}</p>
                    <p className="text-sm text-gray-600">{selectedEntry.admission.assignedDoctor.specialisation}</p>
                  </div>
                </div>
              )}

              {selectedEntry.admission && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Admission Details</label>
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Admission Date</p>
                        <p className="text-sm text-gray-600">
                          {new Date(selectedEntry.admission.admissionDate).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Ward Type</p>
                        <p className="text-sm text-gray-600">{selectedEntry.admission.wardType}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Room Number</p>
                        <p className="text-sm text-gray-600">{selectedEntry.admission.roomNumber}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Bed Number</p>
                        <p className="text-sm text-gray-600">{selectedEntry.admission.bedNumber}</p>
                      </div>
                    </div>
                    {selectedEntry.admission.chiefComplaint && (
                      <div>
                        <p className="text-sm font-medium">Chief Complaint</p>
                        <p className="text-sm text-gray-600">{selectedEntry.admission.chiefComplaint}</p>
                      </div>
                    )}
                    {selectedEntry.admission.insuranceCompany && (
                      <div>
                        <p className="text-sm font-medium">Insurance</p>
                        <p className="text-sm text-gray-600">
                          {selectedEntry.admission.insuranceCompany} ({selectedEntry.admission.insuranceType})
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Created At</label>
                  <p className="text-sm">{new Date(selectedEntry.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Created By</label>
                  <p className="text-sm">{selectedEntry.createdBy.name}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Document Upload Modal */}
      <Dialog open={isDocumentModalOpen} onOpenChange={setIsDocumentModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Patient Documents - {selectedAdmissionForDocuments?.patient.name}
            </DialogTitle>
          </DialogHeader>
          {selectedAdmissionForDocuments?.admission && (
            <IPDPatientDocumentUpload
              admissionId={selectedAdmissionForDocuments.admission.id}
              patientName={selectedAdmissionForDocuments.patient.name}
              onDocumentUploaded={() => {
                // Optionally refresh data or show success message
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
