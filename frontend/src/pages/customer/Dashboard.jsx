import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  PackageCheck,
  Clock,
  Sparkles,
  TrendingUp,
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import { customerService } from '../../api/customerService';
import StatCard from '../../components/common/StatCard';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import toast from 'react-hot-toast';

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    cartItems: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [refillReminders, setRefillReminders] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const [ordersRes, cartRes, recsRes, refillsRes] = await Promise.all([
        customerService.getOrders(1, 5),
        customerService.getCart(),
        customerService.getRecommendations(4),
        customerService.getRefillReminders()
      ]);

      if (ordersRes.success) {
        setRecentOrders(ordersRes.data.orders);
        setStats(prev => ({
          ...prev,
          totalOrders: ordersRes.data.pagination.total,
          pendingOrders: ordersRes.data.orders.filter(o => o.status === 'pending').length
        }));
      }

      if (cartRes.success) {
        setStats(prev => ({ ...prev, cartItems: cartRes.data.total_items }));
      }

      if (recsRes.success) {
        setRecommendations(recsRes.data.recommendations || []);
      }

      if (refillsRes.success) {
        setRefillReminders(refillsRes.data.reminders || []);
      }
    } catch (error) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading fullScreen text="Loading your dashboard..." />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Orders"
          value={stats.totalOrders}
          icon={<ShoppingBag size={20} />}
          color="blue"
          gradient
          onClick={() => navigate('/customer/orders')}
        />
        <StatCard
          title="Pending Orders"
          value={stats.pendingOrders}
          icon={<Clock size={20} />}
          color="orange"
          gradient
          onClick={() => navigate('/customer/orders')}
        />
        <StatCard
          title="Items in Cart"
          value={stats.cartItems}
          icon={<PackageCheck size={20} />}
          color="green"
          gradient
          onClick={() => navigate('/customer/cart')}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          onClick={() => navigate('/customer/chat')}
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-2xl shadow-lg cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold mb-2">AI Pharmacist Chat 🤖</h3>
              <p className="text-sm opacity-90 mb-4">
                Describe your symptoms and get instant medicine recommendations
              </p>
              <div className="flex items-center gap-2 text-sm font-medium">
                Start chatting <ArrowRight size={16} />
              </div>
            </div>
            <MessageSquare size={32} className="opacity-80" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          onClick={() => navigate('/customer/medicines')}
          className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-6 rounded-2xl shadow-lg cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold mb-2">Browse Medicines 💊</h3>
              <p className="text-sm opacity-90 mb-4">
                Search our catalog of 1000+ medicines with AI-powered search
              </p>
              <div className="flex items-center gap-2 text-sm font-medium">
                Start shopping <ArrowRight size={16} />
              </div>
            </div>
            <ShoppingBag size={32} className="opacity-80" />
          </div>
        </motion.div>
      </div>

      {refillReminders.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl shadow-md border"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="text-orange-500" size={20} />
              <h2 className="text-lg font-bold text-gray-800">Refill Reminders</h2>
            </div>
            <span className="text-xs bg-orange-100 text-orange-600 px-3 py-1 rounded-full font-medium">
              {refillReminders.length} due soon
            </span>
          </div>

          <div className="space-y-3">
            {refillReminders.slice(0, 3).map((reminder) => (
              <div
                key={reminder.medicine_id}
                className="flex items-center justify-between p-4 bg-orange-50 rounded-xl"
              >
                <div>
                  <p className="font-semibold text-gray-800">{reminder.medicine_name}</p>
                  <p className="text-sm text-gray-600">
                    Last ordered: {reminder.last_ordered}
                  </p>
                </div>
                <button
                  onClick={() => navigate('/customer/medicines')}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition"
                >
                  Reorder Now
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl shadow-md border"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="text-purple-500" size={20} />
              <h2 className="text-lg font-bold text-gray-800">Recommended for You</h2>
            </div>
            <button
              onClick={() => navigate('/customer/recommendations')}
              className="text-sm text-blue-600 hover:underline font-medium"
            >
              View all
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100"
              >
                <div className="flex items-start justify-between mb-2">
                  <TrendingUp className="text-purple-500" size={18} />
                  <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full font-medium">
                    {Math.round(rec.confidence_score * 100)}%
                  </span>
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">{rec.name}</h3>
                <p className="text-xs text-gray-600 mb-3">{rec.reason}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-800">₹{rec.price}</span>
                  <button
                    onClick={() => navigate(`/customer/medicines`)}
                    className="text-xs px-3 py-1 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 rounded-2xl shadow-md border"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-800">Recent Orders</h2>
          <button
            onClick={() => navigate('/customer/orders')}
            className="text-sm text-blue-600 hover:underline font-medium"
          >
            View all
          </button>
        </div>

        {recentOrders.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag size={48} />}
            title="No orders yet"
            description="Start shopping to see your orders here"
            action={() => navigate('/customer/medicines')}
            actionLabel="Browse Medicines"
          />
        ) : (
          <div className="space-y-4">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => navigate(`/customer/orders/${order.id}`)}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition"
              >
                <div>
                  <p className="font-semibold text-gray-800">{order.order_number}</p>
                  <p className="text-sm text-gray-600">
                    {order.items_count} items • ₹{order.total_amount}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 text-xs font-medium rounded-full ${
                    order.status === 'delivered'
                      ? 'bg-green-100 text-green-600'
                      : order.status === 'dispatched'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-yellow-100 text-yellow-600'
                  }`}
                >
                  {order.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}