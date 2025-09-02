import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { REGISTRATION_MODES, REGISTRATION_SOURCES } from './constants';
import { PatientFormData } from './types';

interface BasicInformationProps {
    formData: PatientFormData;
    isEditing: boolean;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSelectChange: (name: string, value: string) => void;
}

export function BasicInformation({ formData, isEditing, onInputChange, onSelectChange }: BasicInformationProps) {
    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label>Patient ID</Label>
                    <p className="text-gray-700">{formData?.uhid}</p>
                </div>
                <div>
                    <Label htmlFor="name">Name</Label>
                    {isEditing ? (
                        <Input
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={onInputChange}
                            required
                        />
                    ) : (
                        <p className="text-gray-700">{formData.name}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="gender">Gender</Label>
                    {isEditing ? (
                        <Select
                            value={formData.gender}
                            onValueChange={(value) => onSelectChange('gender', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="MALE">Male</SelectItem>
                                <SelectItem value="FEMALE">Female</SelectItem>
                                <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    ) : (
                        <p className="text-gray-700">{formData.gender}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="phone">Phone</Label>
                    {isEditing ? (
                        <Input
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={onInputChange}
                            maxLength={10}
                            required
                        />
                    ) : (
                        <p className="text-gray-700">{formData.phone}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="dob">Date of Birth</Label>
                    {isEditing ? (
                        <Input
                            id="dob"
                            name="dob"
                            value={formData.dob}
                            onChange={onInputChange}
                            placeholder="dd/mm/yyyy"
                            required
                        />
                    ) : (
                        <p className="text-gray-700">{formData.dob}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="registrationMode">Registration Mode</Label>
                    {isEditing ? (
                        <Select
                            value={formData.registrationMode}
                            onValueChange={(value) => onSelectChange('registrationMode', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select mode" />
                            </SelectTrigger>
                            <SelectContent>
                                {REGISTRATION_MODES.map((mode) => (
                                    <SelectItem key={mode.value} value={mode.value}>{mode.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <p className="text-gray-700">{(formData.registrationMode).replace(/_/g, ' ')}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="registrationSource">Registration Source</Label>
                    {isEditing ? (
                        <Select
                            value={formData.registrationSource}
                            onValueChange={(value) => onSelectChange('registrationSource', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select source" />
                            </SelectTrigger>
                            <SelectContent>
                                {REGISTRATION_SOURCES.map((source) => (
                                    <SelectItem key={source.value} value={source.value}>{source.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <p className="text-gray-700">{(formData.registrationSource).replace(/_/g, ' ')}</p>
                    )}
                </div>
            </div>
        </div>
    );
} 