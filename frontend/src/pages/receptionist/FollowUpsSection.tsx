import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Patient } from '../consultation/interfaces/PatinetInterface';
import { useSearch } from '@/contexts/SearchContext';
import { Button } from '@/components/ui/button';
import { appointmentApi } from '@/api/appointment';
import { AppointmentStatus, VisitType } from '@/types/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Appointment {
    id: string;
    scheduledAt: string;
    visitType: 'OPD' | 'IPD' | 'EMERGENCY' | 'FOLLOW_UP';
    status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'DIAGNOSED' | 'PENDING';
    patient: Patient
    doctor: {
        name: string;
        id: string;
    };
}

export default function FollowUpsSection() {
    const { searchQuery } = useSearch();
    const [activeTab, setActiveTab] = useState('pending');

    const { data: appointments, isLoading } = useQuery<Appointment[]>({
        queryKey: ['appointments'],
        queryFn: async () => {
            const response = await appointmentApi.getAppointmentsByHospitalAndVisitType(VisitType.FOLLOW_UP);
            const allAppointments = response.data?.data ?? [];
            return allAppointments;
        },
    });

    const handleConfirmFollowUp = (appointmentId: string) => {
        appointmentApi.updateAppointmentStatus(appointmentId, AppointmentStatus.SCHEDULED).then((res) => {
            console.log(res);
        }).catch((err) => {
            console.log(err);
        });
    }

    if (isLoading) {
        return <div>Loading follow-up appointments...</div>;
    }

    // Filter appointments based on search query
    const filteredAppointments = appointments?.filter((appointment) => {
        if (!searchQuery) { return true; }
        const searchLower = searchQuery.toLowerCase();
        return (
            appointment.patient.name.toLowerCase().includes(searchLower) ||
            appointment.patient.phone.toLowerCase().includes(searchLower) ||
            appointment.doctor.name.toLowerCase().includes(searchLower) ||
            appointment.visitType.toLowerCase().includes(searchLower) ||
            appointment.status.toLowerCase().includes(searchLower)
        );
    }) || [];

    // Separate appointments into confirmed and pending
    const confirmedFollowUps = filteredAppointments.filter(apt =>
        apt.status === 'CONFIRMED' || apt.status === 'SCHEDULED'
    );

    const pendingFollowUps = filteredAppointments.filter(apt =>
        apt.status === 'DIAGNOSED' || apt.status === 'PENDING'
    );

    const renderAppointmentTable = (appointments: Appointment[], showConfirmButton: boolean = false) => (
        <Table numberOfRows={9}>
            <TableHeader>
                <TableRow>
                    <TableHead>Patient Name</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Doctor Name</TableHead>
                    <TableHead>Visit Type</TableHead>
                    <TableHead>Scheduled At</TableHead>
                    <TableHead>Status</TableHead>
                    {showConfirmButton && <TableHead>Action</TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
                {appointments && appointments.length > 0 ? (
                    appointments.map((appointment) => (
                        <TableRow key={appointment.id}>
                            <TableCell className="font-medium">{appointment.patient.name}</TableCell>
                            <TableCell className="font-medium">{appointment.patient.phone}</TableCell>
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
                                <span
                                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${appointment.status === 'COMPLETED'
                                        ? 'bg-green-100 text-green-800'
                                        : appointment.status === 'CANCELLED'
                                            ? 'bg-red-100 text-red-800'
                                            : appointment.status === 'CONFIRMED'
                                                ? 'bg-blue-100 text-blue-800'
                                                : appointment.status === 'SCHEDULED'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                        }`}
                                >
                                    {appointment.status}
                                </span>
                            </TableCell>
                            {showConfirmButton && (
                                <TableCell>
                                    <Button
                                        onClick={() => handleConfirmFollowUp(appointment.id)}
                                        size="sm"
                                        variant="outline"
                                    >
                                        Confirm Follow up
                                    </Button>
                                </TableCell>
                            )}
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={showConfirmButton ? 7 : 6} className="text-center py-4 text-gray-500">
                            No follow-up appointments found
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );

    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6">Follow Up Appointments</h1>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="pending" className="flex items-center gap-2">
                        Pending Follow-ups
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                            {pendingFollowUps.length}
                        </span>
                    </TabsTrigger>
                    <TabsTrigger value="confirmed" className="flex items-center gap-2">
                        Confirmed Follow-ups
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                            {confirmedFollowUps.length}
                        </span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="mt-6">
                    <div className="rounded-lg border">
                        <div className="p-4 border-b bg-yellow-50">
                            <h2 className="text-lg font-medium text-yellow-800">
                                Pending Follow-up Appointments ({pendingFollowUps.length})
                            </h2>
                            <p className="text-sm text-yellow-600 mt-1">
                                Appointments that need follow-up confirmation
                            </p>
                        </div>
                        {renderAppointmentTable(pendingFollowUps, true)}
                    </div>
                </TabsContent>

                <TabsContent value="confirmed" className="mt-6">
                    <div className="rounded-lg border">
                        <div className="p-4 border-b bg-green-50">
                            <h2 className="text-lg font-medium text-green-800">
                                Confirmed Follow-up Appointments ({confirmedFollowUps.length})
                            </h2>
                            <p className="text-sm text-green-600 mt-1">
                                Appointments that have been confirmed for follow-up
                            </p>
                        </div>
                        {renderAppointmentTable(confirmedFollowUps, false)}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}