import React from 'react';
import { FileText, Zap } from 'lucide-react';

interface NotesProps {
    value: string;
    onChange: (value: string) => void;
}

interface Note {
    id: number;
    content: string;
    timestamp: Date;
}

// Common note templates that doctors frequently use
const noteTemplates = [
    {
        id: 1,
        title: "General Examination",
        template: "Patient is alert and oriented. Vital signs stable. No acute distress observed."
    },
    {
        id: 2,
        title: "Normal Checkup",
        template: "General condition satisfactory. Vitals within normal limits. No specific complaints."
    },
    {
        id: 3,
        title: "Follow-up Visit",
        template: "Patient showing improvement. Current treatment plan to be continued. No adverse effects reported."
    },
    {
        id: 4,
        title: "Diet Advice",
        template: "Advised to maintain balanced diet. Increase fluid intake. Avoid excessive salt and sugar."
    },
    {
        id: 5,
        title: "Exercise Recommendation",
        template: "Recommended moderate physical activity. 30 minutes walking daily. Avoid strenuous exercises."
    }
];

const Notes: React.FC<NotesProps> = ({ value, onChange }) => {
    const handleTemplateClick = (template: string) => {
        onChange(template);
    };

    const handleSaveNote = () => {
        if (value.trim()) {
            const newNote: Note = {
                id: Date.now(),
                content: value,
                timestamp: new Date()
            };
            // Logic to save the note
            onChange('');
        }
    };

    const handleDeleteNote = (noteId: number) => {
        // Logic to delete the note
    };

    const formatDate = (date: Date) => {
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            {/* Note Input Section */}
            <div className="space-y-4">
                <div className="relative">
                    <textarea
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="Enter additional clinical observations, patient response, side effects, or any other relevant notes..."
                        className="w-full h-24 p-3 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors text-sm resize-none"
                    />
                    <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                        {value.length} characters
                    </div>
                </div>
            </div>

            {/* Templates Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-600" />
                    <h4 className="text-sm font-medium text-gray-700">Quick Templates</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {noteTemplates.map(template => (
                        <button
                            key={template.id}
                            onClick={() => handleTemplateClick(template.template)}
                            className="group p-3 text-left border border-gray-200 rounded-md hover:border-blue-300 hover:bg-blue-50 transition-colors"
                        >
                            <div className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 group-hover:bg-blue-600"></div>
                                <div className="flex-1">
                                    <span className="font-medium block mb-1 text-gray-800 group-hover:text-blue-800 text-sm">
                                        {template.title}
                                    </span>
                                    <span className="text-xs text-gray-600 group-hover:text-blue-600 line-clamp-2">
                                        {template.template}
                                    </span>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                <div className="text-center">
                    <p className="text-xs text-gray-500">
                        Click any template to add it to your notes
                    </p>
                </div>
            </div>

            {value && (
                <div className="bg-amber-50 border border-amber-100 rounded-md p-2">
                    <div className="flex items-center gap-2 text-amber-700">
                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                        <span className="text-xs">Clinical notes added</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Notes;
