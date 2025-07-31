import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { TimeIntervalFilter } from '@/components/TimeIntervalFilter';
import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  Users,
  Calendar,
  TrendingUp,
  IndianRupee,
  Activity,
  UserCheck,
  Building2,
  User,
  BadgeIndianRupee
} from 'lucide-react';


type IntervalOption = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom_month' | 'custom_year';

interface SuperAdminKpis {
  totalAdmins: number;
  period: {
    start: string;
    end: string;
  };
  hospitalDetails: {
    [hospitalName: string]: {
      totalPatients: number;
      totalRevenue: number;
      totalStaff: number;
      totalAppointments: number;
      averageRevenuePerAppointment: number;

    };
  };
}



export default function Dashboard() {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [selectedInterval, setSelectedInterval] = useState<IntervalOption>('today');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const handleTimeIntervalChange = React.useCallback((start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  }, []);

  const handleIntervalChange = React.useCallback((interval: IntervalOption) => {
    setSelectedInterval(interval);
  }, []);

  const handleMonthChange = React.useCallback((month: number) => {
    setSelectedMonth(month);
  }, []);

  const handleYearChange = React.useCallback((year: number) => {
    setSelectedYear(year);
  }, []);



  const { data: kpis, isLoading, error } = useQuery<SuperAdminKpis>({
    queryKey: [
      'hospital-admin-kpis',
      startDate?.toISOString() ?? 'today',
      endDate?.toISOString() ?? 'today',
    ],
    queryFn: async () => {
      let params;
      if (startDate && endDate) {
        params = {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        };
      } else {
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        params = {
          startDate: startOfDay.toISOString(),
          endDate: endOfDay.toISOString(),
        };
      }

      const response = await api.get<any>('/api/super-admin/kpis-by-interval', {
        params,
      });

      return response.data?.data;
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
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Time Filter */}
      <div className="mb-8">
        <TimeIntervalFilter
          onTimeIntervalChange={handleTimeIntervalChange}
          selectedInterval={selectedInterval}
          onIntervalChange={handleIntervalChange}
          selectedMonth={selectedMonth}
          onMonthChange={handleMonthChange}
          selectedYear={selectedYear}
          onYearChange={handleYearChange}
        />
      </div>

      {kpis?.period && (
        <div className="mb-4 p-4 bg-blue-100 text-blue-800 rounded-lg shadow-sm">
          <p className="text-sm font-medium">
            Showing data from <span className="font-semibold">{format(new Date(kpis.period.start), 'PPP')}</span> to <span className="font-semibold">{format(new Date(kpis.period.end), 'PPP')}</span>
          </p>
        </div>
      )}


      {/* Hospitals Overview */}
<div>
  <h2 className="text-3xl font-extrabold text-gray-900 mb-6 text-center">Hospitals Overview</h2>
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-11/12 mx-auto">
    {kpis?.hospitalDetails &&
      Object.entries(kpis.hospitalDetails).map(([hospitalName, kpi]) => (
        <div
          key={hospitalName}
          className="bg-white p-6 rounded-2xl shadow-xl border border-gray-200 transition-transform transform hover:scale-101 hover:shadow-2xl"
        >
          <div className="flex items-center mb-4">
            <div className="p-3 mr-4 bg-green-100 text-green-600 rounded-full">
              <Building2 size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-800">{hospitalName}</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center text-gray-700">
              <div className="p-2 mr-3 bg-gray-100 rounded-full">
                <Users size={20} className="text-gray-500" />
              </div>
              <span className="font-medium">Patients:</span>
              <span className="ml-auto font-bold text-gray-900">{kpi.totalPatients ?? 0}</span>
            </div>

            <div className="flex items-center text-gray-700">
              <div className="p-2 mr-3 bg-gray-100 rounded-full">
                <UserCheck size={20} className="text-gray-500" />
              </div>
              <span className="font-medium">Staff:</span>
              <span className="ml-auto font-bold text-gray-900">{kpi.totalStaff ?? 0}</span>
            </div>

            <div className="flex items-center text-gray-700">
              <div className="p-2 mr-3 bg-gray-100 rounded-full">
                <Calendar size={20} className="text-gray-500" />
              </div>
              <span className="font-medium">Appointments:</span>
              <span className="ml-auto font-bold text-gray-900">{kpi.totalAppointments ?? 0}</span>
            </div>

            <div className="flex items-center text-gray-700">
              <div className="p-2 mr-3 bg-gray-100 rounded-full">
                <IndianRupee size={20} className="text-gray-500" />
              </div>
              <span className="font-medium">Total Revenue:</span>
              <span className="ml-auto font-bold text-green-600">₹{kpi.totalRevenue ?? 0}</span>
            </div>

            <div className="flex items-center text-gray-700">
              <div className="p-2 mr-3 bg-gray-100 rounded-full">
                <BadgeIndianRupee size={20} className="text-gray-500" />
              </div>
              <span className="font-medium">Avg. Revenue/Appointment:</span>
              <span className="ml-auto font-bold text-green-600">₹{Math.floor(kpi.averageRevenuePerAppointment) ?? 0}</span>
            </div>
          </div>
        </div>
      ))}
  </div>
</div>
    </div>
  );
}

