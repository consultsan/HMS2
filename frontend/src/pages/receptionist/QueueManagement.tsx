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
import { CheckCircle, XCircle, Receipt, Calendar, Users, Clock, Loader2 } from "lucide-react";
import { toast } from 'sonner';
import { useState } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import CreateAppointmentBill from '@/components/appointment/CreateAppointmentBill';
import { appointmentApi } from '@/api/appointment';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ViewBill from '@/components/billing/ViewBill';


export default function QueueManagement() {
    const [activeTab, setActiveTab] = useState<'queue' | 'today'>('queue');
    const [selectedDoctor, setSelectedDoctor] = useState<string>('');
    const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
    const [isBillDialogOpen, setIsBillDialogOpen] = useState(false);
    const [isViewBillDialogOpen, setIsViewBillDialogOpen] = useState(false);
    const [selectedBillId, setSelectedBillId] = useState("");
    const queryClient = useQueryClient();

    const today = new Date().toLocaleString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Kolkata'
    });

    // Fetch appointments using React Query
    const {
        data: appointments = [],
        isLoading: appointmentsLoading,
        isError: appointmentsError,
        refetch: refetchAppointments
    } = useQuery({
        queryKey: ['appointments', 'today', today],
        queryFn: async () => {
            console.log("Fetching appointments for date:", today);
            const response = await appointmentApi.getAppointmentsByDate({
                date: today
            });
            return response.data?.data ?? [];
        },
        staleTime: 30000, // Consider data fresh for 30 seconds
        refetchInterval: 60000, // Auto-refetch every minute
        refetchOnWindowFocus: true, // Refetch when window gains focus
    });

    // Fetch doctors using React Query
    const { data: doctors = [] } = useQuery<any[]>({
        queryKey: ['doctors'],
        queryFn: () => api.get('/api/doctor/get-by-hospital').then(res => {
            const doctorsData = res.data.data;
            // Set the first doctor as default if we have doctors and no selection yet
            if (doctorsData?.length > 0 && !selectedDoctor) {
                setSelectedDoctor(doctorsData[0].id);
            }
            return doctorsData;
        }),
        staleTime: 300000, // Consider doctors data fresh for 5 minutes
    });

    const handleConfirmAppointment = (appointmentId: string) => {
        setSelectedAppointmentId(appointmentId);
        setIsBillDialogOpen(true);
    };

    const handleCloseBillDialog = () => {
        setIsBillDialogOpen(false);
        setSelectedAppointmentId(null);
    };

    // Function to handle successful appointment confirmation
    const handleAppointmentConfirmed = async () => {
        try {
            // Invalidate and refetch appointments immediately
            await queryClient.invalidateQueries({
                queryKey: ['appointments', 'today', today]
            });

            // Also invalidate any related queries
            await queryClient.invalidateQueries({
                queryKey: ['appointments']
            });

            toast.success('Appointment confirmed and added to queue!');
            handleCloseBillDialog();
        } catch (error) {
            console.error('Error refreshing appointments:', error);
            toast.error('Appointment confirmed but failed to refresh queue. Please refresh manually.');
        }
    };

    const handleViewBill = (appointment: Appointment) => {
        console.log("appointment", appointment);
        setSelectedBillId(appointment.bills?.[0]?.id || '');
        setIsViewBillDialogOpen(true);
    };

    const handleCloseViewBillDialog = () => {
        setIsViewBillDialogOpen(false);
        setSelectedBillId("");
    };


    // Filter appointments
    const confirmedAppointments = appointments?.filter((appointment: Appointment) =>
        appointment.status === 'CONFIRMED' &&
        (selectedDoctor === appointment.doctor.id)
    );

    const todayScheduledAppointments = appointments?.filter((appointment: Appointment) =>
        appointment.status !== 'CONFIRMED'
    );

    // Function to assign queue numbers
    const assignQueueNumbers = (appointments: Appointment[] | undefined) => {
        if (!appointments) return new Map();

        // Sort appointments by their confirmation time (updatedAt)
        const sortedAppointments = [...appointments].sort((a, b) => {
            const dateA = new Date(a.updatedAt);
            const dateB = new Date(b.updatedAt);
            return dateA.getTime() - dateB.getTime();
        });

        // Create a map of appointment IDs to queue numbers
        const queueMap = new Map<string, number>();
        sortedAppointments.forEach((appointment, index) => {
            queueMap.set(appointment.id, index + 1);
        });

        return queueMap;
    };

    // Generate queue numbers for confirmed appointments
    const confirmedQueueMap = assignQueueNumbers(confirmedAppointments);

    // Sort confirmed appointments by queue number
    const sortedConfirmedAppointments = confirmedAppointments ? [...confirmedAppointments].sort((a, b) => {
        const queueA = confirmedQueueMap.get(a.id) || 0;
        const queueB = confirmedQueueMap.get(b.id) || 0;
        return queueA - queueB;
    }) : [];

    // Calculate stats
    const totalScheduled = todayScheduledAppointments?.length || 0;
    const totalInQueue = confirmedAppointments?.length || 0;
    const selectedDoctorName = doctors?.find(d => d.id === selectedDoctor)?.name || '';

    if (appointmentsLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
                    <p className="text-gray-600">Loading today's appointments...</p>
                </div>
            </div>
        );
    }

    if (appointmentsError) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Appointments</h3>
                    <p className="text-gray-600 mb-4">There was an error loading today's appointments.</p>
                    <Button
                        onClick={() => refetchAppointments()}
                        variant="outline"
                        className="gap-2"
                    >
                        <Calendar className="h-4 w-4" />
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    const AppointmentTable = ({ appointments, title, showQueue = false }: { appointments: Appointment[] | undefined, title: string, showQueue?: boolean }) => (
        <Card className="shadow-sm">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        {showQueue ? <Users className="h-5 w-5 text-blue-600" /> : <Calendar className="h-5 w-5 text-green-600" />}
                        {title}
                    </CardTitle>
                    <Badge variant="secondary" className="text-sm">
                        {appointments?.length || 0} {appointments?.length === 1 ? 'appointment' : 'appointments'}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50">
                                {showQueue && <TableHead className="text-gray-700 font-medium">Queue #</TableHead>}
                                <TableHead className="text-gray-700 font-medium">Patient Name</TableHead>
                                <TableHead className="text-gray-700 font-medium">Doctor Name</TableHead>
                                <TableHead className="text-gray-700 font-medium">Visit Type</TableHead>
                                <TableHead className="text-gray-700 font-medium">Scheduled At</TableHead>
                                <TableHead className="text-gray-700 font-medium">Status</TableHead>
                                <TableHead className="text-gray-700 font-medium">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(!appointments || appointments.length === 0) ? (
                                <TableRow>
                                    <TableCell colSpan={showQueue ? 7 : 6} className="text-center py-12">
                                        <div className="flex flex-col items-center gap-2">
                                            {showQueue ?
                                                <Users className="h-8 w-8 text-gray-400" /> :
                                                <Calendar className="h-8 w-8 text-gray-400" />
                                            }
                                            <p className="text-gray-500 font-medium">
                                                {showQueue ? 'No appointments in queue' : 'No scheduled appointments'}
                                            </p>
                                            <p className="text-gray-400 text-sm">
                                                {showQueue ?
                                                    'Confirmed appointments will appear here' :
                                                    'New appointments will appear here when scheduled'
                                                }
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                appointments.map((appointment) => (
                                    <TableRow key={appointment.id} className="hover:bg-gray-50/50 transition-colors">
                                        {showQueue && (
                                            <TableCell className="font-bold text-lg text-blue-600">
                                                #{confirmedQueueMap.get(appointment.id)}
                                            </TableCell>
                                        )}
                                        <TableCell className="font-medium text-gray-900">{appointment.patient.name}</TableCell>
                                        <TableCell className="text-gray-700">{appointment.doctor.name}</TableCell>
                                        <TableCell className="text-gray-700">{appointment.visitType}</TableCell>
                                        <TableCell className="text-gray-600">
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {new Date(appointment.scheduledAt).toLocaleString('en-GB', {
                                                    year: 'numeric',
                                                    month: '2-digit',
                                                    day: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    timeZone: 'UTC'
                                                })}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    appointment.status === 'SCHEDULED' ? 'default' :
                                                        appointment.status === 'CONFIRMED' ? 'secondary' :
                                                            appointment.status === 'CANCELLED' ? 'destructive' :
                                                                'outline'
                                                }
                                                className="text-xs"
                                            >
                                                {appointment.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {!showQueue && appointment.status === 'SCHEDULED' && (
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    onClick={() => handleConfirmAppointment(appointment.id)}
                                                    className="gap-1 bg-green-600 hover:bg-green-700"
                                                >
                                                    <CheckCircle className="w-3 h-3" />
                                                    Confirm
                                                </Button>
                                            )}
                                            {showQueue && appointment.status === 'CONFIRMED' && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleViewBill(appointment)}
                                                    className="gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                >
                                                    <Receipt className="w-3 h-3" />
                                                    View Bill
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="p-6 space-y-6">
            {/* Header with Stats */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Queue Management</h1>
                    <p className="text-gray-600 mt-1">Manage today's appointment queue and confirmations</p>
                </div>

                <div className="flex gap-4">
                    <Card className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-blue-600">{totalInQueue}</div>
                                <div className="text-sm text-gray-600">In Queue</div>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <Calendar className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-green-600">{totalScheduled}</div>
                                <div className="text-sm text-gray-600">Scheduled</div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('queue')}
                        className={`flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors ${activeTab === 'queue'
                            ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Users className="h-4 w-4" />
                            Queue Numbers
                            {totalInQueue > 0 && (
                                <Badge variant="secondary" className="ml-1 text-xs">
                                    {totalInQueue}
                                </Badge>
                            )}
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('today')}
                        className={`flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors ${activeTab === 'today'
                            ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Today's Appointments
                            {totalScheduled > 0 && (
                                <Badge variant="secondary" className="ml-1 text-xs">
                                    {totalScheduled}
                                </Badge>
                            )}
                        </div>
                    </button>
                </nav>
            </div>

            {/* Doctor Filter */}
            {activeTab === 'queue' && (
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-medium text-gray-900">Filter by Doctor</h3>
                            <p className="text-sm text-gray-600">View queue for specific doctor or all doctors</p>
                        </div>
                        <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                            <SelectTrigger className="w-[250px]">
                                <SelectValue placeholder="Select a Doctor" />
                            </SelectTrigger>
                            <SelectContent>
                                {doctors?.map((doctor) => (
                                    <SelectItem key={doctor.id} value={doctor.id}>
                                        {doctor.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </Card>
            )}

            {/* Appointment Tables */}
            <div>
                {activeTab === 'queue' ? (
                    <AppointmentTable
                        appointments={sortedConfirmedAppointments}
                        title={selectedDoctor === 'all'
                            ? "Today's Queue - All Doctors"
                            : `Queue for Dr. ${selectedDoctorName}`}
                        showQueue={true}
                    />
                ) : (
                    <AppointmentTable
                        appointments={todayScheduledAppointments}
                        title="Today's Scheduled Appointments"
                    />
                )}
            </div>

            {/* Dialogs */}
            <CreateAppointmentBill
                isOpen={isBillDialogOpen}
                onClose={handleCloseBillDialog}
                appointmentId={selectedAppointmentId ?? ""}
                onSuccess={handleAppointmentConfirmed}
            />

            <ViewBill
                isOpen={isViewBillDialogOpen}
                onClose={handleCloseViewBillDialog}
                billId={selectedBillId}
            />
        </div>
    );
}
