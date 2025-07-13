import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Patient, Surgery } from '@/components/patient/types';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import DoctorSlots from '@/components/DoctorSlots';
import { Calendar, Stethoscope } from 'lucide-react';
import { useSearch } from '@/contexts/SearchContext';

export default function SurgicalAppointments() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedSurgery, setSelectedSurgery] = useState<Surgery | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
    const [selectedSlotId, setSelectedSlotId] = useState<string>('');
    const [partiallyBooked, setPartiallyBooked] = useState(false);
    const [showOpdForm, setShowOpdForm] = useState(false);
    const { searchQuery } = useSearch();

    const [surgeries, setSurgeries] = useState<Surgery[] | undefined>(undefined);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const fetchSurgeries = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/api/appointment/get-surgery-by-hospital-id');
            const allSurgeries = response.data?.data ?? [];
            console.log('allSurgeries', allSurgeries);
            setSurgeries(
                allSurgeries.filter(
                    (surgery: Surgery) =>
                        surgery.status === 'NOT_CONFIRMED' && surgery.scheduledAt === null
                )
            );
        } catch (error) {
            setSurgeries([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSurgeries();
   }, []);

    // For compatibility with the rest of the code
    const refetch = fetchSurgeries;

    const updateSurgeryStatus = useMutation({
        mutationFn: async ({ surgeryId, status, scheduledAt }: { surgeryId: string; status: 'CONFIRMED'; scheduledAt: string }) => {
            const response = await api.patch(`/api/appointment/update-surgery-status/${surgeryId}`, { status, scheduledAt });
            return response.data;
        },
        onSuccess: () => {
            toast.success('Surgery status updated successfully');
            refetch();
            setIsDialogOpen(false);
            setSelectedDate('');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update surgery status');
        }
    });

    const bookOpdAppointment = useMutation({
        mutationFn: async () => {
            if (!selectedSurgery || !selectedTimeSlot) return;

            const appointmentDateTime = new Date(selectedDate);
            const [hours, minutes] = selectedTimeSlot.split(':');
            appointmentDateTime.setUTCHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

            const response = await api.post('/api/appointment/book', {
                patientId: selectedSurgery.appointment.patient.id,
                doctorId: selectedSurgery.appointment.doctor.id,
                visitType: 'OPD',
                scheduledAt: appointmentDateTime.toISOString()
            });

            if (partiallyBooked) {
                await api.patch(`/api/doctor/update-slot/${selectedSlotId}`, {
                    appointment2Id: response.data.data.id,
                    timeSlot: appointmentDateTime.toISOString()
                });
            } else {
                await api.post(`/api/doctor/add-slot/${selectedSurgery.appointment.doctor.id}`, {
                    appointment1Id: response.data.data.id,
                    timeSlot: appointmentDateTime.toISOString()
                });
            }
            

            return response.data;
        },
        onSuccess: () => {
            toast.success('OPD appointment scheduled successfully');
            setIsDialogOpen(false);
            refetch();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to schedule OPD appointment');
        }
    });

    if (isLoading) {
        return <div>Loading Pending Surgical Appointments...</div>;
    }

    const handleConfirm = (surgery: Surgery) => {
        setSelectedSurgery(surgery);
        setIsDialogOpen(true);
    };

    const handleDateChange = (date: string) => {
        setSelectedDate(date);
    };

    const handleSlotSelect = (time: string, slotId: string, isPartiallyBooked: boolean) => {
        setSelectedTimeSlot(time);
        setSelectedSlotId(slotId);
        setPartiallyBooked(isPartiallyBooked);
    };

    const filteredSurgeries = surgeries?.filter((surgery) => {
        if (!searchQuery) { return true; }
        const searchLower = searchQuery.toLowerCase();
        return surgery.appointment.patient.name.toLowerCase().includes(searchLower) ||
            surgery.appointment.patient.phone.toLowerCase().includes(searchLower) ||
            surgery.appointment.doctor.name.toLowerCase().includes(searchLower);
    });
    return (
        <div className="container mx-auto py-10">
            <h1 className="text-2xl font-bold mb-5">Pending Surgical Appointments</h1>
            <Table numberOfRows={9}>
                <TableHeader>
                    <TableRow>
                        <TableHead>Patient Name</TableHead>
                        <TableHead>Phone Number</TableHead>
                        <TableHead>Doctor</TableHead>
                        <TableHead>Surgery Category</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredSurgeries?.map((surgery) => (
                        <TableRow key={surgery.id}>
                            <TableCell>{surgery.appointment.patient.name}</TableCell>
                            <TableCell>{surgery.appointment.patient.phone}</TableCell>
                            <TableCell>{surgery.appointment.doctor.name}</TableCell>
                            <TableCell>{surgery.category}</TableCell>
                            <TableCell>
                                <Button
                                    onClick={() => handleConfirm(surgery)}
                                    disabled={updateSurgeryStatus.isPending}
                                >
                                    Confirm Surgery
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="sticky top-0 bg-background z-10 pb-4 border-b">
                        <DialogTitle>Confirm Surgery</DialogTitle>
                        <DialogDescription>
                            Choose whether to confirm the surgery directly or schedule an OPD appointment first.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 pt-4">

                        {/* Confirm Surgery Section */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Calendar className="h-4 w-4 text-blue-600" />
                                </div>
                                <h3 className="text-lg font-semibold">Confirm Surgery</h3>
                            </div>
                            <div className="pl-10 space-y-4">
                                <div>
                                    <Label htmlFor="surgery-date" className="text-sm font-medium">Surgery Date</Label>
                                    <Input
                                        id="surgery-date"
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="mt-1"
                                    />
                                </div>
                                <Button
                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                    onClick={() => {
                                        if (!selectedDate) return toast.error("Please select a surgery date");
                                        if (selectedSurgery?.id) {
                                            updateSurgeryStatus.mutate({
                                                surgeryId: selectedSurgery.id,
                                                status: "CONFIRMED",
                                                scheduledAt: selectedDate
                                            });
                                        }
                                    }}
                                >
                                    Confirm Surgery
                                </Button>
                            </div>
                        </section>

                        {/* Divider */}
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">Or</span>
                            </div>
                        </div>

                        {/* OPD Appointment Section */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                                    <Stethoscope className="h-4 w-4 text-green-600" />
                                </div>
                                <h3 className="text-lg font-semibold">Schedule OPD Appointment</h3>
                            </div>
                            <div className="pl-10 space-y-4">
                                <Button
                                    className="w-full bg-green-600 hover:bg-green-700"
                                    onClick={() => setShowOpdForm((prev) => !prev)}
                                >
                                    {showOpdForm ? "Hide OPD Form" : "Schedule OPD Appointment"}
                                </Button>

                                {showOpdForm && (
                                    <div className="space-y-4 border rounded-lg p-4 bg-gray-50 transition-all">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Appointment Date</Label>
                                            <Input
                                                type="date"
                                                value={selectedDate}
                                                onChange={(e) => handleDateChange(e.target.value)}
                                                min={new Date().toISOString().split('T')[0]}
                                                required
                                            />
                                        </div>

                                        {selectedDate && selectedSurgery && (
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Available Time Slots</Label>
                                                <DoctorSlots
                                                    doctorId={selectedSurgery.appointment.doctor.id}
                                                    selectedDate={selectedDate}
                                                    onSlotSelect={handleSlotSelect}
                                                />
                                            </div>
                                        )}

                                        <div className="flex justify-end gap-2 pt-4">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    setIsDialogOpen(false);
                                                    setShowOpdForm(false);
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                className="bg-green-600 hover:bg-green-700"
                                                onClick={() => bookOpdAppointment.mutate()}
                                                disabled={!selectedDate || !selectedTimeSlot || bookOpdAppointment.isPending}
                                            >
                                                Schedule OPD
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}