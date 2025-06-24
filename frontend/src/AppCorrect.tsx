import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import Login from '@/pages/Login';
import SuperAdminLayout from '@/layouts/SuperAdminLayout';
import HospitalAdminLayout from '@/layouts/HospitalAdminLayout';
import Dashboard from '@/pages/super-admin/Dashboard';
import Hospitals from '@/pages/super-admin/Hospitals';
import Admins from '@/pages/super-admin/Admins';
import HospitalDashboard from '@/pages/hospital-admin/Dashboard';
import UserManagement from '@/pages/hospital-admin/UserManagement';
import ShiftManagement from '@/pages/hospital-admin/ShiftManagement';
import OpdFees from '@/pages/hospital-admin/OpdFees';
import Patients from '@/pages/hospital-admin/Patients';
import PatientDetails from '@/pages/hospital-admin/PatientDetails';
import ProtectedRoute from '@/components/ProtectedRoute';
import ReceptionistDashboard from '@/pages/receptionist/Dashboard';
import SalesDashboard from '@/pages/sales/Dashboard';

export default function App() {
    return (
        <AuthProvider>
            <Toaster />
            <Routes>
                <Route path="/login" element={<Login />} />

                {/* Super Admin Routes */}
                <Route
                    path="/super-admin"
                    element={
                        <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                            <SuperAdminLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<Navigate to="/super-admin/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="hospitals" element={<Hospitals />} />
                    <Route path="admins" element={<Admins />} />
                </Route>

                {/* Hospital Admin Routes */}
                <Route
                    path="/hospital-admin"
                    element={
                        <ProtectedRoute allowedRoles={['HOSPITAL_ADMIN', 'RECEPTIONIST', 'SALES_PERSON']}>
                            <HospitalAdminLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<Navigate to="/hospital-admin/dashboard" replace />} />
                    <Route path="dashboard" element={<HospitalDashboard />} />
                    <Route path="users" element={<UserManagement />} />
                    <Route path="shifts" element={<ShiftManagement />} />
                    <Route path="opd-fees" element={<OpdFees />} />
                    <Route path="patients" element={<Patients />} />
                    <Route path="patients/:id" element={<PatientDetails />} />
                </Route>

                {/* Receptionist Routes */}
                <Route
                    path="/receptionist/dashboard"
                    element={
                        <ProtectedRoute allowedRoles={['RECEPTIONIST']}>
                            <ReceptionistDashboard />
                        </ProtectedRoute>
                    }
                />

                {/* Sales Person Routes */}
                <Route
                    path="/sales"
                    element={
                        <ProtectedRoute allowedRoles={['SALES_PERSON']}>
                            <SalesDashboard />
                        </ProtectedRoute>
                    }
                />

                {/* Redirect root to login */}
                <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
        </AuthProvider>
    );
} 