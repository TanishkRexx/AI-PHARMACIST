import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Clock,
  CheckCircle,
  Truck,
  Package,
  XCircle,
  Eye
} from 'lucide-react';
import { pharmacyService } from '../../api/pharmacyService';
import SearchBar from '../../components/common/SearchBar';
import Loading from '../../components/common/Loading';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import toast from 'react-hot-toast';

export default function PharmacyOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeFilter, setActiveFilter] = useState('all');
  const [updatingOrder, setUpdatingOrder] = useState(null);

  const limit = 15;

  useEffect(() => {
    loadOrders();
    loadStats();
  }, [page, activeFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await pharmacyService.getOrders({
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

  const loadStats = async () => {
    try {
      const response = await pharmacyService.getOrderStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to load stats');
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdatingOrder(orderId);
    try {
      const response = await pharmacyService.updateOrderStatus(orderId, newStatus);
      if (response.success) {
        toast.success(`Order ${newStatus}`);
        loadOrders();
        loadStats();
      }
    } catch (error) {
      toast.error('Failed to update order');
    } finally {
      setUpdatingOrder(null);
    }
  };

  const statusConfig = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-600', icon: Clock },
    confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-600', icon: CheckCircle },
    processing: { label: 'Processing', color: 'bg-purple-100 text-purple-600', icon: Package },
    dispatched: { label: 'Dispatched', color: 'bg-indigo-100 text-indigo-600', icon: Truck },
    delivered: { label: 'Delivered', color: 'bg-green-100 text-green-600', icon: CheckCircle },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-600', icon: XCircle }
  };

  const filters = [
    { key: 'all', label: 'All Orders', count: Object.values(stats).reduce((a, b) => a + b, 0) },
    { key: 'pending', label: 'Pending', count: stats.pending || 0 },
    { key: 'confirmed', label: 'Confirmed', count: stats.confirmed || 0 },
    { key: 'processing', label: 'Processing', count: stats.processing || 0 },
    { key: 'dispatched', label: 'Dispatched', count: stats.dispatched || 0 },
    { key: 'delivered', label: 'Delivered', count: stats.delivered || 0 }
  ];

  const getNextStatus = (currentStatus) => {
    const flow = {
      pending: 'confirmed',
      confirmed: 'processing',
      processing: 'dispatched',
      dispatched: 'delivered'
    };
    return flow[currentStatus];
  };

  const getActionLabel = (status) => {
    const labels = {
      pending: 'Confirm Order',
      confirmed: 'Start Processing',
      processing: 'Mark Dispatched',
      dispatched: 'Mark Delivered'
    };
    return labels[status];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Order Management</h1>
        <p className="text-sm text-gray-500">Process and track customer orders</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {filters.slice(1).map((filter) => (
          <motion.div
            key={filter.key}
            whileHover={{ scale: 1.02 }}
            onClick={() => {
              setActiveFilter(filter.key);
              setPage(1);
            }}
            className={`p-4 rounded-xl cursor-pointer transition ${
              activeFilter === filter.key
                ? 'bg-purple-600 text-white'
                : 'bg-white border hover:border-purple-200'
            }`}
          >
            <p className={`text-2xl font-bold ${activeFilter === filter.key ? 'text-white' : 'text-gray-800'}`}>
              {filter.count}
            </p>
            <p className={`text-sm ${activeFilter === filter.key ? 'text-purple-100' : 'text-gray-500'}`}>
              {filter.label}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        <Filter className="text-gray-400" size={20} />
        {filters.map((filter) => (
          <button
            key={filter.key}
            onClick={() => {
              setActiveFilter(filter.key);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
              activeFilter === filter.key
                ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow'
                : 'bg-white text-gray-600 border hover:bg-gray-50'
            }`}
          >
            {filter.label} ({filter.count})
          </button>
        ))}
      </div>

      {/* Orders Table */}
      {loading ? (
        <Loading text="Loading orders..." />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<Package size={48} />}
          title="No orders found"
          description="Orders will appear here when customers place them"
        />
      ) : (
        <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Order</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Customer</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Items</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Amount</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, index) => {
                const status = statusConfig[order.status] || statusConfig.pending;
                const StatusIcon = status.icon;
                const nextStatus = getNextStatus(order.status);

                return (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-800">{order.order_number}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-800">{order.customer_name}</p>
                        <p className="text-xs text-gray-500">{order.customer_phone}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-800">{order.items_count} items</span>
                      {order.requires_prescription && (
                        <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                          Rx
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-gray-800">₹{order.total_amount}</p>
                        <p className={`text-xs ${
                          order.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                        }`}>
                          {order.payment_status}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        <StatusIcon size={14} />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/pharmacy/orders/${order.id}`)}
                          className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        {nextStatus && (
                          <button
                            onClick={() => handleStatusUpdate(order.id, nextStatus)}
                            disabled={updatingOrder === order.id}
                            className="px-3 py-2 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 transition disabled:opacity-50"
                          >
                            {updatingOrder === order.id ? 'Updating...' : getActionLabel(order.status)}
                          </button>
                        )}
                        {order.status === 'pending' && (
                          <button
                            onClick={() => handleStatusUpdate(order.id, 'cancelled')}
                            disabled={updatingOrder === order.id}
                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                            title="Cancel Order"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
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