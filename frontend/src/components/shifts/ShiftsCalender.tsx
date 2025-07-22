import { useState } from 'react';
import { Calendar, Loader2, Clock, Plus, Edit3, Trash2, Save, X, Users, CalendarDays, Timer } from 'lucide-react';
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
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';


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

// Helper function to get day color
const getDayColor = (day: WeekDay) => {
    const colors = {
        [WeekDay.MONDAY]: 'bg-blue-50 border-blue-200',
        [WeekDay.TUESDAY]: 'bg-green-50 border-green-200',
        [WeekDay.WEDNESDAY]: 'bg-purple-50 border-purple-200',
        [WeekDay.THURSDAY]: 'bg-orange-50 border-orange-200',
        [WeekDay.FRIDAY]: 'bg-pink-50 border-pink-200',
        [WeekDay.SATURDAY]: 'bg-yellow-50 border-yellow-200',
        [WeekDay.SUNDAY]: 'bg-red-50 border-red-200',
    };
    return colors[day] || 'bg-gray-50 border-gray-200';
};

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

    // Calculate some stats
    const activeShifts = shifts.filter((shift: Shift) => shift.status === Status.ACTIVE).length;
    const upcomingTempShifts = tempShifts.filter((shift: TempShift) => {
        const startDate = shift.startTime ? new Date(shift.startTime) : null;
        return startDate && startDate > new Date();
    }).length;

    return (
        <>
            <Button
                onClick={() => setIsOpen(true)}
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200"
                disabled={isLoadingShifts || isLoadingTempShifts}
            >
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Schedule</span>
                {(activeShifts > 0 || upcomingTempShifts > 0) && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                        {activeShifts + upcomingTempShifts}
                    </Badge>
                )}
            </Button>

            <Dialog open={isOpen} onOpenChange={(open) => !isLoading && setIsOpen(open)}>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader className="border-b pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Calendar className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-semibold">
                                        {userName ? `${userName}'s Schedule` : 'Weekly Schedule'}
                                    </DialogTitle>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Manage regular shifts and temporary schedules
                                    </p>
                                </div>
                            </div>

                            {/* Quick Stats */}
                            <div className="flex gap-4">
                                <div className="text-center">
                                    <div className="text-lg font-bold text-blue-600">{activeShifts}</div>
                                    <div className="text-xs text-gray-500">Regular Shifts</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg font-bold text-green-600">{upcomingTempShifts}</div>
                                    <div className="text-xs text-gray-500">Upcoming Temp</div>
                                </div>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto">
                        <Tabs defaultValue="regular" className="w-full h-full">
                            <TabsList className="grid w-full grid-cols-2 mb-6">
                                <TabsTrigger value="regular" className="flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    Regular Shifts
                                </TabsTrigger>
                                <TabsTrigger value="temporary" className="flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4" />
                                    Temporary Shifts
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="regular" className="space-y-4">
                                {isLoadingShifts ? (
                                    <div className="flex justify-center items-center py-12">
                                        <div className="text-center">
                                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-2" />
                                            <p className="text-gray-600">Loading shifts...</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid gap-3">
                                        {DAYS_OF_WEEK.map((day) => {
                                            const shift = getShiftForDay(day);
                                            const isEditing = editingDay === day;

                                            return (
                                                <Card key={day} className={`transition-all duration-200 hover:shadow-md ${getDayColor(day)}`}>
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium text-gray-900">{day}</span>
                                                                    {shift && (
                                                                        <Badge variant="outline" className="w-fit mt-1">
                                                                            Active
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {isEditing ? (
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <Clock className="h-4 w-4 text-gray-500" />
                                                                        <Input
                                                                            type="time"
                                                                            defaultValue={shift?.startTime || "09:00"}
                                                                            className="w-32 h-8"
                                                                            id={`start-${day}`}
                                                                            disabled={isLoading}
                                                                        />
                                                                        <span className="text-gray-500">to</span>
                                                                        <Input
                                                                            type="time"
                                                                            defaultValue={shift?.endTime || "17:00"}
                                                                            className="w-32 h-8"
                                                                            id={`end-${day}`}
                                                                            disabled={isLoading}
                                                                        />
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                const startTime = (document.getElementById(`start-${day}`) as HTMLInputElement)?.value;
                                                                                const endTime = (document.getElementById(`end-${day}`) as HTMLInputElement)?.value;
                                                                                if (startTime && endTime) {
                                                                                    handleSaveShift(day, startTime, endTime);
                                                                                }
                                                                            }}
                                                                            disabled={isLoading}
                                                                            className="gap-1"
                                                                        >
                                                                            {isLoading ? (
                                                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                                            ) : (
                                                                                <Save className="h-3 w-3" />
                                                                            )}
                                                                            Save
                                                                        </Button>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => setEditingDay(null)}
                                                                            disabled={isLoading}
                                                                        >
                                                                            <X className="h-3 w-3" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-4">
                                                                    <div className="text-right">
                                                                        {shift ? (
                                                                            <div className="flex items-center gap-2 text-sm">
                                                                                <Clock className="h-4 w-4 text-gray-500" />
                                                                                <span className="font-medium">
                                                                                    {shift.startTime} - {shift.endTime}
                                                                                </span>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-gray-500 text-sm">No shift scheduled</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => setEditingDay(day)}
                                                                            disabled={isLoading}
                                                                            className="gap-1"
                                                                        >
                                                                            {shift ? <Edit3 className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                                                                            {shift ? 'Edit' : 'Add'}
                                                                        </Button>
                                                                        {shift && (
                                                                            <Button
                                                                                variant="destructive"
                                                                                size="sm"
                                                                                onClick={() => deleteShiftMutation.mutate(shift.id)}
                                                                                disabled={isLoading}
                                                                                className="gap-1"
                                                                            >
                                                                                {deleteShiftMutation.isPending ? (
                                                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                                                ) : (
                                                                                    <Trash2 className="h-3 w-3" />
                                                                                )}
                                                                                Delete
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="temporary" className="space-y-6">
                                <Card className="border-dashed border-2 border-blue-300 bg-blue-50/50">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <Plus className="h-5 w-5 text-blue-600" />
                                            Add Temporary Shift
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {!isAddingTemp ? (
                                            <Button
                                                onClick={() => setIsAddingTemp(true)}
                                                disabled={isLoading}
                                                className="w-full gap-2"
                                            >
                                                <Plus className="h-4 w-4" />
                                                Schedule Temporary Shift
                                            </Button>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="temp-start" className="flex items-center gap-2">
                                                            <Timer className="h-4 w-4" />
                                                            Start Date & Time
                                                        </Label>
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
                                                        <Label htmlFor="temp-end" className="flex items-center gap-2">
                                                            <Timer className="h-4 w-4" />
                                                            End Date & Time
                                                        </Label>
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
                                                <div className="flex gap-2 justify-end">
                                                    <Button
                                                        onClick={handleSaveTempShift}
                                                        disabled={isLoading}
                                                        className="gap-2"
                                                    >
                                                        {createTempShiftMutation.isPending ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Save className="h-4 w-4" />
                                                        )}
                                                        Save Shift
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => setIsAddingTemp(false)}
                                                        disabled={isLoading}
                                                        className="gap-2"
                                                    >
                                                        <X className="h-4 w-4" />
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {isLoadingTempShifts ? (
                                    <div className="flex justify-center items-center py-12">
                                        <div className="text-center">
                                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-2" />
                                            <p className="text-gray-600">Loading temporary shifts...</p>
                                        </div>
                                    </div>
                                ) : tempShifts.length === 0 ? (
                                    <Card className="border-gray-200">
                                        <CardContent className="flex flex-col items-center justify-center py-12">
                                            <CalendarDays className="h-12 w-12 text-gray-400 mb-4" />
                                            <h3 className="text-lg font-medium text-gray-900 mb-2">No temporary shifts</h3>
                                            <p className="text-gray-600 text-center max-w-md">
                                                Temporary shifts will appear here when scheduled. These are perfect for covering
                                                special events or additional coverage needs.
                                            </p>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="space-y-3">
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

                                            const isUpcoming = displayStartDate && displayStartDate > new Date();
                                            const isActive = displayStartDate && displayEndDate &&
                                                new Date() >= displayStartDate && new Date() <= displayEndDate;

                                            return (
                                                <Card key={shift.id || `temp-shift-${index}`}
                                                    className={`transition-all duration-200 hover:shadow-md ${isActive ? 'bg-green-50 border-green-200' :
                                                            isUpcoming ? 'bg-blue-50 border-blue-200' :
                                                                'bg-gray-50 border-gray-200'
                                                        }`}>
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`p-2 rounded-lg ${isActive ? 'bg-green-100' :
                                                                        isUpcoming ? 'bg-blue-100' :
                                                                            'bg-gray-100'
                                                                    }`}>
                                                                    <CalendarDays className={`h-4 w-4 ${isActive ? 'text-green-600' :
                                                                            isUpcoming ? 'text-blue-600' :
                                                                                'text-gray-600'
                                                                        }`} />
                                                                </div>
                                                                <div>
                                                                    <div className="font-medium text-gray-900">
                                                                        {displayStartDate ? displayStartDate.toLocaleDateString('en-US', {
                                                                            weekday: 'long',
                                                                            year: 'numeric',
                                                                            month: 'long',
                                                                            day: 'numeric'
                                                                        }) : '-'}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                                                                        <Clock className="h-3 w-3" />
                                                                        <span>
                                                                            {displayStartDate ? displayStartDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                                            {' - '}
                                                                            {displayEndDate ? displayEndDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <Badge variant={isActive ? 'default' : isUpcoming ? 'secondary' : 'outline'}>
                                                                    {isActive ? 'Active Now' : isUpcoming ? 'Upcoming' : 'Past'}
                                                                </Badge>
                                                                <Button
                                                                    variant="destructive"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        if (shift.id) {
                                                                            deleteTempShiftMutation.mutate(shift.id);
                                                                        }
                                                                    }}
                                                                    disabled={isLoading || !shift.id}
                                                                    className="gap-1"
                                                                >
                                                                    {deleteTempShiftMutation.isPending ? (
                                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                                    ) : (
                                                                        <Trash2 className="h-3 w-3" />
                                                                    )}
                                                                    Delete
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
