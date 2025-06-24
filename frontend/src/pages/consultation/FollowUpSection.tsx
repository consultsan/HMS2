import React, { useState, useEffect, useRef } from 'react';
import DoctorSlots from "@/components/DoctorSlots";
import { surgeriesBySpecialisation } from '@/constants/doctorSpecialization';

interface FollowUpData {
    followUpDays: number;
    nextAppointmentDate: Date | null;
    selectedTimeSlot?: string;
    selectedSlotId?: string;
    status?: string;    
}

type SurgicalStatus = 'NOT_REQUIRED' | 'NOT_CONFIRMED' | 'CONFIRMED';

interface FollowUpSectionProps {
    doctorId: string;
    onFollowUpChange: (data: {
        surgicalStatus: SurgicalStatus;
        followUpAppointmentId?: string;
        followUpDateTime?: string;
        surgicalCategory?: string;
        surgicalDescription?: string;
        surgeryDate?: string;
    }) => void;
    doctorDept: string;
}

// Common surgery categories
const SURGERY_CATEGORIES = [
    'General Surgery',
    'Orthopedic Surgery',
    'Cardiac Surgery',
    'Neurosurgery',
    'ENT Surgery',
    'Ophthalmologic Surgery',
    'Gynecologic Surgery',
    'Urologic Surgery',
    'Plastic Surgery',
    'Dental Surgery',
    'Other'
] as const;


type SurgeryCategory = typeof SURGERY_CATEGORIES[number];

// Add this type before the component
type SpecializationType = keyof typeof surgeriesBySpecialisation;

