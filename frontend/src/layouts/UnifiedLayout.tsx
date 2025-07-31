import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Search } from 'lucide-react';
import { useSearch } from '@/contexts/SearchContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { useEffect } from 'react';

// Define the role-specific configurations
const roleConfigs = {
  DOCTOR: {
    basePath: '/doctor',
    sections: [
      { name: 'Dashboard', path: '/doctor/dashboard' },
      { name: 'Appointments', path: '/doctor/appointments' },
      { name: 'Disease Templates', path: '/doctor/template' },
      { name: 'Create Test', path: '/doctor/create' },
    ],
    searchPlaceholders: {
      appointments: 'Search Patients',
      default: 'Search...',
    },
  },
  HOSPITAL_ADMIN: {
    basePath: '/hospital-admin',
    sections: [
      { name: 'Dashboard', path: '/hospital-admin/dashboard' },
      { name: 'User Management', path: '/hospital-admin/users' },
      { name: 'Shift Management', path: '/hospital-admin/shifts' },
      { name: 'Doctor OPD Fees', path: '/hospital-admin/opd-fees' },
      { name: 'Department Management', path: '/hospital-admin/department' },
      { name: 'Manage Patients', path: '/hospital-admin/patients' },
    ],
    searchPlaceholders: {
      'opd-fees': 'Search doctors by name or specialisation',
      users: 'Search users by name',
      patients: 'Search patients by name',
      shifts: 'Search shifts',
      default: 'Search...',
    },
  },
  RECEPTIONIST: {
    basePath: '/receptionist',
    sections: [
      { name: 'Dashboard', path: '/receptionist/dashboard' },
      { name: 'Patients', path: '/receptionist/patients' },
      { name: 'Appointments', path: '/receptionist/appointments' },
      { name: 'Pending Lab Test Bills', path: '/receptionist/pending-lab-bills' },
      { name: 'Follow Ups', path: '/receptionist/follow-ups' },
      { name: 'Surgical Appointments', path: '/receptionist/surgical-appointments' },
      { name: 'Create Test', path: '/receptionist/create-test' },
    ],
    searchPlaceholders: {
      appointments: 'Search appointments',
      patients: 'Search patients',
      default: 'Search...',
    },
  },
  SALES_PERSON: {
    basePath: '/sales-person',
    sections: [
      { name: 'Dashboard', path: '/sales-person/dashboard' },
      { name: 'Patients', path: '/sales-person/patients' },
      { name: 'Appointments', path: '/sales-person/appointments' },
      { name: 'Follow Ups', path: '/sales-person/follow-ups' },
      { name: 'Surgical Appointments', path: '/sales-person/surgical-appointments' },
      ],
    searchPlaceholders: {
      appointments: 'Search appointments',
      patients: 'Search patients',
      default: 'Search...',
    },
  },
  LAB_TECHNICIAN: {
    basePath: '/lab',
    sections: [
      { name: 'Dashboard', path: '/lab/dashboard' },
      { name: 'From Doctors', path: '/lab/from-doctors' },
      { name: 'From Receptionist', path: '/lab/from-receptionist' },
      { name: 'Completed Tests', path: '/lab/completed-tests' },
      { name: 'Create Test', path: '/lab/create' },
    ],
    searchPlaceholders: {
      default: 'Search...',
    },
  },
  SUPER_ADMIN: {
    basePath: '/super-admin',
    sections: [
      { name: 'Dashboard', path: '/super-admin/dashboard' },
      { name: 'Hospitals', path: '/super-admin/hospitals' },
      { name: 'Admins', path: '/super-admin/admins' },
    ],
    searchPlaceholders: {
      hospitals: 'Search hospitals',
      users: 'Search users',
      default: 'Search...',
    },
  },
};

export default function UnifiedLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const { searchQuery, setSearchQuery } = useSearch();

  // Get the role-specific configuration
  const roleConfig = roleConfigs[user?.role as keyof typeof roleConfigs] || roleConfigs.DOCTOR;

  // Reset search query when route changes
  useEffect(() => {
    setSearchQuery('');
  }, [location.pathname, setSearchQuery]);

  // Get the placeholder text based on current route
  const getSearchPlaceholder = () => {
    const path = location.pathname;
    const currentSection = Object.entries(roleConfig.searchPlaceholders).find(([key]) =>
      path.includes(`/${key}`)
    );
    return currentSection ? currentSection[1] : roleConfig.searchPlaceholders.default;
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 h-screen w-44 bg-white shadow z-20">
        <Sidebar sections={roleConfig.sections} />
      </aside>

      {/* Main layout shifted right due to sidebar */}
      <div className="flex-1 ml-44 flex flex-col">
        {/* Top navbar */}
        <header className="fixed top-0 left-44 right-0 h-16 bg-[#154D92] px-6 flex justify-between items-center z-10">
          {/* Search (conditionally visible) */}
          <div
            className={`flex items-center visible'
              }`}
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={getSearchPlaceholder()}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-full bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 w-80"
              />
            </div>
          </div>

          {/* User Info */}
          <div className="flex items-center space-x-4">
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                user?.name || ''
              )}&background=fff&color=6366f1`}
              alt={user?.name}
              className="w-8 h-8 rounded-full"
            />
            <div className="text-right">
              <p className="text-white font-medium">{user?.name}</p>
              <p className="text-sm text-gray-200 capitalize">
                {user?.role?.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
        </header>

        {/* Main Content below navbar */}
        <main className="mt-16 p-4 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>

  );
} 