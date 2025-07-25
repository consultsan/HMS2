import React from "react";
import { Stethoscope, AlertCircle } from "lucide-react";

interface DiagnosisProps {
    value: string;
    onChange: (value: string) => void;
}

const Diagnosis: React.FC<DiagnosisProps> = ({ value, onChange }) => {
    return (
        <div className="space-y-4">
            <div className="relative">
                <textarea
                    id="diagnosis"
                    rows={4}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Enter primary diagnosis, condition details, and clinical observations..."
                    className="w-full p-3 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm resize-none"
                />
                {!value && (
                    <div className="absolute top-3 right-3">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                    </div>
                )}
            </div>
            {value && (
                <div className="bg-green-50 border border-green-100 rounded-md p-2">
                    <div className="flex items-center gap-2 text-green-700">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                        <span className="text-xs">Diagnosis recorded</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Diagnosis;
