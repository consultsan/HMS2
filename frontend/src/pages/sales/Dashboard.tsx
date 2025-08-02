import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserGroupIcon, ChartBarIcon, CurrencyDollarIcon, UserIcon } from '@heroicons/react/24/outline';
import Patients from '../hospital-admin/Patients';


export default function SalesDashboard() {
  
  

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Sales Dashboard</h1>
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