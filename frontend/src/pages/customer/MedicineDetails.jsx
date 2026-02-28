import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ShoppingCart,
  Plus,
  Minus,
  AlertTriangle,
  Shield,
  Info,
  Loader2,
  Sparkles
} from 'lucide-react';
import { customerService } from '../../api/customerService';
import { useCart } from '../../context/CartContext';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

// ============================================
// MEDICINE IMAGE COMPONENT WITH FALLBACK
// ============================================
function MedicineImage({ src, alt, className = "" }) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Show placeholder if no src or error occurred
  if (!src || hasError) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-blue-100 to-cyan-100 ${className}`}>
        <span className="text-6xl">💊</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50 animate-pulse">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      )}
      {/* Actual image */}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-contain transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        loading="lazy"
      />
    </div>
  );
}

// ============================================
// MAIN MEDICINE DETAILS COMPONENT
// ============================================
export default function MedicineDetails() {
  const { medicineId } = useParams();
  const navigate = useNavigate();
  const { addToCart, cart } = useCart();

  const [medicine, setMedicine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [alternatives, setAlternatives] = useState([]);

  useEffect(() => {
    loadMedicine();
  }, [medicineId]);

  const loadMedicine = async () => {
    try {
      setLoading(true);
      const response = await customerService.getMedicineDetails(medicineId);
      if (response.success) {
        setMedicine(response.data);
      }
    } catch (error) {
      toast.error('Failed to load medicine details');
      navigate('/customer/medicines');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    setAdding(true);
    const result = await addToCart(medicineId, quantity);
    setAdding(false);
    
    if (result.success) {
      toast.success('Added to cart!');
    }
  };

  const getCartQuantity = () => {
    const item = cart.items?.find(i => i.medicine_id === medicineId);
    return item?.quantity || 0;
  };

  if (loading) return <Loading fullScreen text="Loading medicine details..." />;
  if (!medicine) return null;

  const inCart = getCartQuantity();

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate('/customer/medicines')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
      >
        <ArrowLeft size={20} />
        Back to Medicines
      </button>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Image & Quick Info */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1"
        >
          <div className="bg-white rounded-2xl shadow-md border p-4 fixed top-28 w-[320px]">
            {/* ====== MEDICINE IMAGE ====== */}
            <MedicineImage
              src={medicine.image_url}
              alt={medicine.name}
              className="h-48 w-full rounded-xl mb-6"
            />

            {/* Price & Stock */}
            <div className="mb-4">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-bold text-gray-800">₹{medicine.price}</span>
                <span className="text-gray-500">/ unit</span>
              </div>
              {medicine.in_stock ? (
                <p className="text-green-600 font-medium">✓ In Stock ({medicine.stock} available)</p>
              ) : (
                <p className="text-red-600 font-medium">✗ Out of Stock</p>
              )}
            </div>

            {/* Prescription Badge */}
            {medicine.prescription_required && (
              <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-600 text-sm font-medium">
                  🔴 Prescription Required
                </p>
              </div>
            )}

            {/* Quantity Selector */}
            {medicine.in_stock && (
              <div className="mb-4">
                <label className="text-sm text-gray-600 mb-2 block">Quantity</label>
                <div className="flex items-center gap-3 bg-gray-100 rounded-xl px-4 py-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    <Minus size={20} />
                  </button>
                  <span className="flex-1 text-center font-bold text-gray-800 text-lg">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(medicine.stock, quantity + 1))}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            )}

            {/* Add to Cart */}
            {medicine.in_stock && (
              <button
                onClick={handleAddToCart}
                disabled={adding}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {adding ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <ShoppingCart size={20} />
                    Add to Cart
                  </>
                )}
              </button>
            )}

            {inCart > 0 && (
              <p className="text-center text-sm text-green-600 mt-2">
                ✓ {inCart} in cart
              </p>
            )}
          </div>
        </motion.div>

        {/* Details */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Basic Info */}
          <div className="bg-white rounded-2xl shadow-md border p-4">
            <div className="mb-4">
              <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                {medicine.category}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{medicine.name}</h1>
            <p className="text-gray-600 mb-4">{medicine.generic_name}</p>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Brand:</span>
                <p className="font-medium text-gray-800">{medicine.brand}</p>
              </div>
              <div>
                <span className="text-gray-500">Dosage:</span>
                <p className="font-medium text-gray-800">{medicine.dosage}</p>
              </div>
              <div>
                <span className="text-gray-500">Manufacturer:</span>
                <p className="font-medium text-gray-800">{medicine.manufacturer}</p>
              </div>
            </div>

            {medicine.description && (
              <div className="mt-4 pt-4 border-t">
                <h3 className="font-semibold text-gray-800 mb-2">Description</h3>
                <p className="text-gray-600">{medicine.description}</p>
              </div>
            )}
          </div>

          {/* Safety Information */}
          {(medicine.side_effects?.length > 0 || medicine.contraindications?.length > 0) && (
            <div className="bg-white rounded-2xl shadow-md border p-6">
              <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Shield className="text-red-500" size={20} />
                Safety Information
              </h2>

              {medicine.side_effects?.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-700 mb-2">Common Side Effects</h3>
                  <ul className="space-y-1">
                    {medicine.side_effects.map((effect, index) => (
                      <li key={index} className="text-gray-600 text-sm">
                        • {effect}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {medicine.contraindications?.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-700 mb-2">Contraindications</h3>
                  <ul className="space-y-1">
                    {medicine.contraindications.map((contra, index) => (
                      <li key={index} className="text-gray-600 text-sm">
                        • {contra}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {medicine.drug_interactions?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Drug Interactions</h3>
                  <ul className="space-y-1">
                    {medicine.drug_interactions.map((interaction, index) => (
                      <li key={index} className="text-gray-600 text-sm">
                        • {interaction}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                <p className="text-yellow-700 text-sm">
                  <AlertTriangle size={16} className="inline mr-1" />
                  Always consult with a healthcare professional before use
                </p>
              </div>
            </div>
          )}

          {/* Additional Info */}
          {medicine.max_daily_dosage && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
              <p className="text-blue-700">
                <Info size={16} className="inline mr-2" />
                <strong>Maximum Daily Dosage:</strong> {medicine.max_daily_dosage}
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}