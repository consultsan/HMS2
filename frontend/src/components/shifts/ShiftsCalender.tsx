import { useState } from 'react';
import { Calendar, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shiftApi } from '@/api/shift';
import { Button } from '../ui/button';
import { WeekDay, ShiftName, Shift, Status, TempShift } from '@/types/types';
import { Input } from '../ui/input';
import { toast } from '../ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/contexts/AuthContext';


const DAYS_OF_WEEK = Object.values(WeekDay);

interface ShiftsCalendarProps {
    userId: string;
    userName?: string;
}

interface EditingShift {
    id?: string;
    day: WeekDay;
    startTime: string;
    endTime: string;
}


// Helper function to format datetime for datetime-local input
const formatDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    console.log(hours, minutes);
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function ShiftsCalendar({ userId, userName }: ShiftsCalendarProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [editingDay, setEditingDay] = useState<WeekDay | null>(null);
    const [isAddingTemp, setIsAddingTemp] = useState(false);
    const [newTempShift, setNewTempShift] = useState<TempShift>(() => {
        const now = new Date();
        const startTime = new Date(now);
        startTime.setHours(9, 0, 0, 0); // Default to 9:00 AM
        const endTime = new Date(now);
        endTime.setHours(17, 0, 0, 0); // Default to 5:00 PM

        return {
            staffId: userId,
            startTime,
            endTime,
        };
    });
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Fetch regular shifts data
    const { data: shifts = [], isLoading: isLoadingShifts } = useQuery({
        queryKey: ['shifts', userId],
        queryFn: async () => {
            const response = await shiftApi.getStaffShiftById(userId);
            return response.data.data.shifts || [];
        },
        enabled: !!userId
    });

    // Fetch temporary shifts data
    const { data: tempShifts = [], isLoading: isLoadingTempShifts, refetch: refetchTempShifts } = useQuery({
        queryKey: ['temp-shifts', userId],
        queryFn: async () => {
            try {
                const response = await shiftApi.getTempShiftByStaff(userId);
                console.log('Temp shifts response:', response);
                console.log('Response data:', response.data);
                console.log('Response data.data:', response.data?.data);

                // Extract temp shifts data with more flexible parsing
                let tempShiftsData = [];

                if (response.data) {
                    // Try different possible response structures
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
                }

                console.log('Extracted temp shifts data:', tempShiftsData);
                console.log('Is array?', Array.isArray(tempShiftsData));
                console.log('Length:', tempShiftsData.length);

                return Array.isArray(tempShiftsData) ? tempShiftsData : [];
            } catch (error) {
                console.error('Error fetching temp shifts:', error);
                return [];
            }
        },
        enabled: !!userId,
        refetchOnWindowFocus: false,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });


    // Regular shift mutations
    const createShiftMutation = useMutation({
        mutationFn: (newShift: Partial<Shift>) => shiftApi.createShift(newShift),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shifts', userId] });
            toast({
                title: "Success",
                description: "Shift created successfully",
            });
            setEditingDay(null);
        },
        onError: (error) => {
            console.error('Error creating shift:', error);
            toast({
                title: "Error",
                description: "Failed to create shift",
                variant: "destructive",
            });
        }
    });

    // Temporary shift mutations
    const createTempShiftMutation = useMutation({
        mutationFn: async (newShift: Partial<TempShift>) => {
            console.log('Creating temp shift with data:', newShift);
            const response = await shiftApi.createTempShift(newShift);
            console.log('Create temp shift response:', response);
            return response;
        },
        onSuccess: async () => {
            await refetchTempShifts(); // Immediately refetch the data
            toast({
                title: "Success",
                description: "Temporary shift created successfully",
            });
            setIsAddingTemp(false);
            const now = new Date();
            const startTime = new Date(now);
            startTime.setHours(9, 0, 0, 0);
            const endTime = new Date(now);
            endTime.setHours(17, 0, 0, 0);

            setNewTempShift({
                startTime,
                endTime,
                staffId: userId
            });
        },
        onError: (error) => {
            console.error('Error creating temp shift:', error);
            toast({
                title: "Error",
                description: "Failed to create temporary shift. Please try again.",
                variant: "destructive",
            });
        }
    });

    const updateShiftMutation = useMutation({
        mutationFn: ({ id, shift }: { id: string; shift: Partial<Shift> }) =>
            shiftApi.updateShift(id, shift),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shifts', userId] });
            toast({
                title: "Success",
                description: "Shift updated successfully",
            });
            setEditingDay(null);
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: "Failed to update shift",
                variant: "destructive",
            });
        }
    });

    const deleteShiftMutation = useMutation({
        mutationFn: (shiftId: string) => shiftApi.deleteShift(shiftId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shifts', userId] });
            toast({
                title: "Success",
                description: "Shift deleted successfully",
            });
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: "Failed to delete shift",
                variant: "destructive",
            });
        }
    });

    const deleteTempShiftMutation = useMutation({
        mutationFn: (tempShiftId: string) => shiftApi.deleteTempShift(tempShiftId),
        onSuccess: async () => {
            await refetchTempShifts();
            toast({
                title: "Success",
                description: "Temporary shift deleted successfully",
            });
        },
        onError: (error) => {
            console.error('Error deleting temp shift:', error);
            toast({
                title: "Error",
                description: "Failed to delete temporary shift",
                variant: "destructive",
            });
        }
    });

    const handleSaveShift = async (day: WeekDay, startTime: string, endTime: string) => {
        const existingShift = getShiftForDay(day);
        const shiftData = {
            staffId: userId,
            day,
            startTime,
            endTime,
            shiftName: ShiftName.GENERAL,
            status: Status.ACTIVE,
            hospitalId: "auto-filled-by-backend"
        };

        try {
            if (existingShift?.id) {
                await updateShiftMutation.mutateAsync({
                    id: existingShift.id,
                    shift: shiftData
                });
            } else {
                await createShiftMutation.mutateAsync(shiftData);
            }
        } catch (error) {
            // Error handling is now done in mutation callbacks
        }
    };

    const getShiftForDay = (day: WeekDay) => {
        return shifts.find((shift: Shift) => shift.day === day);
    };

    const handleSaveTempShift = () => {
        const { startTime, endTime } = newTempShift;
        const startDateTime = new Date(startTime);
        const endDateTime = new Date(endTime);

        // Convert to GMT/UTC by treating the input as local time and adjusting
        const startDateTimeGMT = new Date(startDateTime.getTime() - startDateTime.getTimezoneOffset() * 60000);
        const endDateTimeGMT = new Date(endDateTime.getTime() - endDateTime.getTimezoneOffset() * 60000);

        console.log('Original times:', { startDateTime, endDateTime });
        console.log('GMT times:', { startDateTimeGMT, endDateTimeGMT });

        if (startDateTimeGMT >= endDateTimeGMT) {
            toast({
                title: "Error",
                description: "End time must be after start time",
                variant: "destructive",
            });
            return;
        }

        if (!user?.hospitalId) {
            toast({
                title: "Error",
                description: "Hospital ID is required",
                variant: "destructive",
            });
            return;
        }

        createTempShiftMutation.mutate({
            startTime: startDateTimeGMT,
            endTime: endDateTimeGMT,
            status: Status.ACTIVE,
            hospitalId: user.hospitalId,
            staffId: userId
        });
    };

    const isLoading = createShiftMutation.isPending || updateShiftMutation.isPending ||
        deleteShiftMutation.isPending || createTempShiftMutation.isPending || deleteTempShiftMutation.isPending;

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                title="View Schedule"
                disabled={isLoadingShifts || isLoadingTempShifts}
            >
                <Calendar className="w-4 h-4 text-gray-500" />
            </button>

            <Dialog open={isOpen} onOpenChange={(open) => !isLoading && setIsOpen(open)}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {userName ? `${userName}'s Schedule` : 'Weekly Schedule'}
                        </DialogTitle>
                    </DialogHeader>

                    <Tabs defaultValue="regular" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="regular">Regular Shifts</TabsTrigger>
                            <TabsTrigger value="temporary">Temporary Shifts</TabsTrigger>
                        </TabsList>

                        <TabsContent value="regular">
                            {isLoadingShifts ? (
                                <div className="flex justify-center items-center p-4">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Day</TableHead>
                                            <TableHead>Start Time</TableHead>
                                            <TableHead>End Time</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {DAYS_OF_WEEK.map((day) => {
                                            const shift = getShiftForDay(day);
                                            const isEditing = editingDay === day;

                                            return (
                                                <TableRow key={day}>
                                                    <TableCell>{day}</TableCell>
                                                    <TableCell>
                                                        {isEditing ? (
                                                            <Input
                                                                type="time"
                                                                defaultValue={shift?.startTime || "09:00"}
                                                                className="w-32"
                                                                id={`start-${day}`}
                                                                disabled={isLoading}
                                                            />
                                                        ) : (
                                                            shift?.startTime || '-'
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {isEditing ? (
                                                            <Input
                                                                type="time"
                                                                defaultValue={shift?.endTime || "17:00"}
                                                                className="w-32"
                                                                id={`end-${day}`}
                                                                disabled={isLoading}
                                                            />
                                                        ) : (
                                                            shift?.endTime || '-'
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {isEditing ? (
                                                            <div className="flex space-x-2">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        const startTime = (document.getElementById(`start-${day}`) as HTMLInputElement)?.value;
                                                                        const endTime = (document.getElementById(`end-${day}`) as HTMLInputElement)?.value;
                                                                        if (startTime && endTime) {
                                                                            handleSaveShift(day, startTime, endTime);
                                                                        }
                                                                    }}
                                                                    disabled={isLoading}
                                                                >
                                                                    {isLoading ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                                    ) : null}
                                                                    Save
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => setEditingDay(null)}
                                                                    disabled={isLoading}
                                                                >
                                                                    Cancel
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex space-x-2">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => setEditingDay(day)}
                                                                    disabled={isLoading}
                                                                >
                                                                    {shift ? 'Edit' : 'Add'}
                                                                </Button>
                                                                {shift && (
                                                                    <Button
                                                                        variant="destructive"
                                                                        size="sm"
                                                                        onClick={() => deleteShiftMutation.mutate(shift.id)}
                                                                        disabled={isLoading}
                                                                    >
                                                                        {deleteShiftMutation.isPending ? (
                                                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                                        ) : null}
                                                                        Delete
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </TabsContent>

                        <TabsContent value="temporary" className="space-y-4">
                            <div className="space-y-4">
                                <Button
                                    onClick={() => setIsAddingTemp(true)}
                                    disabled={isLoading}
                                    className="w-full sm:w-auto"
                                >
                                    Add Temporary Shift
                                </Button>

                                {isAddingTemp && (
                                    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="temp-start">Start Date & Time</Label>
                                                <Input
                                                    id="temp-start"
                                                    type="datetime-local"
                                                    value={formatDateTimeLocal(newTempShift.startTime)}
                                                    min={formatDateTimeLocal(new Date())}
                                                    onChange={(e) => setNewTempShift(prev => ({
                                                        ...prev,
                                                        startTime: new Date(e.target.value)
                                                    }))}
                                                    disabled={isLoading}
                                                    className="w-full"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="temp-end">End Date & Time</Label>
                                                <Input
                                                    id="temp-end"
                                                    type="datetime-local"
                                                    value={formatDateTimeLocal(newTempShift.endTime)}
                                                    onChange={(e) => setNewTempShift(prev => ({
                                                        ...prev,
                                                        endTime: new Date(e.target.value)
                                                    }))}
                                                    disabled={isLoading}
                                                    className="w-full"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex space-x-2 justify-end">
                                            <Button
                                                onClick={handleSaveTempShift}
                                                disabled={isLoading}
                                                className="w-full sm:w-auto"
                                            >
                                                {createTempShiftMutation.isPending && (
                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                )}
                                                Save
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => setIsAddingTemp(false)}
                                                disabled={isLoading}
                                                className="w-full sm:w-auto"
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {isLoadingTempShifts ? (
                                    <div className="flex justify-center items-center p-4">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    </div>
                                ) : tempShifts.length === 0 ? (
                                    <div className="text-center py-4 text-gray-500">
                                        No temporary shifts scheduled
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>Start Time</TableHead>
                                                    <TableHead>End Time</TableHead>
                                                    <TableHead>Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {tempShifts.map((shift: TempShift, index: number) => {
                                                    const startDate = shift.startTime ? new Date(shift.startTime) : null;
                                                    const endDate = shift.endTime ? new Date(shift.endTime) : null;

                                                    // Convert GMT back to original local time for display
                                                    const getOriginalTime = (date: Date) => {
                                                        // Since we stored GMT, but user intended local time,
                                                        // we need to add back the timezone offset
                                                        const originalTime = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
                                                        return originalTime;
                                                    };

                                                    const displayStartDate = startDate ? getOriginalTime(startDate) : null;
                                                    const displayEndDate = endDate ? getOriginalTime(endDate) : null;

                                                    return (
                                                        <TableRow key={shift.id || `temp-shift-${index}`}>
                                                            <TableCell>
                                                                {displayStartDate ? displayStartDate.toLocaleDateString() : '-'}
                                                            </TableCell>
                                                            <TableCell>
                                                                {displayStartDate ? displayStartDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                            </TableCell>
                                                            <TableCell>
                                                                {displayEndDate ? displayEndDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button
                                                                    variant="destructive"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        if (shift.id) {
                                                                            deleteTempShiftMutation.mutate(shift.id);
                                                                        }
                                                                    }}
                                                                    disabled={isLoading || !shift.id}
                                                                >
                                                                    {deleteTempShiftMutation.isPending ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                                    ) : null}
                                                                    Delete
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>
        </>
    );
}
