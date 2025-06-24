import { Appointment } from '@/components/patient/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { toast } from 'sonner';
import { useState } from 'react';

export default function AppointmentsSection() {
    const [activeTab, setActiveTab] = useState<'queue' | 'today'>('queue');
    const queryClient = useQueryClient();

    const { data: appointments, isLoading: appointmentsLoading, isError: appointmentsError } = useQuery<Appointment[]>({
        queryKey: ["appointments"],
        queryFn: async () => {
            const response = await api.get('/api/appointment/get-by-hospital');
            console.log(response.data?.data);
            return response.data?.data ?? [];
        },
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const response = await api.patch(`/api/appointment/update-status/${id}`, { status });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            toast.success('Appointment status updated successfully');
        },
        onError: (error) => {
            toast.error('Failed to update appointment status');
            console.error('Error updating appointment status:', error);
        },
    });

    const handleConfirmAppointment = (appointmentId: string) => {
        updateStatusMutation.mutate({ id: appointmentId, status: 'CONFIRMED' });
    };

    const todayAppointments = appointments?.filter((appointment) => {
        const appointmentDate = new Date(appointment.scheduledAt);
        const today = new Date();
        return appointmentDate.toDateString() === today.toDateString();
    });

    const confirmedAppointments = todayAppointments?.filter((appointment) => appointment.status === 'CONFIRMED');
    const todayScheduledAppointments = todayAppointments?.filter((appointment) => appointment.status !== 'CONFIRMED');

    // Function to assign queue numbers
    const assignQueueNumbers = (appointments: Appointment[] | undefined) => {
        if (!appointments) return new Map();

        // Sort appointments by scheduled time
        const sortedAppointments = [...appointments].sort((a, b) =>
            new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
        );

        // Create a map of appointment IDs to queue numbers
        const queueMap = new Map<string, number>();
        sortedAppointments.forEach((appointment, index) => {
            queueMap.set(appointment.id, index + 1);
        });

        return queueMap;
    };

    // Generate queue numbers for confirmed appointments
    const confirmedQueueMap = assignQueueNumbers(confirmedAppointments);

    if (appointmentsLoading) return <div>Loading...</div>;
    if (appointmentsError) return <div>Error loading appointments</div>;

    const AppointmentTable = ({ appointments, title, showQueue = false }: { appointments: Appointment[] | undefined, title: string, showQueue?: boolean }) => (
        <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">{title}</h2>
            <div className="rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-blue-50">
                            {showQueue && <TableHead className="text-gray-600">Queue #</TableHead>}
                            <TableHead className="text-gray-600">Patient Name</TableHead>
                            <TableHead className="text-gray-600">Doctor Name</TableHead>
                            <TableHead className="text-gray-600">Visit Type</TableHead>
                            <TableHead className="text-gray-600">Scheduled At</TableHead>
                            <TableHead className="text-gray-600">Status</TableHead>
                            {!showQueue && <TableHead className="text-gray-600">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(!appointments || appointments.length === 0) ? (
                            <TableRow>
                                <TableCell colSpan={showQueue ? 6 : 7} className="text-center py-8 text-gray-500">
                                    No appointments scheduled
                                </TableCell>
                            </TableRow>
                        ) : (
                            appointments.map((appointment) => (
                                <TableRow key={appointment.id} className="border-b border-gray-50 bg-gray-50">
                                    {showQueue && (
                                        <TableCell className="font-bold text-lg">
                                            {confirmedQueueMap.get(appointment.id)}
                                        </TableCell>
                                    )}
                                    <TableCell className="font-medium">{appointment.patient.name}</TableCell>
                                    <TableCell>{appointment.doctor.name}</TableCell>
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
                                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${appointment.status === 'SCHEDULED'
                                            ? 'bg-green-50 text-green-600'
                                            : appointment.status === 'CANCELLED'
                                                ? 'bg-red-50 text-red-600'
                                                : appointment.status === 'CONFIRMED'
                                                    ? 'bg-blue-50 text-blue-600'
                                                    : 'bg-yellow-50 text-yellow-600'
                                            }`}>
                                            {appointment.status}
                                        </span>
                                    </TableCell>
                                    {!showQueue && (
                                        <TableCell>
                                            {appointment.status === 'SCHEDULED' && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleConfirmAppointment(appointment.id)}
                                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                >
                                                    <CheckCircle className="w-4 h-4 mr-1" />
                                                    Confirm
                                                </Button>
                                            )}
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-gray-900">Today's Appointments</h1>
            </div>

            <div className="mt-6">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('queue')}
                            className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${activeTab === 'queue'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Queue Numbers
                        </button>
                        <button
                            onClick={() => setActiveTab('today')}
                            className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${activeTab === 'today'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Today's Appointments
                        </button>
                    </nav>
                </div>

                <div className="mt-6">
                    {activeTab === 'queue' ? (
                        <AppointmentTable
                            appointments={confirmedAppointments}
                            title="Queue's Today Appointments"
                            showQueue={true}
                        />
                    ) : (
                        <AppointmentTable
                            appointments={todayScheduledAppointments}
                            title="Today's Scheduled Appointments"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
