import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Package,
  TrendingUp,
  Brain,
  Shield,
  Bell,
  LogOut,
  Heart
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/orders', icon: ShoppingCart, label: 'All Orders' },
    { to: '/admin/inventory', icon: Package, label: 'Inventory' },
    { to: '/admin/analytics', icon: TrendingUp, label: 'Analytics' },
    { to: '/admin/ai-observability', icon: Brain, label: 'AI Observability' }
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-r from-red-600 to-orange-500 text-white flex items-center justify-center rounded-xl">
              <Shield size={20} />
            </div>
            <div>
              <h2 className="font-bold text-white">GoMed</h2>
              <p className="text-xs text-gray-400">Admin Console</p>
            </div>
          </div>
        </div>

        {/* Admin Info */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-r from-red-500 to-orange-500 text-white flex items-center justify-center rounded-full font-bold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-400">System Admin</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-lg'
                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                }`
              }
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600/20 text-red-400 rounded-xl font-medium hover:bg-red-600/30 transition"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">
                Admin Dashboard
              </h1>
              <p className="text-sm text-gray-400">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <button className="relative p-2 hover:bg-gray-700 rounded-lg">
              <Bell className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-900">
          <Outlet />
        </main>
      </div>
    </div>
  );
}