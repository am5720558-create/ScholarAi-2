import React from 'react';
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '../constants';
import { LogOut, GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  closeMobile: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, closeMobile }) => {
  const { logout } = useAuth();

  const baseClasses = "fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0";
  const mobileClasses = isOpen ? "translate-x-0" : "-translate-x-full";

  return (
    <div className={`${baseClasses} ${mobileClasses} flex flex-col`}>
      <div className="flex items-center justify-center h-16 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2 text-primary dark:text-indigo-400">
          <GraduationCap size={32} />
          <span className="text-xl font-bold tracking-tight">ScholarAI</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {NAV_ITEMS.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                onClick={closeMobile}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary text-white shadow-md"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`
                }
              >
                <span className="mr-3">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={logout}
          className="flex items-center w-full px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <LogOut size={20} className="mr-3" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;