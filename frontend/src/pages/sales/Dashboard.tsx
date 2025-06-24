import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserGroupIcon, ChartBarIcon, CurrencyDollarIcon, UserIcon } from '@heroicons/react/24/outline';
import Patients from '../hospital-admin/Patients';

interface KPIs {
  totalPatients: number;
  totalRevenue: number;
  monthlyTarget: number;
  conversionRate: number;
}

export default function SalesDashboard() {
  const { data: kpis, isLoading } = useQuery<KPIs>({
    queryKey: ['sales-kpis'],
    queryFn: async () => {
      const response = await api.get('/api/sales/kpis');
      return response.data;
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
      name: 'Total Revenue',
      value: `$${kpis?.totalRevenue?.toLocaleString() || 0}`,
      icon: CurrencyDollarIcon,
    },
    {
      name: 'Monthly Target',
      value: `$${kpis?.monthlyTarget?.toLocaleString() || 0}`,
      icon: ChartBarIcon,
    },
    {
      name: 'Conversion Rate',
      value: `${kpis?.conversionRate || 0}%`,
      icon: UserIcon,
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Sales Dashboard</h1>
      
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

      {/* Patients Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Patient Management</h2>
          <Patients />
        </div>
      </div>

      {/* Sales Analytics Section */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Sales Analytics</h2>
        <p className="text-gray-600">Sales analytics and reporting functionality coming soon.</p>
      </div>
    </div>
  );
} 