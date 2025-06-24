import React, { useState, useRef, useCallback } from 'react';
import { PatientDocument } from './types';
import { appointmentApi } from '@/api/appointment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { AppointmentAttachType } from '@/types/types';
import { Upload, FileText, Image, FileCheck, Trash2, Search, Download, AlertCircle } from 'lucide-react';

interface DocumentsListProps {
    documents: PatientDocument[];
    backendBaseUrl: string;
    appointmentId?: string;
    onDocumentsUpdate?: (documents: PatientDocument[]) => void;
    maxFileSize?: number; // in MB
    allowedFileTypes?: string[];
}

export function DocumentsList({
    documents: initialDocuments,
    backendBaseUrl,
    appointmentId,
    onDocumentsUpdate,
    maxFileSize = 10,
    allowedFileTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']
}: DocumentsListProps) {
    const [documents, setDocuments] = useState<PatientDocument[]>(initialDocuments || []);
    const [isUploading, setIsUploading] = useState(false);
    const [documentType, setDocumentType] = useState<AppointmentAttachType | ''>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const documentTypes = [
        { value: AppointmentAttachType.MEDICAL_REPORT, label: 'Medical Report' },
        { value: AppointmentAttachType.LAB_REPORT, label: 'Lab Report' },
        { value: AppointmentAttachType.PRESCRIPTION, label: 'Prescription' },
        { value: AppointmentAttachType.OTHER, label: 'Other' }
    ];

    // Filter documents based on search term
    const filteredDocuments = documents.filter(doc =>
        doc.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.uploadedAt && new Date(doc.uploadedAt).toLocaleDateString().includes(searchTerm))
    );

    // Get file icon based on type
    const getFileIcon = (url: string) => {
        const extension = url.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
            return <Image className="w-5 h-5 text-blue-500" />;
        } else if (['pdf'].includes(extension || '')) {
            return <FileText className="w-5 h-5 text-red-500" />;
        } else {
            return <FileCheck className="w-5 h-5 text-gray-500" />;
        }
    };

    // Format file size
    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Validate file
    const validateFile = (file: File): string | null => {
        // Check file size
        if (file.size > maxFileSize * 1024 * 1024) {
            return `File size must be less than ${maxFileSize}MB`;
        }

        // Check file type
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!allowedFileTypes.includes(fileExtension)) {
            return `File type not allowed. Allowed types: ${allowedFileTypes.join(', ')}`;
        }

        return null;
    };

    const handleFileUpload = async (file: File) => {
        if (!appointmentId || !documentType) {
            toast({
                title: "Error",
                description: "Please select a document type",
                variant: "destructive"
            });
            return;
        }

        const validationError = validateFile(file);
        if (validationError) {
            toast({
                title: "Invalid File",
                description: validationError,
                variant: "destructive"
            });
            return;
        }

        setIsUploading(true);
        try {
            const response = await appointmentApi.uploadAttachment({
                file,
                type: documentType,
                appointmentId
            });

            const newDocument: PatientDocument = {
                id: response.data.id,
                type: documentType,
                url: response.data.url,
                uploadedAt: new Date()
            };

            const updatedDocuments = [...documents, newDocument];
            setDocuments(updatedDocuments);
            onDocumentsUpdate?.(updatedDocuments);

            toast({
                title: "Success",
                description: `Document uploaded successfully (${formatFileSize(file.size)})`,
            });

            // Reset form
            setDocumentType('');
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error) {
            toast({
                title: "Upload Failed",
                description: "Failed to upload document. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            await handleFileUpload(file);
        }
    };

    // Drag and drop handlers
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            await handleFileUpload(files[0]);
        }
    }, [appointmentId, documentType]);

    const handleDeleteDocument = async (documentId: string) => {
        try {
            await appointmentApi.deleteAttachment(documentId);

            const updatedDocuments = documents.filter(doc => doc.id !== documentId);
            setDocuments(updatedDocuments);
            onDocumentsUpdate?.(updatedDocuments);

            toast({
                title: "Success",
                description: "Document deleted successfully"
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to delete document",
                variant: "destructive"
            });
        } finally {
            setDeleteConfirmId(null);
        }
    };

    const handleDownload = (doc: PatientDocument) => {
        const link = document.createElement('a');
        link.href = `${backendBaseUrl}${doc.url}`;
        link.download = `${doc.type}_${new Date(doc.uploadedAt || '').toLocaleDateString()}`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">Documents</h2>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="w-4 h-4" />
                    <span>{documents.length} document{documents.length !== 1 ? 's' : ''}</span>
                </div>
            </div>

            {/* Search Bar */}
            {documents.length > 0 && (
                <div className="mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            placeholder="Search documents..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>
            )}

            {/* Upload Section */}
            <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-dashed border-blue-200">
                <h3 className="text-lg font-medium mb-4 text-gray-800">Upload New Document</h3>

                {/* Document Type Selection */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2 text-gray-700">Document Type</label>
                    <Select value={documentType} onValueChange={(value: string) => setDocumentType(value as AppointmentAttachType)}>
                        <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select document type" />
                        </SelectTrigger>
                        <SelectContent>
                            {documentTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Drag & Drop Area */}
                <div
                    className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${isDragging
                        ? 'border-blue-400 bg-blue-50'
                        : documentType
                            ? 'border-gray-300 hover:border-blue-300 bg-white cursor-pointer'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => documentType && fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileInputChange}
                        disabled={isUploading || !documentType}
                        accept={allowedFileTypes.join(',')}
                        className="hidden"
                    />

                    <div className="flex flex-col items-center space-y-3">
                        <Upload className={`w-12 h-12 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
                        <div>
                            <p className="text-lg font-medium text-gray-700">
                                {isDragging ? 'Drop your file here' : 'Drop files here or click to browse'}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                Supports: {allowedFileTypes.join(', ')} (Max {maxFileSize}MB)
                            </p>
                        </div>
                        {!documentType && (
                            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-md">
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-sm">Please select a document type first</span>
                            </div>
                        )}
                    </div>

                    {isUploading && (
                        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-lg">
                            <div className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                <span className="text-sm font-medium text-blue-600">Uploading...</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Documents List */}
            {filteredDocuments.length === 0 ? (
                <div className="text-center py-8">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">
                        {searchTerm ? 'No documents match your search' : 'No documents uploaded yet'}
                    </p>
                    {searchTerm && (
                        <Button
                            variant="outline"
                            onClick={() => setSearchTerm('')}
                            className="mt-2"
                        >
                            Clear Search
                        </Button>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredDocuments.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors">
                            <div className="flex items-center space-x-3 flex-1">
                                {getFileIcon(doc.url)}
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 truncate">{doc.type}</p>
                                    {doc.uploadedAt && (
                                        <p className="text-sm text-gray-500">
                                            Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()} at {new Date(doc.uploadedAt).toLocaleTimeString()}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(`${backendBaseUrl}${doc.url}`, '_blank')}
                                    className="text-blue-600 hover:text-blue-700"
                                >
                                    View
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDownload(doc)}
                                    className="text-green-600 hover:text-green-700"
                                >
                                    <Download className="w-4 h-4" />
                                </Button>

                                <Dialog open={deleteConfirmId === doc.id} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
                                    <DialogTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setDeleteConfirmId(doc.id)}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Delete Document</DialogTitle>
                                            <DialogDescription>
                                                Are you sure you want to delete this {doc.type.toLowerCase()} document? This action cannot be undone.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="flex justify-end space-x-2 mt-4">
                                            <Button
                                                variant="outline"
                                                onClick={() => setDeleteConfirmId(null)}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                onClick={() => handleDeleteDocument(doc.id)}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
} 