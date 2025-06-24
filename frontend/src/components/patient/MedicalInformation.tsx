import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BLOOD_GROUPS } from './constants';
import { PatientFormData } from './types';

interface MedicalInformationProps {
    formData: PatientFormData;
    isEditing: boolean;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSelectChange: (name: string, value: string) => void;
}

export function MedicalInformation({ formData, isEditing, onInputChange, onSelectChange }: MedicalInformationProps) {
    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Medical Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="bloodGroup">Blood Group</Label>
                    {isEditing ? (
                        <Select
                            value={formData.bloodGroup || ''}
                            onValueChange={(value) => onSelectChange('bloodGroup', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select blood group" />
                            </SelectTrigger>
                            <SelectContent>
                                {BLOOD_GROUPS.map((group) => (
                                    <SelectItem key={group.value} value={group.value}>{group.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <p className="text-gray-700">{formData.bloodGroup || '-'}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="allergy">Allergy</Label>
                    {isEditing ? (
                        <Input
                            id="allergy"
                            name="allergy"
                            value={formData.allergy || ''}
                            onChange={onInputChange}
                        />
                    ) : (
                        <p className="text-gray-700">{formData.allergy || '-'}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="preExistingCondition">Pre-existing Conditions</Label>
                    {isEditing ? (
                        <Input
                            id="preExistingCondition"
                            name="preExistingCondition"
                            value={formData.preExistingCondition || ''}
                            onChange={onInputChange}
                        />
                    ) : (
                        <p className="text-gray-700">{formData.preExistingCondition || '-'}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="chronicDisease">Chronic Diseases</Label>
                    {isEditing ? (
                        <Input
                            id="chronicDisease"
                            name="chronicDisease"
                            value={formData.chronicDisease || ''}
                            onChange={onInputChange}
                        />
                    ) : (
                        <p className="text-gray-700">{formData.chronicDisease || '-'}</p>
                    )}
                </div>
            </div>
        </div>
    );
} 