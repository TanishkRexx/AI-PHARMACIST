import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Pill,
  ShoppingCart,
  PackageSearch,
  MessageSquare,
  Sparkles,
  User,
  LogOut,
   Heart,
  Bell,
  NotepadText,
  SquareActivity
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

export default function CustomerLayout() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();

  const navItems = [
    { to: '/customer/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/customer/medicines', icon: Pill, label: 'Medicines' },
    { to: '/customer/currentPrescription', icon: NotepadText, label: 'Current Prescription' },
    { to: '/customer/currentTherapy', icon: SquareActivity, label: 'Current Therapy' },
    { to: '/customer/cart', icon: ShoppingCart, label: 'Cart', badge: itemCount },
    { to: '/customer/orders', icon: PackageSearch, label: 'Orders' },
    { to: '/customer/chat', icon: MessageSquare, label: 'AI Chat' },
    { to: '/customer/recommendations', icon: Sparkles, label: 'For You' },
    { to: '/customer/profile', icon: User, label: 'Profile' }
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <aside className="w-64 bg-white border-r flex flex-col h-screen sticky top-0">
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
<div className="h-10 w-10 rounded-xl overflow-hidden">
  <img
    src="/mainlogo.png"
    alt="GoMed Logo"
    className="h-full w-full object-contain"
  />
</div>
            <div>
              <h2 className="font-bold text-gray-800">GoMed</h2>
              <p className="text-xs text-gray-500">Patient Portal</p>
            </div>
          </div>
        </div>


        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                  {item.badge > 0 && (
                    <span
                      className={`ml-auto px-2 py-0.5 text-xs font-bold rounded-full ${
                        isActive ? 'bg-white text-blue-600' : 'bg-blue-100 text-blue-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

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

      <div className="flex-1 flex flex-col min-w-0">
      <header className="bg-white border-b px-6 py-2">
        <div className="flex items-center justify-between">

    {/* LEFT SIDE */}
    <div>
      <h1 className="text-xl font-bold text-gray-800">
        Welcome back, {user?.name?.split(" ")[0]} 👋
      </h1>

      <p className="text-sm text-gray-500">
        {new Date().toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>
    </div>

    {/* RIGHT SIDE */}
    <div className="flex items-center gap-4">

      {/* Notification */}
      <button className="relative p-2 rounded-lg hover:bg-gray-100 transition">
        <Bell className="w-5 h-5 text-gray-600" />

        <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
      </button>

      {/* USER PROFILE CARD */}
      <div className="flex items-center gap-3 bg-gray-50 px-3 py-2 rounded-xl border">

        {/* Avatar */}
        <div className="h-9 w-9 bg-gradient-to-r from-blue-500 to-cyan-500 text-white flex items-center justify-center rounded-full font-bold text-sm">
          {user?.name?.[0]?.toUpperCase()}
        </div>

        {/* User Info */}
        <div className="leading-tight">
          <p className="text-sm font-semibold text-gray-800">
            {user?.name}
          </p>

          <p className="text-xs text-gray-500">
            {user?.email}
          </p>
        </div>

      </div>

    </div>
  </div>
</header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-2">
          <Outlet />
        </main>
      </div>
    </div>
  );
}