import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { LabTestSearch } from '@/components/LabTestSearch';
import { Search, Pill, FileText, Plus, X, Save, Stethoscope } from 'lucide-react';

interface Medicine {
    name: string;
    frequency: string;
    duration: string;
    notes?: string;
}

interface ClinicalNote {
    note: string;
}

interface Test {
    id: string;
    name: string;
    code?: string;
    instructions?: string;
    status?: boolean;
}

// Backend template interface
interface DiseaseTemplate {
    id: string;
    name: string;
    medicines: Medicine[];
    clinicalNotes: ClinicalNote[];
    labTests: Test[];
    doctorId: string;
    createdAt: string;
    updatedAt: string;
}

// Frontend template interface (with tests instead of labTests)
interface FrontendTemplate extends Omit<DiseaseTemplate, 'labTests'> {
    tests: Test[];
}

interface SelectedPrescription {
    medicines: Medicine[];
    clinicalNotes: ClinicalNote[];
    tests: Test[];
}

interface PrescriptionSectionProps {
    onPrescriptionChange: (data: {
        medicines: { name: string; frequency: string; duration: string }[];
        tests: { name: string; id: string }[];
        clinicalNotes: { note: string }[];
    }) => void;
}

const FREQUENCY_OPTIONS = ['Once a day', 'Twice a day', 'Thrice a day'] as const;

