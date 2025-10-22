import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, 
  Shield, 
  Building, 
  Phone, 
  Mail, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Star
} from 'lucide-react';
import { toast } from 'sonner';
import { ipdApi } from '@/api/ipd';
import { InsuranceCompany, CreateInsuranceCompanyData } from '@/types/ipd';

export default function InsuranceManagement() {
  const [insuranceCompanies, setInsuranceCompanies] = useState<InsuranceCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateInsuranceCompanyData>({
    name: '',
    isPartnered: false,
    tpaName: '',
    contactInfo: '',
  });

  // Fetch insurance companies
  const fetchInsuranceCompanies = async () => {
    try {
      setIsLoading(true);
      const response = await ipdApi.getInsuranceCompanies();
      setInsuranceCompanies(response.data.data);
    } catch (error) {
      console.error('Error fetching insurance companies:', error);
      toast.error('Failed to fetch insurance companies');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInsuranceCompanies();
  }, []);

  // Handle form input changes
  const handleInputChange = (field: keyof CreateInsuranceCompanyData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle create insurance company
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error('Company name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await ipdApi.createInsuranceCompany(formData);
      toast.success('Insurance company created successfully!');
      setIsCreateModalOpen(false);
      setFormData({ name: '', isPartnered: false, tpaName: '', contactInfo: '' });
      fetchInsuranceCompanies();
    } catch (error: any) {
      console.error('Error creating insurance company:', error);
      toast.error(error.response?.data?.message || 'Failed to create insurance company');
    } finally {
      setIsSubmitting(false);
    }
  };


  // Get partnership status color
  const getPartnershipColor = (isPartnered: boolean) => {
    return isPartnered 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="h-8 w-8 text-blue-600" />
              Insurance Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage insurance companies and TPA partnerships
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchInsuranceCompanies}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Company
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-800">Total Companies</CardTitle>
              <Shield className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">{insuranceCompanies.length}</div>
              <p className="text-xs text-blue-700">Insurance companies</p>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-800">Partnered</CardTitle>
              <Star className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">
                {insuranceCompanies.filter(c => c.isPartnered).length}
              </div>
              <p className="text-xs text-green-700">Partnered companies</p>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-800">With TPA</CardTitle>
              <Building className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900">
                {insuranceCompanies.filter(c => c.tpaName).length}
              </div>
              <p className="text-xs text-orange-700">Companies with TPA</p>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-800">Contact Info</CardTitle>
              <Phone className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900">
                {insuranceCompanies.filter(c => c.contactInfo).length}
              </div>
              <p className="text-xs text-purple-700">With contact details</p>
            </CardContent>
          </Card>
        </div>

        {/* Insurance Companies Table */}
        <Card>
          <CardHeader>
            <CardTitle>Insurance Companies</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Loading insurance companies...
              </div>
            ) : insuranceCompanies.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No insurance companies found</h3>
                <p className="text-gray-500 mb-4">Get started by adding your first insurance company</p>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Company
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company Name</TableHead>
                      <TableHead>Partnership</TableHead>
                      <TableHead>TPA Name</TableHead>
                      <TableHead>Contact Info</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {insuranceCompanies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">{company.name}</TableCell>
                        <TableCell>
                          <Badge className={getPartnershipColor(company.isPartnered)}>
                            {company.isPartnered ? (
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3" />
                                Partnered
                              </div>
                            ) : (
                              'Not Partnered'
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {company.tpaName ? (
                            <span className="text-sm">{company.tpaName}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {company.contactInfo ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              {company.contactInfo}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(company.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-500">
                            View only
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Insurance Company Modal */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-600" />
                Add Insurance Company
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Company Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter company name"
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPartnered"
                  checked={formData.isPartnered}
                  onChange={(e) => handleInputChange('isPartnered', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isPartnered" className="text-sm font-medium text-gray-700">
                  Partnered Company
                </Label>
              </div>

              <div>
                <Label htmlFor="tpaName" className="text-sm font-medium text-gray-700">
                  TPA Name
                </Label>
                <Input
                  id="tpaName"
                  value={formData.tpaName}
                  onChange={(e) => handleInputChange('tpaName', e.target.value)}
                  placeholder="Enter TPA name (optional)"
                />
              </div>

              <div>
                <Label htmlFor="contactInfo" className="text-sm font-medium text-gray-700">
                  Contact Information
                </Label>
                <Textarea
                  id="contactInfo"
                  value={formData.contactInfo}
                  onChange={(e) => handleInputChange('contactInfo', e.target.value)}
                  placeholder="Enter contact information (phone, email, etc.)"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Company
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
