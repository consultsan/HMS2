import { useState, useEffect } from 'react';
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
  Stethoscope, 
  Calendar, 
  User, 
  Activity,
  Heart,
  Thermometer,
  Plus,
  FileText,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { ipdApi } from '@/api/ipd';
import { IPDVisit } from '@/types/ipd';
import IPDVisitForm from './IPDVisitForm';

interface IPDVisitsListProps {
  admissionId: string;
  patientName: string;
  onVisitAdded?: () => void;
}

export default function IPDVisitsList({
  admissionId,
  patientName,
  onVisitAdded
}: IPDVisitsListProps) {
  const [visits, setVisits] = useState<IPDVisit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisitFormOpen, setIsVisitFormOpen] = useState(false);

  // Fetch visits
  const fetchVisits = async () => {
    try {
      setIsLoading(true);
      const response = await ipdApi.getVisits(admissionId);
      setVisits(response.data.data);
    } catch (error) {
      console.error('Error fetching visits:', error);
      toast.error('Failed to fetch visits');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (admissionId) {
      fetchVisits();
    }
  }, [admissionId]);

  const handleVisitAdded = () => {
    fetchVisits();
    onVisitAdded?.();
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

  const getVitalIcon = (type: string) => {
    switch (type) {
      case 'BP_SYSTOLIC':
      case 'BP_DIASTOLIC':
        return <Activity className="h-4 w-4" />;
      case 'HEART_RATE':
        return <Heart className="h-4 w-4" />;
      case 'TEMPERATURE':
        return <Thermometer className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-blue-600" />
            Patient Visits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading visits...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-blue-600" />
              Patient Visits ({visits.length})
            </CardTitle>
            <Button
              onClick={() => setIsVisitFormOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Record Visit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {visits.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No visits recorded</h3>
              <p className="text-gray-500">Record the first visit for this patient</p>
            </div>
          ) : (
            <div className="space-y-4">
              {visits.map((visit) => (
                <div key={visit.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{formatDate(visit.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">{visit.doctor.name}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Visit Notes */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Visit Notes</h4>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                        {visit.visitNotes}
                      </p>
                    </div>

                    {/* Clinical Observations */}
                    {visit.clinicalObservations && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Clinical Observations</h4>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                          {visit.clinicalObservations}
                        </p>
                      </div>
                    )}

                    {/* Treatment Given */}
                    {visit.treatmentGiven && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Treatment Given</h4>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                          {visit.treatmentGiven}
                        </p>
                      </div>
                    )}

                    {/* Medication Changes */}
                    {visit.medicationChanges && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Medication Changes</h4>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                          {visit.medicationChanges}
                        </p>
                      </div>
                    )}

                    {/* Patient Response */}
                    {visit.patientResponse && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Patient Response</h4>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                          {visit.patientResponse}
                        </p>
                      </div>
                    )}

                    {/* Next Visit Plan */}
                    {visit.nextVisitPlan && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">Next Visit Plan</h4>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                          {visit.nextVisitPlan}
                        </p>
                      </div>
                    )}

                    {/* Vitals */}
                    {visit.vitals && visit.vitals.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Vitals</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {visit.vitals.map((vital, index) => (
                            <div key={index} className="flex items-center gap-2 bg-blue-50 p-2 rounded">
                              {getVitalIcon(vital.type)}
                              <div>
                                <div className="text-sm font-medium">
                                  {getVitalLabel(vital.type)}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {vital.value} {vital.unit}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visit Form Modal */}
      <IPDVisitForm
        isOpen={isVisitFormOpen}
        onClose={() => setIsVisitFormOpen(false)}
        onSuccess={handleVisitAdded}
        admissionId={admissionId}
        patientName={patientName}
      />
    </>
  );
}
