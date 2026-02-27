import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Upload, Loader2, CheckCircle } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { customerService } from '../../api/customerService';
import toast from 'react-hot-toast';

export default function Checkout() {
  const navigate = useNavigate();
  const { cart, clearCart } = useCart();

  const [form, setForm] = useState({
    delivery_address: '',
    delivery_notes: '',
    prescription_image: null
  });
  const [loading, setLoading] = useState(false);
  const [prescriptionFile, setPrescriptionFile] = useState(null);

  const requiresPrescription = cart.items?.some(item => item.prescription_required);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPrescriptionFile(file);
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, prescription_image: reader.result.split(',')[1] });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.delivery_address) {
      toast.error('Please enter delivery address');
      return;
    }

    if (requiresPrescription && !form.prescription_image) {
      toast.error('Please upload prescription');
      return;
    }

    try {
      setLoading(true);

      const orderResult = await customerService.placeOrder(form);

      if (orderResult.success) {
        const orderId = orderResult.data.order_id;

        const paymentResult = await customerService.mockPayment(orderId);

        if (paymentResult.success) {
          await clearCart();
          toast.success('Order placed successfully! 🎉');
          navigate(`/customer/orders/${orderId}`);
        }
      }
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to place order';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const deliveryCharge = cart.total_amount >= 500 ? 0 : 40;
  const total = cart.total_amount + deliveryCharge;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Checkout</h1>

      <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-md border">
            <h2 className="font-bold text-gray-800 mb-4">Delivery Address</h2>
            <textarea
              required
              rows="3"
              placeholder="Enter complete delivery address"
              value={form.delivery_address}
              onChange={(e) => setForm({ ...form, delivery_address: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-md border">
            <h2 className="font-bold text-gray-800 mb-4">Delivery Notes (Optional)</h2>
            <textarea
              rows="2"
              placeholder="Any special instructions for delivery"
              value={form.delivery_notes}
              onChange={(e) => setForm({ ...form, delivery_notes: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {requiresPrescription && (
            <div className="bg-orange-50 border-2 border-orange-200 p-6 rounded-2xl">
              <h2 className="font-bold text-gray-800 mb-2">Upload Prescription</h2>
              <p className="text-sm text-gray-600 mb-4">
                Some items in your cart require a valid prescription
              </p>

              <label className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-dashed border-orange-300 rounded-xl cursor-pointer hover:bg-orange-50 transition">
                <Upload size={20} className="text-orange-500" />
                <span className="font-medium text-gray-700">
                  {prescriptionFile ? prescriptionFile.name : 'Choose File'}
                </span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  required={requiresPrescription}
                />
              </label>

              {prescriptionFile && (
                <p className="mt-2 text-sm text-green-600">✓ Prescription uploaded</p>
              )}
            </div>
          )}
        </div>

        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-md border sticky top-6">
            <h2 className="font-bold text-gray-800 mb-4">Order Summary</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Items ({cart.total_items})</span>
                <span className="font-semibold">₹{cart.total_amount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Delivery</span>
                <span className="font-semibold text-green-600">
                  {deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}
                </span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="font-bold text-gray-800">Total</span>
                <span className="text-xl font-bold text-gray-800">₹{total}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard size={18} />
                  Place Order
                </>
              )}
            </button>

            <p className="mt-4 text-xs text-gray-500 text-center">
              By placing order, you agree to our Terms & Conditions
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}