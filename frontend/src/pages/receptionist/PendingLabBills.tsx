import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DatePicker } from "@/components/ui/date-filter";
import { useEffect, useState } from "react";
import { useSearch } from "@/contexts/SearchContext";
import ViewAppointmentBill from "@/components/appointment/ViewAppointmentBill";   
import { appointmentApi } from "@/api/appointment";
import { Button } from "@/components/ui/button";
import { LabTestStatus } from "@/types/types";
import { Appointment } from "@/types/types";
import { redirect } from "react-router-dom";


export default function PendingLabBills() {
  const [filterDate, setFilterDate] = useState<Date>(new Date());
  const [viewBillAppointmentId, setViewBillAppointmentId] = useState<string | null>(null);
  const { searchQuery } = useSearch();
  // Check if two dates are the same day
  const isSameDay = (date1: Date | string, date2: Date | string) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);

    return d1.toDateString() === d2.toDateString();
  };

  
  const getDateForFilter = () => {
    console.log("filterDate", filterDate);
    const date = new Date(filterDate);
    date.setHours(date.getHours());
    date.setMinutes(date.getMinutes());
    date.setUTCHours(0, 0, 0, 0);
    console.log("date after setting", date);
    return date.toISOString();
  };
  

  const [appointments, setAppointments] = useState<Appointment[] | undefined>(undefined);
  const [appointmentsLoading, setAppointmentsLoading] = useState<boolean>(true);
  const [appointmentsError, setAppointmentsError] = useState<boolean>(false);
  const [refresh, setRefresh] = useState<boolean>(false);
  useEffect(() => {
    const fetchAppointments = async () => {
      setAppointmentsLoading(true);
      setAppointmentsError(false);
      try {
        const response = await appointmentApi.getAppointmentsByDate({
          date: getDateForFilter()
        });
        setAppointments(response.data?.data ?? []);
      } catch (error) {
        setAppointmentsError(true);
        setAppointments(undefined);
      } finally {
        setAppointmentsLoading(false);
      }
    };
    fetchAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDate,refresh]);
    
  console.log("appointments on date", appointments);

    const requiredAppointments = appointments?.filter(appointment => {
        if (appointment.labTests) {
          const labtest = appointment.labTests?.find(labTest => labTest.status === LabTestStatus.PENDING);
          if (labtest) {
            return true;
          }
        }
      return false;
    });
   
  console.log("requiredAppointments", requiredAppointments);


  const filteredAppointments = requiredAppointments?.filter(appointment => {
    if (searchQuery && appointment.patient) {
      return appointment.patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appointment.patient.phone.toLowerCase().includes(searchQuery.toLowerCase());
    }
    // Use date comparison
    return isSameDay(appointment.scheduledAt, filterDate);
  });

  if (appointmentsLoading) return <div>Loading...</div>;
  if (appointmentsError) return <div>Error loading data</div>;



  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFilterDate(date);
    }
  };

  const handleViewBill = (appointmentId: string) => {
    setViewBillAppointmentId(appointmentId);
  };

  return (
    <div className="p-6">

      {/* All Appointments Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Pending Lab Bills</h2>
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
                    <TableCell className="font-medium">{appointment.patient?.name ?? ''}</TableCell>
                    <TableCell>{appointment.doctor?.name}</TableCell>
                    <TableCell>{appointment.patient?.phone}</TableCell>
                    <TableCell>{appointment.visitType}</TableCell>
                    <TableCell>
                      {new Date(appointment.scheduledAt).toLocaleString('en-IN', {
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
                      <Button onClick={() => handleViewBill(appointment.id)}>View Bill</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            ) : (
              <TableBody>
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4 text-gray-500">
                    {filterDate ? 'No pending labtest bills found for the selected date' : 'No pending labtest bills found'}
                  </TableCell>
                </TableRow>
              </TableBody>
            )}
          </Table>
        </div>
      </div>

    {/* View Bill Dialog */}
      {viewBillAppointmentId && (
        <ViewAppointmentBill
          appointmentId={viewBillAppointmentId}
          ifpayment={() => {
            setRefresh(!refresh);
          }}
          isOpen={!!viewBillAppointmentId}
          onClose={() => {
            setViewBillAppointmentId(null)
          }}
            
        />
      )}
    </div>
  );
}