import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useState } from 'react';

interface DateFilterProps {
    onDateChange: (date: Date) => void;
    initialFilter?: 'today' | 'yesterday' | 'custom';
}

const filterLabels = {
    'today': "Today",
    'yesterday': "Yesterday",
    'custom': "Custom"
} as const;

export default function DateFilter({ onDateChange, initialFilter = 'today' }: DateFilterProps) {
    const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'custom'>(initialFilter);

    // Get start of today (midnight)
    const getStartOfDay = (date: Date) => {
        const newDate = new Date(date);
        newDate.setHours(0, 0, 0, 0);
        return newDate;
    };

    // Initialize with start of today
    const [selectedDate, setSelectedDate] = useState<Date>(() => {
        const today = getStartOfDay(new Date());
        return today;
    });

    // Effect to set initial date based on initialFilter
    useEffect(() => {
        const today = getStartOfDay(new Date());

        switch (initialFilter) {
            case 'yesterday': {
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                setSelectedDate(yesterday);
                onDateChange(yesterday);
                break;
            }
            case 'custom':
                setSelectedDate(today);
                onDateChange(today);
                break;
            default: // today
                setSelectedDate(today);
                onDateChange(today);
        }
    }, [initialFilter, onDateChange]);

    const handleFilterChange = (value: 'today' | 'yesterday' | 'custom') => {
        setDateFilter(value);
        const today = getStartOfDay(new Date());

        switch (value) {
            case 'yesterday': {
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                setSelectedDate(yesterday);
                onDateChange(yesterday);
                break;
            }
            case 'custom':
                // Keep the current selected date if it's custom
                if (dateFilter !== 'custom') {
                    setSelectedDate(today);
                    onDateChange(today);
                }
                break;
            default: // today
                setSelectedDate(today);
                onDateChange(today);
        }
    };

    const handleCustomDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.value) return;

        const date = new Date(e.target.value);
        // Ensure we're working with local midnight
        const adjustedDate = getStartOfDay(date);

        setSelectedDate(adjustedDate);
        onDateChange(adjustedDate);
    };

    // Format date for input value
    const formatDateForInput = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    return (
        <div className="flex items-center gap-4 mb-6">
            <Select
                value={dateFilter}
                onValueChange={handleFilterChange}
            >
                <SelectTrigger className="w-[180px]">
                    <SelectValue>
                        {filterLabels[dateFilter]}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="today">{filterLabels.today}</SelectItem>
                    <SelectItem value="yesterday">{filterLabels.yesterday}</SelectItem>
                    <SelectItem value="custom">{filterLabels.custom}</SelectItem>
                </SelectContent>
            </Select>

            {dateFilter === 'custom' && (
                <input
                    type="date"
                    value={formatDateForInput(selectedDate)}
                    onChange={handleCustomDateChange}
                    className="px-3 py-2 border rounded-md"
                    max={formatDateForInput(new Date())} // Prevent future dates
                />
            )}
        </div>
    );
} 