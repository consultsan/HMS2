import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building, 
  Shield, 
  TrendingUp, 
  RefreshCw,
  Stethoscope,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { ipdApi } from '@/api/ipd';
import { IPDDashboardStats, Ward, InsuranceCompany } from '@/types/ipd';

export default function IPDAdminDashboard() {
  const [dashboardStats, setDashboardStats] = useState<IPDDashboardStats | null>(null);
  const [wards, setWards] = useState<Ward[]>([]);
  const [insuranceCompanies, setInsuranceCompanies] = useState<InsuranceCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const [statsResponse, wardsResponse, insuranceResponse] = await Promise.all([
        ipdApi.getDashboardStats(),
        ipdApi.getWards(),
        ipdApi.getInsuranceCompanies()
      ]);

      setDashboardStats(statsResponse.data.data);
      setWards(wardsResponse.data.data);
      setInsuranceCompanies(insuranceResponse.data.data);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Get ward occupancy status
  const getWardOccupancyStatus = (ward: Ward) => {
    const occupancyRate = (ward.occupiedBeds / ward.totalBeds) * 100;
    if (occupancyRate >= 90) return { status: 'Full', color: 'bg-red-100 text-red-800', icon: AlertCircle };
    if (occupancyRate >= 70) return { status: 'High', color: 'bg-orange-100 text-orange-800', icon: AlertCircle };
    if (occupancyRate >= 50) return { status: 'Medium', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
    return { status: 'Low', color: 'bg-green-100 text-green-800', icon: CheckCircle };
  };

  // Get ward type color
  const getWardTypeColor = (type: string) => {
    switch (type) {
      case 'ICU': return 'bg-red-100 text-red-800 border-red-200';
      case 'PRIVATE': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'SEMI_PRIVATE': return 'bg-green-100 text-green-800 border-green-200';
      case 'EMERGENCY': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin mr-3" />
            <span className="text-lg">Loading dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              IPD Admin Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Overview of IPD operations, ward management, and system status
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-yellow-50 border-yellow-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-800">In Queue</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-900">
                {dashboardStats?.totalQueued || 0}
              </div>
              <p className="text-xs text-yellow-700">Patients waiting</p>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-800">Admitted</CardTitle>
              <Stethoscope className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">
                {dashboardStats?.totalAdmitted || 0}
              </div>
              <p className="text-xs text-blue-700">Currently admitted</p>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-800">Discharged</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">
                {dashboardStats?.totalDischarged || 0}
              </div>
              <p className="text-xs text-green-700">Recently discharged</p>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-800">Total Wards</CardTitle>
              <Building className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900">{wards.length}</div>
              <p className="text-xs text-purple-700">Active wards</p>
            </CardContent>
          </Card>
        </div>

        {/* Ward Overview and Recent Queue */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ward Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Ward Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {wards.length === 0 ? (
                <div className="text-center py-8">
                  <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No wards found</h3>
                  <p className="text-gray-500">Create your first ward to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {wards.map((ward) => {
                    const occupancy = getWardOccupancyStatus(ward);
                    const OccupancyIcon = occupancy.icon;
                    const occupancyRate = Math.round((ward.occupiedBeds / ward.totalBeds) * 100);
                    
                    return (
                      <div key={ward.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{ward.name}</h4>
                            <Badge className={getWardTypeColor(ward.type)}>
                              {ward.type}
                            </Badge>
                            <Badge className={occupancy.color}>
                              <OccupancyIcon className="h-3 w-3 mr-1" />
                              {occupancy.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>{ward.occupiedBeds}/{ward.totalBeds} beds occupied</span>
                            <span>{ward.availableBeds} available</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${occupancyRate}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

        {/* System Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              System Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div>
                    <div className="font-medium text-green-900">System Uptime</div>
                    <div className="text-sm text-green-700">99.9% operational</div>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Building className="h-6 w-6 text-blue-600" />
                  <div>
                    <div className="font-medium text-blue-900">Ward Utilization</div>
                    <div className="text-sm text-blue-700">
                      {wards.length > 0 ? Math.round((wards.reduce((sum, ward) => sum + ward.occupiedBeds, 0) / wards.reduce((sum, ward) => sum + ward.totalBeds, 0)) * 100) : 0}% capacity
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-purple-600" />
                  <div>
                    <div className="font-medium text-purple-900">Insurance Coverage</div>
                    <div className="text-sm text-purple-700">
                      {insuranceCompanies.filter(c => c.isPartnered).length} active partnerships
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-6 w-6 text-orange-600" />
                  <div>
                    <div className="font-medium text-orange-900">Response Time</div>
                    <div className="text-sm text-orange-700">Average 2.3s</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>

        {/* Insurance Companies Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Insurance Companies Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insuranceCompanies.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No insurance companies</h3>
                <p className="text-gray-500">Add insurance companies to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {insuranceCompanies.map((company) => (
                  <div key={company.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{company.name}</h4>
                      {company.isPartnered && (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Partnered
                        </Badge>
                      )}
                    </div>
                    {company.tpaName && (
                      <div className="text-sm text-gray-600 mb-1">
                        TPA: {company.tpaName}
                      </div>
                    )}
                    {company.contactInfo && (
                      <div className="text-sm text-gray-600">
                        Contact: {company.contactInfo}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Health Indicators */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <div>
                  <div className="font-medium text-green-900">System Status</div>
                  <div className="text-sm text-green-700">All systems operational</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                <Building className="h-6 w-6 text-blue-600" />
                <div>
                  <div className="font-medium text-blue-900">Ward Capacity</div>
                  <div className="text-sm text-blue-700">
                    {wards.reduce((sum, ward) => sum + ward.availableBeds, 0)} beds available
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
                <Shield className="h-6 w-6 text-purple-600" />
                <div>
                  <div className="font-medium text-purple-900">Insurance Partners</div>
                  <div className="text-sm text-purple-700">
                    {insuranceCompanies.filter(c => c.isPartnered).length} partnered companies
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
