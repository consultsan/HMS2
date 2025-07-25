import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import Login from '@/pages/Login';
import UnifiedLayout from '@/layouts/UnifiedLayout';
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
import { SearchProvider } from '@/contexts/SearchContext';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import Appointments from './pages/doctor/Appointments';
import ConsultationPage from './pages/consultation/ConsultationPage';
import DiseaseTemplate from './pages/doctor/DiseaseTemplate';
import DiagnosisRecord from './pages/consultation/DiagnosisRecord';
import LabDashboard from './pages/lab/LabDashboard';
import AppointmentManagement from './pages/appointment/AppointmentManagement';
import FollowUpsSection from './pages/receptionist/FollowUpsSection';
import SurgicalAppointments from './pages/receptionist/SurgicalAppointments';
import DepartmentManagement from './pages/hospital-admin/DepartmentManagement';
import CompletedTests from './pages/lab/CompletedTests';
import TestsFromReceptionist from './pages/lab/TestsFromReceptionist';
import TestFromDoctors from './pages/lab/TestFromDoctors';
import Retests from './pages/lab/Retests';
import CreateLabTest from './pages/lab/CreateLabTest';
import CreateLabTestAppointment from './pages/receptionist/CreateLabTestAppointment';
import PendingLabBills from './pages/receptionist/PendingLabBills';

export default function App() {
  return (
    <AuthProvider>
      <SearchProvider>
        <Toaster />
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Super Admin Routes */}
          <Route
            path="/super-admin/*"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <UnifiedLayout />
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
            path="/hospital-admin/*"
            element={
              <ProtectedRoute allowedRoles={['HOSPITAL_ADMIN', 'RECEPTIONIST', 'SALES_PERSON']}>
                <UnifiedLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/hospital-admin/dashboard" replace />} />
            <Route path="dashboard" element={<HospitalDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="shifts" element={<ShiftManagement />} />
            <Route path="opd-fees" element={<OpdFees />} />
            <Route path="patients" element={<Patients />} />
            <Route path="department" element={<DepartmentManagement />} />
          </Route>

          {/* Patient Details View Route (Standalone) */}
          <Route
            path="/patient/:patientId"
            element={
              <ProtectedRoute allowedRoles={['HOSPITAL_ADMIN', 'RECEPTIONIST', 'SALES_PERSON', 'DOCTOR']}>
                <PatientDetails />
              </ProtectedRoute>
            }
          />

          {/* Receptionist Routes */}
          <Route
            path="/receptionist/*"
            element={
              <ProtectedRoute allowedRoles={['RECEPTIONIST']}>
                <UnifiedLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/receptionist/dashboard" replace />} />
            <Route path="dashboard" element={<ReceptionistDashboard />} />
            <Route path="patients" element={<Patients />} />
            <Route path="appointments" element={<AppointmentManagement />} />
            <Route path="follow-ups" element={<FollowUpsSection />} />
            <Route path="surgical-appointments" element={<SurgicalAppointments />} />
            <Route path="create-test" element={<CreateLabTestAppointment />} />
            <Route path="pending-lab-bills" element={<PendingLabBills />} />
          </Route>

          {/* Sales Person Routes */}
          <Route
            path="/sales-person/*"
            element={
              <ProtectedRoute allowedRoles={['SALES_PERSON']}>
                <UnifiedLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/sales-person/dashboard" replace />} />
            <Route path="dashboard" element={<SalesDashboard />} />
            <Route path="patients" element={<Patients />} />
            <Route path="appointments" element={<AppointmentManagement />} />
            <Route path="follow-ups" element={<FollowUpsSection />} />
            <Route path="surgical-appointments" element={<SurgicalAppointments />} />
          </Route>

          {/* Doctor Routes */}
          <Route
            path="/doctor/*"
            element={
              <ProtectedRoute allowedRoles={['DOCTOR']}>
                <UnifiedLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/doctor/dashboard" replace />} />
            <Route path="dashboard" element={<DoctorDashboard />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="template" element={<DiseaseTemplate />} />
            <Route path="create" element={<CreateLabTest />} />

          </Route>

          <Route path="doctor/consultation/:patientId/:appointmentId" element={<ConsultationPage />} />
          <Route path="doctor/diagnosis-record/:appointmentId" element={<DiagnosisRecord />} />

          {/* Lab Technician Routes */}
          <Route
            path="/lab/*"
            element={
              <ProtectedRoute allowedRoles={['LAB_TECHNICIAN']}>
                <UnifiedLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/lab/dashboard" replace />} />
            <Route path="dashboard" element={<LabDashboard />} />
            <Route path="from-doctors" element={<TestFromDoctors />} />
            <Route path="from-receptionist" element={<TestsFromReceptionist />} />
            <Route path="completed-tests" element={<CompletedTests />} />
            <Route path="retests" element={<Retests />} />
            <Route path="create" element={<CreateLabTest />} />
          </Route>

          {/* Redirect root to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </SearchProvider>
    </AuthProvider>
  );
} 