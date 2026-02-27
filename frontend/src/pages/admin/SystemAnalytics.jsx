import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Calendar
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { adminService } from '../../api/adminService';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

export default function SystemAnalytics() {
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, [days]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await adminService.getSystemAnalytics(days);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">System Analytics</h1>
          <p className="text-gray-400">Platform-wide performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-gray-400" />
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Daily Orders Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 p-6 rounded-2xl border border-gray-700"
        >
          <h3 className="font-bold text-white mb-4">Daily Orders & Revenue</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analytics.daily_orders || []}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
                formatter={(value, name) => [name === 'revenue' ? `₹${value}` : value, name]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#06b6d4"
                strokeWidth={2}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Top Categories */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800 p-6 rounded-2xl border border-gray-700"
        >
          <h3 className="font-bold text-white mb-4">Top Categories by Revenue</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.top_categories || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#9ca3af" />
              <YAxis dataKey="category" type="category" stroke="#9ca3af" width={100} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
                formatter={(value) => [`₹${value}`, 'Revenue']}
              />
              <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Top Categories List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gray-800 p-6 rounded-2xl border border-gray-700"
      >
        <h3 className="font-bold text-white mb-4">Category Breakdown</h3>
        <div className="grid md:grid-cols-5 gap-4">
          {analytics.top_categories?.map((cat, index) => (
            <div key={index} className="p-4 bg-gray-700/50 rounded-xl">
              <p className="text-gray-400 text-sm capitalize">{cat.category}</p>
              <p className="text-xl font-bold text-white mt-1">₹{cat.revenue}</p>
              <p className="text-xs text-gray-500">{cat.quantity} units</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Period Info */}
      <div className="bg-cyan-500/10 border border-cyan-500/30 p-4 rounded-xl text-center">
        <p className="text-cyan-400">
          Showing analytics for the last <strong>{analytics.period_days} days</strong>
        </p>
      </div>
    </div>
  );
}