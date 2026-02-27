import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  ShoppingCart,
  Package,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Building,
  Truck,
  UserCheck,
  RefreshCw
} from 'lucide-react';
import { adminService } from '../../api/adminService';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await adminService.getDashboard();
      if (response.success) {
        setDashboard(response.data);
      }
    } catch (error) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading fullScreen text="Loading admin dashboard..." />;
  if (!dashboard) return null;

  const stats = [
    {
      title: 'Total Users',
      value: dashboard.users.total,
      icon: Users,
      color: 'from-blue-600 to-cyan-500',
      onClick: () => navigate('/admin/users')
    },
    {
      title: 'Customers',
      value: dashboard.users.customers,
      icon: UserCheck,
      color: 'from-green-600 to-emerald-500'
    },
    {
      title: 'Pharmacies',
      value: dashboard.users.pharmacies,
      icon: Building,
      color: 'from-purple-600 to-pink-500'
    },
    {
      title: 'Distributors',
      value: dashboard.users.distributors,
      icon: Truck,
      color: 'from-orange-600 to-yellow-500'
    },
    {
      title: 'Total Orders',
      value: dashboard.orders.total,
      icon: ShoppingCart,
      color: 'from-indigo-600 to-blue-500',
      onClick: () => navigate('/admin/orders')
    },
    {
      title: 'Orders Today',
      value: dashboard.orders.today,
      icon: TrendingUp,
      color: 'from-cyan-600 to-teal-500'
    },
    {
      title: 'Total Revenue',
      value: `₹${dashboard.revenue.total.toLocaleString()}`,
      icon: DollarSign,
      color: 'from-emerald-600 to-green-500'
    },
    {
      title: 'Total Medicines',
      value: dashboard.inventory.total_medicines,
      icon: Package,
      color: 'from-pink-600 to-rose-500',
      onClick: () => navigate('/admin/inventory')
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">System Overview</h1>
          <p className="text-gray-400">Complete platform analytics</p>
        </div>
        <button
          onClick={loadDashboard}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02, y: -2 }}
              onClick={stat.onClick}
              className={`bg-gradient-to-r ${stat.color} p-5 rounded-2xl text-white shadow-lg ${stat.onClick ? 'cursor-pointer' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm opacity-80">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className="p-2 bg-white/20 rounded-xl">
                  <Icon size={20} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Alerts */}
      {(dashboard.inventory.low_stock > 0 || dashboard.inventory.out_of_stock > 0 || dashboard.orders.pending > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 p-6 rounded-2xl border border-gray-700"
        >
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="text-yellow-500" size={20} />
            System Alerts
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            {dashboard.orders.pending > 0 && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                <p className="text-yellow-500 font-semibold">{dashboard.orders.pending} Pending Orders</p>
                <p className="text-xs text-gray-400 mt-1">Require attention</p>
              </div>
            )}
            {dashboard.inventory.low_stock > 0 && (
              <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                <p className="text-orange-500 font-semibold">{dashboard.inventory.low_stock} Low Stock Items</p>
                <p className="text-xs text-gray-400 mt-1">Need reorder</p>
              </div>
            )}
            {dashboard.inventory.out_of_stock > 0 && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-red-500 font-semibold">{dashboard.inventory.out_of_stock} Out of Stock</p>
                <p className="text-xs text-gray-400 mt-1">Critical</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gray-800 p-6 rounded-2xl border border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white">Recent Orders</h3>
            <button
              onClick={() => navigate('/admin/orders')}
              className="text-sm text-cyan-400 hover:underline"
            >
              View all
            </button>
          </div>
          <div className="space-y-3">
            {dashboard.recent_orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-3 bg-gray-700/50 rounded-xl"
              >
                <div>
                  <p className="font-medium text-white">{order.order_number}</p>
                  <p className="text-xs text-gray-400">{order.customer_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-white">₹{order.total_amount}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    order.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                    order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Users */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gray-800 p-6 rounded-2xl border border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white">Recent Users</h3>
            <button
              onClick={() => navigate('/admin/users')}
              className="text-sm text-cyan-400 hover:underline"
            >
              View all
            </button>
          </div>
          <div className="space-y-3">
            {dashboard.recent_users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 bg-gray-700/50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {user.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-white">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  user.role === 'customer' ? 'bg-blue-500/20 text-blue-400' :
                  user.role === 'pharmacy' ? 'bg-purple-500/20 text-purple-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {user.role}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}