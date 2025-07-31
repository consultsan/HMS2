import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Search, FileText, Pill, Stethoscope, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

interface SelectedTemplateData {
  medicines: Medicine[];
  clinicalNotes: ClinicalNote[];
  labTests: LabTest[];
}

interface PrescriptionProps {
  onTemplateSelect?: (templateData: SelectedTemplateData) => void;
  selectedTemplateId?: string;
}

function Prescription({ onTemplateSelect, selectedTemplateId }: PrescriptionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showDetails, setShowDetails] = useState<string | null>(null);

  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ['clinical-templates'],
    queryFn: async () => {
      const response = await api.get('/api/doctor/get-prescription-templates');
      return response.data?.data || [];
    },
  });

  // Filter templates based on search query
  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    if (onTemplateSelect) {
      onTemplateSelect({
        medicines: template.medicines,
        clinicalNotes: template.clinicalNotes || [],
        labTests: template.labTests
      });
    }
  };

  const toggleDetails = (templateId: string) => {
    setShowDetails(showDetails === templateId ? null : templateId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading templates...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Clinical Templates</h1>
          <p className="text-gray-600 mt-1">Select a template to apply medicines, clinical notes, and lab tests</p>
        </div>
      </div>

      {/* Search Section */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search templates by name..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Selected Template Summary */}
      {selectedTemplate && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Check className="h-5 w-5" />
              Selected Template: {selectedTemplate.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-green-600" />
                <span>{selectedTemplate.medicines?.length || 0} Medicines</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-600" />
                <span>{selectedTemplate.clinicalNotes?.length || 0} Clinical Notes</span>
              </div>
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-purple-600" />
                <span>{selectedTemplate.labTests?.length || 0} Lab Tests</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No templates found</p>
            {searchQuery && (
              <p className="text-sm mt-2">Try adjusting your search terms</p>
            )}
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <Card
              key={template.id}
              className={`cursor-pointer transition-all hover:shadow-md ${selectedTemplateId === template.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}
            >
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="truncate">{template.name}</span>
                  {selectedTemplateId === template.id && (
                    <Check className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Summary Stats */}
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full flex items-center">
                      <Pill className="h-3 w-3 mr-1" />
                      {template.medicines?.length || 0} Medicines
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full flex items-center">
                      <FileText className="h-3 w-3 mr-1" />
                      {template.clinicalNotes?.length || 0} Notes
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full flex items-center">
                      <Stethoscope className="h-3 w-3 mr-1" />
                      {template.labTests?.length || 0} Tests
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleTemplateSelect(template)}
                      className="flex-1"
                    >
                      {selectedTemplateId === template.id ? 'Selected' : 'Use Template'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleDetails(template.id)}
                    >
                      {showDetails === template.id ? 'Hide' : 'Details'}
                    </Button>
                  </div>

                  {/* Template Details */}
                  {showDetails === template.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                      {/* Medicines */}
                      {template.medicines && template.medicines.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                            <Pill className="h-4 w-4 text-green-600" />
                            Medicines
                          </h4>
                          <div className="space-y-1">
                            {template.medicines.map((medicine, index) => (
                              <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                                <div className="font-medium">{medicine.name}</div>
                                <div className="text-gray-600">
                                  {medicine.frequency} • {medicine.duration}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Clinical Notes */}
                      {template.clinicalNotes && template.clinicalNotes.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                            <FileText className="h-4 w-4 text-amber-600" />
                            Clinical Notes
                          </h4>
                          <div className="space-y-1">
                            {template.clinicalNotes.map((note, index) => (
                              <div key={index} className="text-xs bg-amber-50 p-2 rounded">
                                <div className="font-medium">{note.note}</div>
                                {note.category && (
                                  <div className="text-amber-700 mt-1">
                                    Category: {note.category}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Lab Tests */}
                      {template.labTests && template.labTests.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                            <Stethoscope className="h-4 w-4 text-purple-600" />
                            Lab Tests
                          </h4>
                          <div className="space-y-1">
                            {template.labTests.map((test, index) => (
                              <div key={index} className="text-xs bg-purple-50 p-2 rounded">
                                <div className="font-medium">{test.name}</div>
                                <div className="text-purple-700">Code: {test.code}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

export default Prescription;