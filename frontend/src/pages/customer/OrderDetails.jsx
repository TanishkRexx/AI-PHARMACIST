import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Package,
  MapPin,
  CreditCard,
  Phone,
  Clock,
  CheckCircle,
  Truck,
  FileText
} from 'lucide-react';
import { customerService } from '../../api/customerService';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

export default function OrderDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrderDetails();
  }, [orderId]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await customerService.getOrderDetails(orderId);

      if (response.success) {
        setOrder(response.data);
      }
    } catch (error) {
      toast.error('Failed to load order details');
      navigate('/customer/orders');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading fullScreen text="Loading order details..." />;
  if (!order) return null;

  const statusColors = {
    pending: 'text-yellow-600 bg-yellow-100',
    confirmed: 'text-blue-600 bg-blue-100',
    processing: 'text-purple-600 bg-purple-100',
    dispatched: 'text-indigo-600 bg-indigo-100',
    delivered: 'text-green-600 bg-green-100',
    cancelled: 'text-red-600 bg-red-100'
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/customer/orders')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition"
      >
        <ArrowLeft size={20} />
        <span>Back to Orders</span>
      </button>

      <div className="bg-white p-6 rounded-2xl shadow-md border">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{order.order_number}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Placed on {new Date(order.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${statusColors[order.status]}`}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>
        </div>

        {['confirmed', 'processing', 'dispatched'].includes(order.status) && (
          <button
            onClick={() => navigate(`/customer/orders/${orderId}/track`)}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg font-medium hover:shadow-lg transition"
          >
            <Truck size={18} />
            Track Order
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-md border">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Package size={20} />
            Order Items ({order.items?.length})
          </h2>

          <div className="space-y-4">
            {order.items?.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg flex items-center justify-center text-xl">
                  💊
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{item.medicine_name}</p>
                  <p className="text-xs text-gray-500">{item.dosage}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">Qty: {item.quantity}</span>
                    {item.prescription_required && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                        Rx
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-800">₹{item.subtotal}</p>
                  <p className="text-xs text-gray-500">₹{item.unit_price}/unit</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-md border">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <MapPin size={20} />
              Delivery Address
            </h2>
            <p className="text-gray-600">{order.delivery_address}</p>
            {order.delivery_notes && (
              <p className="text-sm text-gray-500 mt-2">
                <strong>Notes:</strong> {order.delivery_notes}
              </p>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-md border">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <CreditCard size={20} />
              Payment Summary
            </h2>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span>₹{order.subtotal}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax (5%)</span>
                <span>₹{order.tax_amount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Delivery</span>
                <span className={order.delivery_charge === 0 ? 'text-green-600' : ''}>
                  {order.delivery_charge === 0 ? 'FREE' : `₹${order.delivery_charge}`}
                </span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-₹{order.discount_amount}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>₹{order.total_amount}</span>
              </div>
              <div className={`flex items-center gap-2 text-sm ${
                order.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'
              }`}>
                <CheckCircle size={16} />
                {order.payment_status === 'paid' ? 'Payment Complete' : 'Payment Pending'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-md border">
        <h2 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Clock size={20} />
          Order Timeline
        </h2>

        <div className="space-y-4">
          {[
            { status: 'Order Placed', date: order.created_at, done: true },
            { status: 'Confirmed', date: order.confirmed_at, done: !!order.confirmed_at },
            { status: 'Processing', date: null, done: ['processing', 'dispatched', 'delivered'].includes(order.status) },
            { status: 'Dispatched', date: order.dispatched_at, done: !!order.dispatched_at },
            { status: 'Delivered', date: order.delivered_at, done: order.status === 'delivered' }
          ].map((step, index) => (
            <div key={index} className="flex items-start gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                step.done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {step.done ? <CheckCircle size={16} /> : <span className="text-xs">{index + 1}</span>}
              </div>
              <div className="flex-1">
                <p className={`font-medium ${step.done ? 'text-gray-800' : 'text-gray-400'}`}>
                  {step.status}
                </p>
                {step.date && (
                  <p className="text-xs text-gray-500">
                    {new Date(step.date).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}