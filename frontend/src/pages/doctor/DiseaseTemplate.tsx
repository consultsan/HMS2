import { useState, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/contexts/AuthContext';
import { useSearch } from '@/contexts/SearchContext';
import { labApi } from '@/api/lab';

const FREQUENCY_OPTIONS = [
    'Once a day ',
    'Twice a day ',
    'Three times a day ',
    'Four times a day ',
    'Every 4 hours ',
    'Every 6 hours ',
    'Every 8 hours ',
    'Every 12 hours ',
    'After meals ',
    'Before meals ',
    'With meals',
    'At bedtime ',
    'As needed ',
    'Twice a week',
    'Three times a week',
    'Once weekly',
    'Twice weekly'
] as const;

interface Medicine {
    name: string;
    frequency: string;
    duration: string;
    notes?: string;
}

interface ClinicalNote {
    note: string;
    category?: string;
}

interface LabTest {
    id: string;
    name: string;
    code: string;
}

interface Template {
    id: string;
    name: string;
    medicines: Medicine[];
    clinicalNotes: ClinicalNote[];
    labTests: LabTest[];
    doctorId: string;
    createdAt: string;
    updatedAt: string;
}

interface TemplateFormProps {
    mode: 'create' | 'edit';
    initialData?: {
        name: string;
        medicines: Medicine[];
        clinicalNotes: ClinicalNote[];
        labTests: LabTest[];
    };
    onSubmit: (data: { name: string; medicines: Medicine[]; clinicalNotes: ClinicalNote[]; labTests: LabTest[] }) => void;
    onCancel: () => void;
    isSubmitting?: boolean;
}

const TemplateForm = ({ mode, initialData, onSubmit, onCancel, isSubmitting }: TemplateFormProps) => {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        medicines: initialData?.medicines || [],
        clinicalNotes: initialData?.clinicalNotes || [],
        labTests: initialData?.labTests || [],
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [showTestDropdown, setShowTestDropdown] = useState(false);

    const { data: allTests = [], isLoading: isTestsLoading } = useQuery<LabTest[]>({
        queryKey: ['lab-tests'],
        queryFn: async () => {
            const response = await labApi.getLabTests();
            return response.data?.data || [];
        }
    });

    const filteredTests = useMemo(() => {
        return allTests.filter(test =>
            test.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            test.code.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [allTests, searchQuery]);

    const addMedicine = () => {
        setFormData(prev => ({
            ...prev,
            medicines: [...prev.medicines, { name: '', frequency: 'Once a day', duration: '' }]
        }));
    };

    const removeMedicine = (index: number) => {
        setFormData(prev => ({
            ...prev,
            medicines: prev.medicines.filter((_, i) => i !== index)
        }));
    };

    const updateMedicine = (index: number, field: keyof Medicine, value: string) => {
        setFormData(prev => ({
            ...prev,
            medicines: prev.medicines.map((m, i) =>
                i === index ? { ...m, [field]: value } : m
            )
        }));
    };

    const addClinicalNote = () => {
        setFormData(prev => ({
            ...prev,
            clinicalNotes: [...prev.clinicalNotes, { note: '', category: '' }]
        }));
    };

    const removeClinicalNote = (index: number) => {
        setFormData(prev => ({
            ...prev,
            clinicalNotes: prev.clinicalNotes.filter((_, i) => i !== index)
        }));
    };

    const updateClinicalNote = (index: number, field: keyof ClinicalNote, value: string) => {
        setFormData(prev => ({
            ...prev,
            clinicalNotes: prev.clinicalNotes.map((note, i) =>
                i === index ? { ...note, [field]: value } : note
            )
        }));
    };

    const addLabTest = (test: LabTest) => {
        if (!formData.labTests.some(t => t.id === test.id)) {
            setFormData(prev => ({
                ...prev,
                labTests: [...prev.labTests, test]
            }));
        }
        setShowTestDropdown(false);
        setSearchQuery('');
    };

    const removeLabTest = (index: number) => {
        setFormData(prev => ({
            ...prev,
            labTests: prev.labTests.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = () => {
        if (!formData.name || (formData.medicines.length === 0 && formData.labTests.length === 0)) {
            toast.error('Please fill in at least one required fields (name, medicines, and lab tests)');
            return;
        }
        onSubmit(formData);
    };

    return (
        <div className="grid gap-4 py-4">
            <div>
                <label className="block text-sm font-medium mb-1">Template Name</label>
                <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Hypertension Protocol"
                />
            </div>

            {/* Medicines Section */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium">Medicines</label>
                    <Button type="button" variant="outline" size="sm" onClick={addMedicine}>
                        Add Medicine
                    </Button>
                </div>
                <div className="space-y-2">
                    {formData.medicines.map((medicine, index) => (
                        <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 bg-gray-50 p-4 rounded-lg items-center">
                            <Input
                                placeholder="Medicine name"
                                value={medicine.name}
                                onChange={(e) => updateMedicine(index, 'name', e.target.value)}
                            />
                            <Select
                                value={medicine.frequency}
                                onValueChange={(value) => updateMedicine(index, 'frequency', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select frequency" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px] overflow-y-auto">
                                    {FREQUENCY_OPTIONS.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Input
                                placeholder="Duration in days"
                                value={medicine.duration}
                                type="number"
                                onChange={(e) => updateMedicine(index, 'duration', e.target.value)}
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-gray-500 hover:text-red-500"
                                onClick={() => removeMedicine(index)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Clinical Notes Section */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium">Clinical Notes</label>
                    <Button type="button" variant="outline" size="sm" onClick={addClinicalNote}>
                        Add Clinical Note
                    </Button>
                </div>
                <div className="space-y-2">
                    {formData.clinicalNotes.map((clinicalNote, index) => (
                        <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 bg-gray-50 p-4 rounded-lg items-start">
                            <Input
                                placeholder="Clinical note"
                                value={clinicalNote.note}
                                onChange={(e) => updateClinicalNote(index, 'note', e.target.value)}
                            />
                            <Input
                                placeholder="Category (e.g., Observation, Plan)"
                                value={clinicalNote.category || ''}
                                onChange={(e) => updateClinicalNote(index, 'category', e.target.value)}
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-gray-500 hover:text-red-500"
                                onClick={() => removeClinicalNote(index)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Lab Tests Section */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium">Lab Tests</label>
                    <div className="relative">
                        <div className="flex items-center gap-2">
                            <Input
                                placeholder="Search tests..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setShowTestDropdown(true);
                                }}
                                onFocus={() => setShowTestDropdown(true)}
                                className="w-64"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowTestDropdown(!showTestDropdown)}
                            >
                                <Search className="h-4 w-4" />
                            </Button>
                        </div>

                        {showTestDropdown && (
                            <div className="absolute z-10 mt-1 w-64 bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
                                {filteredTests?.length === 0 ? (
                                    <div className="p-2 text-sm text-gray-500">No tests found</div>
                                ) : (
                                    filteredTests?.map((test) => (
                                        <div
                                            key={test.id}
                                            className="p-2 hover:bg-gray-100 cursor-pointer"
                                            onClick={() => addLabTest(test)}
                                        >
                                            <div className="font-medium">{test.name}</div>
                                            <div className="text-sm text-gray-500">{test.code}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                    </div>
                </div>
                <div className="space-y-2">
                    {formData.labTests?.map((test, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                            <div>
                                <p className="font-medium">{test.name}</p>
                                <p className="text-sm text-gray-500">{test.code}</p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-gray-500 hover:text-red-500"
                                onClick={() => removeLabTest(index)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t mt-4 space-x-2">
                <Button variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {mode === 'create' ? 'Save Template' : 'Update Template'}
                </Button>
            </div>
        </div>
    );
};

export default function DiseaseTemplate() {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [viewingTemplate, setViewingTemplate] = useState<Template | null>(null);
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const doctorId = user?.id;
    const { searchQuery } = useSearch();

    const createMutation = useMutation({
        mutationFn: (data: { name: string; medicines: Medicine[]; clinicalNotes: ClinicalNote[]; labTests: LabTest[] }) =>
            api.post('/api/doctor/add-prescription-template', {
                name: data.name,
                medicines: data.medicines.map(med => ({
                    name: med.name,
                    frequency: med.frequency,
                    duration: med.duration
                })),
                clinicalNotes: data.clinicalNotes.map(note => ({
                    note: note.note,
                    category: note.category
                })),
                labTests: data.labTests.map(test => ({
                    id: test.id
                })),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clinical-templates'] });
            setIsAddDialogOpen(false);
            toast.success('Template created successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to create template');
        }
    }); 

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: { name: string; medicines: Medicine[]; clinicalNotes: ClinicalNote[]; labTests: LabTest[] } }) =>
            api.patch(`/api/doctor/update-prescription-template/${id}`, {
                name: data.name,
                medicines: data.medicines.map(med => ({
                    name: med.name,
                    frequency: med.frequency,
                    duration: med.duration
                })),
                clinicalNotes: data.clinicalNotes.map(note => ({
                    note: note.note,
                    category: note.category
                })),
                labTests: data.labTests.map(test => ({
                    id: test.id
                }))
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clinical-templates'] });
            setIsEditDialogOpen(false);
            setEditingTemplate(null);
            toast.success('Template updated successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update template');
        }
    });

    const { data: templates = [], isLoading } = useQuery<Template[]>({
        queryKey: ['clinical-templates'],
        queryFn: async () => {
            const response = await api.get('/api/doctor/get-prescription-templates');
            return response.data?.data || [];
        },
    });

    // Filter templates with null checks
    const yourTemplates = useMemo(() => {
        return templates.filter(template => template.doctorId === doctorId) || [];
    }, [templates, doctorId]);

    const allTemplates = templates || [];
    const filteredAllTemplates = allTemplates.filter(template => {
        if (searchQuery == '') { return true; }
        return template.name.toLowerCase().includes(searchQuery.toLowerCase());

    });
    const filteredYourTemplates = yourTemplates.filter(template => {
        if (searchQuery == '') { return true; }
        return template.name.toLowerCase().includes(searchQuery.toLowerCase());

    });
    const handleCreate = async (data: { name: string; medicines: Medicine[]; clinicalNotes: ClinicalNote[]; labTests: LabTest[] }) => {
        createMutation.mutate(data);
    };

    const handleUpdate = async (data: { name: string; medicines: Medicine[]; clinicalNotes: ClinicalNote[]; labTests: LabTest[] }) => {
        if (!editingTemplate?.id) {
            toast.error('Template ID is missing');
            return;
        }
        updateMutation.mutate({ id: editingTemplate.id, data });
    };

    const handleEdit = (template: Template) => {
        setEditingTemplate(template);
        setIsEditDialogOpen(true);
    };

    const handleView = (template: Template) => {
        setViewingTemplate(template);
        setIsViewDialogOpen(true);
    };

    const TemplateDetails = ({ template }: { template: Template }) => (
        <div className="grid gap-4">
            <div>
                <h3 className="text-sm font-medium text-gray-500">Template Name</h3>
                <p className="mt-1 text-base font-medium">{template.name}</p>
            </div>

            <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Medicines</h3>
                <div className="space-y-2">
                    {template.medicines && template.medicines.length > 0 ? (
                        template.medicines.map((medicine, index) => (
                            <div key={index} className="bg-gray-50 p-3 rounded-lg">
                                <p className="font-medium">{medicine.name}</p>
                                <div className="text-sm text-gray-500 mt-1">
                                    <p>Frequency: {medicine.frequency}</p>
                                    <p>Duration: {medicine.duration}</p>
                                    {medicine.notes && <p>Notes: {medicine.notes}</p>}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-gray-500">No medicines added</div>
                    )}
                </div>
            </div>

            <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Clinical Notes</h3>
                <div className="space-y-2">
                    {template.clinicalNotes && template.clinicalNotes.length > 0 ? (
                        template.clinicalNotes.map((note, index) => (
                            <div key={index} className="bg-gray-50 p-3 rounded-lg">
                                <p className="font-medium">{note.note}</p>
                                {note.category && (
                                    <p className="text-sm text-gray-500 mt-1">Category: {note.category}</p>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-gray-500">No clinical notes added</div>
                    )}
                </div>
            </div>

            <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Lab Tests</h3>
                <div className="space-y-2">
                    {template.labTests && template.labTests.length > 0 ? (
                        template.labTests.map((test, index) => (
                            <div key={index} className="bg-gray-50 p-3 rounded-lg">
                                <p className="font-medium">{test.name}</p>
                                <p className="text-sm text-gray-500 mt-1">Code: {test.code}</p>
                            </div>
                        ))
                    ) : (
                        <div className="text-gray-500">No lab tests added</div>
                    )}
                </div>
            </div>
        </div>
    );

    const TemplatesTable = ({ data, showEditButton = false }: { data: Template[]; showEditButton?: boolean }) => {
        console.log(data);
        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Template Name</TableHead>
                        <TableHead>Medicines</TableHead>
                        <TableHead>Clinical Notes</TableHead>
                        <TableHead>Lab Tests</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {!data || data.length === 0 ? (

                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                No templates found
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((template) => (

                            <TableRow key={template.id}>
                                <TableCell className="font-medium">{template.name}</TableCell>
                                <TableCell>{template.medicines?.length || 0} medicines</TableCell>
                                <TableCell>{template.clinicalNotes?.length || 0} notes</TableCell>
                                <TableCell>{template.labTests?.length || 0} tests</TableCell>
                                <TableCell className="space-x-2">
                                    <Button variant="ghost" size="sm" onClick={() => handleView(template)}>
                                        View
                                    </Button>
                                    {showEditButton && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEdit(template)}
                                            disabled={updateMutation.isPending}
                                        >
                                            {updateMutation.isPending && editingTemplate?.id === template.id ? 'Updating...' : 'Edit'}
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        )
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-gray-900">Clinical Templates</h1>
                <Button
                    className="flex items-center gap-2"
                    onClick={() => setIsAddDialogOpen(true)}
                    disabled={createMutation.isPending}
                >
                    <Plus className="h-4 w-4" />
                    {createMutation.isPending ? 'Creating...' : 'Create Template'}
                </Button>
            </div>

            {/* Templates List with Tabs */}
            <Tabs defaultValue="your-templates" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="your-templates">Your Templates</TabsTrigger>
                    <TabsTrigger value="all-templates">All Templates</TabsTrigger>
                </TabsList>

                <TabsContent value="your-templates" className="bg-white rounded-lg shadow">
                    <TemplatesTable data={filteredYourTemplates} showEditButton={true} />
                </TabsContent>

                <TabsContent value="all-templates" className="bg-white rounded-lg shadow">
                    <TemplatesTable data={filteredAllTemplates} />
                </TabsContent>
            </Tabs>

            {/* Create Template Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Create New Clinical Template</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto pr-4 -mr-4">
                        <TemplateForm
                            mode="create"
                            onSubmit={handleCreate}
                            onCancel={() => setIsAddDialogOpen(false)}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Template Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
                setIsEditDialogOpen(open);
                if (!open) setEditingTemplate(null);
            }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Edit Clinical Template</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto pr-4 -mr-4">
                        {editingTemplate && (
                            <TemplateForm
                                mode="edit"
                                initialData={{
                                    name: editingTemplate.name,
                                    medicines: editingTemplate.medicines,
                                    clinicalNotes: editingTemplate.clinicalNotes || [],
                                    labTests: editingTemplate.labTests
                                }}
                                onSubmit={handleUpdate}
                                onCancel={() => {
                                    setIsEditDialogOpen(false);
                                    setEditingTemplate(null);
                                }}
                                isSubmitting={updateMutation.isPending}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* View Template Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={(open) => {
                setIsViewDialogOpen(open);
                if (!open) setViewingTemplate(null);
            }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>View Template Details</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto pr-4 -mr-4">
                        {viewingTemplate && <TemplateDetails template={viewingTemplate} />}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
} 