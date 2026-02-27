import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Filter,
  Eye,
  Clock,
  CheckCircle,
  Truck,
  Package,
  XCircle
} from 'lucide-react';
import { adminService } from '../../api/adminService';
import Loading from '../../components/common/Loading';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import toast from 'react-hot-toast';

export default function AdminAllOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  const limit = 20;

  useEffect(() => {
    loadOrders();
  }, [page, statusFilter, paymentFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await adminService.getAllOrders({
        page,
        limit,
        status: statusFilter || undefined,
        payment_status: paymentFilter || undefined
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

  const statusConfig = {
    pending: { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
    confirmed: { label: 'Confirmed', color: 'bg-blue-500/20 text-blue-400', icon: CheckCircle },
    processing: { label: 'Processing', color: 'bg-purple-500/20 text-purple-400', icon: Package },
    dispatched: { label: 'Dispatched', color: 'bg-indigo-500/20 text-indigo-400', icon: Truck },
    delivered: { label: 'Delivered', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
    cancelled: { label: 'Cancelled', color: 'bg-red-500/20 text-red-400', icon: XCircle }
  };

  const statusFilters = [
    { value: '', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'dispatched', label: 'Dispatched' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const paymentFilters = [
    { value: '', label: 'All Payments' },
    { value: 'pending', label: 'Unpaid' },
    { value: 'paid', label: 'Paid' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">All Orders</h1>
        <p className="text-gray-400">View all orders across the platform</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Filter size={20} className="text-gray-400" />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white"
        >
          {statusFilters.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <select
          value={paymentFilter}
          onChange={(e) => {
            setPaymentFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white"
        >
          {paymentFilters.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Orders Table */}
      {loading ? (
        <Loading text="Loading orders..." />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart size={48} />}
          title="No orders found"
          description="Orders will appear here"
        />
      ) : (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Order</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Customer</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Items</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Amount</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Payment</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-300">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, index) => {
                const status = statusConfig[order.status] || statusConfig.pending;
                const StatusIcon = status.icon;

                return (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-t border-gray-700 hover:bg-gray-700/30"
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium text-white">{order.order_number}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white">{order.customer_name}</p>
                        <p className="text-xs text-gray-400">{order.customer_phone}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300">{order.items_count} items</td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-white">₹{order.total_amount}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        <StatusIcon size={12} />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.payment_status === 'paid'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {order.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {new Date(order.created_at).toLocaleDateString()}
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