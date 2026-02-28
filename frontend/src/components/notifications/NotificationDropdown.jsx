// src/components/notifications/NotificationDropdown.jsx
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  ShoppingCart,
  Clock,
  AlertTriangle,
  Pill,
  RefreshCw,
  Loader2,
  ChevronRight,
  Trash2
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';

export default function NotificationDropdown() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    refreshNotifications
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [addingToCart, setAddingToCart] = useState({});
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleReorder = async (notification) => {
    const medicineId = notification.medicine?.medicine_id || notification.medicine?.id;
    if (!medicineId) {
      toast.error('Unable to add to cart');
      return;
    }

    setAddingToCart(prev => ({ ...prev, [notification.id]: true }));
    
    try {
      const quantity = notification.medicine?.suggested_quantity || 1;
      const result = await addToCart(medicineId, quantity);
      
      if (result.success) {
        toast.success(`Added ${notification.medicine.medicine_name || notification.medicine.name} to cart!`);
        markAsRead(notification.id);
      }
    } catch (error) {
      toast.error('Failed to add to cart');
    } finally {
      setAddingToCart(prev => ({ ...prev, [notification.id]: false }));
    }
  };

  const getNotificationIcon = (notification) => {
    switch (notification.type) {
      case 'refill':
        return <Clock className="w-5 h-5 text-orange-500" />;
      case 'overdue':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'low_stock':
        return <Pill className="w-5 h-5 text-yellow-500" />;
      default:
        return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  const getPriorityStyles = (priority) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50';
      case 'medium':
        return 'border-l-orange-500 bg-orange-50';
      case 'low':
        return 'border-l-blue-500 bg-blue-50';
      default:
        return 'border-l-gray-300 bg-gray-50';
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-blue-600' : 'text-gray-600'}`} />
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
        
        {/* Pulse animation for urgent notifications */}
        {notifications.some(n => n.priority === 'high' && !n.read) && (
          <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full animate-ping" />
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell size={18} />
                  <h3 className="font-bold">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={refreshNotifications}
                    disabled={loading}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition"
                    title="Refresh"
                  >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  </button>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition"
                      title="Mark all as read"
                    >
                      <CheckCheck size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Notification List */}
            <div className="max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No notifications</p>
                  <p className="text-sm text-gray-400 mt-1">
                    You're all caught up! 🎉
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 border-l-4 transition-colors hover:bg-gray-50 ${getPriorityStyles(notification.priority)} ${
                        notification.read ? 'opacity-70' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className="flex-shrink-0 mt-0.5">
                          <span className="text-xl">{notification.icon}</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className={`text-sm font-semibold text-gray-800 ${
                                !notification.read ? 'font-bold' : ''
                              }`}>
                                {notification.title}
                              </h4>
                              <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                                {notification.message}
                              </p>
                            </div>
                            
                            {/* Dismiss button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                dismissNotification(notification.id);
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition"
                            >
                              <X size={14} />
                            </button>
                          </div>

                          {/* Medicine Details */}
                          {notification.medicine && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                              {notification.medicine.days_until_refill !== undefined && (
                                <span className={`px-2 py-0.5 rounded-full font-medium ${
                                  notification.medicine.days_until_refill <= 0 
                                    ? 'bg-red-100 text-red-700'
                                    : notification.medicine.days_until_refill <= 7
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {notification.medicine.days_until_refill <= 0 
                                    ? 'Overdue!'
                                    : `${notification.medicine.days_until_refill} days left`}
                                </span>
                              )}
                              {notification.medicine.suggested_quantity && (
                                <span className="text-gray-500">
                                  Qty: {notification.medicine.suggested_quantity}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-xs text-gray-400">
                              {formatTimeAgo(notification.timestamp)}
                            </span>
                            
                            <div className="flex items-center gap-2">
                              {!notification.read && (
                                <button
                                  onClick={() => markAsRead(notification.id)}
                                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                >
                                  <Check size={12} />
                                  Mark read
                                </button>
                              )}
                              
                              {notification.actionType === 'reorder' && (
                                <button
                                  onClick={() => handleReorder(notification)}
                                  disabled={addingToCart[notification.id]}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-semibold rounded-lg hover:shadow-md transition disabled:opacity-50"
                                >
                                  {addingToCart[notification.id] ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : (
                                    <ShoppingCart size={12} />
                                  )}
                                  {notification.actionLabel}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-3 bg-gray-50 border-t">
                <button
                  onClick={() => {
                    navigate('/customer/recommendations');
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View All Reminders
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}