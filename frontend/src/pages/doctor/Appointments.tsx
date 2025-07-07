import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { useSearch } from '@/contexts/SearchContext';
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState } from 'react';
import { Appointment, AppointmentStatus } from '@/types/types';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { DatePicker } from "@/components/ui/date-filter";
import { formatTime } from '@/utils/dateUtils';



// id          String   @id @default(uuid())
//   scheduledAt DateTime
//   visitType   VisitType
//   status      AppointmentStatus @default(SCHEDULED)
//   createdAt   DateTime @default(now())
//   updatedAt   DateTime @updatedAt

//   diagnosisRecord DiagnosisRecord?
//   vitals          Vital[]
//   attachments     AppointmentAttachment[]

//   patient     Patient       @relation(fields: [patientId], references: [id])
//   patientId   String
//   doctor      HospitalStaff @relation(fields: [doctorId], references: [id])
//   doctorId    String
//   hospital    Hospital      @relation(fields: [hospitalId], references: [id])
//   hospitalId  String


function Appointments() {
  const { user } = useAuth();
  const { searchQuery } = useSearch();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const getDateForFilter = () => {
    const date = new Date(selectedDate);
    date.setUTCHours(0, 0, 0, 0);
    return date.toISOString();
  };

  const { data: appointments, isLoading } = useQuery<any[]>({

    queryKey: ['doctor-appointments', user?.id, selectedDate],
    queryFn: async () => {
      const response = await api.get('/api/appointment/get-by-date-and-doctor', {
        params: {
          doctorId: user?.id,
          date: getDateForFilter()
        }
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

  // new Date(appointment.scheduledAt).toLocaleString()
  // useEffect(() => {
  //   setSearchQuery('');
  // }, [setActiveTab]);
  

  const filteredAppointments = appointments?.filter((appointment) => {
    if (searchQuery === '') { return true; }
    return (
      appointment?.patient?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment?.status?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment?.visitType?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Separate appointments into upcoming and completed
  const upcomingAppointments = filteredAppointments?.filter(
    (appointment) => appointment.status !== 'COMPLETED' && appointment.status !== 'DIAGNOSED'
  ) || [];

  const completedAppointments = filteredAppointments?.filter(
    (appointment) => appointment.status === 'COMPLETED' || appointment.status === 'DIAGNOSED'
  ) || [];

  const handleMarkAsCompleted = async (appointmentId: string) => {
    try {
      await api.patch(`/api/appointment/update-status/${appointmentId}`, {
        status: 'DIAGNOSED'
      });

      // Invalidate and refetch the appointments query with all its dependencies
      queryClient.invalidateQueries({
        queryKey: ['doctor-appointments', user?.id, selectedDate]
      });
      toast.success('Appointment marked as diagnosed');
    } catch (error: any) {
      console.error('Error updating appointment status:', error);
      toast.error(error.response?.data?.message || 'Failed to update appointment status');
    }
  };

  const AppointmentTable = ({ appointments, title }: { appointments: Appointment[], title: string }) => (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">{title}</h2>
      <div className="rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-blue-50">
              <TableHead className="text-gray-600">Patient Name</TableHead>
              <TableHead className="text-gray-600">Scheduled At</TableHead>
              <TableHead className="text-gray-600">Visit Type</TableHead>
              <TableHead className="text-gray-600">Status</TableHead>
              <TableHead className="text-gray-600">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  No appointments scheduled
                </TableCell>
              </TableRow>
            ) : (
              appointments.map((appointment) => (
                <TableRow key={appointment.id} className="border-b border-gray-50 bg-gray-50">
                  <TableCell className="font-medium">
                    <Link to={`/doctor/consultation/${appointment?.patient?.id}/${appointment.id}`} className="underline" target="_blank" rel="noopener noreferrer">
                      {appointment?.patient?.name}
                    </Link>
                  </TableCell>
                  <TableCell>{formatTime(new Date(appointment.scheduledAt))}</TableCell>
                  <TableCell>{appointment.visitType}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${appointment?.status === 'DIAGNOSED'
                        ? 'bg-green-50 text-green-600'
                        : appointment?.status === 'CANCELLED'
                          ? 'bg-red-50 text-red-600'
                          : 'bg-yellow-50 text-yellow-600'
                        }`}
                    >
                      {appointment.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {appointment.status === 'SCHEDULED' || appointment.status === 'CONFIRMED' && (
                      <Link
                        to={`/doctor/consultation/${appointment?.patient?.id}/${appointment?.id}`}
                        className="inline-flex"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          Start Consultation
                        </Button>
                      </Link>
                    )}
                    {appointment.status === 'DIAGNOSED' && (
                      <Link
                        to={`/doctor/diagnosis-record/${appointment.id}`}
                        className="inline-flex"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          View Diagnosis
                        </Button>
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  const DateFilterSection = () => (
    <div className="flex items-center gap-4 mb-6">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Select Date:</span>
        <DatePicker
          date={selectedDate}
          onDateChange={(date) => {
            if (date) {
              setSelectedDate(date);
            }
          }}
          className="w-[240px]"
        />
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">My Appointments</h1>
      </div>

      <DateFilterSection />

      <div className="mt-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${activeTab === 'upcoming'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Upcoming Appointments
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${activeTab === 'completed'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Completed Appointments
            </button>
          </nav>
        </div>

        <div className="mt-6">
          {activeTab === 'upcoming' ? (
            <AppointmentTable
              appointments={upcomingAppointments}
              title={`Upcoming Appointments - ${format(selectedDate, 'PP')}`}
            />
          ) : (
            <AppointmentTable
              appointments={completedAppointments}
              title={`Completed Appointments - ${format(selectedDate, 'PP')}`}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default Appointments;