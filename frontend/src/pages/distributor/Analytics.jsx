import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Package,
  Truck,
  CheckCircle,
  Calendar,
  DollarSign
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { distributorService } from '../../api/distributorService';
import StatCard from '../../components/common/StatCard';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

export default function DistributorAnalytics() {
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, [days]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await distributorService.getAnalytics(days);
      if (response.success) {
        setAnalytics(response.data);
      }
    } catch (error) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading fullScreen text="Loading analytics..." />;
  if (!analytics) return null;

  const statusData = Object.entries(analytics.status_breakdown || {}).map(([status, data]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: data.count,
    amount: data.value
  }));

  const COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Analytics</h1>
          <p className="text-sm text-gray-500">Distribution performance insights</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-gray-400" />
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-4 py-2 border rounded-xl"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Orders"
          value={analytics.total_orders}
          icon={<Package size={20} />}
          color="blue"
          gradient
        />
        <StatCard
          title="Total Value"
          value={`₹${analytics.total_value.toLocaleString()}`}
          icon={<DollarSign size={20} />}
          color="green"
          gradient
        />
        <StatCard
          title="Avg. Order Value"
          value={`₹${analytics.total_orders > 0 ? Math.round(analytics.total_value / analytics.total_orders).toLocaleString() : 0}`}
          icon={<TrendingUp size={20} />}
          color="purple"
          gradient
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Status Breakdown Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl shadow-md border"
        >
          <h3 className="font-bold text-gray-800 mb-4">Order Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [value, 'Orders']} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Revenue by Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-2xl shadow-md border"
        >
          <h3 className="font-bold text-gray-800 mb-4">Revenue by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} />
              <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Status Breakdown Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white p-6 rounded-2xl shadow-md border"
      >
        <h3 className="font-bold text-gray-800 mb-4">Detailed Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statusData.map((item, index) => (
            <div
              key={item.name}
              className="p-4 rounded-xl text-center"
              style={{ backgroundColor: `${COLORS[index]}20` }}
            >
              <p className="text-3xl font-bold" style={{ color: COLORS[index] }}>
                {item.value}
              </p>
              <p className="text-sm text-gray-600">{item.name}</p>
              <p className="text-sm font-semibold text-gray-800 mt-1">
                ₹{item.amount?.toLocaleString() || 0}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Period Info */}
      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-center">
        <p className="text-emerald-700">
          Showing data for the last <strong>{analytics.period_days} days</strong>
        </p>
      </div>
    </div>
  );
}