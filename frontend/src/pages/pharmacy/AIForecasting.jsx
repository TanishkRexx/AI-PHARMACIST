import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  ShoppingCart,
  Package,
  DollarSign,
  Zap,
  Target,
  BarChart3,
  PieChart,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Skull,
  Gauge
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
  PieChart as RechartsPie,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { pharmacyService } from '../../api/pharmacyService';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

export default function AIForecasting() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data states
  const [aiSummary, setAISummary] = useState(null);
  const [forecasts, setForecasts] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [optimization, setOptimization] = useState(null);
  const [velocity, setVelocity] = useState(null);
  const [deadStock, setDeadStock] = useState(null);
  const [categoryData, setCategoryData] = useState(null);
  const [revenueForecast, setRevenueForecast] = useState(null);
  const [smartReorder, setSmartReorder] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [
        summaryRes,
        forecastRes,
        anomaliesRes,
        optimizationRes,
        velocityRes,
        deadStockRes,
        categoryRes,
        revenueRes,
        reorderRes
      ] = await Promise.allSettled([
        pharmacyService.getAISummary(),
        pharmacyService.getAIForecast(30, 30),
        pharmacyService.detectAnomalies(30),
        pharmacyService.getInventoryOptimization(),
        pharmacyService.getSalesVelocity(),
        pharmacyService.getDeadStock(),
        pharmacyService.getCategoryPerformance(),
        pharmacyService.getRevenueForecast(30),
        pharmacyService.getSmartReorder()
      ]);

      // Process results
      if (summaryRes.status === 'fulfilled' && summaryRes.value.success) {
        setAISummary(summaryRes.value.data);
      }
      if (forecastRes.status === 'fulfilled' && forecastRes.value.success) {
        setForecasts(forecastRes.value.data.forecasts || []);
      }
      if (anomaliesRes.status === 'fulfilled' && anomaliesRes.value.success) {
        setAnomalies(anomaliesRes.value.data.anomalies || []);
      }
      if (optimizationRes.status === 'fulfilled' && optimizationRes.value.success) {
        setOptimization(optimizationRes.value.data);
      }
      if (velocityRes.status === 'fulfilled' && velocityRes.value.success) {
        setVelocity(velocityRes.value.data);
      }
      if (deadStockRes.status === 'fulfilled' && deadStockRes.value.success) {
        setDeadStock(deadStockRes.value.data);
      }
      if (categoryRes.status === 'fulfilled' && categoryRes.value.success) {
        setCategoryData(categoryRes.value.data);
      }
      if (revenueRes.status === 'fulfilled' && revenueRes.value.success) {
        setRevenueForecast(revenueRes.value.data);
      }
      if (reorderRes.status === 'fulfilled' && reorderRes.value.success) {
        setSmartReorder(reorderRes.value.data);
      }
      
    } catch (error) {
      toast.error('Failed to load AI insights');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success('AI insights refreshed!');
  };

  if (loading) return <Loading fullScreen text="🧠 AI is analyzing your data..." />;

  const tabs = [
    { key: 'overview', label: 'Overview', icon: Brain },
    { key: 'forecast', label: 'Demand Forecast', icon: TrendingUp },
    { key: 'velocity', label: 'Sales Velocity', icon: Zap },
    { key: 'inventory', label: 'Inventory AI', icon: Package },
    { key: 'revenue', label: 'Revenue', icon: DollarSign },
    { key: 'reorder', label: 'Smart Reorder', icon: ShoppingCart }
  ];

  const priorityColors = {
    critical: 'bg-red-100 text-red-600 border-red-200',
    high: 'bg-orange-100 text-orange-600 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-600 border-yellow-200',
    low: 'bg-green-100 text-green-600 border-green-200'
  };

  const COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  const getHealthScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthScoreBg = (score) => {
    if (score >= 80) return 'from-green-500 to-emerald-500';
    if (score >= 60) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white">
            <Brain size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">AI Insights</h1>
            <p className="text-sm text-gray-500">
              Machine learning powered analytics & predictions
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Analyzing...' : 'Refresh'}
        </button>
      </div>

      {/* AI Health Score Card */}
      {aiSummary?.summary && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-gradient-to-r ${getHealthScoreBg(aiSummary.summary.health_score)} text-white p-6 rounded-2xl`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={20} />
                <span className="font-bold">Pharmacy Health Score</span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-bold">{aiSummary.summary.health_score}</span>
                <span className="text-xl opacity-80">/100</span>
              </div>
              <p className="mt-2 opacity-90">{aiSummary.summary.ai_recommendations?.[0]}</p>
            </div>
            <div className="text-right space-y-2">
              {aiSummary.summary.urgent_actions?.slice(0, 2).map((action, idx) => (
                <div key={idx} className="bg-white/20 px-3 py-1 rounded-lg text-sm">
                  ⚠️ {action.action}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white p-4 rounded-xl border shadow-sm"
        >
          <div className="flex items-center gap-2 text-purple-600 mb-2">
            <Package size={18} />
            <span className="text-sm font-medium">Inventory Value</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            ₹{(aiSummary?.summary?.key_metrics?.inventory_value || 0).toLocaleString()}
          </p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white p-4 rounded-xl border shadow-sm"
        >
          <div className="flex items-center gap-2 text-orange-600 mb-2">
            <AlertTriangle size={18} />
            <span className="text-sm font-medium">Items to Reorder</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {smartReorder?.summary?.total_items_to_reorder || 0}
          </p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white p-4 rounded-xl border shadow-sm"
        >
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <Skull size={18} />
            <span className="text-sm font-medium">Dead Stock Value</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            ₹{(deadStock?.summary?.dead_stock_value || 0).toLocaleString()}
          </p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white p-4 rounded-xl border shadow-sm"
        >
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <Zap size={18} />
            <span className="text-sm font-medium">Fast Movers</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {velocity?.summary?.fast_movers || 0}
          </p>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium whitespace-nowrap transition ${
                activeTab === tab.key
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}
            >
              <TabIcon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Category Performance */}
            {categoryData?.categories && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-2xl shadow-md border"
              >
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <PieChart size={20} className="text-purple-500" />
                  Category Performance
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPie>
                    <Pie
                      data={categoryData.categories.slice(0, 6)}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="revenue"
                      nameKey="category"
                      label={({ category, revenue_percentage }) => `${category}: ${revenue_percentage}%`}
                    >
                      {categoryData.categories.slice(0, 6).map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']} />
                  </RechartsPie>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* Anomalies */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-6 rounded-2xl shadow-md border"
            >
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Activity size={20} className="text-purple-500" />
                Recent Anomalies
              </h3>
              {anomalies.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle size={40} className="mx-auto text-green-500 mb-2" />
                  <p className="text-green-600 font-medium">No anomalies detected!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {anomalies.slice(0, 5).map((anomaly, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl ${
                        anomaly.anomaly_type === 'spike' ? 'bg-green-50' : 'bg-red-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {anomaly.anomaly_type === 'spike' ? (
                            <TrendingUp className="text-green-500" size={18} />
                          ) : (
                            <TrendingDown className="text-red-500" size={18} />
                          )}
                          <span className="font-medium">{anomaly.date}</span>
                        </div>
                        <span className={`font-bold ${
                          anomaly.anomaly_type === 'spike' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {anomaly.deviation_percent > 0 ? '+' : ''}{anomaly.deviation_percent}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* Demand Forecast Tab */}
        {activeTab === 'forecast' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              AI-powered demand prediction for the next 30 days
            </p>
            {forecasts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border">
                <TrendingUp size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Not enough sales data for forecasting</p>
              </div>
            ) : (
              forecasts.slice(0, 10).map((item, index) => (
                <motion.div
                  key={item.medicine_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-white p-5 rounded-2xl shadow-md border-l-4 ${
                    item.priority === 'critical' ? 'border-l-red-500' :
                    item.priority === 'high' ? 'border-l-orange-500' :
                    item.priority === 'medium' ? 'border-l-yellow-500' :
                    'border-l-green-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="font-bold text-gray-800">{item.medicine_name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${priorityColors[item.priority]}`}>
                          {item.priority.toUpperCase()}
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">30-Day Sales</span>
                          <p className="font-bold">{item.historical_data?.total_sold || 0}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Daily Avg</span>
                          <p className="font-bold">{item.historical_data?.daily_average || 0}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Predicted</span>
                          <p className="font-bold text-purple-600">{item.forecast?.predicted_demand || 0}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Stock</span>
                          <p className="font-bold">{item.inventory?.current_stock || 0}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Days Left</span>
                          <p className={`font-bold ${
                            item.inventory?.days_of_stock_remaining <= 7 ? 'text-red-600' : 'text-gray-800'
                          }`}>
                            {item.inventory?.days_of_stock_remaining || 0}
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-gray-600">
                        💡 {item.recommendation}
                      </p>
                    </div>
                    {item.suggested_order_quantity > 0 && (
                      <button
                        onClick={() => navigate('/pharmacy/procurement/create', {
                          state: { preselected: [{ medicine_id: item.medicine_id, quantity: item.suggested_order_quantity }] }
                        })}
                        className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
                      >
                        Order {item.suggested_order_quantity}
                      </button>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Sales Velocity Tab */}
        {activeTab === 'velocity' && velocity && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                <p className="text-sm text-green-600">Fast Movers</p>
                <p className="text-3xl font-bold text-green-700">{velocity.summary?.fast_movers || 0}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                <p className="text-sm text-yellow-600">Medium Movers</p>
                <p className="text-3xl font-bold text-yellow-700">{velocity.summary?.medium_movers || 0}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                <p className="text-sm text-red-600">Slow Movers</p>
                <p className="text-3xl font-bold text-red-700">{velocity.summary?.slow_movers || 0}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Medicine</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">30-Day Sales</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Daily Avg</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Stock</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Velocity</th>
                  </tr>
                </thead>
                <tbody>
                  {velocity.velocities?.map((item, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{item.medicine_name}</td>
                      <td className="px-6 py-4">{item.total_sold_30d}</td>
                      <td className="px-6 py-4">{item.daily_average}</td>
                      <td className="px-6 py-4">{item.current_stock}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.velocity_rating === 'fast' ? 'bg-green-100 text-green-600' :
                          item.velocity_rating === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-red-100 text-red-600'
                        }`}>
                          {item.velocity_rating}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Inventory AI Tab */}
        {activeTab === 'inventory' && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Dead Stock */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white p-6 rounded-2xl shadow-md border"
            >
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Skull size={20} className="text-red-500" />
                Dead Stock ({deadStock?.dead_stock?.length || 0})
              </h3>
              <p className="text-sm text-gray-500 mb-4">{deadStock?.ai_insight}</p>
              
              {deadStock?.dead_stock?.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle size={40} className="mx-auto text-green-500 mb-2" />
                  <p className="text-green-600">No dead stock! 🎉</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {deadStock?.dead_stock?.map((item, idx) => (
                    <div key={idx} className="p-3 bg-red-50 rounded-xl border border-red-100">
                      <div className="flex justify-between">
                        <span className="font-medium">{item.medicine_name}</span>
                        <span className="text-red-600 font-bold">₹{item.stock_value}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {item.current_stock} units • No sales in 60 days
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Optimization Suggestions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white p-6 rounded-2xl shadow-md border"
            >
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Target size={20} className="text-purple-500" />
                Optimization Suggestions
              </h3>
              
              {optimization?.suggestions?.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle size={40} className="mx-auto text-green-500 mb-2" />
                  <p className="text-green-600">Inventory optimized!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {optimization?.suggestions?.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border ${
                        item.issue === 'overstocked' ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'
                      }`}
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">{item.medicine_name}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          item.issue === 'overstocked' ? 'bg-blue-200 text-blue-700' : 'bg-orange-200 text-orange-700'
                        }`}>
                          {item.issue}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{item.suggestion}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* Revenue Tab */}
        {activeTab === 'revenue' && revenueForecast && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border">
                <p className="text-sm text-gray-500">Historical Avg/Day</p>
                <p className="text-2xl font-bold">₹{revenueForecast.historical?.avg_daily_revenue?.toLocaleString()}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border">
                <p className="text-sm text-gray-500">Forecasted 30-Day Revenue</p>
                <p className="text-2xl font-bold text-purple-600">₹{revenueForecast.forecast?.predicted_revenue?.toLocaleString()}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border">
                <p className="text-sm text-gray-500">Growth Potential</p>
                <p className={`text-2xl font-bold ${
                  revenueForecast.forecast?.growth_potential > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {revenueForecast.forecast?.growth_potential > 0 ? '+' : ''}
                  {revenueForecast.forecast?.growth_potential}%
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-md border">
              <h3 className="font-bold text-gray-800 mb-4">Revenue Forecast</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueForecast.forecast?.daily_breakdown || []}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} />
                  <YAxis />
                  <Tooltip formatter={(v) => [`₹${v.toLocaleString()}`, 'Predicted']} />
                  <Area type="monotone" dataKey="predicted_revenue" stroke="#8b5cf6" fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
              <p className="mt-4 text-sm text-gray-600">💡 {revenueForecast.recommendation}</p>
            </div>
          </div>
        )}

        {/* Smart Reorder Tab */}
        {activeTab === 'reorder' && smartReorder && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                <p className="text-sm text-red-600">Critical</p>
                <p className="text-3xl font-bold text-red-700">{smartReorder.summary?.critical_items || 0}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                <p className="text-sm text-orange-600">High Priority</p>
                <p className="text-3xl font-bold text-orange-700">{smartReorder.summary?.high_priority_items || 0}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <p className="text-sm text-blue-600">Total to Reorder</p>
                <p className="text-3xl font-bold text-blue-700">{smartReorder.summary?.total_items_to_reorder || 0}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                <p className="text-sm text-purple-600">Estimated Cost</p>
                <p className="text-3xl font-bold text-purple-700">₹{(smartReorder.summary?.total_estimated_cost || 0).toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border">
              <p className="text-gray-600">💡 {smartReorder.ai_insight}</p>
            </div>

            {smartReorder.quick_action?.can_create_po && (
              <button
                onClick={() => {
                  const items = smartReorder.quick_action.critical_reorder.map(item => ({
                    medicine_id: item.medicine_id,
                    quantity: item.suggested_order_quantity
                  }));
                  navigate('/pharmacy/procurement/create', { state: { preselected: items } });
                }}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition flex items-center justify-center gap-2"
              >
                <ShoppingCart size={20} />
                Create Procurement Order for Critical Items
              </button>
            )}

            <div className="space-y-3">
              {smartReorder.suggestions?.map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`p-4 rounded-xl border-l-4 ${
                    item.urgency === 'critical' ? 'border-l-red-500 bg-red-50' :
                    item.urgency === 'high' ? 'border-l-orange-500 bg-orange-50' :
                    'border-l-yellow-500 bg-yellow-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-gray-800">{item.medicine_name}</h4>
                      <p className="text-sm text-gray-600">{item.reason}</p>
                      <div className="flex gap-4 mt-2 text-sm">
                        <span>Stock: <strong>{item.current_stock}</strong></span>
                        <span>Daily Avg: <strong>{item.daily_average_sales}</strong></span>
                        <span>Suggest: <strong className="text-purple-600">{item.suggested_order_quantity}</strong></span>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/pharmacy/procurement/create', {
                        state: { preselected: [{ medicine_id: item.medicine_id, quantity: item.suggested_order_quantity }] }
                      })}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 flex items-center gap-1"
                    >
                      Order <ArrowRight size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}