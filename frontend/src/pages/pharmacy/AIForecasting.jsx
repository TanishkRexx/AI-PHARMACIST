import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  ShoppingCart,
  Package
} from 'lucide-react';
import { pharmacyService } from '../../api/pharmacyService';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

export default function AIForecasting() {
  const [loading, setLoading] = useState(true);
  const [forecasts, setForecasts] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [optimization, setOptimization] = useState(null);
  const [activeTab, setActiveTab] = useState('forecast');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [forecastRes, anomaliesRes, optimizationRes] = await Promise.all([
        pharmacyService.getAIForecast(30, 30),
        pharmacyService.detectAnomalies(30),
        pharmacyService.getInventoryOptimization()
      ]);

      if (forecastRes.success) setForecasts(forecastRes.data.forecasts || []);
      if (anomaliesRes.success) setAnomalies(anomaliesRes.data.anomalies || []);
      if (optimizationRes.success) setOptimization(optimizationRes.data);
    } catch (error) {
      toast.error('Failed to load AI insights');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading fullScreen text="Analyzing data with AI..." />;

  const tabs = [
    { key: 'forecast', label: 'Demand Forecast', icon: TrendingUp },
    { key: 'anomalies', label: 'Anomaly Detection', icon: AlertTriangle, count: anomalies.length },
    { key: 'optimization', label: 'Inventory Optimization', icon: Package, count: optimization?.suggestions?.length }
  ];

  const priorityColors = {
    critical: 'bg-red-100 text-red-600 border-red-200',
    high: 'bg-orange-100 text-orange-600 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-600 border-yellow-200',
    low: 'bg-green-100 text-green-600 border-green-200'
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
              Machine learning powered predictions and optimizations
            </p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-white border rounded-xl hover:bg-gray-50 transition"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* AI Badge */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 text-white p-6 rounded-2xl"
      >
        <div className="flex items-center gap-3 mb-2">
          <Sparkles size={20} />
          <span className="font-bold">AI-Powered Analytics</span>
        </div>
        <p className="text-sm opacity-90">
          Using linear regression with seasonality analysis to predict demand patterns,
          detect anomalies, and optimize your inventory management.
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition ${
                activeTab === tab.key
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <TabIcon size={18} />
              {tab.label}
              {tab.count > 0 && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'forecast' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Showing demand forecast for next 30 days based on historical sales data
          </p>

          {forecasts.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No forecast data available yet</p>
            </div>
          ) : (
            forecasts.map((item, index) => (
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
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.forecast.trend === 'upward' ? 'bg-green-100 text-green-600' :
                        item.forecast.trend === 'downward' ? 'bg-red-100 text-red-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {item.forecast.trend === 'upward' ? <TrendingUp size={12} className="inline mr-1" /> : 
                         item.forecast.trend === 'downward' ? <TrendingDown size={12} className="inline mr-1" /> : null}
                        {item.forecast.trend}
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">30-Day Sales</span>
                        <p className="font-bold text-gray-800">{item.historical_data.total_sold}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Daily Avg</span>
                        <p className="font-bold text-gray-800">{item.historical_data.daily_average}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Predicted (30d)</span>
                        <p className="font-bold text-purple-600">{item.forecast.predicted_demand}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Current Stock</span>
                        <p className={`font-bold ${item.inventory.current_stock <= item.inventory.reorder_level ? 'text-red-600' : 'text-gray-800'}`}>
                          {item.inventory.current_stock}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Days Left</span>
                        <p className={`font-bold ${item.inventory.days_of_stock_remaining <= 7 ? 'text-red-600' : 'text-gray-800'}`}>
                          {item.inventory.days_of_stock_remaining}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 p-3 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-700">
                        <strong>Recommendation:</strong> {item.recommendation}
                      </p>
                      {item.suggested_order_quantity > 0 && (
                        <p className="text-sm text-purple-600 mt-1">
                          <ShoppingCart size={14} className="inline mr-1" />
                          Suggested order: <strong>{item.suggested_order_quantity} units</strong>
                        </p>
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        Confidence: {Math.round(item.forecast.confidence_score * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {activeTab === 'anomalies' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Detecting unusual patterns in sales data (z-score &gt; 2)
          </p>

          {anomalies.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle size={48} className="mx-auto text-green-500 mb-4" />
              <p className="text-green-600 font-medium">No anomalies detected!</p>
              <p className="text-gray-500">All sales patterns appear normal</p>
            </div>
          ) : (
            anomalies.map((anomaly, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-5 rounded-2xl border ${
                  anomaly.anomaly_type === 'spike' 
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {anomaly.anomaly_type === 'spike' ? (
                      <TrendingUp className="text-green-500" size={24} />
                    ) : (
                      <TrendingDown className="text-red-500" size={24} />
                    )}
                    <div>
                      <p className="font-bold text-gray-800">{anomaly.date}</p>
                      <p className="text-sm text-gray-600">
                        {anomaly.anomaly_type === 'spike' ? 'Sales Spike' : 'Sales Drop'} • {anomaly.orders} orders
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${
                      anomaly.anomaly_type === 'spike' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {anomaly.deviation_percent > 0 ? '+' : ''}{anomaly.deviation_percent}%
                    </p>
                    <p className="text-sm text-gray-500">vs average</p>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {activeTab === 'optimization' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border">
              <p className="text-sm text-gray-500">Total Medicines</p>
              <p className="text-2xl font-bold">{optimization?.summary?.total_medicines}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border">
              <p className="text-sm text-gray-500">Issues Found</p>
              <p className="text-2xl font-bold text-orange-600">{optimization?.summary?.issues_found}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border">
              <p className="text-sm text-gray-500">Inventory Value</p>
              <p className="text-2xl font-bold">₹{optimization?.summary?.total_inventory_value?.toLocaleString()}</p>
            </div>
          </div>

          {optimization?.suggestions?.length === 0 ? (
            <div className="text-center py-12">
              <Package size={48} className="mx-auto text-green-500 mb-4" />
              <p className="text-green-600 font-medium">Inventory is optimized!</p>
            </div>
          ) : (
            optimization?.suggestions?.map((item, index) => (
              <motion.div
                key={item.medicine_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-white p-5 rounded-2xl shadow-md border-l-4 ${
                  item.issue === 'overstocked' ? 'border-l-blue-500' : 'border-l-red-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-gray-800">{item.medicine_name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.issue === 'overstocked' 
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {item.issue === 'overstocked' ? 'Overstocked' : 'Understocked'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{item.suggestion}</p>
                    <div className="flex gap-4 mt-2 text-sm">
                      <span>Current: <strong>{item.current_stock}</strong></span>
                      {item.recommended_stock && <span>Recommended: <strong>{item.recommended_stock}</strong></span>}
                      {item.capital_locked && <span className="text-blue-600">Capital locked: <strong>₹{item.capital_locked}</strong></span>}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${priorityColors[item.priority]}`}>
                    {item.priority}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
}