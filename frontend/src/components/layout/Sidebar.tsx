import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarSection {
  name: string;
  path: string;
  icon?: React.ReactNode;
}

interface SidebarProps {
  sections: SidebarSection[];
}

export function Sidebar({ sections }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-48 bg-white min-h-screen border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <img
          src="/True-Hospital-Logo.webp"
          alt="T.R.U.E. Hospitals"
          className="w-auto p-2"
        />
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 flex flex-col py-4">
        {sections.map((section) => (
          <Link
            key={section.path}
            to={section.path}
            className={`relative pl-2 pr-6 py-3 text-sm font-medium text-gray-700 flex items-center space-x-3
              ${isActive(section.path) ? 'bg-[#EFF6FF] rounded-r-lg' : 'hover:bg-[#EFF6FF]'}
            `}
          >
            {isActive(section.path) && (
              <div className="absolute left-0 top-0 h-full w-1 bg-[#154D92] rounded-r-full" />
            )}
            {section.icon && <span className="text-bg-[#154D92]">{section.icon}</span>}
            <span>{section.name}</span>
          </Link>
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div className="border-gray-200 py-4">
        <button
          onClick={handleLogout}
          className="w-full pl-2 pr-6 py-3 text-sm font-medium text-red-600 flex items-center space-x-3 hover:bg-red-50"
        >
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}