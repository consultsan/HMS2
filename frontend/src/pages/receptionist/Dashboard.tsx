import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserGroupIcon, ClockIcon, CurrencyDollarIcon, UserIcon } from '@heroicons/react/24/outline';
import Patients from '../hospital-admin/Patients';
import AppointmentManagement from '../appointment/AppointmentManagement';
import AppointmentsSection from './QueueManagement';

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

  const stats = [
    {
      name: 'Total Patients',
      value: kpis?.totalPatients || 0,
      icon: UserGroupIcon,
    },
    {
      name: 'Active Appointments',
      value: kpis?.activeAppointments || 0,
      icon: ClockIcon,
    },
    {
      name: 'Total Revenue',
      value: `$${kpis?.totalRevenue?.toLocaleString() || 0}`,
      icon: CurrencyDollarIcon,
    },
    {
      name: 'Pending Visits',
      value: kpis?.pendingVisits || 0,
      icon: UserIcon,
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Receptionist Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.name}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <AppointmentsSection />
    </div>
  );
} 