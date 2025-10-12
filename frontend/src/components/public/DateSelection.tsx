import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DateSelectionProps {
  doctorName: string;
  doctorSpecialization: string;
  onNext: (date: string) => void;
  onBack: () => void;
}

const DateSelection: React.FC<DateSelectionProps> = ({ 
  doctorName, 
  doctorSpecialization, 
  onNext, 
  onBack 
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDate) {
      // Create a date string in YYYY-MM-DD format to avoid timezone issues
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      onNext(dateString);
    }
  };

  // Disable dates before today
  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      setIsOpen(false); // Close the popover when date is selected
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Select Date</CardTitle>
        <CardDescription>
          Choose your preferred date for the appointment with {doctorName}
          {doctorSpecialization && ` (${doctorSpecialization})`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Appointment Date *</label>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  disabled={isDateDisabled}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {selectedDate && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Selected Date</h4>
              <p className="text-sm text-gray-600">
                {format(selectedDate, "EEEE, MMMM do, yyyy")}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Available time slots will be shown on the next step
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
              disabled={!selectedDate}
            >
              Continue to Time Selection
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default DateSelection;
