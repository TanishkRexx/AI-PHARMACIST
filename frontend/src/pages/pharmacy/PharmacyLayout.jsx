import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  TrendingUp,
  Truck,
  Brain,
  Bell,
  LogOut,
  Heart,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import { pharmacyService } from '../../api/pharmacyService';

export default function PharmacyLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState({ lowStock: 0, outOfStock: 0 });

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const response = await pharmacyService.getLowStockAlerts();
      if (response.success) {
        setAlerts({
          lowStock: response.data.low_stock.count,
          outOfStock: response.data.out_of_stock.count
        });
      }
    } catch (error) {
      console.error('Failed to load alerts');
    }
  };

  const navItems = [
    { to: '/pharmacy/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { 
      to: '/pharmacy/inventory', 
      icon: Package, 
      label: 'Inventory',
      badge: alerts.lowStock + alerts.outOfStock > 0 ? alerts.lowStock + alerts.outOfStock : null,
      badgeColor: 'bg-red-500'
    },
    { to: '/pharmacy/orders', icon: ShoppingCart, label: 'Orders' },
    { to: '/pharmacy/procurement', icon: Truck, label: 'Procurement' },
    { to: '/pharmacy/analytics', icon: TrendingUp, label: 'Analytics' },
    { to: '/pharmacy/ai-forecasting', icon: Brain, label: 'AI Insights' }
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col h-screen sticky top-0">

        {/* Pharmacy Info */}
        <div className="p-2 border-b bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-gradient-to-r from-purple-500 to-pink-500 text-white flex items-center justify-center rounded-full font-bold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500">Pharmacy Manager</p>
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
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
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
                      isActive ? 'bg-white text-purple-600' : item.badgeColor + ' text-white'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Stock Alert Summary */}
        {(alerts.lowStock > 0 || alerts.outOfStock > 0) && (
          <div className="mx-3 mb-3 p-3 bg-red-50 border border-red-100 rounded-xl">
            <div className="flex items-center gap-2 text-red-600 text-sm font-medium mb-2">
              <AlertTriangle size={16} />
              Stock Alerts
            </div>
            <div className="text-xs text-red-600 space-y-1">
              {alerts.outOfStock > 0 && <p>• {alerts.outOfStock} out of stock</p>}
              {alerts.lowStock > 0 && <p>• {alerts.lowStock} low stock</p>}
            </div>
          </div>
        )}

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
        Welcome, {user?.name?.split(' ')[0]}! 🏥
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

        {(alerts.lowStock + alerts.outOfStock) > 0 && (
          <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 text-white text-xs flex items-center justify-center rounded-full">
            {alerts.lowStock + alerts.outOfStock}
          </span>
        )}
      </button>

      {/* Profile */}
      <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-xl border">

        <div className="h-8 w-8 bg-gradient-to-r from-purple-500 to-pink-500 text-white flex items-center justify-center rounded-full font-bold text-sm">
          {user?.name?.[0]?.toUpperCase()}
        </div>

        <div className="leading-tight">
          <p className="text-sm font-semibold text-gray-800">
            {user?.name}
          </p>
          <p className="text-xs text-gray-500">
            Pharmacy Manager
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