import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  Calendar,
  TrendingUp,
  CheckCircle,
  XCircle,
  RefreshCw,
  DollarSign,
  Activity
} from 'lucide-react';
import { doctorApi } from '@/api/doctor';

interface DoctorKpis {
  id: string;
  doctorId: string;
  hospitalId: string;
  totalAppointments: number;
  totalRevenue: number;
  totalPatients: number;
  totalFollowUps: number;
  totalCancelledAppointments: number;
  totalCompletedAppointments: number;
}

function DoctorDashboard() {
  const { user } = useAuth();
  const doctorId = user?.id;

  const { data: kpis, isLoading, error } = useQuery<DoctorKpis>({
    queryKey: ['doctor-kpis', doctorId],
    queryFn: async () => {
      if (!doctorId) throw new Error('Doctor ID is required');
      const response = await doctorApi.getDoctorKpis(doctorId);
      return response;
    },
    enabled: !!doctorId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load dashboard data</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const kpiCards = [
    {
      title: 'Total Appointments',
      value: kpis?.totalAppointments || 0,
      icon: Calendar,
      color: 'bg-blue-500',
      description: 'All appointments scheduled'
    },
    {
      title: 'Total Patients',
      value: kpis?.totalPatients || 0,
      icon: Users,
      color: 'bg-green-500',
      description: 'Unique patients treated'
    },
    {
      title: 'Total Revenue',
      value: `₹${(kpis?.totalRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-emerald-500',
      description: 'Revenue generated'
    },
    {
      title: 'Completed Appointments',
      value: kpis?.totalCompletedAppointments || 0,
      icon: CheckCircle,
      color: 'bg-teal-500',
      description: 'Successfully diagnosed'
    },
    {
      title: 'Follow-ups Scheduled',
      value: kpis?.totalFollowUps || 0,
      icon: RefreshCw,
      color: 'bg-purple-500',
      description: 'Follow-up appointments'
    },
    {
      title: 'Cancelled Appointments',
      value: kpis?.totalCancelledAppointments || 0,
      icon: XCircle,
      color: 'bg-red-500',
      description: 'Appointments cancelled'
    }
  ];

  // Calculate completion rate
  const completionRate = kpis?.totalAppointments
    ? Math.round((kpis.totalCompletedAppointments / kpis.totalAppointments) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Doctor Dashboard</h1>
          <p className="text-gray-600 mt-1">Overview of your practice performance</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Activity className="w-4 h-4" />
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpiCards.map((kpi, index) => {
          const IconComponent = kpi.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {kpi.title}
                </CardTitle>
                <div className={`p-2 rounded-full ${kpi.color}`}>
                  <IconComponent className="w-4 h-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
                <p className="text-xs text-gray-500 mt-1">{kpi.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Performance Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Completion Rate</span>
              <span className="text-lg font-semibold text-green-600">{completionRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {kpis?.totalAppointments || 0}
                </div>
                <div className="text-xs text-gray-500">Total Appointments</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {kpis?.totalCompletedAppointments || 0}
                </div>
                <div className="text-xs text-gray-500">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Patient Engagement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              Patient Engagement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Average Appointments per Patient</span>
              <span className="text-lg font-semibold text-purple-600">
                {kpis?.totalPatients
                  ? Math.round((kpis.totalAppointments / kpis.totalPatients) * 10) / 10
                  : 0
                }
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {kpis?.totalFollowUps || 0}
                </div>
                <div className="text-xs text-gray-500">Follow-ups</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {kpis?.totalCancelledAppointments || 0}
                </div>
                <div className="text-xs text-gray-500">Cancelled</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default DoctorDashboard;