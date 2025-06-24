import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

interface KPIs {
  totalHospitals: number;
  totalAdmins: number;
  totalPatients: number;
  totalRevenue: number;
}

export default function Dashboard() {
  const { data: kpis, isLoading } = useQuery<KPIs>({
    queryKey: ['kpis'],
    queryFn: async () => {
      // const response = await api.get('/api/super-admin/kpis');
      // return response.data;

      // Dummy data for development
      return {
        totalHospitals: 100,
        totalAdmins: 50,
        totalPatients: 250,
        totalRevenue: 110000,
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
      name: 'Total Hospitals',
      value: kpis?.totalHospitals || 0,
    },
    {
      name: 'Total Admins',
      value: kpis?.totalAdmins || 0,

    },
    {
      name: 'Total Revenue',
      value: `$${kpis?.totalRevenue?.toLocaleString() || 0}`,

    },
    {
      name: 'Total Patients',
      value: kpis?.totalPatients || 0,
    },
  ];
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (<Card key={idx} className="bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 font-normal">{stat.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          </CardContent>
        </Card>))}
      </div>
    </div>
  );
} 