const FollowUpSection: React.FC<FollowUpSectionProps> = ({ doctorId, doctorDept, onFollowUpChange }) => {
    const [showFollowUp, setShowFollowUp] = useState(false);
    const [followUpData, setFollowUpData] = useState<FollowUpData>({
        followUpDays: 0,
        nextAppointmentDate: null,
        selectedTimeSlot: undefined,
        selectedSlotId: undefined
    });
    const [surgicalStatus, setSurgicalStatus] = useState<SurgicalStatus>('NOT_REQUIRED');
    const [surgeryDate, setSurgeryDate] = useState<string>('');
    const [surgeryCategory, setSurgeryCategory] = useState<string>('');
    const [customSurgeryCategory, setCustomSurgeryCategory] = useState<string>('');
    const [surgeryDescription, setSurgeryDescription] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [showSurgeryDropdown, setShowSurgeryDropdown] = useState(false);

    // Ref for dropdown click-outside detection
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Get the surgery list for the doctor's department
    const availableSurgeries = surgeriesBySpecialisation[doctorDept as SpecializationType] || [];

    // Filter available surgeries based on search query - show all when empty
    const filteredSurgeries = availableSurgeries.filter(surgery => {
        if (!searchQuery.trim()) return true;
        return surgery.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const handleSurgerySelect = (surgery: string) => {
        setSurgeryCategory(surgery);
        setSearchQuery(surgery);
        setShowSurgeryDropdown(false);
    };

    // Handle click outside dropdown to close it
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowSurgeryDropdown(false);
            }
        };

        if (showSurgeryDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showSurgeryDropdown]);

    useEffect(() => {
        onFollowUpChange({
            surgicalStatus,
            followUpAppointmentId: followUpData.nextAppointmentDate ? 'temp-id' : undefined,
            followUpDateTime: followUpData.nextAppointmentDate && followUpData.selectedTimeSlot
                ? `${selectedDate}T${followUpData.selectedTimeSlot}:00.000Z`
                : undefined,
            surgicalCategory: surgeryCategory === 'OTHER' ? customSurgeryCategory : surgeryCategory,
            surgeryDate: surgeryDate,
            surgicalDescription: surgeryDescription
        });
    }, [surgicalStatus, followUpData.nextAppointmentDate, followUpData.selectedTimeSlot, selectedDate, surgeryCategory, customSurgeryCategory, surgeryDate, surgeryDescription, onFollowUpChange]);

    const handleFollowUpDaysChange = (days: number) => {
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + days);

        // Format the date as YYYY-MM-DD for the date input
        const formattedDate = nextDate.toISOString().split('T')[0];
        setSelectedDate(formattedDate);

        setFollowUpData({
            ...followUpData,
            followUpDays: days,
            nextAppointmentDate: nextDate,
            status: 'PENDING',
            selectedTimeSlot: undefined,  // Reset time slot when date changes
            selectedSlotId: undefined
        });
    };

    const handleSlotSelect = (time: string, slotId: string, isPartiallyBooked: boolean) => {
        setFollowUpData({
            ...followUpData,
            selectedTimeSlot: time,
            selectedSlotId: slotId
        });
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const handleSurgicalStatusChange = (status: SurgicalStatus) => {
        setSurgicalStatus(status);
        if (status === 'NOT_REQUIRED') {
            setSurgeryDate('');
        }
        const data: any = {
            surgicalStatus: status,
            followUpAppointmentId: followUpData.nextAppointmentDate ? 'temp-id' : undefined,
            followUpDateTime: followUpData.nextAppointmentDate && followUpData.selectedTimeSlot
                ? `${selectedDate}T${followUpData.selectedTimeSlot}:00.000Z`
                : undefined,
            surgicalCategory: surgeryCategory,
            surgeryDate: surgeryDate,
            surgicalDescription: surgeryDescription
        }
        if (surgeryCategory === 'OTHER') {
            data.surgicalCategory = customSurgeryCategory;
        } else {
            data.surgicalCategory = surgeryCategory;
        }
        onFollowUpChange(data);
    };

    // Get tomorrow's date in YYYY-MM-DD format for min date in surgery date picker
    const getTomorrowDate = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Follow Up Section */}
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <h4 className="text-base font-medium text-gray-700">Follow Up Appointment</h4>
                    <button
                        onClick={() => setShowFollowUp(!showFollowUp)}
                        className={`px-4 py-2 text-sm rounded-md transition-colors ${showFollowUp
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                            }`}
                    >
                        {showFollowUp ? 'Cancel' : 'Schedule Follow Up'}
                    </button>
                </div>

                {showFollowUp && (
                    <div className="space-y-6 pl-4 border-l-2 border-gray-100">
                        <div className="flex items-center space-x-4">
                            <label className="text-sm text-gray-600 w-28">Follow up after:</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="1"
                                    value={followUpData.followUpDays || ''}
                                    onChange={(e) => handleFollowUpDaysChange(parseInt(e.target.value) || 0)}
                                    className="w-20 px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Days"
                                />
                                <span className="text-sm text-gray-600">days</span>
                            </div>
                        </div>

                        {followUpData.nextAppointmentDate && followUpData.followUpDays > 0 && (
                            <div className="space-y-4">
                                <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                                    <h5 className="text-sm font-medium text-blue-900 mb-1">Next Appointment</h5>
                                    <p className="text-sm text-blue-700">
                                        {formatDate(followUpData.nextAppointmentDate)}
                                    </p>
                                </div>

                                {selectedDate && (
                                    <div>
                                        <h5 className="text-sm font-medium text-gray-700 mb-3">Available Time Slots</h5>
                                        <DoctorSlots
                                            doctorId={doctorId}
                                            selectedDate={selectedDate}
                                            onSlotSelect={handleSlotSelect}
                                        />
                                    </div>
                                )}

                                {followUpData.selectedTimeSlot && (
                                    <div className="bg-green-50 p-3 rounded-md border border-green-100">
                                        <p className="text-sm text-green-800">
                                            <span className="font-medium">Selected Time:</span> {followUpData.selectedTimeSlot}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Surgical Section */}
            <div className="space-y-6">
                <h4 className="text-base font-medium text-gray-700">Surgical Status</h4>

                <div className="flex gap-3 flex-wrap">
                    <button
                        onClick={() => handleSurgicalStatusChange('NOT_REQUIRED')}
                        className={`px-4 py-2 text-sm rounded-md transition-colors ${surgicalStatus === 'NOT_REQUIRED'
                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                            : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                            }`}
                    >
                        Non-Surgical
                    </button>
                    <button
                        onClick={() => handleSurgicalStatusChange('NOT_CONFIRMED')}
                        className={`px-4 py-2 text-sm rounded-md transition-colors ${surgicalStatus === 'NOT_CONFIRMED'
                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                            : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                            }`}
                    >
                        Surgical
                    </button>
                    <button
                        onClick={() => handleSurgicalStatusChange('CONFIRMED')}
                        className={`px-4 py-2 text-sm rounded-md transition-colors ${surgicalStatus === 'CONFIRMED'
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                            }`}
                    >
                        Surgical Confirmed
                    </button>
                </div>

                {surgicalStatus !== 'NOT_REQUIRED' && (
                    <div className="pl-4 border-l-2 border-gray-100 space-y-6">
                        <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-3">
                                {surgicalStatus === 'CONFIRMED' ? 'Schedule Surgery' : 'Select Surgery Category'}
                            </h5>

                            <div className="space-y-4">
                                <div className="flex items-start gap-4 flex-wrap">
                                    <div className="relative flex-1 min-w-48" ref={dropdownRef}>
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value);
                                                setShowSurgeryDropdown(true);
                                                if (e.target.value === '') {
                                                    setSurgeryCategory('');
                                                }
                                            }}
                                            onFocus={() => setShowSurgeryDropdown(true)}
                                            placeholder="Search surgery category..."
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                                        />

                                        {showSurgeryDropdown && filteredSurgeries.length > 0 && (
                                            <div className="absolute w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                                                {filteredSurgeries.map(surgery => (
                                                    <div
                                                        key={surgery}
                                                        className="p-3 text-sm hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-b-0"
                                                        onClick={() => handleSurgerySelect(surgery)}
                                                    >
                                                        {surgery}
                                                    </div>
                                                ))}
                                                <div
                                                    className="p-3 text-sm hover:bg-gray-50 cursor-pointer border-t border-gray-100 font-medium text-gray-600"
                                                    onClick={() => {
                                                        setSurgeryCategory('OTHER');
                                                        setSearchQuery('Other');
                                                        setShowSurgeryDropdown(false);
                                                    }}
                                                >
                                                    Other (Custom)
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {surgeryCategory === 'OTHER' && (
                                        <input
                                            type="text"
                                            placeholder="Enter custom surgery category"
                                            value={customSurgeryCategory}
                                            onChange={(e) => setCustomSurgeryCategory(e.target.value)}
                                            className="px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 min-w-48"
                                        />
                                    )}

                                    {surgicalStatus === 'CONFIRMED' && (
                                        <input
                                            type="date"
                                            min={getTomorrowDate()}
                                            value={surgeryDate}
                                            onChange={(e) => setSurgeryDate(e.target.value)}
                                            className="px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                                        />
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Surgery Description</label>
                                    <textarea
                                        value={surgeryDescription}
                                        onChange={(e) => setSurgeryDescription(e.target.value)}
                                        placeholder="Enter surgery description..."
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                                        rows={3}
                                    />
                                </div>

                                {surgeryDate && (
                                    <div className="bg-green-50 p-3 rounded-md border border-green-100">
                                        <p className="text-sm text-green-800">
                                            <span className="font-medium">Scheduled:</span> {surgeryCategory} on {new Date(surgeryDate).toLocaleDateString('en-US', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FollowUpSection;