const PrescriptionSection: React.FC<PrescriptionSectionProps> = ({ onPrescriptionChange }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<FrontendTemplate | null>(null);
    const [selectedPrescription, setSelectedPrescription] = useState<SelectedPrescription>({
        medicines: [],
        clinicalNotes: [],
        tests: []
    });

    // State for editing template
    const [editingTemplate, setEditingTemplate] = useState<FrontendTemplate | null>(null);

    // New state for custom medicine input
    const [customMedicine, setCustomMedicine] = useState<Medicine>({
        name: '',
        frequency: 'Once a day',
        duration: ''
    });

    // New state for custom test input
    const [customTest, setCustomTest] = useState<Test>({
        name: '',
        id: '',
        instructions: ''
    });

    // New state for custom clinical note input
    const [customClinicalNote, setCustomClinicalNote] = useState<ClinicalNote>({
        note: ''
    });

    // Fetch templates from backend
    const { data: templates, isLoading } = useQuery<DiseaseTemplate[]>({
        queryKey: ['prescription-templates'],
        queryFn: async () => {
            const response = await api.get('/api/doctor/get-prescription-templates');
            return response.data?.data;
        }
    });

    // Filter templates based on search query - show all when empty
    const filteredTemplates = templates?.filter((template) => {
        if (!searchQuery.trim()) { return true; }
        return template.name.toLowerCase().includes(searchQuery.toLowerCase())
    }) || [];

    const isMedicineSelected = (medicine: Medicine) => {
        return selectedPrescription.medicines.some(
            m => m.name === medicine.name &&
                m.duration === medicine.duration &&
                m.frequency === medicine.frequency
        );
    };

    const isTestSelected = (test: Test) => {
        return selectedPrescription.tests.some(t => t.name === test.name);
    };

    const handleAddMedicine = (medicine: Medicine) => {
        if (isMedicineSelected(medicine)) {
            const updatedPrescription = {
                ...selectedPrescription,
                medicines: selectedPrescription.medicines.filter(
                    m => !(m.name === medicine.name &&
                        m.duration === medicine.duration &&
                        m.frequency === medicine.frequency)
                )
            };
            setSelectedPrescription(updatedPrescription);
            onPrescriptionChange({
                medicines: updatedPrescription.medicines.map(m => ({ name: m.name, frequency: m.frequency, duration: m.duration })),
                tests: updatedPrescription.tests.map(t => ({ name: t.name, id: t.id })),
                clinicalNotes: updatedPrescription.clinicalNotes.map(n => ({ note: n.note })),
            });
        } else {
            const updatedPrescription = {
                ...selectedPrescription,
                medicines: [...selectedPrescription.medicines, medicine]
            };
            setSelectedPrescription(updatedPrescription);
            onPrescriptionChange({
                medicines: updatedPrescription.medicines.map(m => ({ name: m.name, frequency: m.frequency, duration: m.duration })),
                tests: updatedPrescription.tests.map(t => ({ name: t.name, id: t.id, code: t.code, instructions: t.instructions, status: false })),
                clinicalNotes: updatedPrescription.clinicalNotes.map(n => ({ note: n.note })),
            });
        }
    };

    const handleAddTest = (test: Test) => {
        if (isTestSelected(test)) {
            const updatedPrescription = {
                ...selectedPrescription,
                tests: selectedPrescription.tests.filter(t => t.name !== test.name)
            };
            setSelectedPrescription(updatedPrescription);
            onPrescriptionChange({
                medicines: updatedPrescription.medicines.map(m => ({ name: m.name, frequency: m.frequency, duration: m.duration })),
                tests: updatedPrescription.tests.map(t => ({ name: t.name, id: t.id })),
                clinicalNotes: updatedPrescription.clinicalNotes.map(n => ({ note: n.note })),
            });
        } else {
            const updatedPrescription = {
                ...selectedPrescription,
                tests: [...selectedPrescription.tests, test]
            };
            setSelectedPrescription(updatedPrescription);
            onPrescriptionChange({
                medicines: updatedPrescription.medicines.map(m => ({ name: m.name, frequency: m.frequency, duration: m.duration })),
                tests: updatedPrescription.tests.map(t => ({ name: t.name, id: t.id })),
                clinicalNotes: updatedPrescription.clinicalNotes.map(n => ({ note: n.note })),
            });
        }
    };

    const handleRemoveMedicine = (index: number) => {
        const updatedPrescription = {
            ...selectedPrescription,
            medicines: selectedPrescription.medicines.filter((_, i) => i !== index)
        };
        setSelectedPrescription(updatedPrescription);
        onPrescriptionChange({
            medicines: updatedPrescription.medicines.map(m => ({ name: m.name, frequency: m.frequency, duration: m.duration })),
            tests: updatedPrescription.tests.map(t => ({ name: t.name, id: t.id })),
            clinicalNotes: updatedPrescription.clinicalNotes.map(n => ({ note: n.note })),
        });
    };

    const handleRemoveTest = (index: number) => {
        const updatedPrescription = {
            ...selectedPrescription,
            tests: selectedPrescription.tests.filter((_, i) => i !== index)
        };
        setSelectedPrescription(updatedPrescription);
        onPrescriptionChange({
            medicines: updatedPrescription.medicines.map(m => ({ name: m.name, frequency: m.frequency, duration: m.duration })),
            tests: updatedPrescription.tests.map(t => ({ name: t.name, id: t.id })),
            clinicalNotes: updatedPrescription.clinicalNotes.map(n => ({ note: n.note })),
        });
    };

    const handleRemoveClinicalNote = (index: number) => {
        const updatedPrescription = {
            ...selectedPrescription,
            clinicalNotes: selectedPrescription.clinicalNotes.filter((_, i) => i !== index)
        };
        setSelectedPrescription(updatedPrescription);
        onPrescriptionChange({
            medicines: updatedPrescription.medicines.map(m => ({ name: m.name, frequency: m.frequency, duration: m.duration })),
            tests: updatedPrescription.tests.map(t => ({ name: t.name, id: t.id })),
            clinicalNotes: updatedPrescription.clinicalNotes.map(n => ({ note: n.note })),
        });
    };

    const handleSelectDisease = (template: DiseaseTemplate) => {
        // Convert backend template to frontend template
        const frontendTemplate: FrontendTemplate = {
            ...template,
            tests: template.labTests
        };
        setSelectedTemplate(frontendTemplate);
        setEditingTemplate(frontendTemplate); // Initialize editing template

        // Don't auto-select items - user must click "+" for each item they want
        setSearchQuery('');
        setShowDropdown(false);
    };

    const handleEditMedicine = (index: number, field: keyof Medicine, value: string) => {
        if (!editingTemplate) return;

        const updatedMedicines = [...editingTemplate.medicines];
        updatedMedicines[index] = {
            ...updatedMedicines[index],
            [field]: value
        };

        setEditingTemplate({
            ...editingTemplate,
            medicines: updatedMedicines
        });
    };

    const handleEditTest = (index: number, field: keyof Test, value: string) => {
        if (!editingTemplate) return;

        const updatedTests = [...editingTemplate.tests];
        updatedTests[index] = {
            ...updatedTests[index],
            [field]: value
        };

        setEditingTemplate({
            ...editingTemplate,
            tests: updatedTests
        });
    };

    const handleSaveTemplate = () => {
        if (!editingTemplate) return;
        setSelectedTemplate(editingTemplate);
    };

    // Handler for custom medicine submission
    const handleCustomMedicineSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (customMedicine.name && customMedicine.duration && customMedicine.frequency) {
            const updatedPrescription = {
                ...selectedPrescription,
                medicines: [...selectedPrescription.medicines, customMedicine]
            };
            setSelectedPrescription(updatedPrescription);
            onPrescriptionChange({
                medicines: updatedPrescription.medicines.map(m => ({ name: m.name, frequency: m.frequency, duration: m.duration })),
                tests: updatedPrescription.tests.map(t => ({ name: t.name, id: t.id })),
                clinicalNotes: updatedPrescription.clinicalNotes.map(n => ({ note: n.note })),
            });
            setCustomMedicine({
                name: '',
                frequency: 'Once a day',
                duration: ''
            });
        }
    };

    // Handler for custom test submission
    const handleCustomTestSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (customTest.name) {
            const updatedPrescription = {
                ...selectedPrescription,
                tests: [...selectedPrescription.tests, customTest]
            };
            setSelectedPrescription(updatedPrescription);
            onPrescriptionChange({
                medicines: updatedPrescription.medicines.map(m => ({ name: m.name, frequency: m.frequency, duration: m.duration })),
                tests: updatedPrescription.tests.map(t => ({ name: t.name, id: t.id })),
                clinicalNotes: updatedPrescription.clinicalNotes.map(n => ({ note: n.note })),
            });
            setCustomTest({
                name: '',
                id: '',
                instructions: ''
            });
        }
    };

    // Handler for custom clinical note submission
    const handleCustomClinicalNoteSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (customClinicalNote.note) {
            const updatedPrescription = {
                ...selectedPrescription,
                clinicalNotes: [...selectedPrescription.clinicalNotes, customClinicalNote]
            };
            setSelectedPrescription(updatedPrescription);
            onPrescriptionChange({
                medicines: updatedPrescription.medicines.map(m => ({ name: m.name, frequency: m.frequency, duration: m.duration })),
                tests: updatedPrescription.tests.map(t => ({ name: t.name, id: t.id })),
                clinicalNotes: updatedPrescription.clinicalNotes.map(n => ({ note: n.note })),
            });
            setCustomClinicalNote({
                note: ''
            });
        }
    };

    // New function to handle test selection - just populate the form, don't add directly
    const handleTestSelection = (test: Test) => {
        setCustomTest({
            name: test.name,
            id: test.id,
            instructions: ''
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                <span className="ml-3 text-gray-600">Loading prescription templates...</span>
            </div>
        );
    }

    return (
        <div className="flex gap-4 h-screen">
            {/* Left Side - Search and Templates */}
            <div className="flex-1 w-3/5 overflow-y-auto pr-2">
                {/* Header Section */}
                <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
                    <div className="flex items-center space-x-2 mb-3">
                        <Pill className="h-5 w-5 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-800">Prescription & Lab Tests</h2>
                    </div>

                    {/* Enhanced Search Section */}
                    <div className="relative">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search disease templates..."
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 text-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => setShowDropdown(true)}
                                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                            />
                        </div>

                        {/* Enhanced Search Results Dropdown */}
                        {showDropdown && filteredTemplates.length > 0 && (
                            <div className="absolute w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-20 max-h-60 overflow-y-auto">
                                <div className="p-2 bg-gray-50 border-b border-gray-200">
                                    <span className="text-xs text-gray-600 font-medium">
                                        {filteredTemplates.length} templates available
                                    </span>
                                </div>
                                {filteredTemplates.map(template => (
                                    <div
                                        key={template.id}
                                        className="p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleSelectDisease(template);
                                        }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-800">{template.name}</span>
                                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                                                <span>{template.medicines.length}m</span>
                                                <span>•</span>
                                                <span>{template.labTests.length}t</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Selected Disease Template Section */}
                {selectedTemplate && editingTemplate && (
                    <div className="bg-white border border-gray-200 rounded-lg mb-4">
                        <div className="p-4 border-b border-gray-200">
                            <div className="flex justify-between items-center">
                                <h3 className="text-base font-medium text-gray-800">{selectedTemplate.name}</h3>
                                <button
                                    onClick={handleSaveTemplate}
                                    className="px-3 py-1 bg-gray-800 text-white rounded text-sm hover:bg-gray-700"
                                >
                                    Save
                                </button>
                            </div>
                        </div>

                        <div className="p-4 space-y-6">
                            {/* Medicines Section */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-3">Medicines</h4>

                                {editingTemplate.medicines.map((medicine, index) => (
                                    <div key={index} className="grid grid-cols-12 gap-2 mb-2 p-2 bg-gray-50 rounded">
                                        <input
                                            type="text"
                                            className="col-span-5 p-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                                            value={medicine.name}
                                            onChange={(e) => handleEditMedicine(index, 'name', e.target.value)}
                                        />
                                        <input
                                            type="text"
                                            className="col-span-2 p-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                                            value={medicine.duration}
                                            onChange={(e) => handleEditMedicine(index, 'duration', e.target.value)}
                                        />
                                        <select
                                            className="col-span-3 p-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                                            value={medicine.frequency}
                                            onChange={(e) => handleEditMedicine(index, 'frequency', e.target.value)}
                                        >
                                            {FREQUENCY_OPTIONS.map((option) => (
                                                <option key={option} value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="col-span-2 flex justify-center">
                                            <button
                                                onClick={() => handleAddMedicine(medicine)}
                                                className={`px-2 py-1 rounded text-xs ${isMedicineSelected(medicine)
                                                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {isMedicineSelected(medicine) ? '−' : '+'}
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {/* Custom Medicine Form */}
                                <div className="mt-3 p-3 bg-gray-50 rounded border">
                                    <div className="text-xs text-gray-600 mb-2">Add Custom Medicine</div>
                                    <form onSubmit={handleCustomMedicineSubmit} className="grid grid-cols-12 gap-2">
                                        <input
                                            type="text"
                                            placeholder="Medicine name"
                                            className="col-span-5 p-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                                            value={customMedicine.name}
                                            onChange={(e) => setCustomMedicine(prev => ({ ...prev, name: e.target.value }))}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Duration"
                                            className="col-span-2 p-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                                            value={customMedicine.duration}
                                            onChange={(e) => setCustomMedicine(prev => ({ ...prev, duration: e.target.value }))}
                                        />
                                        <select
                                            value={customMedicine.frequency}
                                            onChange={(e) => setCustomMedicine(prev => ({ ...prev, frequency: e.target.value }))}
                                            className="col-span-3 p-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                                        >
                                            {FREQUENCY_OPTIONS.map((option) => (
                                                <option key={option} value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            type="submit"
                                            className="col-span-2 px-2 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-600"
                                        >
                                            Add
                                        </button>
                                    </form>
                                </div>
                            </div>

                            {/* Tests Section */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-3">Lab Tests</h4>

                                {editingTemplate.tests.map((test, index) => (
                                    <div key={index} className="grid grid-cols-12 gap-2 mb-2 p-2 bg-gray-50 rounded">
                                        <input
                                            type="text"
                                            className="col-span-6 p-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                                            value={test.name}
                                            onChange={(e) => handleEditTest(index, 'name', e.target.value)}
                                        />
                                        <input
                                            type="text"
                                            className="col-span-4 p-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                                            value={test.instructions || ''}
                                            placeholder="Instructions"
                                            onChange={(e) => handleEditTest(index, 'instructions', e.target.value)}
                                        />
                                        <div className="col-span-2 flex justify-center">
                                            <button
                                                onClick={() => handleAddTest(test)}
                                                className={`px-2 py-1 rounded text-xs ${isTestSelected(test)
                                                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {isTestSelected(test) ? '−' : '+'}
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {/* Custom Test Form */}
                                <div className="mt-3 p-3 bg-gray-50 rounded border">
                                    <div className="text-xs text-gray-600 mb-2">Add Custom Lab Test</div>
                                    {customTest.name ? (
                                        <form onSubmit={handleCustomTestSubmit} className="flex gap-2">
                                            <div className="flex-1 flex items-center p-1 bg-white border border-gray-300 rounded text-sm">
                                                <span className="flex-1 text-gray-800">{customTest.name}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setCustomTest({ name: '', id: '', instructions: '' })}
                                                    className="p-1 text-gray-400 hover:text-red-500"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                            <button
                                                type="submit"
                                                className="px-3 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-600"
                                            >
                                                Add
                                            </button>
                                        </form>
                                    ) : (
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <LabTestSearch
                                                    onTestSelect={handleTestSelection}
                                                    placeholder="Search lab test..."
                                                    className="w-full"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Clinical Notes Section */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-3">Clinical Notes</h4>

                                {editingTemplate.clinicalNotes?.map((note, index) => (
                                    <div key={index} className="grid grid-cols-12 gap-2 mb-2 p-2 bg-gray-50 rounded">
                                        <div className="col-span-10 p-1 border border-gray-300 rounded text-sm bg-white">
                                            {note.note}
                                        </div>
                                        <div className="col-span-2 flex justify-center">
                                            <button
                                                onClick={() => {
                                                    const isSelected = selectedPrescription.clinicalNotes.some(n => n.note === note.note);
                                                    if (isSelected) {
                                                        const updatedPrescription = {
                                                            ...selectedPrescription,
                                                            clinicalNotes: selectedPrescription.clinicalNotes.filter(n => n.note !== note.note)
                                                        };
                                                        setSelectedPrescription(updatedPrescription);
                                                        onPrescriptionChange({
                                                            medicines: updatedPrescription.medicines.map(m => ({ name: m.name, frequency: m.frequency, duration: m.duration })),
                                                            tests: updatedPrescription.tests.map(t => ({ name: t.name, id: t.id })),
                                                            clinicalNotes: updatedPrescription.clinicalNotes.map(n => ({ note: n.note })),
                                                        });
                                                    } else {
                                                        const updatedPrescription = {
                                                            ...selectedPrescription,
                                                            clinicalNotes: [...selectedPrescription.clinicalNotes, { note: note.note }]
                                                        };
                                                        setSelectedPrescription(updatedPrescription);
                                                        onPrescriptionChange({
                                                            medicines: updatedPrescription.medicines.map(m => ({ name: m.name, frequency: m.frequency, duration: m.duration })),
                                                            tests: updatedPrescription.tests.map(t => ({ name: t.name, id: t.id })),
                                                            clinicalNotes: updatedPrescription.clinicalNotes.map(n => ({ note: n.note })),
                                                        });
                                                    }
                                                }}
                                                className={`px-2 py-1 rounded text-xs ${selectedPrescription.clinicalNotes.some(n => n.note === note.note)
                                                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {selectedPrescription.clinicalNotes.some(n => n.note === note.note) ? '−' : '+'}
                                            </button>
                                        </div>
                                    </div>
                                )) || <div className="text-gray-500 text-sm">No clinical notes in this template</div>}

                                {/* Custom Clinical Note Form */}
                                <div className="mt-3 p-3 bg-gray-50 rounded border">
                                    <div className="text-xs text-gray-600 mb-2">Add Custom Clinical Note</div>
                                    <form onSubmit={handleCustomClinicalNoteSubmit} className="grid grid-cols-12 gap-2">
                                        <textarea
                                            placeholder="Enter clinical note..."
                                            className="col-span-12 p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none h-20"
                                            value={customClinicalNote.note}
                                            onChange={(e) => setCustomClinicalNote(prev => ({ ...prev, note: e.target.value }))}
                                        />

                                        <button
                                            type="submit"
                                            className="col-span-2 px-2 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-600 h-fit"
                                        >
                                            Add Note
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Side - Fixed Prescription Summary */}
            <div className="w-2/5 h-full">
                <div className="bg-white border border-gray-200 rounded-lg h-full flex flex-col">
                    <div className="p-4 border-b border-gray-200">
                        <h2 className="text-base font-medium text-gray-800">Final Prescription</h2>
                    </div>

                    <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                        {/* Selected Medicines */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-medium text-gray-700">Medicines</h3>
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                    {selectedPrescription.medicines.length}
                                </span>
                            </div>

                            {selectedPrescription.medicines.length === 0 ? (
                                <div className="text-center py-6 text-gray-400">
                                    <Pill className="h-8 w-8 mx-auto mb-2" />
                                    <p className="text-xs">No medicines selected</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {selectedPrescription.medicines.map((medicine, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-gray-800 truncate">{medicine.name}</div>
                                                <div className="text-xs text-gray-600">{medicine.duration} • {medicine.frequency}</div>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveMedicine(index)}
                                                className="p-1 text-gray-400 hover:text-red-500 ml-2"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Selected Tests */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-medium text-gray-700">Lab Tests</h3>
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                    {selectedPrescription.tests.length}
                                </span>
                            </div>

                            {selectedPrescription.tests.length === 0 ? (
                                <div className="text-center py-6 text-gray-400">
                                    <FileText className="h-8 w-8 mx-auto mb-2" />
                                    <p className="text-xs">No lab tests selected</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {selectedPrescription.tests.map((test, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-gray-800 truncate">{test.name}</div>
                                                {test.instructions && (
                                                    <div className="text-xs text-gray-600 truncate">{test.instructions}</div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleRemoveTest(index)}
                                                className="p-1 text-gray-400 hover:text-red-500 ml-2"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Selected Clinical Notes */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-medium text-gray-700">Clinical Notes</h3>
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                        {selectedPrescription.clinicalNotes.length}
                                    </span>
                                </div>

                                {selectedPrescription.clinicalNotes.length === 0 ? (
                                    <div className="text-center py-6 text-gray-400">
                                        <FileText className="h-8 w-8 mx-auto mb-2" />
                                        <p className="text-xs">No clinical notes selected</p>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {selectedPrescription.clinicalNotes.map((note, index) => (
                                            <div key={index} className="flex items-center justify-between p-2 bg-amber-50 rounded text-sm border border-amber-200">
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-gray-800 text-xs">{note.note}</div>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveClinicalNote(index)}
                                                    className="p-1 text-gray-400 hover:text-red-500 ml-2"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrescriptionSection;
