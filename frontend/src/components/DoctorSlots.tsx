import { useState, useEffect } from 'react';
import { api } from "@/lib/api";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { shiftApi } from "@/api/shift";

interface TimeSlot {
    time: string;
    status: 'AVAILABLE' | 'PARTIAL' | 'FULL';
    slotId?: string;
}

interface TempShift {
    id: string;
    startTime: string;
    endTime: string;
    staffId: string;
    hospitalId: string;
    status: string;
    createdAt: string;
    updatedAt: string;
}

interface Doctor {
    id: string;
    name: string;
    specialisation: string;
    shifts: Array<{
        id: string;
        shiftName: string;
        day: string;
        startTime: string;
        endTime: string;
    }>;
}

interface DoctorSlotsProps {
    doctorId: string;
    selectedDate: string;
    onSlotSelect: (time: string, slotId: string, isPartiallyBooked: boolean) => void;
}

export default function DoctorSlots({ doctorId, selectedDate, onSlotSelect }: DoctorSlotsProps) {
    console.log('doctorId', doctorId);
    console.log('selectedDate', selectedDate);
    const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
    const [noShiftFound, setNoShiftFound] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");

    const fetchDoctorSlots = async (doctorId: string, date: string) => {
        const startDate = new Date(date);
        startDate.setUTCHours(0, 0, 0, 0);

        const endDate = new Date(date);
        endDate.setUTCHours(23, 59, 59, 999);

        try {
            const response = await api.get(`/api/doctor/get-slots/${doctorId}`, {
                params: {
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString()
                }
            });
            return response.data?.data || [];
        } catch (error) {
            console.error('Error fetching doctor slots:', error);
            return [];
        }
    };

    const fetchDoctorDetails = async (doctorId: string) => {
        try {
            const response = await api.get(`/api/hospital-admin/staff/fetch/${doctorId}`);
            console.log('doctor details', response.data?.data);
            console.log('doctor details', response.data?.data.shifts);
            return response.data?.data;
        } catch (error) {
            console.error('Error fetching doctor details:', error);
            throw error;
        }
    };

    const fetchDoctorTempShifts = async (doctorId: string) => {
        try {
            const response = await shiftApi.getTempShiftByStaff(doctorId);

            if (response.data) {
                let tempShiftsData = [];

                if (response.data.data) {
                    tempShiftsData = response.data.data.tempShifts ||
                        response.data.data.shifts ||
                        response.data.data || [];
                } else if (Array.isArray(response.data)) {
                    tempShiftsData = response.data;
                } else if (response.data.tempShifts) {
                    tempShiftsData = response.data.tempShifts;
                } else if (response.data.shifts) {
                    tempShiftsData = response.data.shifts;
                }

                console.log('Doctor temp shifts data:', tempShiftsData);
                return Array.isArray(tempShiftsData) ? tempShiftsData : [];
            }

            return [];
        } catch (error) {
            console.error('Error fetching doctor temp shifts:', error);
            return [];
        }
    };

    const generateTimeSlots = async (doctor: Doctor, date: string) => {
        // First check for temporary shifts for the selected date
        const tempShifts = await fetchDoctorTempShifts(doctor.id);
        console.log('Temp shifts for doctor:', tempShifts);

        // Check if there's a temp shift for the selected date
        const selectedDate = new Date(date);
        const tempShiftForDate = tempShifts.find((tempShift: TempShift) => {
            const tempShiftDate = new Date(tempShift.startTime);
            return (
                tempShiftDate.getFullYear() === selectedDate.getFullYear() &&
                tempShiftDate.getMonth() === selectedDate.getMonth() &&
                tempShiftDate.getDate() === selectedDate.getDate()
            );
        });

        let shiftStartTime: string = '';
        let shiftEndTime: string = '';
        let shiftFound = false;

        if (tempShiftForDate) {
            // Use temporary shift timing
            console.log('Using temp shift for date:', tempShiftForDate);
            const tempStartTime = new Date(tempShiftForDate.startTime);
            const tempEndTime = new Date(tempShiftForDate.endTime);

            shiftStartTime = tempStartTime.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: 'UTC'
            });
            shiftEndTime = tempEndTime.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: 'UTC'
            });
            shiftFound = true;
        } else {
            // Use regular shift timing
            const selectedDay = new Date(date).toLocaleString('en-US', { weekday: 'long', timeZone: 'UTC' }).toUpperCase();
            const doctorShift = doctor.shifts.find(shift => shift.day === selectedDay);
            console.log('doctorShift', doctorShift);

            if (doctorShift) {
                shiftStartTime = doctorShift.startTime;
                shiftEndTime = doctorShift.endTime;
                shiftFound = true;
            }
        }

        if (!shiftFound) {
            setNoShiftFound(true);
            setAvailableTimeSlots([]);
            return;
        }

        try {
            // Generate all possible time slots based on the determined shift timing
            const slots: TimeSlot[] = [];
            const startParts = shiftStartTime.split(':');
            const endParts = shiftEndTime.split(':');

            // Create dates in UTC
            const start = new Date(date);
            start.setUTCHours(parseInt(startParts[0], 10), parseInt(startParts[1], 10), 0, 0);

            const end = new Date(date);
            end.setUTCHours(parseInt(endParts[0], 10), parseInt(endParts[1], 10), 0, 0);

            // If end time is before start time, it means it's an overnight shift
            if (end < start) {
                end.setDate(end.getDate() + 1); // Add one day to the end time
            }

            // 15-minute interval slots
            let current = new Date(start);
            while (current < end) {
                slots.push({
                    time: current.toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                        timeZone: 'UTC'
                    }),
                    status: 'AVAILABLE'
                });
                current = new Date(current.getTime() + 15 * 60000); // add 15 minutes
            }

            // Get booked slots from the API
            const bookedSlots = await fetchDoctorSlots(doctor.id, date);

            // Mark slots as available, partial, or full based on appointments
            const availableTimeSlots = slots.map(slot => {
                const bookedSlot = bookedSlots.find((bs: any) => {
                    const time = new Date(bs.timeSlot).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                        timeZone: 'UTC'
                    });
                    return slot.time === time;
                });

                if (bookedSlot) {
                    if (bookedSlot.appointment1 && bookedSlot.appointment2) {
                        return { ...slot, status: 'FULL' as const, slotId: bookedSlot.id };
                    } else if (bookedSlot.appointment1 || bookedSlot.appointment2) {
                        return { ...slot, status: 'PARTIAL' as const, slotId: bookedSlot.id };
                    }
                }
                return { ...slot, status: 'AVAILABLE' as const };
            });

            setAvailableTimeSlots(availableTimeSlots);
            setNoShiftFound(false);
        } catch (error) {
            setError('Failed to generate time slots');
            setNoShiftFound(true);
            setAvailableTimeSlots([]);
        }
    };

    const handleTimeSlotSelect = (time: string) => {
        setSelectedTimeSlot(time);
        const selectedSlot = availableTimeSlots.find(slot => slot.time === time);
        if (selectedSlot) {
            onSlotSelect(
                time,
                selectedSlot.slotId || '',
                selectedSlot.status === 'PARTIAL'
            );
        }
    };

    useEffect(() => {
        const loadSlots = async () => {
            if (!doctorId || !selectedDate) {
                setAvailableTimeSlots([]);
                return;
            }

            setLoading(true);
            setError(null);
            try {
                const doctorDetails = await fetchDoctorDetails(doctorId);
                await generateTimeSlots(doctorDetails, selectedDate);
            } catch (err) {
                setError('Failed to load slots');
            } finally {
                setLoading(false);
            }
        };

        loadSlots();
    }, [doctorId, selectedDate]);

    if (loading) {
        return <div className="text-center py-4">Loading slots...</div>;
    }

    if (error) {
        return <div className="text-red-500 py-4">{error}</div>;
    }

    if (noShiftFound) {
        return <div className="text-yellow-600 py-4">No shifts available for this date</div>;
    }

    return (
        <div className="space-y-2">
            <Label>Available Time Slots</Label>
            <div className="">
                <RadioGroup
                    value={selectedTimeSlot}
                    onValueChange={handleTimeSlotSelect}
                    className="flex flex-wrap gap-2"
                >
                    {availableTimeSlots.map((slot) => (
                        <div key={slot.time} className="flex-none">
                            <RadioGroupItem
                                value={slot.time}
                                id={slot.time}
                                disabled={slot.status === 'FULL'}
                                className="peer sr-only"
                            />
                            <Label
                                htmlFor={slot.time}
                                className={`flex h-10 w-20 cursor-pointer items-center justify-center rounded-md border-2 ${slot.status === 'AVAILABLE'
                                    ? 'border-green-500 bg-green-50 hover:bg-green-100'
                                    : slot.status === 'PARTIAL'
                                        ? 'border-orange-500 bg-orange-50 hover:bg-orange-100'
                                        : 'border-red-500 bg-red-50 opacity-50 cursor-not-allowed'
                                    } p-2 text-sm peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary`}
                            >
                                {slot.time}
                            </Label>
                        </div>
                    ))}
                </RadioGroup>
            </div>
        </div>
    );
} 