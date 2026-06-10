import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiHome, HiUsers, HiCurrencyRupee, HiMap, HiClipboardList, HiCalendar, HiSpeakerphone, HiLogout, HiX } from 'react-icons/hi';
import { MdFoodBank, MdAssignment } from 'react-icons/md';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout, isAdmin, isAccountant, isRoutePlanner } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', icon: <HiHome />, label: 'Dashboard', show: true },
    { to: '/members', icon: <HiUsers />, label: 'Members', show: true },
    { to: '/finance', icon: <HiCurrencyRupee />, label: 'Finance', show: isAccountant || user?.role === 'member' },
    { to: '/routes', icon: <HiMap />, label: 'Routes', show: true },
    { to: '/tasks', icon: <HiClipboardList />, label: 'Tasks', show: true },
    { to: '/duties', icon: <MdAssignment />, label: 'Duty Roster', show: true },
    { to: '/attendance', icon: <HiCalendar />, label: 'Attendance', show: true },
    { to: '/meals', icon: <MdFoodBank />, label: 'Meals', show: true },
    { to: '/announcements', icon: <HiSpeakerphone />, label: 'Announcements', show: true },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 z-50 bg-surface-900/95 backdrop-blur-xl border-r border-surface-700/50 flex flex-col transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="p-5 border-b border-surface-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-emerald-400 flex items-center justify-center text-xl">🕌</div>
              <div>
                <h1 className="text-lg font-bold text-surface-100">Jamat</h1>
                <p className="text-xs text-surface-500">Management System</p>
              </div>
            </div>
            <button onClick={onClose} className="lg:hidden p-1 rounded-lg hover:bg-surface-800 text-surface-400">
              <HiX size={20} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.filter(item => item.show).map(item => (
            <NavLink key={item.to} to={item.to} onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-500/15 text-primary-400 border border-primary-500/20'
                    : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800'
                }`
              }>
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-surface-700/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-emerald-400 flex items-center justify-center text-sm font-bold text-white">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-200 truncate">{user?.name}</p>
              <p className="text-xs text-surface-500 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors">
            <HiLogout /> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
