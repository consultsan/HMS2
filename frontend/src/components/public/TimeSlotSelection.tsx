import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Clock, CheckCircle } from 'lucide-react';
import { publicAppointmentApi, AvailableSlot } from '@/api/publicAppointment';
import { format } from 'date-fns';

interface TimeSlotSelectionProps {
  doctorId: string;
  doctorName: string;
  doctorSpecialization: string;
  selectedDate: string;
  onNext: (slot: AvailableSlot) => void;
  onBack: () => void;
}

const TimeSlotSelection: React.FC<TimeSlotSelectionProps> = ({ 
  doctorId, 
  doctorName, 
  doctorSpecialization, 
  selectedDate, 
  onNext, 
  onBack 
}) => {
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchAvailableSlots();
  }, [doctorId, selectedDate]);

  const fetchAvailableSlots = async () => {
    try {
      setLoading(true);
      console.log(doctorId, selectedDate);
      const response = await publicAppointmentApi.getAvailableSlots(doctorId, selectedDate);
      setSlots(response.data.data.slots);
      console.log(response.data.data.slots);
    } catch (err: any) {
      console.error('Error fetching available slots:', err);
      setError('Failed to load available time slots. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSlot) {
      console.log(selectedSlot);
      onNext(selectedSlot);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "EEEE, MMMM do, yyyy");
  };

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading available slots...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="py-8">
          <div className="text-center">
            <p className="text-gray-500 mb-4">No available time slots for this date.</p>
            <Button onClick={onBack} variant="outline">
              Back to Date Selection
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (slots.length === 0) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="py-8">
          <div className="text-center">
            <p className="text-gray-500 mb-4">No available time slots for this date.</p>
            <Button onClick={onBack} variant="outline">
              Back to Date Selection
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Select Time Slot</CardTitle>
        <CardDescription>
          Choose your preferred time slot for {doctorName}
          {doctorSpecialization && ` (${doctorSpecialization})`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Available Time Slots *</label>
            <p className="text-xs text-gray-500">
              {formatDate(selectedDate)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
            {slots.map((slot, index) => (
              <Button
                key={index}
                type="button"
                variant={selectedSlot?.time === slot.time ? "default" : "outline"}
                className={`h-12 text-sm ${
                  selectedSlot?.time === slot.time 
                    ? "bg-blue-600 hover:bg-blue-700" 
                    : "hover:bg-gray-50"
                }`}
                onClick={() => setSelectedSlot(slot)}
                disabled={!slot.available}
              >
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{slot.time}</span>
                  {selectedSlot?.time === slot.time && (
                    <CheckCircle className="h-4 w-4 ml-1" />
                  )}
                </div>
              </Button>
            ))}
          </div>

          {selectedSlot && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Selected Time Slot</h4>
              <p className="text-sm text-gray-600">
                {formatDate(selectedDate)} at {selectedSlot.time}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onBack} className="flex-1">
              Back
            </Button>
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={!selectedSlot}
            >
              Book Appointment
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default TimeSlotSelection;
