import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  X,
  Package,
  ShoppingCart,
  AlertTriangle,
  Truck,
  CheckCircle,
  Clock,
  ChevronRight,
  RefreshCw,
  Trash2,
  Settings,
  BellOff
} from 'lucide-react';
import { pharmacyService } from '../../api/pharmacyService';
import toast from 'react-hot-toast';

export default function NotificationPanel({ isOpen, onClose, onNotificationCountChange }) {
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [notifications, setNotifications] = useState({
    outOfStock: [],
    lowStock: [],
    newOrders: [],
    procurement: []
  });

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      
      // Fetch all notification data in parallel
      const [stockRes, ordersRes, procurementRes] = await Promise.all([
        pharmacyService.getLowStockAlerts(),
        pharmacyService.getOrders({ page: 1, limit: 10, status: 'pending' }),
        pharmacyService.getProcurementOrders({ page: 1, limit: 5 })
      ]);

      const newNotifications = {
        outOfStock: [],
        lowStock: [],
        newOrders: [],
        procurement: []
      };

      // Process stock alerts
      if (stockRes.success) {
        newNotifications.outOfStock = stockRes.data.out_of_stock.items.map(item => ({
          id: `oos-${item.id}`,
          type: 'out_of_stock',
          title: item.name,
          message: `Out of stock! Reorder level: ${item.reorder_level}`,
          priority: 'critical',
          time: 'Now',
          link: `/pharmacy/inventory/edit/${item.id}`,
          actionLabel: 'Reorder',
          actionLink: '/pharmacy/procurement/create',
          actionState: { preselected: [{ medicine_id: item.id, quantity: item.reorder_level * 2 }] }
        }));

        newNotifications.lowStock = stockRes.data.low_stock.items.map(item => ({
          id: `low-${item.id}`,
          type: 'low_stock',
          title: item.name,
          message: `Only ${item.stock} left (Reorder at ${item.reorder_level})`,
          priority: 'warning',
          time: 'Now',
          link: `/pharmacy/inventory/edit/${item.id}`,
          actionLabel: 'Reorder',
          actionLink: '/pharmacy/procurement/create',
          actionState: { preselected: [{ medicine_id: item.id, quantity: item.shortage + item.reorder_level }] }
        }));
      }

      // Process new orders
      if (ordersRes.success) {
        newNotifications.newOrders = ordersRes.data.orders.map(order => ({
          id: `order-${order.id}`,
          type: 'new_order',
          title: `Order ${order.order_number}`,
          message: `${order.customer_name} - ${order.items_count} items - ₹${order.total_amount}`,
          priority: 'info',
          time: formatTimeAgo(order.created_at),
          link: `/pharmacy/orders/${order.id}`,
          actionLabel: 'View Order'
        }));
      }

      // Process procurement updates
      if (procurementRes.success) {
        const recentProcurement = procurementRes.data.orders
          .filter(po => ['shipped', 'approved'].includes(po.status))
          .slice(0, 3);

        newNotifications.procurement = recentProcurement.map(po => ({
          id: `po-${po.id}`,
          type: 'procurement',
          title: po.po_number,
          message: po.status === 'shipped' 
            ? `Your order is on the way! ${po.tracking_number || ''}` 
            : `Order approved by distributor`,
          priority: po.status === 'shipped' ? 'success' : 'info',
          time: formatTimeAgo(po.created_at),
          link: `/pharmacy/procurement/${po.id}`,
          actionLabel: po.status === 'shipped' ? 'Track Order' : 'View Details'
        }));
      }

      setNotifications(newNotifications);

      // Calculate total count
      const totalCount = 
        newNotifications.outOfStock.length + 
        newNotifications.lowStock.length + 
        newNotifications.newOrders.length +
        newNotifications.procurement.length;

      onNotificationCountChange && onNotificationCountChange(totalCount);

    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleNotificationClick = (notification) => {
    if (notification.link) {
      navigate(notification.link);
      onClose();
    }
  };

  const handleAction = (notification, e) => {
    e.stopPropagation();
    if (notification.actionLink) {
      navigate(notification.actionLink, { state: notification.actionState });
      onClose();
    } else if (notification.link) {
      navigate(notification.link);
      onClose();
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'out_of_stock':
        return <AlertTriangle className="text-red-500" size={20} />;
      case 'low_stock':
        return <Package className="text-yellow-500" size={20} />;
      case 'new_order':
        return <ShoppingCart className="text-blue-500" size={20} />;
      case 'procurement':
        return <Truck className="text-purple-500" size={20} />;
      default:
        return <Bell className="text-gray-500" size={20} />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical':
        return 'border-l-red-500 bg-red-50';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'success':
        return 'border-l-green-500 bg-green-50';
      case 'info':
      default:
        return 'border-l-blue-500 bg-blue-50';
    }
  };

  // Get all notifications for current tab
  const getAllNotifications = () => {
    const all = [
      ...notifications.outOfStock,
      ...notifications.lowStock,
      ...notifications.newOrders,
      ...notifications.procurement
    ];
    return all;
  };

  const getFilteredNotifications = () => {
    switch (activeTab) {
      case 'stock':
        return [...notifications.outOfStock, ...notifications.lowStock];
      case 'orders':
        return notifications.newOrders;
      case 'procurement':
        return notifications.procurement;
      case 'all':
      default:
        return getAllNotifications();
    }
  };

  const filteredNotifications = getFilteredNotifications();

  const tabs = [
    { key: 'all', label: 'All', count: getAllNotifications().length },
    { key: 'stock', label: 'Stock', count: notifications.outOfStock.length + notifications.lowStock.length },
    { key: 'orders', label: 'Orders', count: notifications.newOrders.length },
    { key: 'procurement', label: 'Procurement', count: notifications.procurement.length }
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        ref={panelRef}
        className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-500 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Bell size={20} />
              <h3 className="font-bold">Notifications</h3>
              {getAllNotifications().length > 0 && (
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {getAllNotifications().length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={loadNotifications}
                className="p-1.5 hover:bg-white/20 rounded-lg transition"
                title="Refresh"
              >
                <RefreshCw size={16} className={`text-white ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-white/20 rounded-lg transition"
              >
                <X size={16} className="text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-3 py-2 text-xs font-medium whitespace-nowrap transition ${
                activeTab === tab.key
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                  activeTab === tab.key ? 'bg-purple-200 text-purple-700' : 'bg-gray-200 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw size={24} className="mx-auto text-purple-500 animate-spin mb-2" />
              <p className="text-gray-500 text-sm">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <BellOff size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No notifications</p>
              <p className="text-gray-400 text-sm mt-1">You're all caught up! 🎉</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition border-l-4 ${getPriorityColor(notification.priority)}`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-gray-800 text-sm truncate">
                          {notification.title}
                        </p>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {notification.time}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      {notification.actionLabel && (
                        <button
                          onClick={(e) => handleAction(notification, e)}
                          className="mt-2 text-xs font-medium text-purple-600 hover:text-purple-700 flex items-center gap-1"
                        >
                          {notification.actionLabel}
                          <ChevronRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {filteredNotifications.length > 0 && (
          <div className="p-3 border-t bg-gray-50">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigate('/pharmacy/inventory?stock_status=low');
                  onClose();
                }}
                className="flex-1 py-2 text-xs font-medium text-purple-600 hover:bg-purple-100 rounded-lg transition"
              >
                View Low Stock
              </button>
              <button
                onClick={() => {
                  navigate('/pharmacy/orders?status=pending');
                  onClose();
                }}
                className="flex-1 py-2 text-xs font-medium text-purple-600 hover:bg-purple-100 rounded-lg transition"
              >
                View Pending Orders
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}