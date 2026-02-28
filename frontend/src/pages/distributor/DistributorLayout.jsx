import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  TrendingUp,
  Truck,
  Bell,
  LogOut,
  Heart
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import { distributorService } from '../../api/distributorService';

export default function DistributorLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pendingOrders, setPendingOrders] = useState(0);

  useEffect(() => {
    loadPendingCount();
  }, []);

  const loadPendingCount = async () => {
    try {
      const response = await distributorService.getDashboard();
      if (response.success) {
        setPendingOrders(response.data.orders.pending || 0);
      }
    } catch (error) {
      console.error('Failed to load pending count');
    }
  };

  const navItems = [
    { to: '/distributor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { 
      to: '/distributor/orders', 
      icon: Package, 
      label: 'Orders',
      badge: pendingOrders > 0 ? pendingOrders : null
    },
    { to: '/distributor/analytics', icon: TrendingUp, label: 'Analytics' }
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col h-screen sticky top-0">
        {/* Logo */}
        <div className="p-3 border-b">
          <div className="flex items-center gap-3">
<div className="h-10 w-10 rounded-xl overflow-hidden">
  <img
    src="/logo.png"
    alt="GoMed Logo"
    className="h-full w-full object-contain"
  />
</div>
            <div>
              <h2 className="font-bold text-gray-800">GoMed</h2>
              <p className="text-xs text-gray-500">Distributor Portal</p>
            </div>
          </div>
        </div>


        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                  {item.badge && (
                    <span className={`ml-auto px-2 py-0.5 text-xs font-bold rounded-full ${
                      isActive ? 'bg-white text-emerald-600' : 'bg-emerald-500 text-white'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Stats Summary */}
        <div className="mx-3 mb-3 p-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Truck size={18} />
            <span className="font-medium text-sm">Quick Stats</span>
          </div>
          <div className="text-2xl font-bold">{pendingOrders}</div>
          <div className="text-xs opacity-80">Orders pending shipment</div>
        </div>

        {/* Logout */}
        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
<header className="bg-white border-b px-6 py-2">
  <div className="flex items-center justify-between">

    {/* LEFT */}
    <div className="leading-tight">
      <h1 className="text-lg font-bold text-gray-800">
        Welcome, {user?.name?.split(' ')[0]}! 🚚
      </h1>

      <p className="text-xs text-gray-500">
        {new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </p>
    </div>

    {/* RIGHT */}
    <div className="flex items-center gap-4">

      {/* Notification */}
      <button className="relative p-2 hover:bg-gray-100 rounded-lg">
        <Bell className="w-5 h-5 text-gray-600" />

        {pendingOrders > 0 && (
          <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 text-white text-xs flex items-center justify-center rounded-full">
            {pendingOrders}
          </span>
        )}
      </button>

      {/* User Profile */}
      <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-xl border">

        <div className="h-8 w-8 bg-gradient-to-r from-emerald-500 to-teal-500 text-white flex items-center justify-center rounded-full font-bold text-sm">
          {user?.name?.[0]?.toUpperCase()}
        </div>

        <div className="leading-tight">
          <p className="text-sm font-semibold text-gray-800">
            {user?.name}
          </p>
          <p className="text-xs text-gray-500">
            Distributor Manager
          </p>
        </div>

      </div>

    </div>

  </div>
</header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}