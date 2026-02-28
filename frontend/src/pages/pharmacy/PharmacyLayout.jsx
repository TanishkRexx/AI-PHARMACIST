import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  TrendingUp,
  Truck,
  Brain,
  Bell,
  LogOut,
  AlertTriangle,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { pharmacyService } from '../../api/pharmacyService';
import NotificationPanel from '../../components/pharmacy/NotificationPanel';

export default function PharmacyLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [alerts, setAlerts] = useState({ lowStock: 0, outOfStock: 0 });
  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    loadAlerts();
    
    // Refresh alerts every 2 minutes
    const interval = setInterval(loadAlerts, 120000);
    return () => clearInterval(interval);
  }, []);

  // Reload alerts when navigating to certain pages
  useEffect(() => {
    if (location.pathname.includes('inventory') || 
        location.pathname.includes('orders') ||
        location.pathname.includes('procurement')) {
      loadAlerts();
    }
  }, [location.pathname]);

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

  const handleNotificationCountChange = (count) => {
    setNotificationCount(count);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white border-r flex flex-col h-screen
        transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>

        {/* Mobile Close Button */}
        <div className="lg:hidden absolute right-2 top-2">
          <button 
            onClick={() => setSidebarOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Pharmacy Info */}
        <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-gradient-to-r from-purple-500 to-pink-500 text-white flex items-center justify-center rounded-full font-bold">
              {user?.name?.[0]?.toUpperCase() || 'P'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 truncate">{user?.name || 'Pharmacy'}</p>
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
              onClick={() => setSidebarOpen(false)}
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
        {/* Header */}
        <header className="bg-white border-b px-4 lg:px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left - Menu Button & Title */}
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu size={20} />
              </button>
              
              <div className="leading-tight">
                <h1 className="text-lg font-bold text-gray-800">
                  Welcome, {user?.name?.split(' ')[0] || 'User'}! 🏥
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Notification Button */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`relative p-2 rounded-lg transition ${
                    showNotifications ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100'
                  }`}
                >
                  <Bell className="w-5 h-5" />
                  {notificationCount > 0 && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs flex items-center justify-center rounded-full font-bold"
                    >
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </motion.span>
                  )}
                </button>

                {/* Notification Panel */}
                <NotificationPanel
                  isOpen={showNotifications}
                  onClose={() => setShowNotifications(false)}
                  onNotificationCountChange={handleNotificationCountChange}
                />
              </div>

              {/* Profile */}
              <div className="hidden sm:flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-xl border">
                <div className="h-8 w-8 bg-gradient-to-r from-purple-500 to-pink-500 text-white flex items-center justify-center rounded-full font-bold text-sm">
                  {user?.name?.[0]?.toUpperCase() || 'P'}
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-gray-800">
                    {user?.name || 'Pharmacy'}
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
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}