import React, { useState, useRef, useCallback } from 'react';
import { PatientDocument } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { PatientDoc } from '@/types/types';
import { Upload, FileText, Image, FileCheck, Trash2, Search, AlertCircle } from 'lucide-react';
import { patientApi } from '@/api/patient';

interface DocumentsListProps {
    backendBaseUrl: string;
    patientId?: string;
    onDocumentsUpdate?: (documents: PatientDocument[]) => void;
    maxFileSize?: number; // in MB
    allowedFileTypes?: string[];
}

export function DocumentsList({
    backendBaseUrl,
    patientId,
    onDocumentsUpdate,
    maxFileSize = 10,
    allowedFileTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']
}: DocumentsListProps) {
    const [documents, setDocuments] = useState<PatientDocument[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [documentType, setDocumentType] = useState<PatientDoc | ''>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const documentTypes = [
        { value: PatientDoc.INSURANCE_CARD, label: 'Medical Report' },
        { value: PatientDoc.LAB_REPORT, label: 'Lab Report' },
        { value: PatientDoc.PRESCRIPTION, label: 'Prescription' },
        { value: PatientDoc.OTHER, label: 'Other' }
    ];

    const fetchPatientDocuments = useCallback(async () => {
        if (!patientId) return;
        try {
            const response = await patientApi.getDocuments(patientId);
            setDocuments(response);
            onDocumentsUpdate?.(response);
            return;
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to fetch patient documents",
                variant: "destructive",
                duration: 3000
            });
        }
    }, [patientId, onDocumentsUpdate]);

    React.useEffect(() => {
        fetchPatientDocuments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientId]);

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
    // Handle file upload


    // Upload multiple files one by one using labApi.uploadLabTestAttachment
    const handleFileUpload = async (files: FileList | File[]) => {
        if (!patientId || !documentType) {
            toast({
                title: "Error",
                description: "Please select a document type",
                variant: "destructive"
            });
            return;
        }


        const fileArray = Array.from(files);
        setIsUploading(true);
        let anyError = false;
        for (const file of fileArray) {
            const validationError = validateFile(file);
            if (validationError) {
                    toast({
                        title: "Invalid File",
                        description: validationError,
                        variant: "destructive"
                    });
                anyError = true;
                continue;
            }
            try {
                // Use patientApi.uploadDocument with FormData
                const docResponse: any = await patientApi.uploadDocument({
                    file: file,
                    patientId: patientId,
                    type: documentType
                });



                const newDocument: PatientDocument = {
                    id: docResponse.data.data.id || Math.random().toString(),
                    type: documentType,
                    url: docResponse.data.data.url,
                    uploadedAt: new Date()
                };
                const updatedDocuments = [...documents, newDocument];
                setDocuments(updatedDocuments);
                onDocumentsUpdate?.(updatedDocuments);
                toast({
                    title: "Success",
                    description: `Document uploaded successfully (${formatFileSize(file.size)})`,
                    variant: "default",
                    duration: 3000,
                });
            } catch (error) {
                anyError = true;
                toast({
                    title: "Upload Failed",
                    description: "Failed to upload document. Please try again.",
                    variant: "destructive"
                });
            }
        }
        setIsUploading(false);
        // Reset form
        setDocumentType('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        if (!anyError) {
            // Optionally: show a summary toast
        }
    };

    const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            await handleFileUpload(files);
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
            await handleFileUpload([files[0]]);
        }
    }, [patientId, documentType]);

    const handleDeleteDocument = async (documentId: string) => {
        try {
            setIsDeleting(documentId);
            // Use patientApi for patient documents and appointmentApi for appointment attachments
            await patientApi.deleteDocument(documentId);

            const updatedDocuments = documents.filter(doc => doc.id !== documentId);
            setDocuments(updatedDocuments);
            onDocumentsUpdate?.(updatedDocuments);

            toast({
                title: "Success",
                description: "Document deleted successfully",
                variant: "default",
                duration: 3000
            });
        } catch (error) {
            console.error('Error deleting document:', error);
            toast({
                title: "Error",
                description: "Failed to delete document",
                variant: "destructive"
            });
        } finally {
            setIsDeleting(null);
            setDeleteConfirmId(null);
        }
    };



    const handleviewDocument = (url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer');
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
                <div className="text-lg font-medium mb-4 text-gray-800">Upload New Document</div>

                {/* Document Type Selection */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2 text-gray-700">Document Type</label>
                    <Select value={documentType} onValueChange={(value: string) => setDocumentType(value as PatientDoc)}>
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
                                    onClick={() => handleviewDocument(doc.url)}
                                    className="text-blue-600 hover:text-blue-700"
                                >
                                    View
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
                                                disabled={isDeleting === doc.id}
                                            >
                                                {isDeleting === doc.id ? (
                                                    <>
                                                        <span className="animate-spin mr-2">⌛</span>
                                                        Deleting...
                                                    </>
                                                ) : (
                                                    'Delete'
                                                )}
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