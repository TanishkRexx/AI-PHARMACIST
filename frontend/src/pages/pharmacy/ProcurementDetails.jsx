import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Package,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  Loader2,
  Edit,
  Copy,
  ExternalLink
} from 'lucide-react';
import { pharmacyService } from '../../api/pharmacyService';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

export default function ProcurementDetails() {
  const { poId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [receiving, setReceiving] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);

  useEffect(() => {
    loadOrder();
  }, [poId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const response = await pharmacyService.getProcurementDetails(poId);
      if (response.success) {
        setOrder(response.data);
      }
    } catch (error) {
      toast.error('Failed to load order details');
      navigate('/pharmacy/procurement');
    } finally {
      setLoading(false);
    }
  };

  const handleReceive = async () => {
    if (!window.confirm('Mark this order as received? This will update your inventory.')) {
      return;
    }

    setReceiving(true);
    try {
      const response = await pharmacyService.receiveProcurement(poId);
      if (response.success) {
        toast.success('Order received! Inventory updated.');
        loadOrder();
      }
    } catch (error) {
      toast.error('Failed to receive order');
    } finally {
      setReceiving(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  if (loading) return <Loading fullScreen text="Loading order details..." />;
  if (!order) return null;

  const statusConfig = {
    pending: { 
      label: 'Pending', 
      color: 'bg-yellow-100 text-yellow-600 border-yellow-200',
      icon: Clock,
      description: 'Order placed, waiting for confirmation'
    },
    approved: { 
      label: 'Approved', 
      color: 'bg-blue-100 text-blue-600 border-blue-200',
      icon: CheckCircle,
      description: 'Order approved by distributor'
    },
    shipped: { 
      label: 'Shipped', 
      color: 'bg-purple-100 text-purple-600 border-purple-200',
      icon: Truck,
      description: 'Order is on the way'
    },
    delivered: { 
      label: 'Delivered', 
      color: 'bg-green-100 text-green-600 border-green-200',
      icon: CheckCircle,
      description: 'Order received and inventory updated'
    },
    cancelled: { 
      label: 'Cancelled', 
      color: 'bg-red-100 text-red-600 border-red-200',
      icon: XCircle,
      description: 'Order was cancelled'
    }
  };

  const status = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  // Timeline steps
  const timelineSteps = [
    { 
      label: 'Order Placed', 
      date: order.created_at, 
      done: true,
      icon: Package
    },
    { 
      label: 'Approved', 
      date: order.approved_at, 
      done: ['approved', 'shipped', 'delivered'].includes(order.status),
      icon: CheckCircle
    },
    { 
      label: 'Shipped', 
      date: order.shipped_at, 
      done: ['shipped', 'delivered'].includes(order.status),
      icon: Truck
    },
    { 
      label: 'Delivered', 
      date: order.delivered_at, 
      done: order.status === 'delivered',
      icon: Download
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/pharmacy/procurement')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
      >
        <ArrowLeft size={20} />
        Back to Procurement Orders
      </button>

      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 rounded-2xl shadow-md border"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-xl ${status.color}`}>
              <StatusIcon size={28} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-800">{order.po_number}</h1>
                <button
                  onClick={() => copyToClipboard(order.po_number)}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Copy PO Number"
                >
                  <Copy size={16} className="text-gray-400" />
                </button>
              </div>
              <p className="text-gray-500">
                Created on {new Date(order.created_at).toLocaleDateString('en-IN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
          <span className={`px-4 py-2 rounded-full font-semibold border ${status.color}`}>
            {status.label}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-6 border-t flex gap-3">
          {order.status === 'shipped' && (
            <button
              onClick={handleReceive}
              disabled={receiving}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:shadow-lg transition flex items-center gap-2"
            >
              {receiving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Download size={20} />
                  Receive Order
                </>
              )}
            </button>
          )}

          {order.status === 'delivered' && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle size={20} />
              <span className="font-semibold">Order Completed</span>
            </div>
          )}

          {order.status === 'pending' && (
            <p className="text-gray-500 text-sm flex items-center gap-2">
              <Clock size={16} />
              Waiting for distributor to process your order
            </p>
          )}
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Order Items */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
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
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center text-lg">
                    💊
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{item.medicine_name}</p>
                    <p className="text-xs text-gray-500">
                      Current Stock: {item.current_stock} • Reorder: {item.reorder_level}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-800">₹{item.subtotal?.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">
                    {item.quantity_ordered} × ₹{item.unit_cost?.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Tracking & Timeline */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          {/* Tracking Info */}
          <div className="bg-white p-6 rounded-2xl shadow-md border">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Truck size={20} className="text-purple-500" />
              Tracking Information
            </h2>

            {order.tracking_number ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl">
                  <div>
                    <p className="text-sm text-gray-500">Tracking Number</p>
                    <p className="font-bold text-gray-800 text-lg">{order.tracking_number}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(order.tracking_number)}
                      className="p-2 bg-white rounded-lg hover:bg-gray-100 transition"
                      title="Copy"
                    >
                      <Copy size={18} className="text-gray-600" />
                    </button>
                    <a
                      href={`https://www.google.com/search?q=${order.tracking_number}+tracking`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-white rounded-lg hover:bg-gray-100 transition"
                      title="Track online"
                    >
                      <ExternalLink size={18} className="text-gray-600" />
                    </a>
                  </div>
                </div>

                {order.carrier && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Carrier</span>
                    <span className="font-medium text-gray-800">{order.carrier}</span>
                  </div>
                )}

                {order.expected_delivery && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Expected Delivery</span>
                    <span className="font-medium text-gray-800">
                      {new Date(order.expected_delivery).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Truck size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">Tracking information not available yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Tracking will be available once the order is shipped
                </p>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-white p-6 rounded-2xl shadow-md border">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Clock size={20} className="text-purple-500" />
              Order Timeline
            </h2>

            <div className="space-y-4">
              {timelineSteps.map((step, index) => {
                const StepIcon = step.icon;
                return (
                  <div key={index} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step.done 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 text-gray-500'
                    }`}>
                      <StepIcon size={16} />
                    </div>
                    <div className="flex-1 pb-4 border-l-2 border-gray-200 pl-4 -ml-4 ml-4">
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
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Payment Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 rounded-2xl shadow-md border"
      >
        <h2 className="font-bold text-gray-800 mb-4">Payment Summary</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">₹{order.subtotal?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax (5%)</span>
              <span className="font-medium">₹{order.tax_amount?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Shipping</span>
              <span className={order.shipping_cost === 0 ? 'text-green-600 font-medium' : ''}>
                {order.shipping_cost === 0 ? 'FREE' : `₹${order.shipping_cost?.toFixed(2)}`}
              </span>
            </div>
            <div className="border-t pt-3 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-purple-600">₹{order.total_amount?.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl">
            <h3 className="font-medium text-gray-800 mb-2">Order Notes</h3>
            <p className="text-sm text-gray-600">
              {order.notes || 'No notes added'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Simulate Actions (For Testing) */}
      {process.env.NODE_ENV === 'development' && order.status !== 'delivered' && order.status !== 'cancelled' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 p-6 rounded-2xl border border-yellow-200"
        >
          <h2 className="font-bold text-yellow-800 mb-2 flex items-center gap-2">
            🧪 Development Tools
          </h2>
          <p className="text-sm text-yellow-700 mb-4">
            Simulate distributor actions for testing
          </p>
          <div className="flex gap-3">
            {order.status === 'pending' && (
              <button
                onClick={() => handleSimulateStatus('approved')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
              >
                Simulate: Approve Order
              </button>
            )}
            {order.status === 'approved' && (
              <button
                onClick={() => handleSimulateStatus('shipped')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm"
              >
                Simulate: Ship Order
              </button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );

  // Development helper function
  async function handleSimulateStatus(newStatus) {
    try {
      await pharmacyService.updateProcurementStatus(poId, newStatus);
      toast.success(`Order status updated to ${newStatus}`);
      loadOrder();
    } catch (error) {
      toast.error('Failed to update status');
    }
  }
}