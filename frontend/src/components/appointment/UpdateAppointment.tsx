import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import DoctorSlots from "@/components/DoctorSlots";

interface Doctor {
    id: string;
    name: string;
    specialisation: string;
    role: 'DOCTOR';
    status: 'ACTIVE' | 'INACTIVE';
}

interface Appointment {
    id: string;
    patientId: string;
    doctorId: string;
    visitType: 'OPD' | 'IPD' | 'EMERGENCY';
    scheduledAt: string;
    status: string;
    patient: {
        name: string;
        id: string;
        phone: string;
    };
    doctor: {
        name: string;
        id: string;
    };
}

interface UpdateAppointmentProps {
    appointment: Appointment;
    isOpen: boolean;
    onClose: () => void;
}

export default function UpdateAppointment({ appointment, isOpen, onClose }: UpdateAppointmentProps) {
    const [selectedDoctorId, setSelectedDoctorId] = useState(appointment.doctorId);
    const [selectedDate, setSelectedDate] = useState(new Date(appointment.scheduledAt).toISOString().split('T')[0]);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>(() => {
        // Display time in UTC format to match DoctorSlots component
        return new Date(appointment.scheduledAt).toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'UTC'
        });
    });
    console.log(appointment)
    const [selectedSlotId, setSelectedSlotId] = useState<string>("");
    const [partiallyBooked, setPartiallyBooked] = useState(false);

    const queryClient = useQueryClient();

    const { data: doctors } = useQuery<Doctor[]>({
        queryKey: ["doctors"],
        queryFn: async () => {
            const response = await api.get('/api/doctor/get-by-hospital');
            return response.data?.data ?? [];
        },
    });

    const updateAppointmentMutation = useMutation({
        mutationFn: async (data: { scheduledAt: string }) => {
            console.log("Data inside update appointment mutation", data);
            // First update the appointment schedule
            await api.patch(`/api/appointment/update-appointment-schedule/${appointment.id}`, data);

            // Then update the doctor's time slot
            await api.patch('/api/doctor/update-time-slot-by-appointment-id', {
                timeSlot: data.scheduledAt,
                appointmentId: appointment.id
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            toast.success('Appointment updated successfully');
            onClose();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update appointment');
        },
    });

    const handleDoctorChange = (doctorId: string) => {
        setSelectedDoctorId(doctorId);
    };

    const handleDateChange = (date: string) => {
        setSelectedDate(date);
    };

    const handleSlotSelect = (time: string, slotId: string, isPartiallyBooked: boolean) => {
        setSelectedTimeSlot(time);
        setSelectedSlotId(slotId);
        setPartiallyBooked(isPartiallyBooked);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const appointmentDateTime = new Date(selectedDate);
        const [hours, minutes] = selectedTimeSlot.split(':');

        // Set the time directly as UTC since our backend expects UTC time
        appointmentDateTime.setUTCHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

        try {
            await updateAppointmentMutation.mutateAsync({
                scheduledAt: appointmentDateTime.toISOString()
            });
        } catch (error: any) {
            console.error('Error updating appointment:', error);
            toast.error(error.response?.data?.message || 'Failed to update appointment');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto space-y-6">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">Update Appointment</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Patient Info Display */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-medium text-gray-900">Patient Information</h3>
                        <p className="text-sm text-gray-600 mt-1">
                            {appointment.patient.name} • {appointment.patient.phone}
                        </p>
                    </div>

                    {/* Doctor Selection */}
                    <div className="space-y-2">
                        <Label className="text-base font-semibold">Doctor</Label>
                        <Select value={selectedDoctorId} onValueChange={handleDoctorChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a doctor" />
                            </SelectTrigger>
                            <SelectContent>
                                {doctors?.map((doctor) => (
                                    <SelectItem key={doctor.id} value={doctor.id}>
                                        {doctor.name} ({doctor.specialisation})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Appointment Date */}
                    <div className="space-y-2">
                        <Label className="text-base font-semibold">Appointment Date</Label>
                        <Input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => handleDateChange(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            required
                        />
                    </div>

                    {/* Slots */}
                    {selectedDoctorId && selectedDate && (
                        <div className="space-y-2">
                            <Label className="text-base font-semibold">Select Time Slot</Label>
                            <DoctorSlots
                                doctorId={selectedDoctorId}
                                selectedDate={selectedDate}
                                onSlotSelect={handleSlotSelect}
                            />
                            {selectedTimeSlot && (
                                <div className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-md border border-green-200">
                                    Selected Slot: <span className="font-semibold">{selectedTimeSlot}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="bg-blue-800 text-white hover:bg-blue-700"
                            disabled={
                                !selectedDoctorId ||
                                !selectedDate ||
                                !selectedTimeSlot ||
                                updateAppointmentMutation.isPending
                            }
                        >
                            {updateAppointmentMutation.isPending ? 'Updating...' : 'Update Appointment'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
