import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { distributorService } from '../../api/distributorService';
import StatCard from '../../components/common/StatCard';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

export default function DistributorDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await distributorService.getDashboard();
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

  const statusFlow = [
    { status: 'Pending', count: dashboard.orders.pending, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    { status: 'Shipped', count: dashboard.orders.shipped, color: 'text-blue-600', bg: 'bg-blue-100' },
    { status: 'Delivered', count: dashboard.orders.delivered, color: 'text-green-600', bg: 'bg-green-100' }
  ];

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white p-6 rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80">Distribution Overview</p>
            <h2 className="text-2xl font-bold mt-1">Distributor Dashboard</h2>
            <p className="text-sm opacity-80 mt-2">
              {dashboard.orders.pending} pending • {dashboard.orders.shipped} in transit
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
          icon={<Package size={20} />}
          color="blue"
          gradient
          onClick={() => navigate('/distributor/orders')}
        />
        <StatCard
          title="Pending Shipment"
          value={dashboard.orders.pending}
          icon={<Clock size={20} />}
          color="orange"
          gradient
          onClick={() => navigate('/distributor/orders?status=pending')}
        />
        <StatCard
          title="In Transit"
          value={dashboard.orders.shipped}
          icon={<Truck size={20} />}
          color="purple"
          gradient
          onClick={() => navigate('/distributor/orders?status=shipped')}
        />
        <StatCard
          title="Total Revenue"
          value={`₹${dashboard.revenue.toLocaleString()}`}
          icon={<DollarSign size={20} />}
          color="green"
          gradient
          onClick={() => navigate('/distributor/analytics')}
        />
      </div>

      {/* Order Flow */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 rounded-2xl shadow-md border"
      >
        <h3 className="font-bold text-gray-800 mb-6">Order Pipeline</h3>
        <div className="flex items-center justify-between">
          {statusFlow.map((item, index) => (
            <div key={item.status} className="flex items-center">
              <div className="text-center">
                <div className={`w-20 h-20 rounded-full ${item.bg} flex items-center justify-center mx-auto mb-2`}>
                  <span className={`text-2xl font-bold ${item.color}`}>{item.count}</span>
                </div>
                <p className="text-sm font-medium text-gray-700">{item.status}</p>
              </div>
              {index < statusFlow.length - 1 && (
                <div className="flex-1 px-4">
                  <div className="h-1 bg-gray-200 rounded-full relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ delay: index * 0.3, duration: 0.5 }}
                      className="absolute h-full bg-emerald-500 rounded-full"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Quick Actions & Recent Orders */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-6 rounded-2xl shadow-md border"
        >
          <h3 className="font-bold text-gray-800 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/distributor/orders?status=pending')}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl hover:shadow-md transition"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500 text-white rounded-lg">
                  <Package size={20} />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-800">Process Pending Orders</p>
                  <p className="text-sm text-gray-500">{dashboard.orders.pending} orders waiting</p>
                </div>
              </div>
              <ArrowRight className="text-gray-400" size={20} />
            </button>

            <button
              onClick={() => navigate('/distributor/orders?status=shipped')}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl hover:shadow-md transition"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 text-white rounded-lg">
                  <Truck size={20} />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-800">Track Shipments</p>
                  <p className="text-sm text-gray-500">{dashboard.orders.shipped} in transit</p>
                </div>
              </div>
              <ArrowRight className="text-gray-400" size={20} />
            </button>

            <button
              onClick={() => navigate('/distributor/analytics')}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl hover:shadow-md transition"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500 text-white rounded-lg">
                  <TrendingUp size={20} />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-800">View Analytics</p>
                  <p className="text-sm text-gray-500">Performance insights</p>
                </div>
              </div>
              <ArrowRight className="text-gray-400" size={20} />
            </button>
          </div>
        </motion.div>

        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-6 rounded-2xl shadow-md border"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800">Recent Orders</h3>
            <button
              onClick={() => navigate('/distributor/orders')}
              className="text-sm text-emerald-600 hover:underline"
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
                  onClick={() => navigate(`/distributor/orders/${order.id}`)}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition"
                >
                  <div>
                    <p className="font-semibold text-gray-800">{order.po_number}</p>
                    <p className="text-sm text-gray-500">{order.items_count} items</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800">₹{order.total_amount}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-600' :
                      order.status === 'shipped' ? 'bg-blue-100 text-blue-600' :
                      'bg-yellow-100 text-yellow-600'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}