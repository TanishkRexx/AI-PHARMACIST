import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Clock,
  TrendingUp,
  ShoppingCart,
  Loader2,
  Brain
} from 'lucide-react';
import { customerService } from '../../api/customerService';
import { useCart } from '../../context/CartContext';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import toast from 'react-hot-toast';

export default function Recommendations() {
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [recommendations, setRecommendations] = useState([]);
  const [refillReminders, setRefillReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [recsRes, refillsRes] = await Promise.all([
        customerService.getRecommendations(10),
        customerService.getRefillReminders()
      ]);

      if (recsRes.success) {
        setRecommendations(recsRes.data.recommendations || []);
      }

      if (refillsRes.success) {
        setRefillReminders(refillsRes.data.reminders || []);
      }
    } catch (error) {
      toast.error('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (medicine) => {
    setAddingToCart({ ...addingToCart, [medicine.id]: true });
    const result = await addToCart(medicine.id, 1);
    setAddingToCart({ ...addingToCart, [medicine.id]: false });
  };

  if (loading) return <Loading fullScreen text="Loading recommendations..." />;

  return (
    <div className="space-y-8 p-2">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Sparkles className="text-purple-500" />
          Personalized For You
        </h1>
        <p className="text-sm text-gray-500">
          AI-powered recommendations based on your health profile and purchase history
        </p>
      </div>

      {/* Refill Reminders */}
      {refillReminders.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="text-orange-500" size={20} />
            <h2 className="text-lg font-bold text-gray-800">Refill Reminders</h2>
            <span className="ml-auto text-xs bg-orange-100 text-orange-600 px-3 py-1 rounded-full font-medium">
              {refillReminders.length} items due
            </span>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {refillReminders.map((reminder, index) => (
              <motion.div
                key={reminder.medicine_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-white p-5 rounded-2xl shadow-md border-l-4 ${
                  reminder.urgency === 'urgent'
                    ? 'border-l-red-500'
                    : 'border-l-orange-400'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-800">{reminder.medicine_name}</h3>
                    <p className="text-sm text-gray-500">
                      Last ordered: {reminder.last_ordered}
                    </p>
                  </div>
                  {reminder.urgency === 'urgent' && (
                    <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-medium rounded-full">
                      Urgent
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                  <div>
                    <span className="text-xs text-gray-400">Days until refill</span>
                    <p className="font-bold text-lg text-gray-800">{reminder.days_until_refill}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Suggested Qty</span>
                    <p className="font-bold text-lg text-gray-800">{reminder.suggested_quantity}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Confidence</span>
                    <p className="font-bold text-lg text-gray-800">
                      {Math.round(reminder.confidence_score * 100)}%
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/customer/medicines')}
                  className={`w-full py-2 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${
                    reminder.urgency === 'urgent'
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-orange-500 text-white hover:bg-orange-600'
                  }`}
                >
                  <ShoppingCart size={16} />
                  Reorder Now
                </button>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* AI Recommendations */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Brain className="text-purple-500" size={20} />
          <h2 className="text-lg font-bold text-gray-800">AI Recommendations</h2>
          <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-600 text-xs font-medium rounded-full">
            Based on your profile
          </span>
        </div>

        {recommendations.length === 0 ? (
          <EmptyState
            icon={<Sparkles size={48} />}
            title="No recommendations yet"
            description="Order medicines to get personalized recommendations"
            action={() => navigate('/customer/medicines')}
            actionLabel="Browse Medicines"
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.map((rec, index) => (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4 }}
                className="bg-white p-5 rounded-2xl shadow-md border hover:shadow-xl transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="text-purple-500" size={18} />
                    <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full font-medium">
                      {Math.round(rec.confidence_score * 100)}% match
                    </span>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-medium">
                    {rec.recommendation_type}
                  </span>
                </div>

                <h3 className="font-bold text-gray-800 mb-1">{rec.name}</h3>
                <p className="text-sm text-gray-500 mb-2">{rec.category}</p>
                <p className="text-xs text-gray-600 mb-4">{rec.reason}</p>

                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-800">₹{rec.price}</span>
                  <button
                    onClick={() => handleAddToCart(rec)}
                    disabled={addingToCart[rec.id]}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {addingToCart[rec.id] ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <ShoppingCart size={16} />
                        Add
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}