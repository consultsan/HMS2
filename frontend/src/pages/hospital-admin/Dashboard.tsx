import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserGroupIcon, ClockIcon, CurrencyDollarIcon, UserIcon } from '@heroicons/react/24/outline';

interface KPIs {
  totalStaff: number;
  activeShifts: number;
  totalRevenue: number;
  totalPatients: number;
}

export default function HospitalDashboard() {
  const { data: kpis, isLoading } = useQuery<KPIs>({
    queryKey: ['hospital-kpis'],
    queryFn: async () => {
      // const response = await api.get('/api/hospital-admin/kpis');
      // return response.data;
      return {
        totalStaff: 42,
        activeShifts: 8,
        totalRevenue: 125000,
        totalPatients: 256
      };
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
      name: 'Total Staff',
      value: kpis?.totalStaff || 0,
      icon: UserGroupIcon,
    },
    {
      name: 'Active Shifts',
      value: kpis?.activeShifts || 0,
      icon: ClockIcon,
    },
    {
      name: 'Total Revenue',
      value: `$${kpis?.totalRevenue?.toLocaleString() || 0}`,
      icon: CurrencyDollarIcon,
    },
    {
      name: 'Total Patients',
      value: kpis?.totalPatients || 0,
      icon: UserIcon,
    },
  ];

  return (
    <div className="p-6">
      {/* <h1 className="text-3xl font-bold mb-6">Hospital Dashboard</h1> */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card className='bg-white shadow-sm' key={stat.name}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500 font-normal">
                {stat.name}
              </CardTitle>
              {/* <stat.icon className="h-4 w-4 text-muted-foreground" /> */}
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="text-2xl font-bold">{stat.value || 0}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 