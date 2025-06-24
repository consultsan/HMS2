import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
    LayoutDashboard,
    Users,
    Clock,
    DollarSign,
    UserCircle,
} from 'lucide-react';

export default function HospitalAdminLayout() {
    const { user, logout } = useAuth();
    const location = useLocation();

    const navigation = [
        { name: 'Dashboard', href: '/hospital-admin/dashboard', icon: LayoutDashboard },
        { name: 'Users', href: '/hospital-admin/users', icon: Users },
        { name: 'Shifts', href: '/hospital-admin/shifts', icon: Clock },
        { name: 'OPD Fees', href: '/hospital-admin/opd-fees', icon: DollarSign },
        { name: 'Patients', href: '/hospital-admin/patients', icon: UserCircle },
    ];

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Sidebar */}
            <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-center h-16 px-4 bg-blue-800">
                        <h1 className="text-xl font-bold text-white">HMS Hospital</h1>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-4 space-y-1">
                        {navigation.map((item) => {
                            const isActive = location.pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${isActive
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    <item.icon className="w-5 h-5 mr-3" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Info & Logout */}
                    <div className="p-4 border-t">
                        <div className="flex items-center mb-4">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                                <p className="text-xs text-gray-500">{user?.email}</p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => logout()}
                        >
                            Logout
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="pl-64">
                <main className="p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
} 