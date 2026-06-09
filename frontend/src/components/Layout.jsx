import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { HiMenuAlt2 } from 'react-icons/hi';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen islamic-pattern">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="lg:ml-64 min-h-screen">
        {/* Top Bar (mobile) */}
        <header className="lg:hidden sticky top-0 z-30 bg-surface-900/90 backdrop-blur-xl border-b border-surface-700/50 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-surface-800 text-surface-400">
            <HiMenuAlt2 size={22} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg">🕌</span>
            <span className="font-semibold text-surface-200">Jamat Manager</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
