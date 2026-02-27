import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Package,
  User,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  FileText,
  Loader2
} from 'lucide-react';
import { pharmacyService } from '../../api/pharmacyService';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

export default function PharmacyOrderDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const response = await pharmacyService.getOrderDetails(orderId);
      if (response.success) {
        setOrder(response.data);
      }
    } catch (error) {
      toast.error('Failed to load order');
      navigate('/pharmacy/orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    setUpdating(true);
    try {
      const response = await pharmacyService.updateOrderStatus(orderId, newStatus);
      if (response.success) {
        toast.success(`Order ${newStatus}`);
        loadOrder();
      }
    } catch (error) {
      toast.error('Failed to update order');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <Loading fullScreen text="Loading order details..." />;
  if (!order) return null;

  const statusConfig = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-600', icon: Clock },
    confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-600', icon: CheckCircle },
    processing: { label: 'Processing', color: 'bg-purple-100 text-purple-600', icon: Package },
    dispatched: { label: 'Dispatched', color: 'bg-indigo-100 text-indigo-600', icon: Truck },
    delivered: { label: 'Delivered', color: 'bg-green-100 text-green-600', icon: CheckCircle },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-600', icon: XCircle }
  };

  const status = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  const getNextStatus = () => {
    const flow = {
      pending: 'confirmed',
      confirmed: 'processing',
      processing: 'dispatched',
      dispatched: 'delivered'
    };
    return flow[order.status];
  };

  const getActionLabel = () => {
    const labels = {
      pending: 'Confirm Order',
      confirmed: 'Start Processing',
      processing: 'Mark Dispatched',
      dispatched: 'Mark Delivered'
    };
    return labels[order.status];
  };

  const nextStatus = getNextStatus();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/pharmacy/orders')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
      >
        <ArrowLeft size={20} />
        Back to Orders
      </button>

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-md border">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-xl ${status.color}`}>
              <StatusIcon size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{order.order_number}</h1>
              <p className="text-gray-500">
                Placed on {new Date(order.created_at).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className={`px-4 py-2 rounded-full font-semibold ${status.color}`}>
              {status.label}
            </span>
            <p className={`text-sm mt-2 ${
              order.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'
            }`}>
              Payment: {order.payment_status}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 pt-6 border-t flex gap-3">
          {nextStatus && (
            <button
              onClick={() => handleStatusUpdate(nextStatus)}
              disabled={updating}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50 flex items-center gap-2"
            >
              {updating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  {getActionLabel()}
                </>
              )}
            </button>
          )}
          
          {order.status === 'pending' && (
            <button
              onClick={() => handleStatusUpdate('cancelled')}
              disabled={updating}
              className="px-6 py-3 bg-red-100 text-red-600 rounded-xl font-semibold hover:bg-red-200 transition disabled:opacity-50 flex items-center gap-2"
            >
              <XCircle size={20} />
              Cancel Order
            </button>
          )}

          {order.status === 'delivered' && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle size={20} />
              <span className="font-semibold">Order Completed</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Customer Information */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-6 rounded-2xl shadow-md border"
        >
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <User size={20} className="text-purple-500" />
            Customer Information
          </h2>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <User className="text-gray-400" size={18} />
              <div>
                <p className="text-xs text-gray-500">Name</p>
                <p className="font-medium text-gray-800">{order.customer_name || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Phone className="text-gray-400" size={18} />
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="font-medium text-gray-800">{order.customer_phone || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Mail className="text-gray-400" size={18} />
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="font-medium text-gray-800">{order.customer_email || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <MapPin className="text-gray-400 mt-1" size={18} />
              <div>
                <p className="text-xs text-gray-500">Delivery Address</p>
                <p className="font-medium text-gray-800">{order.delivery_address}</p>
                {order.delivery_notes && (
                  <p className="text-sm text-gray-500 mt-1">Notes: {order.delivery_notes}</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Order Items */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-6 rounded-2xl shadow-md border"
        >
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Package size={20} className="text-purple-500" />
            Order Items ({order.items?.length || 0})
          </h2>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {order.items?.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                    💊
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{item.medicine_name}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{item.dosage}</span>
                      {item.prescription_required && (
                        <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded">Rx</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-800">₹{item.subtotal}</p>
                  <p className="text-xs text-gray-500">
                    {item.quantity} × ₹{item.unit_price}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Payment Summary & Timeline */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Payment Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl shadow-md border"
        >
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <CreditCard size={20} className="text-purple-500" />
            Payment Summary
          </h2>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span>₹{order.subtotal}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax (5%)</span>
              <span>₹{order.tax_amount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Delivery Charge</span>
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
            <div className="border-t pt-3 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>₹{order.total_amount}</span>
            </div>
          </div>
        </motion.div>

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-2xl shadow-md border"
        >
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Clock size={20} className="text-purple-500" />
            Order Timeline
          </h2>

          <div className="space-y-4">
            {[
              { label: 'Order Placed', date: order.created_at, done: true },
              { label: 'Confirmed', date: order.confirmed_at, done: !!order.confirmed_at },
              { label: 'Processing', date: null, done: ['processing', 'dispatched', 'delivered'].includes(order.status) },
              { label: 'Dispatched', date: order.dispatched_at, done: !!order.dispatched_at },
              { label: 'Delivered', date: order.delivered_at, done: order.status === 'delivered' }
            ].map((step, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  step.done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step.done ? <CheckCircle size={16} /> : <span className="text-xs">{index + 1}</span>}
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${step.done ? 'text-gray-800' : 'text-gray-400'}`}>
                    {step.label}
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
        </motion.div>
      </div>

      {/* Prescription */}
      {order.requires_prescription && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-orange-50 border border-orange-200 p-6 rounded-2xl"
        >
          <h2 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
            <FileText size={20} />
            Prescription Required
          </h2>
          <p className="text-orange-700 text-sm">
            {order.prescription_verified
              ? '✓ Prescription has been verified'
              : '⚠️ Prescription verification pending'}
          </p>
        </motion.div>
      )}
    </div>
  );
}