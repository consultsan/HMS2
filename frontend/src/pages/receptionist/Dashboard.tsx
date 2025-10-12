import { useQuery } from '@tanstack/react-query';
import QueueManagement from './QueueManagement';

interface KPIs {
  totalPatients: number;
  activeAppointments: number;
  totalRevenue: number;
  pendingVisits: number;
}

export default function ReceptionistDashboard() {
  const { isLoading } = useQuery<KPIs>({
    queryKey: ['receptionist-kpis'],
    queryFn: async () => {
      // const response = await api.get('/api/receptionist/kpis');
      // return response.data;
      return {
        totalPatients: 12,
        activeAppointments: 1,
        totalRevenue: 2323,
        pendingVisits: 2,
      }
    },
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
      {/* KPI Cards */}
      <QueueManagement />
    </div>
  );
} 