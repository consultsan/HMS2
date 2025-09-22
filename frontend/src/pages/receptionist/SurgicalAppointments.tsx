import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Surgery } from '@/components/patient/types';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import DoctorSlots from '@/components/DoctorSlots';
import { Calendar, Stethoscope, Trash2 } from 'lucide-react';
import { useSearch } from '@/contexts/SearchContext';
import { appointmentApi } from '@/api/appointment';
import { SurgicalStatus } from '@/types/types';

export default function SurgicalAppointments() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSurgery, setSelectedSurgery] = useState<Surgery | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [partiallyBooked, setPartiallyBooked] = useState(false);
  const [showOpdForm, setShowOpdForm] = useState(false);
  const [confirmingSurgeryId, setConfirmingSurgeryId] = useState<string | null>(null);

  const { searchQuery } = useSearch();
  const queryClient = useQueryClient();

  const { data: surgeries, isLoading } = useQuery({
    queryKey: ['surgical-appointments'],
    queryFn: async () => {
      const response = await api.get('/api/appointment/get-surgery-by-hospital-id');
      const allSurgeries = response.data?.data ?? [];
      return allSurgeries.filter(
        (surgery: Surgery) =>
          surgery.status === 'NOT_CONFIRMED' && surgery.scheduledAt === null
      );
    },
  });

  const updateSurgeryStatus = useMutation({
    mutationFn: async ({
      surgeryId,
      status,
      scheduledAt,
    }: {
      surgeryId: string;
      status: SurgicalStatus;
      scheduledAt: string;
    }) => {
      return await appointmentApi.updateSurgeryStatus(surgeryId, status, scheduledAt);
    },
  });

  const handleUpdateSurgeryStatus = async (surgeryId: string, surgicalStatus: SurgicalStatus, scheduledAt: string) => {
    if (!selectedDate && surgicalStatus === SurgicalStatus.CONFIRMED) {
      return toast.error('Please select a surgery date');
    }

    setConfirmingSurgeryId(surgeryId);

    updateSurgeryStatus.mutate(
      { surgeryId, status: surgicalStatus, scheduledAt: selectedDate },
      {
        onSuccess: () => {
          toast.success(
            `Surgery ${surgicalStatus === 'CANCELLED' ? 'cancelled' : 'confirmed'} successfully`
          );
          setIsDialogOpen(false);
          setSelectedDate('');
          setConfirmingSurgeryId(null);

          queryClient.setQueryData(['surgical-appointments'], (old: Surgery[] | undefined) => {
            if (!old) return old;
            return old.filter((s) => s.id !== surgeryId);
          });
        },
        onError: (error: any) => {
          toast.error(error.response?.data?.message || 'Failed to update surgery status');
          setConfirmingSurgeryId(null);
        },
      }
    );
  };

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
        scheduledAt: appointmentDateTime.toISOString(),
      });

      if (partiallyBooked) {
        await api.patch(`/api/doctor/update-slot/${selectedSlotId}`, {
          appointment2Id: response.data.data.id,
          timeSlot: appointmentDateTime.toISOString(),
        });
      } else {
        await api.post(`/api/doctor/add-slot/${selectedSurgery.appointment.doctor.id}`, {
          appointment1Id: response.data.data.id,
          timeSlot: appointmentDateTime.toISOString(),
        });
      }

      return response.data;
    },
    onSuccess: () => {
      toast.success('OPD appointment scheduled successfully');
      setIsDialogOpen(false);
      queryClient.setQueryData(['surgical-appointments'], (old: Surgery[] | undefined) => {
        if (!old || !selectedSurgery) return old;
        return old.filter((s) => s.id !== selectedSurgery.id);
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to schedule OPD appointment');
    },
  });

  const handleConfirm = (surgery: Surgery) => {
    setSelectedSurgery(surgery);
    setIsDialogOpen(true);
  };

  const handleDateChange = (date: string) => setSelectedDate(date);

  const handleSlotSelect = (time: string, slotId: string, isPartiallyBooked: boolean) => {
    setSelectedTimeSlot(time);
    setSelectedSlotId(slotId);
    setPartiallyBooked(isPartiallyBooked);
  };

    const filteredSurgeries = surgeries?.filter((surgery:any) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      surgery.appointment.patient.name.toLowerCase().includes(searchLower) ||
      surgery.appointment.patient.phone.toLowerCase().includes(searchLower) ||
      surgery.appointment.doctor.name.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return <div className="text-center w-full h-full">Loading Pending Surgical Appointments...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-5">Pending Surgical Appointments</h1>
      <Table numberOfRows={11}>
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
          {filteredSurgeries?.map((surgery:Surgery) => (
            <TableRow key={surgery.id}>
              <TableCell>{surgery.appointment.patient.name}</TableCell>
              <TableCell>{surgery.appointment.patient.phone}</TableCell>
              <TableCell>{surgery.appointment.doctor.name}</TableCell>
              <TableCell>{surgery.category}</TableCell>
              <TableCell className="flex gap-2 items-center">
                <Button
                  onClick={() => handleConfirm(surgery)}
                  disabled={confirmingSurgeryId === surgery.id}
                >
                  {confirmingSurgeryId === surgery.id ? 'Confirming...' : 'Confirm Surgery'}
                </Button>
                <button
                  onClick={() =>
                    handleUpdateSurgeryStatus(surgery.id, SurgicalStatus.CANCELLED, selectedDate)
                  }
                  className="px-2 py-1 hover:bg-gray-100 rounded-full"
                  title="Cancel Surgery"
                  disabled={confirmingSurgeryId === surgery.id}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
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
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold">Confirm Surgery</h3>
              </div>
              <div className="pl-10 space-y-4">
                <div>
                  <Label htmlFor="surgery-date" className="text-sm font-medium">
                    Surgery Date
                  </Label>
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
                  onClick={() =>
                    handleUpdateSurgeryStatus(selectedSurgery?.id!, SurgicalStatus.CONFIRMED, selectedDate)
                  }
                  disabled={confirmingSurgeryId === selectedSurgery?.id}
                >
                  {confirmingSurgeryId === selectedSurgery?.id ? 'Confirming...' : 'Confirm Surgery'}
                </Button>

                <button
                  onClick={() =>
                    handleUpdateSurgeryStatus(selectedSurgery?.id!, SurgicalStatus.CANCELLED, selectedDate)
                  }
                  className="px-2 py-1 hover:bg-gray-100 rounded-full"
                  title="Cancel Surgery"
                  disabled={confirmingSurgeryId === selectedSurgery?.id}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </section>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

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
                  {showOpdForm ? 'Hide OPD Form' : 'Schedule OPD Appointment'}
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
                        disabled={
                          !selectedDate || !selectedTimeSlot || bookOpdAppointment.isPending
                        }
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
