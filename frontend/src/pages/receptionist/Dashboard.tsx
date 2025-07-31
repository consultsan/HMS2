import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserGroupIcon, ClockIcon, CurrencyDollarIcon, UserIcon } from '@heroicons/react/24/outline';
import Patients from '../hospital-admin/Patients';
import AppointmentManagement from '../appointment/AppointmentManagement';
import QueueManagement from './QueueManagement';

interface KPIs {
  totalPatients: number;
  activeAppointments: number;
  totalRevenue: number;
  pendingVisits: number;
}

export default function ReceptionistDashboard() {
  const { data: kpis, isLoading } = useQuery<KPIs>({
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