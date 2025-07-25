import React from 'react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface TimeIntervalFilterProps {
    onTimeIntervalChange: (startDate: Date, endDate: Date) => void;
    selectedInterval: IntervalOption;
    onIntervalChange: (interval: IntervalOption) => void;
    selectedMonth: number;
    onMonthChange: (month: number) => void;
    selectedYear: number;
    onYearChange: (year: number) => void;
    className?: string;
}

type IntervalOption = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom_month' | 'custom_year';

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const getIntervalLabel = (interval: IntervalOption): string => {
    switch (interval) {
        case 'today':
            return 'Today';
        case 'yesterday':
            return 'Yesterday';
        case 'this_week':
            return 'This Week';
        case 'this_month':
            return 'This Month';
        case 'custom_month':
            return 'Select Month';
        case 'custom_year':
            return 'Select Year';
        default:
            return 'Select Interval';
    }
};

export const TimeIntervalFilter = React.memo(({
    onTimeIntervalChange,
    selectedInterval,
    onIntervalChange,
    selectedMonth,
    onMonthChange,
    selectedYear,
    onYearChange,
    className
}: TimeIntervalFilterProps) => {
    const updateDateRange = React.useCallback((interval: IntervalOption) => {
        const now = new Date();

        switch (interval) {
            case 'today': {
                const start = startOfDay(now);
                const end = endOfDay(now);
                onTimeIntervalChange(start, end);
                break;
            }
            case 'yesterday': {
                const yesterday = subDays(now, 1);
                const start = startOfDay(yesterday);
                const end = endOfDay(yesterday);
                onTimeIntervalChange(start, end);
                break;
            }
            case 'this_week': {
                const start = startOfWeek(now, { weekStartsOn: 1 });
                const end = endOfWeek(now, { weekStartsOn: 1 });
                onTimeIntervalChange(start, end);
                break;
            }
            case 'this_month': {
                const start = startOfMonth(now);
                const end = endOfMonth(now);
                onTimeIntervalChange(start, end);
                break;
            }
            case 'custom_month': {
                const date = new Date(selectedYear, selectedMonth);
                const start = startOfMonth(date);
                const end = endOfMonth(date);
                onTimeIntervalChange(start, end);
                break;
            }
            case 'custom_year': {
                const start = new Date(selectedYear, 0, 1);
                const end = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
                onTimeIntervalChange(start, end);
                break;
            }
        }
    }, [selectedMonth, selectedYear, onTimeIntervalChange]);

    const handleIntervalChange = React.useCallback((value: IntervalOption) => {
        onIntervalChange(value);
        updateDateRange(value);
    }, [onIntervalChange, updateDateRange]);

    // Generate array of years (last 10 years to current year)
    const years = React.useMemo(() => Array.from({ length: 11 }, (_, i) => {
        const year = new Date().getFullYear() - 10 + i;
        return { value: year.toString(), label: year.toString() };
    }), []);

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <Select
                value={selectedInterval}
                onValueChange={(value) => handleIntervalChange(value as IntervalOption)}
            >
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select interval">
                        {getIntervalLabel(selectedInterval)}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="this_week">This Week</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="custom_month">Select Month</SelectItem>
                    <SelectItem value="custom_year">Select Year</SelectItem>
                </SelectContent>
            </Select>

            {selectedInterval === 'custom_month' && (
                <>
                    <Select
                        value={selectedMonth.toString()}
                        onValueChange={(value) => {
                            const month = parseInt(value);
                            onMonthChange(month);
                            const date = new Date(selectedYear, month);
                            const start = startOfMonth(date);
                            const end = endOfMonth(date);
                            onTimeIntervalChange(start, end);
                        }}
                    >
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Select month">
                                {MONTHS[selectedMonth]}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {MONTHS.map((month, index) => (
                                <SelectItem key={index} value={index.toString()}>
                                    {month}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={selectedYear.toString()}
                        onValueChange={(value) => {
                            const year = parseInt(value);
                            onYearChange(year);
                            const date = new Date(year, selectedMonth);
                            const start = startOfMonth(date);
                            const end = endOfMonth(date);
                            onTimeIntervalChange(start, end);
                        }}
                    >
                        <SelectTrigger className="w-[100px]">
                            <SelectValue placeholder="Year">
                                {selectedYear}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {years.map((year) => (
                                <SelectItem key={year.value} value={year.value}>
                                    {year.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </>
            )}

            {selectedInterval === 'custom_year' && (
                <Select
                    value={selectedYear.toString()}
                    onValueChange={(value) => {
                        const year = parseInt(value);
                        onYearChange(year);
                        const start = new Date(year, 0, 1);
                        const end = new Date(year, 11, 31, 23, 59, 59, 999);
                        onTimeIntervalChange(start, end);
                    }}
                >
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Select year">
                            {selectedYear}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {years.map((year) => (
                            <SelectItem key={year.value} value={year.value}>
                                {year.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
        </div>
    );
}); 