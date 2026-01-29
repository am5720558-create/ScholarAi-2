import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu, X, Moon, Sun, Bell, Settings, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    // Load existing key
    setApiKey(localStorage.getItem('scholar_api_key') || '');
  }, []);

  const saveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('scholar_api_key', apiKey.trim());
    } else {
      localStorage.removeItem('scholar_api_key');
    }
    setShowSettings(false);
    alert("Settings saved. You can now use the app.");
    window.location.reload(); // Reload to refresh services
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Settings className="text-primary" /> Settings
              </h2>
              <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Gemini API Key (Local Mode)
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  The backend connection failed. Enter your API key here to run the app directly in your browser.
                  This key is saved locally in your browser.
                </p>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <button 
                onClick={saveApiKey}
                className="w-full py-2 bg-primary text-white rounded-lg font-medium hover:bg-indigo-700 flex justify-center items-center gap-2"
              >
                <Save size={18} /> Save & Reload
              </button>
              <div className="text-center">
                 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                   Get a free API Key here
                 </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} closeMobile={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between h-16 px-4 sm:px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm z-10">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Menu size={24} />
            </button>
            <h1 className="ml-4 text-xl font-semibold hidden sm:block lg:hidden">ScholarAI</h1>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
             <button 
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Settings & API Key"
            >
              <Settings size={20} />
            </button>

            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {darkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
            </button>
            
            <div className="relative">
              <Bell size={20} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer" />
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
            </div>

            <div className="flex items-center ml-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white font-bold text-sm">
                {user?.name.charAt(0)}
              </div>
              <span className="ml-2 text-sm font-medium hidden md:block text-gray-700 dark:text-gray-200">
                {user?.name}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;