import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  Filter,
  Eye,
  Send,
  Loader2
} from 'lucide-react';
import { distributorService } from '../../api/distributorService';
import Loading from '../../components/common/Loading';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import toast from 'react-hot-toast';

export default function DistributorOrders() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeFilter, setActiveFilter] = useState(searchParams.get('status') || 'all');
  const [processingOrder, setProcessingOrder] = useState(null);

  const limit = 15;

  useEffect(() => {
    loadOrders();
  }, [page, activeFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await distributorService.getOrders({
        page,
        limit,
        status: activeFilter !== 'all' ? activeFilter : undefined
      });

      if (response.success) {
        setOrders(response.data.orders);
        setTotalPages(response.data.pagination.pages);
      }
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleShipOrder = async (orderId) => {
    setProcessingOrder(orderId);
    try {
      const response = await distributorService.shipOrder(orderId, 'Shipped via standard delivery');
      if (response.success) {
        toast.success(`Order shipped! Tracking: ${response.data.tracking_number}`);
        loadOrders();
      }
    } catch (error) {
      toast.error('Failed to ship order');
    } finally {
      setProcessingOrder(null);
    }
  };

  const handleMarkDelivered = async (orderId) => {
    setProcessingOrder(orderId);
    try {
      const response = await distributorService.markDelivered(orderId);
      if (response.success) {
        toast.success('Order marked as delivered!');
        loadOrders();
      }
    } catch (error) {
      toast.error('Failed to mark as delivered');
    } finally {
      setProcessingOrder(null);
    }
  };

  const statusConfig = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-600', icon: Clock },
    approved: { label: 'Approved', color: 'bg-blue-100 text-blue-600', icon: CheckCircle },
    shipped: { label: 'Shipped', color: 'bg-purple-100 text-purple-600', icon: Truck },
    delivered: { label: 'Delivered', color: 'bg-green-100 text-green-600', icon: CheckCircle }
  };

  const filters = [
    { key: 'all', label: 'All Orders' },
    { key: 'pending', label: 'Pending' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'delivered', label: 'Delivered' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Order Management</h1>
        <p className="text-sm text-gray-500">Process and ship pharmacy orders</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        <Filter className="text-gray-400 flex-shrink-0" size={20} />
        {filters.map((filter) => (
          <button
            key={filter.key}
            onClick={() => {
              setActiveFilter(filter.key);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
              activeFilter === filter.key
                ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow'
                : 'bg-white text-gray-600 border hover:bg-gray-50'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {loading ? (
        <Loading text="Loading orders..." />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<Package size={48} />}
          title="No orders found"
          description="Orders from pharmacies will appear here"
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order, index) => {
            const status = statusConfig[order.status] || statusConfig.pending;
            const StatusIcon = status.icon;
            const isProcessing = processingOrder === order.id;

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white p-6 rounded-2xl shadow-md border hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between">
                  {/* Left Section */}
                  <div className="flex gap-4">
                    <div className={`p-3 rounded-xl ${status.color}`}>
                      <StatusIcon size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{order.po_number}</h3>
                      <p className="text-sm text-gray-500">
                        {order.items_count} items • Created {new Date(order.created_at).toLocaleDateString()}
                      </p>
                      {order.tracking_number && (
                        <p className="text-sm text-blue-600 mt-1">
                          <Truck size={14} className="inline mr-1" />
                          Tracking: {order.tracking_number}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Section */}
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-800">₹{order.total_amount}</p>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <button
                    onClick={() => navigate(`/distributor/orders/${order.id}`)}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
                  >
                    <Eye size={18} />
                    View Details
                  </button>

                  <div className="flex items-center gap-2">
                    {order.status === 'pending' && (
                      <button
                        onClick={() => handleShipOrder(order.id)}
                        disabled={isProcessing}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Send size={18} />
                            Ship Order
                          </>
                        )}
                      </button>
                    )}

                    {order.status === 'shipped' && (
                      <button
                        onClick={() => handleMarkDelivered(order.id)}
                        disabled={isProcessing}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle size={18} />
                            Mark Delivered
                          </>
                        )}
                      </button>
                    )}

                    {order.status === 'delivered' && (
                      <span className="text-green-600 text-sm font-medium">
                        ✓ Completed
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}