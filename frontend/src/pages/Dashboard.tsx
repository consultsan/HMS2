import { useQuery } from '@tanstack/react-query';
import { BuildingOfficeIcon, UserGroupIcon, UserIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import apiClient from '../api/client';
import { toast } from 'react-hot-toast';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const stats = [
  { name: 'Total Hospitals', value: '0', icon: BuildingOfficeIcon },
  { name: 'Total Users', value: '0', icon: UserGroupIcon },
  { name: 'Total Patients', value: '0', icon: UserIcon },
  { name: 'Total Revenue', value: '$0', icon: CurrencyDollarIcon },
];

const chartData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [
    {
      label: 'Revenue',
      data: [0, 0, 0, 0, 0, 0],
      borderColor: 'rgb(14, 165, 233)',
      backgroundColor: 'rgba(14, 165, 233, 0.5)',
    },
  ],
};

const chartOptions = {
  responsive: true,
  plugins: {
    legend: {
      position: 'top' as const,
    },
    title: {
      display: true,
      text: 'Monthly Revenue',
    },
  },
};

export default function Dashboard() {
  const { data: kpis, error } = useQuery({
    queryKey: ['kpis'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/super-admin/kpis');
        return response.data;
      } catch (error) {
        console.error('Error fetching KPIs:', error);
        toast.error('Failed to fetch dashboard data');
        throw error;
      }
    },
  });

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load dashboard data</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-700">
          Overview of your hospital management system
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="relative overflow-hidden rounded-lg bg-white px-4 pb-12 pt-5 shadow sm:px-6 sm:pt-6"
          >
            <dt>
              <div className="absolute rounded-md bg-primary-500 p-3">
                <stat.icon className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-500">
                {stat.name}
              </p>
            </dt>
            <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
              <p className="text-2xl font-semibold text-gray-900">
                {kpis ? kpis[stat.name.toLowerCase().replace(' ', '')] : stat.value}
              </p>
            </dd>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <div className="rounded-lg bg-white p-6 shadow">
          <Line options={chartOptions} data={chartData} />
        </div>
      </div>
    </div>
  );
} 