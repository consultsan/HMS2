import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Search } from 'lucide-react';
import { useSearch } from '@/contexts/SearchContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { useEffect } from 'react';

const sidebarSections = [
    {
        name: 'Dashboard',
        path: '/lab/dashboard',
    },
    {
        name: 'Lab Tests',
        path: '/lab/tests',
    },
];

export default function LabLayout() {
    const { user } = useAuth();
    const location = useLocation();
    const { searchQuery, setSearchQuery } = useSearch();

    // Reset search query when route changes
    useEffect(() => {
        setSearchQuery('');
    }, [location.pathname, setSearchQuery]);

    // Get the placeholder text based on current route
    const getSearchPlaceholder = () => {
        if (location.pathname.includes('/lab/tests')) {
            return 'Search Lab Tests';
        }
        return 'Search...';
    };

    return (
        <div className="min-h-screen flex bg-gray-50">
            <Sidebar sections={sidebarSections} />

            {/* Main content */}
            <div className="flex-1 flex flex-col">
                {/* Top nav */}
                <header className="h-16 bg-[#154D92] px-6 flex justify-between items-center">
                    <div className={`flex items-center ${location.pathname.includes('/lab/dashboard') ? 'invisible' : 'visible'}`}>
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
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-3">
                            <img
                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || '')}&background=fff&color=6366f1`}
                                alt={user?.name}
                                className="w-8 h-8 rounded-full"
                            />
                            <div className="text-right">
                                <p className="text-white font-medium">{user?.name}</p>
                                <p className="text-sm text-gray-200">
                                    {user?.role
                                        ?.replace(/_/g, ' ')
                                        .toLowerCase()
                                        .replace(/\b\w/g, c => c.toUpperCase())}
                                </p>
                            </div>
                        </div>
                    </div>
                </header>

                <Outlet />

            </div>
        </div>
    );
}
