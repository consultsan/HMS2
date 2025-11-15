import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, X, Download, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { ipdApi } from '@/api/ipd';
import { PatientDocumentCategory, IPDPatientDocument } from '@/types/ipd';

interface IPDPatientDocumentUploadProps {
  admissionId: string;
  patientName: string;
  onDocumentUploaded?: () => void;
}

export default function IPDPatientDocumentUpload({ 
  admissionId, 
  patientName, 
  onDocumentUploaded 
}: IPDPatientDocumentUploadProps) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState<IPDPatientDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<PatientDocumentCategory | ''>('');
  const [description, setDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const documentCategories = [
    { value: PatientDocumentCategory.MEDICAL_REPORTS, label: 'Medical Reports' },
    { value: PatientDocumentCategory.LAB_REPORTS, label: 'Lab Reports' },
    { value: PatientDocumentCategory.IMAGING_REPORTS, label: 'Imaging Reports' },
    { value: PatientDocumentCategory.PRESCRIPTION, label: 'Prescription' },
    { value: PatientDocumentCategory.CONSENT_FORMS, label: 'Consent Forms' },
    { value: PatientDocumentCategory.DISCHARGE_SUMMARY, label: 'Discharge Summary' },
    { value: PatientDocumentCategory.REFERRAL_LETTERS, label: 'Referral Letters' },
    { value: PatientDocumentCategory.INSURANCE_DOCUMENTS, label: 'Insurance Documents' },
    { value: PatientDocumentCategory.ID_PROOF, label: 'ID Proof' },
    { value: PatientDocumentCategory.EMERGENCY_CONTACT, label: 'Emergency Contact' }
  ];

  const fetchDocuments = async () => {
    setIsLoadingDocuments(true);
    try {
      const response = await ipdApi.getIPDPatientDocuments(admissionId);
      console.log('Documents API response:', response);
      // Ensure documents is always an array
      const documentsData = response.data.data || [];
      setDocuments(Array.isArray(documentsData) ? documentsData : []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to fetch documents');
      setDocuments([]); // Set empty array on error
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !category) {
      toast.error('Please select a file and category');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('admissionId', admissionId);
      formData.append('category', category);
      formData.append('description', description);
      formData.append('file', selectedFile);

      await ipdApi.uploadIPDPatientDocument(formData);
      
      toast.success('Document uploaded successfully!');
      setSelectedFile(null);
      setCategory('');
      setDescription('');
      setIsUploadModalOpen(false);
      onDocumentUploaded?.();
      fetchDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await ipdApi.deleteIPDPatientDocument(documentId);
      toast.success('Document deleted successfully!');
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCategoryColor = (category: PatientDocumentCategory) => {
    const colors = {
      [PatientDocumentCategory.MEDICAL_REPORTS]: 'bg-blue-100 text-blue-800',
      [PatientDocumentCategory.LAB_REPORTS]: 'bg-green-100 text-green-800',
      [PatientDocumentCategory.IMAGING_REPORTS]: 'bg-purple-100 text-purple-800',
      [PatientDocumentCategory.PRESCRIPTION]: 'bg-orange-100 text-orange-800',
      [PatientDocumentCategory.CONSENT_FORMS]: 'bg-red-100 text-red-800',
      [PatientDocumentCategory.DISCHARGE_SUMMARY]: 'bg-gray-100 text-gray-800',
      [PatientDocumentCategory.REFERRAL_LETTERS]: 'bg-yellow-100 text-yellow-800',
      [PatientDocumentCategory.INSURANCE_DOCUMENTS]: 'bg-indigo-100 text-indigo-800',
      [PatientDocumentCategory.ID_PROOF]: 'bg-pink-100 text-pink-800',
      [PatientDocumentCategory.EMERGENCY_CONTACT]: 'bg-teal-100 text-teal-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  React.useEffect(() => {
    fetchDocuments();
  }, [admissionId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Patient Documents</h3>
        <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Document for {patientName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="category">Document Category</Label>
                <Select value={category} onValueChange={(value) => setCategory(value as PatientDocumentCategory)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentCategories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description for this document..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="file">Select File</Label>
                <Input
                  id="file"
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  className="cursor-pointer"
                />
                {selectedFile && (
                  <div className="mt-2 flex items-center justify-between bg-gray-50 p-2 rounded">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm">{selectedFile.name}</span>
                      <span className="text-xs text-gray-500">
                        ({formatFileSize(selectedFile.size)})
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsUploadModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={isUploading || !selectedFile || !category}
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoadingDocuments ? (
        <div className="text-center py-4">
          <div className="animate-pulse">Loading documents...</div>
        </div>
      ) : !Array.isArray(documents) || documents.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
          <p>No documents uploaded yet</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {Array.isArray(documents) && documents.map((doc) => (
            <Card key={doc.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{doc.fileName}</span>
                    <Badge className={getCategoryColor(doc.category)}>
                      {documentCategories.find(cat => cat.value === doc.category)?.label}
                    </Badge>
                  </div>
                  {doc.description && (
                    <p className="text-sm text-gray-600 mb-2">{doc.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{formatFileSize(doc.fileSize)}</span>
                    <span>Uploaded by {doc.uploadedBy.name}</span>
                    <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(doc.fileUrl, '_blank')}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(doc.fileUrl, '_blank')}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
