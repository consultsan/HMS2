

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TimeIntervalFilter } from '@/components/TimeIntervalFilter';
import { format } from 'date-fns';
import { labApi } from '@/api/lab';
import { FlaskConical, FlaskRound, Clock, CheckCircle, RefreshCw } from 'lucide-react';

type IntervalOption = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom_month' | 'custom_year';

interface LabKpis {
  internalTests: number;
  externalTests: number;
  pendingTests: number;
  processingTests: number;
  completedTests: number;
}

const LabDashboard: React.FC = () => {
  const { user } = useAuth();
  const hospitalId = user?.hospitalId;
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
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

  const { data: kpis, isLoading, error } = useQuery<LabKpis>({
    queryKey: ['lab-kpis', hospitalId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!hospitalId) throw new Error('Hospital ID is required');
      return (await labApi.getLabKpisByInterval(startDate.toISOString(), endDate.toISOString())).data.data;
    },
    enabled: !!hospitalId && !!startDate && !!endDate,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const kpiCards = [
    {
      title: 'Internal Lab Tests',
      value: kpis?.internalTests || 0,
      icon: FlaskConical,
      color: 'bg-blue-500',
      description: 'Tests ordered internally'
    },
    {
      title: 'External Lab Tests',
      value: kpis?.externalTests || 0,
      icon: FlaskRound,
      color: 'bg-purple-500',
      description: 'Tests referred externally'
    },
    {
      title: 'Pending Tests',
      value: kpis?.pendingTests || 0,
      icon: Clock,
      color: 'bg-yellow-500',
      description: 'Tests pending processing'
    },
    {
      title: 'Processing Tests',
      value: kpis?.processingTests || 0,
      icon: RefreshCw,
      color: 'bg-orange-500',
      description: 'Tests currently processing'
    },
    {
      title: 'Completed Tests',
      value: kpis?.completedTests || 0,
      icon: CheckCircle,
      color: 'bg-green-500',
      description: 'Tests completed'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lab Dashboard</h1>
          <p className="text-gray-600 mt-1">Overview of lab test performance</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <TimeIntervalFilter
            onTimeIntervalChange={handleTimeIntervalChange}
            selectedInterval={selectedInterval}
            onIntervalChange={handleIntervalChange}
            selectedMonth={selectedMonth}
            onMonthChange={handleMonthChange}
            selectedYear={selectedYear}
            onYearChange={handleYearChange}
          />
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <RefreshCw className="w-4 h-4" />
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Date Range Info */}
      <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-md text-sm">
        Showing data from {format(startDate, 'PPP')} to {format(endDate, 'PPP')}
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

      {/* Error/Loading States */}
      {isLoading && (
        <div className="flex items-center justify-center min-h-[20vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600">Loading KPIs...</span>
        </div>
      )}
      {error && (
        <div className="flex items-center justify-center min-h-[20vh]">
          <span className="text-red-600">Failed to load KPIs</span>
        </div>
      )}
    </div>
  );
};

export default LabDashboard;