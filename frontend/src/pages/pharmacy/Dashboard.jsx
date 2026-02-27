import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Package,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle,
  TrendingUp,
  Brain,
  Truck,
  RefreshCw
} from 'lucide-react';
import { pharmacyService } from '../../api/pharmacyService';
import StatCard from '../../components/common/StatCard';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

export default function PharmacyDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await pharmacyService.getDashboard();
      if (response.success) {
        setDashboard(response.data);
      }
    } catch (error) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading fullScreen text="Loading dashboard..." />;
  if (!dashboard) return null;

  const quickActions = [
    {
      title: 'Process Orders',
      count: dashboard.orders.pending,
      icon: <ShoppingCart size={20} />,
      color: 'bg-blue-500',
      onClick: () => navigate('/pharmacy/orders')
    },
    {
      title: 'Restock Inventory',
      count: dashboard.inventory.low_stock + dashboard.inventory.out_of_stock,
      icon: <Package size={20} />,
      color: 'bg-orange-500',
      onClick: () => navigate('/pharmacy/procurement')
    },
    {
      title: 'View Analytics',
      icon: <TrendingUp size={20} />,
      color: 'bg-green-500',
      onClick: () => navigate('/pharmacy/analytics')
    },
    {
      title: 'AI Forecasting',
      icon: <Brain size={20} />,
      color: 'bg-purple-500',
      onClick: () => navigate('/pharmacy/ai-forecasting')
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-600 to-pink-500 text-white p-6 rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80">Today's Overview</p>
            <h2 className="text-2xl font-bold mt-1">Pharmacy Dashboard</h2>
            <p className="text-sm opacity-80 mt-2">
              {dashboard.orders.pending} orders pending • {dashboard.inventory.low_stock} low stock items
            </p>
          </div>
          <button
            onClick={loadDashboard}
            className="p-3 bg-white/20 rounded-xl hover:bg-white/30 transition"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Orders"
          value={dashboard.orders.total}
          subtitle={`${dashboard.orders.today} today`}
          icon={<ShoppingCart size={20} />}
          color="blue"
          onClick={() => navigate('/pharmacy/orders')}
        />
        <StatCard
          title="Pending Orders"
          value={dashboard.orders.pending}
          subtitle={`${dashboard.orders.confirmed} confirmed`}
          icon={<Clock size={20} />}
          color="orange"
          onClick={() => navigate('/pharmacy/orders?status=pending')}
        />
        <StatCard
          title="Total Revenue"
          value={`₹${dashboard.revenue.total.toLocaleString()}`}
          icon={<DollarSign size={20} />}
          color="green"
          onClick={() => navigate('/pharmacy/analytics')}
        />
        <StatCard
          title="Total Medicines"
          value={dashboard.inventory.total_medicines}
          subtitle={`${dashboard.inventory.out_of_stock} out of stock`}
          icon={<Package size={20} />}
          color="purple"
          onClick={() => navigate('/pharmacy/inventory')}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, index) => (
          <motion.div
            key={action.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02, y: -2 }}
            onClick={action.onClick}
            className="bg-white p-5 rounded-2xl shadow-md border hover:shadow-lg cursor-pointer transition"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl text-white ${action.color}`}>
                  {action.icon}
                </div>
                <span className="font-medium text-gray-800">{action.title}</span>
              </div>
              {action.count !== undefined && action.count > 0 && (
                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                  {action.count}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-6 rounded-2xl shadow-md border"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800">Recent Orders</h3>
            <button
              onClick={() => navigate('/pharmacy/orders')}
              className="text-sm text-purple-600 hover:underline"
            >
              View all
            </button>
          </div>

          {dashboard.recent_orders.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No recent orders</p>
          ) : (
            <div className="space-y-3">
              {dashboard.recent_orders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => navigate(`/pharmacy/orders/${order.id}`)}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition"
                >
                  <div>
                    <p className="font-semibold text-gray-800">{order.order_number}</p>
                    <p className="text-sm text-gray-500">{order.customer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800">₹{order.total_amount}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-600' :
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Low Stock Items */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-6 rounded-2xl shadow-md border"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <AlertTriangle className="text-red-500" size={18} />
              Low Stock Alert
            </h3>
            <button
              onClick={() => navigate('/pharmacy/inventory?stock_status=low')}
              className="text-sm text-purple-600 hover:underline"
            >
              View all
            </button>
          </div>

          {dashboard.low_stock_items.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle size={40} className="mx-auto text-green-500 mb-2" />
              <p className="text-green-600 font-medium">All stock levels healthy!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dashboard.low_stock_items.map((item) => {
                const percent = Math.round((item.stock / item.reorder_level) * 100);
                return (
                  <div key={item.id} className="p-4 bg-red-50 rounded-xl border border-red-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-gray-800">{item.name}</p>
                      <span className="text-red-600 font-bold">{item.stock} left</span>
                    </div>
                    <div className="h-2 bg-red-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Reorder level: {item.reorder_level}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {dashboard.low_stock_items.length > 0 && (
            <button
              onClick={() => navigate('/pharmacy/procurement')}
              className="w-full mt-4 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg transition flex items-center justify-center gap-2"
            >
              <Truck size={18} />
              Create Reorder
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
}