import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  Search,
  Filter
} from 'lucide-react';
import { customerService } from '../../api/customerService';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import toast from 'react-hot-toast';

const statusConfig = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-600',
    icon: Clock
  },
  confirmed: {
    label: 'Confirmed',
    color: 'bg-blue-100 text-blue-600',
    icon: CheckCircle
  },
  processing: {
    label: 'Processing',
    color: 'bg-purple-100 text-purple-600',
    icon: Package
  },
  dispatched: {
    label: 'Dispatched',
    color: 'bg-indigo-100 text-indigo-600',
    icon: Truck
  },
  delivered: {
    label: 'Delivered',
    color: 'bg-green-100 text-green-600',
    icon: CheckCircle
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-600',
    icon: XCircle
  }
};

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeFilter, setActiveFilter] = useState('all');

  const limit = 10;

  useEffect(() => {
    loadOrders();
  }, [page]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await customerService.getOrders(page, limit);

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

  const filteredOrders = activeFilter === 'all'
    ? orders
    : orders.filter(order => order.status === activeFilter);

  const filters = [
    { key: 'all', label: 'All Orders' },
    { key: 'pending', label: 'Pending' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'dispatched', label: 'Dispatched' },
    { key: 'delivered', label: 'Delivered' }
  ];

  if (loading && orders.length === 0) {
    return <Loading fullScreen text="Loading orders..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">My Orders</h1>
        <p className="text-sm text-gray-500">Track and manage your orders</p>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        <Filter className="text-gray-400 flex-shrink-0" size={20} />
        {filters.map((filter) => (
          <button
            key={filter.key}
            onClick={() => setActiveFilter(filter.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
              activeFilter === filter.key
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50 border'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading text="Loading orders..." />
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          icon={<Package size={64} />}
          title="No orders found"
          description={
            activeFilter === 'all'
              ? "You haven't placed any orders yet"
              : `No ${activeFilter} orders`
          }
          action={() => navigate('/customer/medicines')}
          actionLabel="Start Shopping"
        />
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order, index) => {
            const status = statusConfig[order.status] || statusConfig.pending;
            const StatusIcon = status.icon;

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => navigate(`/customer/orders/${order.id}`)}
                className="bg-white p-5 rounded-2xl shadow-md border hover:shadow-lg cursor-pointer transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className={`p-3 rounded-xl ${status.color}`}>
                      <StatusIcon size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{order.order_number}</h3>
                      <p className="text-sm text-gray-600">
                        {order.items_count} {order.items_count === 1 ? 'item' : 'items'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(order.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-800">₹{order.total_amount}</p>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                      {status.label}
                    </span>
                    {order.payment_status === 'paid' && (
                      <p className="text-xs text-green-600 mt-1">✓ Paid</p>
                    )}
                  </div>
                </div>

                {['confirmed', 'processing', 'dispatched'].includes(order.status) && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                      <span>Order Progress</span>
                      <span>Track Order →</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width:
                            order.status === 'confirmed' ? '33%' :
                            order.status === 'processing' ? '50%' :
                            order.status === 'dispatched' ? '75%' : '0%'
                        }}
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}