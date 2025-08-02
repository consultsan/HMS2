import { useState } from "react";
import { formatDate, calculateAge } from "../../utils/dateUtils";
import { api } from "@/lib/api";
import ViewDiagnosisRecordButton from "./viewDiagnosisRecord";
import { User, Calendar, Phone, Heart, History, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Patient, RegistrationMode } from "@/types/types";
import { patientApi } from "@/api/patient";

function PatientBasicDetails({ patientId }: { patientId: string }) {
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { data: patient, isLoading: isPatientLoading } = useQuery<Patient>({
        queryKey: ['patient-details', patientId],
        queryFn: async () => {
            const response = await patientApi.getPatientById(patientId);
            return response;
        },
        enabled: !!patientId,
    });

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/api/appointment/history?patientId=${patient?.id}`);
      setHistory(response.data.data);
    } catch (err) {
      setError("Failed to fetch patient history");
      console.error("Error fetching history:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistory = () => {
    setShowHistory(!showHistory);
    if (!showHistory) {
      fetchHistory();
    }
  };

  const getRegistrationModeColor = (mode: RegistrationMode | undefined) => {
    if (mode === undefined) return;
    switch (mode.toLowerCase()) {
      case 'opd':
        return 'bg-blue-100 text-blue-800';
      case 'ipd':
        return 'bg-purple-100 text-purple-800';
      case 'emergency':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getReferredByInfo = () => {
    if (patient?.registrationSource === 'REFERRAL' || patient?.registrationSource === 'AFFILIATE') {
      return patient?.registrationSourceDetails || 'Not specified';
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      {/* Compact Patient Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 p-2 rounded-full">
            <User className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{patient?.name}</h2>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {calculateAge(patient?.dob)} years, {patient?.gender}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {patient?.phone}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRegistrationModeColor(patient?.registrationMode)}`}>
                {patient?.registrationMode}
              </span>
            </div>
          </div>
        </div>

        {getReferredByInfo() && (
          <div className="text-right">
            <div className="text-xs text-gray-500">Referred by</div>
            <div className="text-sm font-medium text-blue-600">{getReferredByInfo()}</div>
          </div>
        )}
      </div>

      {/* Compact Medical History */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Heart className="w-4 h-4 text-red-500" />
          <h3 className="text-sm font-semibold text-gray-800">Medical History</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          {[
            {
              title: 'Allergies',
              value: patient?.allergy || 'None',
              icon: '🤧',
              isEmpty: !patient?.allergy
            },
            {
              title: 'Chronic Diseases',
              value: patient?.chronicDisease || 'None',
              icon: '🏥',
              isEmpty: !patient?.chronicDisease
            },
            {
              title: 'Pre-existing Conditions',
              value: patient?.preExistingCondition || 'None',
              icon: '📋',
              isEmpty: !patient?.preExistingCondition
            },
          ].map(({ title, value, icon, isEmpty }) => (
            <div key={title} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
              <span className="text-sm">{icon}</span>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-700 text-xs">{title}</div>
                <div className={`text-xs truncate ${isEmpty ? 'text-gray-500 italic' : 'text-gray-800'}`}>
                  {value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Compact History Section */}
      <div className="border-t border-gray-100 pt-4">
        <button
          onClick={handleViewHistory}
          className="flex items-center justify-between w-full p-2 hover:bg-gray-50 transition-colors rounded-lg"
        >
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-gray-800">Appointment History</span>
            {history.length > 0 && (
              <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-0.5 rounded-full">
                {history.length}
              </span>
            )}
          </div>
          {showHistory ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </button>

        {showHistory && (
          <div className="mt-3">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-sm text-gray-600">Loading...</span>
              </div>
            ) : error ? (
              <div className="text-center py-4">
                <div className="text-red-500 text-sm mb-1">⚠️ {error}</div>
                <button
                  onClick={fetchHistory}
                  className="text-blue-500 hover:text-blue-700 text-xs underline"
                >
                  Try again
                </button>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <History className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No appointment history found</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {history.map((appointment: any) => (
                  <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-medium text-gray-900">
                          {formatDate(appointment.scheduledAt)}
                        </span>
                        <span className="text-gray-600">
                          Dr. {appointment.doctor.name}
                        </span>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                          {appointment.doctor.specialisation}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1 truncate">
                        {appointment?.diagnosisRecord?.diagnosis || 'No diagnosis recorded'}
                      </div>
                    </div>
                    <div className="ml-3">
                      {appointment?.diagnosisRecord ? (
                        <ViewDiagnosisRecordButton appointmentId={appointment.id} />
                      ) : (
                        <span className="text-gray-400 text-xs">No records</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PatientBasicDetails;