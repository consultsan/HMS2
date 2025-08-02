import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Pencil, Trash2, Receipt } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from 'sonner';
import { DatePicker } from "@/components/ui/date-filter";
import AddAppointment from "@/components/appointment/AddAppointment";
import { useState } from "react";
import { useSearch } from "@/contexts/SearchContext";
import UpdateAppointment from "@/components/appointment/UpdateAppointment";
import { useAuth } from "@/contexts/AuthContext";
import ViewAppointmentLabtests from "@/components/lab/viewAppointmentLabtests";
import ViewBill from "@/components/billing/ViewBill";
import { appointmentApi } from "@/api/appointment";
import { ApiResponse, Appointment } from "@/types/types";
import { stat } from "fs";

export default function AppointmentManagement() {
  const [filterDate, setFilterDate] = useState<Date>(new Date());
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [viewBillAppointmentId, setViewBillAppointmentId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { searchQuery } = useSearch();
  const { user } = useAuth();

  // Check if user can view bills (receptionist or hospital admin)
  const canViewBills = user?.role === 'RECEPTIONIST' || user?.role === 'HOSPITAL_ADMIN';


  const { data: appointments, isLoading: appointmentsLoading, isError: appointmentsError } = useQuery<ApiResponse<Appointment[]>>({
    queryKey: ["appointments", filterDate.toISOString().split('T')[0]],
    queryFn: async () => {
      // Ensure we're using the start of the day in local timezone
      const date = new Date(filterDate);
      date.setHours(0, 0, 0, 0);

      // Format date as DD/MM/YYYY
      const formattedDate = date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      if (user?.role === 'SALES_PERSON') {
        console.log("Sales appointments appointments for date:", formattedDate);
        const response = await appointmentApi.getCreatedAppointmentsByDate(formattedDate);
        return response.data;
      }
      
      const response = await appointmentApi.getAppointmentsByDate({date:formattedDate});
      console.log("Appointments from API:", response.data);
      return response.data;
    },
    refetchOnWindowFocus: false,
  });

  const cancelAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const response = await api.patch(`/api/appointment/update-status/${appointmentId}`, { status: 'CANCELLED' });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment cancelled successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel appointment');
    },
  });

  const filteredAppointments = appointments?.data?.filter((appointment: Appointment) => {
    if (!searchQuery || searchQuery == '') return true;
    return appointment?.patient?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment?.patient?.phone?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (appointmentsLoading) return <div>Loading...</div>;
  if (appointmentsError) return <div>Error loading data</div>;

  const handleEditAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsUpdateDialogOpen(true);
  };

  const handleCancelAppointment = (appointmentId: string) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      cancelAppointmentMutation.mutate(appointmentId);
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFilterDate(date);
      // Force refetch when date changes
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    }
  };

  const handleViewBill = (appointment: Appointment) => {
    console.log("appointment", appointment);
    if (appointment?.bills?.length) {
      setViewBillAppointmentId(appointment.bills[0].id);
    }
    else toast.message("No bill Created for this appointment");
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Appointments</h1>
        <AddAppointment patientId={''} />
      </div>

      {/* All Appointments Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <div className="text-xl font-semibold text-gray-800">All Appointments</div>
          <DatePicker
            date={filterDate}
            onDateChange={handleDateChange}
          />
        </div>
        <div className="rounded-lg border">
          <Table numberOfRows={9}>
            <TableHeader>
              <TableRow>
                <TableHead>Patient Name</TableHead>
                <TableHead>Doctor Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Visit Type</TableHead>
                <TableHead>Scheduled At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            {Array.isArray(filteredAppointments) && filteredAppointments.length > 0 ? (
              <TableBody>
                {filteredAppointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell className="font-medium">{appointment?.patient?.name}</TableCell>
                    <TableCell>{appointment?.doctor?.name}</TableCell>
                    <TableCell>{appointment?.patient?.phone}</TableCell>
                    <TableCell>{appointment.visitType}</TableCell>
                    <TableCell>
                      {new Date(appointment.scheduledAt).toLocaleString('en-GB', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'UTC'
                      })}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${appointment.status === 'SCHEDULED'
                          ? 'bg-green-100 text-green-800'
                          : appointment.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-800'
                            : appointment.status === 'CONFIRMED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                      >
                        {appointment.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditAppointment(appointment)}
                          className="p-1 hover:bg-gray-100 rounded-full"
                          title="Edit Appointment"
                        >
                          <Pencil className="w-4 h-4 text-gray-500" />
                        </button>
                        {canViewBills && (
                          <button
                            onClick={() => handleViewBill(appointment)}
                            className="p-1 hover:bg-gray-100 rounded-full"
                            title="View Bill"
                          >
                            <Receipt className="w-4 h-4 text-blue-500" />
                          </button>
                        )}
                        <ViewAppointmentLabtests appointmentId={appointment?.id} />
                        {appointment?.status !== 'DIAGNOSED' && appointment?.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleCancelAppointment(appointment.id)}
                            className="p-1 hover:bg-gray-100 rounded-full"
                            title="Cancel Appointment"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button> 
                        )}

                        
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            ) : (
              <TableBody>
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4 text-gray-500">
                    {filterDate ? 'No appointments found for the selected date' : 'No appointments found'}
                  </TableCell>
                </TableRow>
              </TableBody>
            )}
          </Table>
        </div>
      </div>

      {selectedAppointment && (
        <UpdateAppointment
          appointment={selectedAppointment as Appointment}
          isOpen={isUpdateDialogOpen}
          onClose={() => {
            setIsUpdateDialogOpen(false);
            setSelectedAppointment(null);
          }}
        />
      )}

      {/* View Bill Dialog */}
      {viewBillAppointmentId && (
        <ViewBill
          billId={viewBillAppointmentId}
          isOpen={!!viewBillAppointmentId}
          onClose={() => setViewBillAppointmentId(null)}
        />
        // <ViewAppointmentBill
        //   appointmentId={viewBillAppointmentId}
        //   isOpen={!!viewBillAppointmentId}
        //   onClose={() => setViewBillAppointmentId(null)}
        //   ifpayment={()=>{}}
        // />
      )}
    </div>
  );
}