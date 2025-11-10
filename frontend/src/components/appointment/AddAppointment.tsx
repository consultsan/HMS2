import { useState, useEffect } from "react";
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
import { Search, Loader2 } from "lucide-react";
import { toast } from 'sonner';
import DoctorSlots from "@/components/DoctorSlots";
import { HospitalStaff, VisitType } from "@/types/types";
import { appointmentApi } from "@/api/appointment";
import { doctorApi } from "@/api/doctor";

interface Patient {
    id: string;
    name: string;
    patientUniqueId: string;
    phone: string;
}

export default function AddAppointment({ patientId }: { patientId: string }) {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [selectedPatientId, setSelectedPatientId] = useState(patientId || "");
    const [selectedDoctorId, setSelectedDoctorId] = useState("");
    const [patientSearchQuery, setPatientSearchQuery] = useState("");
    const [visitType, setVisitType] = useState<'OPD' | 'IPD' | 'EMERGENCY'>('OPD');
    const [selectedDate, setSelectedDate] = useState("");
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
    const [selectedSlotId, setSelectedSlotId] = useState<string>("");
    const [partiallyBooked, setPartiallyBooked] = useState(false);
    const [doctorOpdCharge, setSlectedDoctorOpdCharge] = useState(0);
    const hospitalName = "True Hospitals"; // Replace with actual hospital name if needed

    useEffect(() => {
        if (patientId) {
            setSelectedPatientId(patientId);
        }
    }, [patientId]);

    const queryClient = useQueryClient();

    const { data: doctors } = useQuery<HospitalStaff[]>({
        queryKey: ["doctors"],
        queryFn: async () => {
            const response = await api.get('/api/doctor/get-by-hospital');
            return response.data?.data ?? [];
        },
    });

    const { data: patients } = useQuery<Patient[]>({
        queryKey: ["patients"],
        queryFn: async () => {
            const response = await api.get('/api/patient/');
            return response.data?.data ?? [];
        },
    });

    const filteredPatients = patients?.filter(patient =>
        patient.name.toLowerCase().includes(patientSearchQuery.toLowerCase()) ||
        patient.patientUniqueId.toLowerCase().includes(patientSearchQuery.toLowerCase()) ||
        patient.phone.includes(patientSearchQuery)
    );

    const createAppointmentMutation = useMutation({
        mutationFn: async (data: {
            patientId: string;
            doctorId: string;
            phoneNumber: string;
            patientName: string;
            doctorName: string;
            hospitalName: string;
            visitType: 'OPD' | 'IPD' | 'EMERGENCY';
            scheduledAt: string;
            selectedSlotId: string;
            partiallyBooked: boolean;
        }) => {
            // Create the appointment
            const appointmentResponse = await appointmentApi.bookAppointment({
                patientId: data.patientId,
                doctorId: data.doctorId,
                visitType: data.visitType as VisitType,
                scheduledAt: new Date(data.scheduledAt)
            });

            // Get appointment ID from response (same structure as SurgicalAppointments)
            const appointmentId = appointmentResponse.data?.data?.id || appointmentResponse.data?.id;
            
            if (!appointmentId) {
                throw new Error('Failed to get appointment ID from response');
            }

            console.log('Appointment ID:', appointmentId);
            console.log('Doctor ID:', data.doctorId);
            console.log('Time Slot:', data.scheduledAt);

            // Create a new slot for the appointment
            const slotResponse = await doctorApi.addSlot(data.doctorId, {
                appointment1Id: appointmentId,
                timeSlot: new Date(data.scheduledAt)
            });
            console.log('Slot response:', slotResponse);

            return appointmentResponse.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            toast.success('Appointment created successfully');
            setIsAddDialogOpen(false);
            resetFormFields();
        },
        onError: (error: any) => {
            console.error('Error creating appointment:', error);
            toast.error(error.response?.data?.message || 'Failed to create appointment');
        },
    });

    const handleDoctorChange = (doctorId: string) => {
        setSelectedDoctorId(doctorId);
        const doctor = doctors?.find(d => d.id === doctorId);
        setSlectedDoctorOpdCharge(doctor?.opdCharge?.amount || 0);
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

        // Check if appointment date is today or in the future
        const now = new Date();
        const appointmentDateOnly = new Date(appointmentDateTime.getFullYear(), appointmentDateTime.getMonth(), appointmentDateTime.getDate());
        const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (appointmentDateOnly < nowDateOnly) {
            toast.error('Appointment date must be today or in the future');
            return;
        }


        const [hours, minutes] = selectedTimeSlot.split(':');
        appointmentDateTime.setUTCHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

        createAppointmentMutation.mutate({
            patientId: selectedPatientId,
            doctorId: selectedDoctorId,
            phoneNumber: patients?.find(p => p.id === selectedPatientId)?.phone || '',
            patientName: patients?.find(p => p.id === selectedPatientId)?.name || '',
            doctorName: doctors?.find(d => d.id === selectedDoctorId)?.name || '',
            hospitalName: hospitalName || '',
            visitType,
            scheduledAt: appointmentDateTime.toISOString(),
            selectedSlotId,
            partiallyBooked
        });
    };

    const resetFormFields = () => {
        if (!patientId) {
            setSelectedPatientId("");
        }
        setSelectedDoctorId("");
        setPatientSearchQuery("");
        setVisitType('OPD');
        setSelectedDate("");
        setSelectedTimeSlot("");
        setSelectedSlotId("");
        setSlectedDoctorOpdCharge(0);
        setPartiallyBooked(false);
    };

    const handleAddDialogOpen = (open: boolean) => {
        if (open) {
            resetFormFields();
        }
        setIsAddDialogOpen(open);
    };

    return (
        <>
            <Button
                className="text-white bg-blue-800 hover:bg-blue-700"
                onClick={() => handleAddDialogOpen(true)}
            >
                Add New Appointment
            </Button>

            <Dialog open={isAddDialogOpen} onOpenChange={handleAddDialogOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto space-y-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold">Add New Appointment</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Patient Section */}
                        <div className="space-y-2">
                            <Label className="text-base font-semibold">Search Patient</Label>
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                                <Input
                                    placeholder="Search patients by name, ID or phone..."
                                    value={patientSearchQuery}
                                    onChange={(e) => setPatientSearchQuery(e.target.value)}
                                    className="pl-8"
                                    disabled={createAppointmentMutation.isPending}
                                />
                            </div>
                            {patientSearchQuery && (
                                <div className="rounded-md border bg-white shadow-sm max-h-48 overflow-y-auto">
                                    {filteredPatients?.map((patient) => (
                                        <div
                                            key={patient.id}
                                            className="cursor-pointer p-2 hover:bg-gray-100 transition"
                                            onClick={() => {
                                                if (!createAppointmentMutation.isPending) {
                                                    setSelectedPatientId(patient.id);
                                                    setPatientSearchQuery("");
                                                }
                                            }}
                                        >
                                            <div className="font-medium">{patient.name}</div>
                                            <div className="text-sm text-gray-500">
                                                {patient.phone}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {selectedPatientId && (
                                <div className="text-sm text-green-700 mt-5 p-4 pl-0">
                                    {(() => {
                                        const selectedPatient = patients?.find(p => p.id === selectedPatientId);
                                        return selectedPatient ? (
                                            <>Selected: <strong>{selectedPatient.name}</strong> • <span className="text-gray-600">{selectedPatient.phone}</span></>
                                        ) : null;
                                    })()}
                                </div>
                            )}
                        </div>

                        {/* Doctor + Visit Type */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-base font-semibold">Doctor</Label>
                                <Select
                                    value={selectedDoctorId}
                                    onValueChange={handleDoctorChange}
                                    disabled={createAppointmentMutation.isPending}
                                >
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
                            <div className="space-y-2">
                                <Label className="text-base font-semibold">Visit Type</Label>
                                <Select
                                    value={visitType}
                                    onValueChange={(val) => setVisitType(val as typeof visitType)}
                                    disabled={createAppointmentMutation.isPending}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select visit type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="OPD">OPD</SelectItem>
                                        <SelectItem value="IPD">IPD</SelectItem>
                                        <SelectItem value="EMERGENCY">Emergency</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* OPD Charge */}
                        {doctorOpdCharge > 0 && (
                            <p className="bg-green-50 text-green-700 p-2 rounded-md text-sm">OPD Charge: ₹{doctorOpdCharge}</p>
                        )}

                        {/* Appointment Date */}
                        <div className="space-y-2">
                            <Label className="text-base font-semibold">Appointment Date</Label>
                            <Input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => handleDateChange(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                disabled={createAppointmentMutation.isPending}
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
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddDialogOpen(false)}
                                disabled={createAppointmentMutation.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-blue-800 text-white hover:bg-blue-700 disabled:opacity-50"
                                disabled={
                                    !selectedPatientId ||
                                    !selectedDoctorId ||
                                    !selectedDate ||
                                    !selectedTimeSlot ||
                                    createAppointmentMutation.isPending
                                }
                            >
                                {createAppointmentMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create Appointment'
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
