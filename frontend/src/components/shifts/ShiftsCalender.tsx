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

interface EditingTempShift {
    id?: string;
    startTime: string;
    endTime: string;
    date: string;
}

export default function ShiftsCalendar({ userId, userName }: ShiftsCalendarProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [editingDay, setEditingDay] = useState<WeekDay | null>(null);
    const [isAddingTemp, setIsAddingTemp] = useState(false);
    const [newTempShift, setNewTempShift] = useState<EditingTempShift>({
        startTime: "09:00",
        endTime: "17:00",
        date: new Date().toISOString().split('T')[0]
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
                if (response.data.success) {
                    toast({
                        title: "Success",
                        description: "Temp shifts fetched successfully",
                    });
                }
                return response.data.data.shifts || [];
            } catch (error) {
                console.error('Error fetching temp shifts:', error);
                toast({
                    title: "Error",
                    description: "Failed to fetch temp shifts",
                    variant: "destructive",
                });
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
            setNewTempShift({
                startTime: "09:00",
                endTime: "17:00",
                date: new Date().toISOString().split('T')[0]
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
        const { date, startTime, endTime } = newTempShift;
        const startDateTime = new Date(`${date}T${startTime}`);
        const endDateTime = new Date(`${date}T${endTime}`);

        console.log('Saving temp shift:', { startDateTime, endDateTime });

        if (startDateTime >= endDateTime) {
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
            startTime: startDateTime,
            endTime: endDateTime,
            status: Status.ACTIVE,
            hospitalId: user.hospitalId,
            staffId: userId
        });
    };

    const isLoading = createShiftMutation.isPending || updateShiftMutation.isPending ||
        deleteShiftMutation.isPending || createTempShiftMutation.isPending;

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
                                                <Label htmlFor="temp-date">Date</Label>
                                                <Input
                                                    id="temp-date"
                                                    type="date"
                                                    value={newTempShift.date}
                                                    min={new Date().toISOString().split('T')[0]}
                                                    onChange={(e) => setNewTempShift(prev => ({
                                                        ...prev,
                                                        date: e.target.value
                                                    }))}
                                                    disabled={isLoading}
                                                    className="w-full"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="temp-start">Start Time</Label>
                                                <Input
                                                    id="temp-start"
                                                    type="time"
                                                    value={newTempShift.startTime}
                                                    onChange={(e) => setNewTempShift(prev => ({
                                                        ...prev,
                                                        startTime: e.target.value
                                                    }))}
                                                    disabled={isLoading}
                                                    className="w-full"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="temp-end">End Time</Label>
                                                <Input
                                                    id="temp-end"
                                                    type="time"
                                                    value={newTempShift.endTime}
                                                    onChange={(e) => setNewTempShift(prev => ({
                                                        ...prev,
                                                        endTime: e.target.value
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
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {tempShifts.map((shift: TempShift) => (
                                                    <TableRow key={shift.id}>
                                                        <TableCell>
                                                            {new Date(shift.startTime).toLocaleDateString()}
                                                        </TableCell>
                                                        <TableCell>
                                                            {new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </TableCell>
                                                        <TableCell>
                                                            {new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
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
