import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  Send,
  Loader2
} from 'lucide-react';
import { distributorService } from '../../api/distributorService';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

export default function DistributorOrderDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const response = await distributorService.getOrderDetails(orderId);
      if (response.success) {
        setOrder(response.data);
      }
    } catch (error) {
      toast.error('Failed to load order');
      navigate('/distributor/orders');
    } finally {
      setLoading(false);
    }
  };

  const handleShip = async () => {
    setProcessing(true);
    try {
      const response = await distributorService.shipOrder(orderId);
      if (response.success) {
        toast.success(`Shipped! Tracking: ${response.data.tracking_number}`);
        loadOrder();
      }
    } catch (error) {
      toast.error('Failed to ship order');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeliver = async () => {
    setProcessing(true);
    try {
      const response = await distributorService.markDelivered(orderId);
      if (response.success) {
        toast.success('Order delivered!');
        loadOrder();
      }
    } catch (error) {
      toast.error('Failed to mark delivered');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <Loading fullScreen text="Loading order..." />;
  if (!order) return null;

  const timeline = [
    { label: 'Order Placed', done: true, date: order.created_at },
    { label: 'Approved', done: ['approved', 'shipped', 'delivered'].includes(order.status) },
    { label: 'Shipped', done: ['shipped', 'delivered'].includes(order.status), date: order.shipped_at },
    { label: 'Delivered', done: order.status === 'delivered', date: order.delivered_at }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/distributor/orders')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
      >
        <ArrowLeft size={20} />
        Back to Orders
      </button>

      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white p-6 rounded-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{order.po_number}</h1>
            <p className="text-sm opacity-80 mt-1">
              {order.items?.length || 0} items • Created {new Date(order.created_at).toLocaleDateString()}
            </p>
            {order.tracking_number && (
              <p className="text-sm mt-2 bg-white/20 px-3 py-1 rounded-full inline-block">
                Tracking: {order.tracking_number}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">₹{order.total_amount}</p>
            <span className="text-sm opacity-80 capitalize">{order.status}</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 rounded-2xl shadow-md border"
      >
        <h2 className="font-bold text-gray-800 mb-6">Order Timeline</h2>
        <div className="flex items-center justify-between">
          {timeline.map((step, index) => (
            <div key={index} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  step.done ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  {step.done ? <CheckCircle size={20} /> : <Clock size={20} />}
                </div>
                <p className={`text-sm mt-2 font-medium ${step.done ? 'text-gray-800' : 'text-gray-400'}`}>
                  {step.label}
                </p>
                {step.date && (
                  <p className="text-xs text-gray-500">
                    {new Date(step.date).toLocaleDateString()}
                  </p>
                )}
              </div>
              {index < timeline.length - 1 && (
                <div className={`w-16 h-1 mx-2 rounded ${
                  timeline[index + 1].done ? 'bg-emerald-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Order Items */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-6 rounded-2xl shadow-md border"
        >
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Package size={20} />
            Order Items
          </h2>
          <div className="space-y-3">
            {order.items?.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-800">{item.medicine_name}</p>
                  <p className="text-xs text-gray-500">Qty: {item.quantity_ordered}</p>
                </div>
                <p className="font-bold text-gray-800">₹{item.subtotal}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span>₹{order.subtotal}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tax</span>
              <span>₹{order.tax_amount}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total</span>
              <span>₹{order.total_amount}</span>
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-6 rounded-2xl shadow-md border"
        >
          <h2 className="font-bold text-gray-800 mb-4">Actions</h2>

          {order.status === 'pending' && (
            <button
              onClick={handleShip}
              disabled={processing}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send size={20} />
                  Ship This Order
                </>
              )}
            </button>
          )}

          {order.status === 'shipped' && (
            <button
              onClick={handleDeliver}
              disabled={processing}
              className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-50"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  Mark as Delivered
                </>
              )}
            </button>
          )}

          {order.status === 'delivered' && (
            <div className="text-center py-8">
              <CheckCircle size={48} className="mx-auto text-green-500 mb-3" />
              <p className="text-green-600 font-semibold">Order Completed</p>
              <p className="text-sm text-gray-500 mt-1">
                Delivered on {new Date(order.delivered_at).toLocaleDateString()}
              </p>
            </div>
          )}

          {order.notes && (
            <div className="mt-4 p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500">Notes</p>
              <p className="text-gray-700">{order.notes}</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}