import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MARITAL_STATUS } from './constants';
import { PatientFormData } from './types';

interface ContactInformationProps {
    formData: PatientFormData;
    isEditing: boolean;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSelectChange: (name: string, value: string) => void;
}

export function ContactInformation({ formData, isEditing, onInputChange, onSelectChange }: ContactInformationProps) {
    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="email">Email</Label>
                    {isEditing ? (
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email || ''}
                            onChange={onInputChange}
                        />
                    ) : (
                        <p className="text-gray-700">{formData.email || '-'}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="maritalStatus">Marital Status</Label>
                    {isEditing ? (
                        <Select
                            value={formData.maritalStatus || ''}
                            onValueChange={(value) => onSelectChange('maritalStatus', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                {MARITAL_STATUS.map((status) => (
                                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <p className="text-gray-700">{formData.maritalStatus || '-'}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="address">Address</Label>
                    {isEditing ? (
                        <Input
                            id="address"
                            name="address"
                            value={formData.address || ''}
                            onChange={onInputChange}
                        />
                    ) : (
                        <p className="text-gray-700">{formData.address || '-'}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                    {isEditing ? (
                        <Input
                            id="emergencyContactName"
                            name="emergencyContactName"
                            value={formData.emergencyContactName || ''}
                            onChange={onInputChange}
                        />
                    ) : (
                        <p className="text-gray-700">{formData.emergencyContactName || '-'}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
                    {isEditing ? (
                        <Input
                            id="emergencyContactPhone"
                            name="emergencyContactPhone"
                            value={formData.emergencyContactPhone || ''}
                            onChange={onInputChange}
                            maxLength={10}
                        />
                    ) : (
                        <p className="text-gray-700">{formData.emergencyContactPhone || '-'}</p>
                    )}
                </div>
            </div>
        </div>
    );
} 