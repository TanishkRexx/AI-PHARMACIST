import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Package,
  CheckCircle,
  Truck,
  Home,
  Clock
} from 'lucide-react';
import { customerService } from '../../api/customerService';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

export default function OrderTracking() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTracking();
  }, [orderId]);

  const loadTracking = async () => {
    try {
      setLoading(true);
      const response = await customerService.trackOrder(orderId);

      if (response.success) {
        setTracking(response.data);
      }
    } catch (error) {
      toast.error('Failed to load tracking');
      navigate('/customer/orders');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading fullScreen text="Loading tracking info..." />;
  if (!tracking) return null;

  const steps = [
    { icon: Clock, label: 'Order Placed' },
    { icon: CheckCircle, label: 'Confirmed' },
    { icon: Package, label: 'Processing' },
    { icon: Truck, label: 'Dispatched' },
    { icon: Home, label: 'Delivered' }
  ];

  const getCurrentStep = () => {
    const statusMap = {
      pending: 0,
      confirmed: 1,
      processing: 2,
      dispatched: 3,
      delivered: 4
    };
    return statusMap[tracking.current_status] || 0;
  };

  const currentStep = getCurrentStep();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button
        onClick={() => navigate(`/customer/orders/${orderId}`)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition"
      >
        <ArrowLeft size={20} />
        <span>Back to Order Details</span>
      </button>

      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white p-6 rounded-2xl">
        <h1 className="text-xl font-bold mb-2">Track Your Order</h1>
        <p className="text-sm opacity-90">{tracking.order_number}</p>
        <p className="text-sm opacity-80 mt-2">
          Current Status: <strong>{tracking.current_status.toUpperCase()}</strong>
        </p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-md border">
        <div className="relative">
          <div className="absolute top-6 left-6 right-6 h-1 bg-gray-200 rounded-full">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
              transition={{ duration: 1, delay: 0.5 }}
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
            />
          </div>

          <div className="relative flex justify-between">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = index <= currentStep;
              const isCurrent = index === currentStep;
              const timelineStep = tracking.timeline?.[index];

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex flex-col items-center"
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all ${
                      isCompleted
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                        : 'bg-gray-200 text-gray-400'
                    } ${isCurrent ? 'ring-4 ring-blue-200' : ''}`}
                  >
                    <StepIcon size={20} />
                  </div>
                  <p className={`mt-3 text-sm font-medium ${isCompleted ? 'text-gray-800' : 'text-gray-400'}`}>
                    {step.label}
                  </p>
                  {timelineStep?.completed && timelineStep.timestamp && (
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(timelineStep.timestamp).toLocaleDateString()}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-md border">
        <h2 className="font-bold text-gray-800 mb-4">Timeline Details</h2>
        
        <div className="space-y-4">
          {tracking.timeline?.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-start gap-4 p-4 rounded-xl ${
                step.completed ? 'bg-green-50 border border-green-100' : 'bg-gray-50'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                step.completed ? 'bg-green-500 text-white' : 'bg-gray-300 text-white'
              }`}>
                {step.completed ? <CheckCircle size={16} /> : <Clock size={16} />}
              </div>
              <div className="flex-1">
                <p className={`font-medium ${step.completed ? 'text-gray-800' : 'text-gray-400'}`}>
                  {step.label}
                </p>
                {step.timestamp && (
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(step.timestamp).toLocaleString()}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl">
        <h3 className="font-semibold text-blue-800 mb-2">Need Help?</h3>
        <p className="text-sm text-blue-600">
          If you have any questions about your order, please contact our support team or use the AI Chat feature.
        </p>
        <button
          onClick={() => navigate('/customer/chat')}
          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          Chat with AI Support
        </button>
      </div>
    </div>
  );
}