import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  Calendar
} from 'lucide-react';
import {
  AreaChart,
  Area,
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
import { pharmacyService } from '../../api/pharmacyService';
import StatCard from '../../components/common/StatCard';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [salesData, setSalesData] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [inventoryHealth, setInventoryHealth] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, [days]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [salesRes, productsRes, healthRes] = await Promise.all([
        pharmacyService.getSalesAnalytics(days),
        pharmacyService.getTopProducts(days, 10),
        pharmacyService.getInventoryHealth()
      ]);

      if (salesRes.success) setSalesData(salesRes.data);
      if (productsRes.success) setTopProducts(productsRes.data.top_products);
      if (healthRes.success) setInventoryHealth(healthRes.data);
    } catch (error) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading fullScreen text="Loading analytics..." />;

  const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Analytics</h1>
          <p className="text-sm text-gray-500">Sales performance and insights</p>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={`₹${(salesData?.summary?.total_revenue || 0).toLocaleString()}`}
          icon={<DollarSign size={20} />}
          color="green"
          gradient
        />
        <StatCard
          title="Total Orders"
          value={salesData?.summary?.total_orders || 0}
          icon={<ShoppingCart size={20} />}
          color="blue"
          gradient
        />
        <StatCard
          title="Avg Order Value"
          value={`₹${(salesData?.summary?.average_order_value || 0).toFixed(0)}`}
          icon={<TrendingUp size={20} />}
          color="purple"
          gradient
        />
        <StatCard
          title="Inventory Health"
          value={`${inventoryHealth?.health_score || 0}%`}
          subtitle={inventoryHealth?.status}
          icon={<Package size={20} />}
          color="cyan"
          gradient
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl shadow-md border"
        >
          <h3 className="font-bold text-gray-800 mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={salesData?.daily_data || []}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis />
              <Tooltip
                formatter={(value) => [`₹${value}`, 'Revenue']}
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Orders Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-2xl shadow-md border"
        >
          <h3 className="font-bold text-gray-800 mb-4">Daily Orders</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesData?.daily_data || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { day: 'numeric' })}
              />
              <YAxis />
              <Tooltip
                formatter={(value) => [value, 'Orders']}
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <Bar dataKey="orders" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-2xl shadow-md border"
        >
          <h3 className="font-bold text-gray-800 mb-4">Top Selling Products</h3>
          <div className="space-y-3">
            {topProducts.map((product, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center font-bold text-sm">
                    {product.rank}
                  </span>
                  <div>
                    <p className="font-medium text-gray-800">{product.medicine_name}</p>
                    <p className="text-xs text-gray-500">{product.total_quantity} units sold</p>
                  </div>
                </div>
                <span className="font-bold text-gray-800">₹{product.total_revenue}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Inventory Health */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-2xl shadow-md border"
        >
          <h3 className="font-bold text-gray-800 mb-4">Inventory Health</h3>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Healthy', value: inventoryHealth?.breakdown?.healthy_stock || 0 },
                    { name: 'Low Stock', value: inventoryHealth?.breakdown?.low_stock || 0 },
                    { name: 'Out of Stock', value: inventoryHealth?.breakdown?.out_of_stock || 0 }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  dataKey="value"
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              <span className="text-sm text-gray-600">Healthy ({inventoryHealth?.breakdown?.healthy_stock})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
              <span className="text-sm text-gray-600">Low ({inventoryHealth?.breakdown?.low_stock})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full"></span>
              <span className="text-sm text-gray-600">Out ({inventoryHealth?.breakdown?.out_of_stock})</span>
            </div>
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-xl text-center">
            <p className="text-3xl font-bold text-gray-800">{inventoryHealth?.health_score}%</p>
            <p className={`text-sm font-medium ${
              inventoryHealth?.status === 'excellent' ? 'text-green-600' :
              inventoryHealth?.status === 'good' ? 'text-blue-600' :
              inventoryHealth?.status === 'fair' ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {inventoryHealth?.status?.toUpperCase()} Health
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}