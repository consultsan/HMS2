import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Building, 
  Bed, 
  Users, 
  RefreshCw,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { ipdApi } from '@/api/ipd';
import { Ward, WardType, WardSubType, CreateWardData } from '@/types/ipd';  

export default function WardManagement() {
  const [wards, setWards] = useState<Ward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBedCountModalOpen, setIsBedCountModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  const [bedCountData, setBedCountData] = useState({ occupiedBeds: 0 });
  const [formData, setFormData] = useState<CreateWardData>({
    name: '',
    type: WardType.GENERAL,
    subType: undefined,
    totalBeds: 0,
    pricePerDay: undefined,
    description: '',
  });

  // Fetch wards
  const fetchWards = async () => {
    try {
      setIsLoading(true);
      const response = await ipdApi.getWards();
      setWards(response.data.data);
    } catch (error) {
      console.error('Error fetching wards:', error);
      toast.error('Failed to fetch wards');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWards();
  }, []);

  // Handle form input changes
  const handleInputChange = (field: keyof CreateWardData, value: string | number | WardSubType | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle create ward
  const handleCreateWard = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || formData.totalBeds <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await ipdApi.createWard(formData);
      toast.success('Ward created successfully!');
      setIsCreateModalOpen(false);
      setFormData({ 
        name: '', 
        type: WardType.GENERAL, 
        subType: undefined,
        totalBeds: 0, 
        pricePerDay: undefined,
        description: ''
      });
      fetchWards();
    } catch (error: any) {
      console.error('Error creating ward:', error);
      toast.error(error.response?.data?.message || 'Failed to create ward');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle open bed count modal
  const handleOpenBedCountModal = (ward: Ward) => {
    setSelectedWard(ward);
    setBedCountData({ occupiedBeds: ward.occupiedBeds });
    setIsBedCountModalOpen(true);
  };

  // Handle update bed count
  const handleUpdateBedCount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedWard) return;

    const { occupiedBeds } = bedCountData;
    const totalBeds = selectedWard.totalBeds;
    
    if (occupiedBeds < 0 || occupiedBeds > totalBeds) {
      toast.error(`Invalid bed count. Must be between 0 and ${totalBeds}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const availableBeds = totalBeds - occupiedBeds;
      await ipdApi.updateWardBedCount(selectedWard.id, { occupiedBeds, availableBeds });
      toast.success('Bed count updated successfully!');
      setIsBedCountModalOpen(false);
      fetchWards();
    } catch (error: any) {
      console.error('Error updating bed count:', error);
      toast.error('Failed to update bed count');
    } finally {
      setIsSubmitting(false);
    }
  };


  // Get ward type color
  const getWardTypeColor = (type: WardType) => {
    switch (type) {
      case WardType.ICU: return 'bg-red-100 text-red-800 border-red-200';
      case WardType.PRIVATE: return 'bg-blue-100 text-blue-800 border-blue-200';
      case WardType.SEMI_PRIVATE: return 'bg-green-100 text-green-800 border-green-200';
      case WardType.EMERGENCY: return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get occupancy status
  const getOccupancyStatus = (ward: Ward) => {
    const occupancyRate = (ward.occupiedBeds / ward.totalBeds) * 100;
    if (occupancyRate >= 90) return { status: 'Full', color: 'bg-red-100 text-red-800' };
    if (occupancyRate >= 70) return { status: 'High', color: 'bg-orange-100 text-orange-800' };
    if (occupancyRate >= 50) return { status: 'Medium', color: 'bg-yellow-100 text-yellow-800' };
    return { status: 'Low', color: 'bg-green-100 text-green-800' };
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Building className="h-8 w-8 text-blue-600" />
              Ward Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage hospital wards, bed allocation, and occupancy
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchWards}
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
              Add Ward
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-800">Total Wards</CardTitle>
              <Building className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">{wards.length}</div>
              <p className="text-xs text-blue-700">Active wards</p>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-800">Total Beds</CardTitle>
              <Bed className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">
                {wards.reduce((sum, ward) => sum + ward.totalBeds, 0)}
              </div>
              <p className="text-xs text-green-700">Available capacity</p>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-800">Occupied Beds</CardTitle>
              <Users className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900">
                {wards.reduce((sum, ward) => sum + ward.occupiedBeds, 0)}
              </div>
              <p className="text-xs text-orange-700">Currently occupied</p>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-800">Available Beds</CardTitle>
              <CheckCircle className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900">
                {wards.reduce((sum, ward) => sum + ward.availableBeds, 0)}
              </div>
              <p className="text-xs text-purple-700">Ready for admission</p>
            </CardContent>
          </Card>
        </div>

        {/* Wards Table */}
        <Card>
          <CardHeader>
            <CardTitle>Ward Details</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Loading wards...
              </div>
            ) : wards.length === 0 ? (
              <div className="text-center py-8">
                <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No wards found</h3>
                <p className="text-gray-500 mb-4">Get started by creating your first ward</p>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Ward
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ward Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Sub Type</TableHead>
                      <TableHead>Total Beds</TableHead>
                      <TableHead>Occupied</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Price/Day</TableHead>
                      <TableHead>Occupancy</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wards.map((ward) => {
                      const occupancy = getOccupancyStatus(ward);
                      const occupancyRate = Math.round((ward.occupiedBeds / ward.totalBeds) * 100);
                      
                      return (
                        <TableRow key={ward.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div>{ward.name}</div>
                              {ward.description && (
                                <div className="text-xs text-gray-500 mt-1">{ward.description}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getWardTypeColor(ward.type)}>
                              {ward.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {ward.subType ? (
                              <Badge variant="outline" className="text-xs">
                                {ward.subType}
                              </Badge>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>{ward.totalBeds}</TableCell>
                          <TableCell>{ward.occupiedBeds}</TableCell>
                          <TableCell>{ward.availableBeds}</TableCell>
                          <TableCell>
                            {ward.pricePerDay ? (
                              <span className="font-medium">₹{ward.pricePerDay}</span>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${occupancyRate}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">{occupancyRate}%</span>
                              <Badge className={occupancy.color}>
                                {occupancy.status}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenBedCountModal(ward)}
                              >
                                <Bed className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Ward Modal */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-600" />
                Create New Ward
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateWard} className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Ward Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter ward name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="type" className="text-sm font-medium text-gray-700">
                  Ward Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleInputChange('type', value as WardType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select ward type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={WardType.GENERAL}>General</SelectItem>
                    <SelectItem value={WardType.ICU}>ICU</SelectItem>
                    <SelectItem value={WardType.PRIVATE}>Private</SelectItem>
                    <SelectItem value={WardType.SEMI_PRIVATE}>Semi-Private</SelectItem>
                    <SelectItem value={WardType.EMERGENCY}>Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="subType" className="text-sm font-medium text-gray-700">
                  Ward Sub Type
                </Label>
                <Select
                  value={formData.subType || 'none'}
                  onValueChange={(value) => handleInputChange('subType', value === 'none' ? undefined : value as WardSubType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select ward sub type (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value={WardSubType.AC}>AC</SelectItem>
                    <SelectItem value={WardSubType.NON_AC}>Non-AC</SelectItem>
                    <SelectItem value={WardSubType.SINGLE}>Single</SelectItem>
                    <SelectItem value={WardSubType.DOUBLE}>Double</SelectItem>
                    <SelectItem value={WardSubType.TRIPLE}>Triple</SelectItem>
                    <SelectItem value={WardSubType.QUADRUPLE}>Quadruple</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="totalBeds" className="text-sm font-medium text-gray-700">
                  Total Beds <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="totalBeds"
                  type="number"
                  min="1"
                  value={formData.totalBeds}
                  onChange={(e) => handleInputChange('totalBeds', parseInt(e.target.value) || 0)}
                  placeholder="Enter total number of beds"
                  required
                />
              </div>

              <div>
                <Label htmlFor="pricePerDay" className="text-sm font-medium text-gray-700">
                  Price Per Day (₹)
                </Label>
                <Input
                  id="pricePerDay"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.pricePerDay || ''}
                  onChange={(e) => handleInputChange('pricePerDay', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="Enter price per day (optional)"
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                  Description
                </Label>
                <Input
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter ward description (optional)"
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
                      Create Ward
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Update Bed Count Modal */}
        <Dialog open={isBedCountModalOpen} onOpenChange={setIsBedCountModalOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bed className="h-5 w-5 text-blue-600" />
                Update Bed Count
              </DialogTitle>
            </DialogHeader>

            {selectedWard && (
              <form onSubmit={handleUpdateBedCount} className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Ward: {selectedWard.name}</div>
                  <div className="text-sm text-gray-600">Total Beds: {selectedWard.totalBeds}</div>
                </div>

                <div>
                  <Label htmlFor="occupiedBeds" className="text-sm font-medium text-gray-700">
                    Occupied Beds <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="occupiedBeds"
                    type="number"
                    min="0"
                    max={selectedWard.totalBeds}
                    value={bedCountData.occupiedBeds}
                    onChange={(e) => setBedCountData({ occupiedBeds: parseInt(e.target.value) || 0 })}
                    placeholder="Enter occupied bed count"
                    required
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Available beds: {selectedWard.totalBeds - bedCountData.occupiedBeds}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsBedCountModalOpen(false)}
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
                        Updating...
                      </>
                    ) : (
                      <>
                        <Bed className="h-4 w-4 mr-2" />
                        Update Beds
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
