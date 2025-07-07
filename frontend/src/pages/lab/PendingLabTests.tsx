import { useQuery } from '@tanstack/react-query';
import { appointmentApi } from '@/api/appointment';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DateFilter from '@/components/DateFilter';
import { useState } from 'react';
import { format } from 'date-fns';
import { AppointmentStatus, LabTestStatus } from '@/types/types';


interface AppointmentWithLabTests {
    id: string;
    scheduledAt: string;
    status: AppointmentStatus;
    labTests: Array<{
        id: string;
        status: LabTestStatus;
        labTest: {
            id: string;
            name: string;
            code: string;
        };
    }>;
    patient: {
        id: string;
        name: string;
        patientUniqueId: string;
        phone: string;
    };
    doctor: {
        id: string;
        name: string;
        specialisation: string;
    };
}

export default function PendingLabTests() {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    const { data: appointments, isLoading, error } = useQuery<AppointmentWithLabTests[]>({
        queryKey: ['appointments-by-date', selectedDate],
        queryFn: async () => {
            const response = await appointmentApi.getAppointmentsByDate({
                date: selectedDate.toISOString().split('T')[0]
            });
            return response.data?.data || [];
        },
        enabled: !!selectedDate,
    });


    

    // Filter appointments: diagnosed status and at least one pending lab test
    const filteredAppointments = appointments?.filter(appointment => {
        // Check if appointment status is DIAGNOSED
        if (appointment.status !== AppointmentStatus.DIAGNOSED) {
            return false;
        }

        // Check if appointment has at least one lab test with PENDING status
        const hasPendingLabTest = appointment.labTests?.some(
            labTest => labTest.status === LabTestStatus.PENDING
        );

        return hasPendingLabTest;
    }) || [];

    const handleDateChange = (date: Date) => {
        setSelectedDate(date);
    };

    const getStatusBadgeClasses = (status: LabTestStatus) => {
        switch (status) {
            case LabTestStatus.PENDING:
                return 'bg-red-100 text-red-800';
            case LabTestStatus.PROCESSING:
                return 'bg-yellow-100 text-yellow-800';
            case LabTestStatus.COMPLETED:
                return 'bg-green-100 text-green-800';
            case LabTestStatus.SENT_EXTERNAL:
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg text-red-600">Error loading appointments</div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-gray-900 mb-4">
                    Pending Lab Tests
                </h1>
                <p className="text-gray-600 mb-4">
                    Showing diagnosed appointments with pending lab tests
                </p>
                <DateFilter onDateChange={handleDateChange} initialFilter="today" />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>
                        Appointments with Pending Lab Tests - {format(selectedDate, 'PPP')}
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                        Total: {filteredAppointments.length} appointment(s)
                    </p>
                </CardHeader>
                <CardContent>
                    {filteredAppointments.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No diagnosed appointments with pending lab tests found for this date.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Patient</TableHead>
                                    <TableHead>Patient ID</TableHead>
                                    <TableHead>Doctor</TableHead>
                                    <TableHead>Appointment Time</TableHead>
                                    <TableHead>Lab Tests</TableHead>
                                    <TableHead>Pending Tests</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAppointments.map((appointment) => {
                                    const pendingLabTests = appointment.labTests?.filter(
                                        labTest => labTest.status === LabTestStatus.PENDING
                                    ) || [];

                                    return (
                                        <TableRow key={appointment.id}>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{appointment.patient.name}</div>
                                                    <div className="text-sm text-gray-500">{appointment.patient.phone}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                    {appointment.patient.patientUniqueId}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{appointment.doctor.name}</div>
                                                    <div className="text-sm text-gray-500">{appointment.doctor.specialisation}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {format(new Date(appointment.scheduledAt), 'PPp')}
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    {appointment.labTests?.map((labTest) => (
                                                        <div key={labTest.id} className="flex items-center gap-2">
                                                            <span className="text-sm">{labTest.labTest.name}</span>
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClasses(labTest.status)}`}>
                                                                {labTest.status}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    {pendingLabTests.map((labTest) => (
                                                        <span key={labTest.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                            {labTest.labTest.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
} 