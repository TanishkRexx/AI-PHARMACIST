import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ShoppingCart,
  Plus,
  Minus,
  AlertTriangle,
  Shield,
  Info,
  Loader2,
  Sparkles,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Zap,
  Package
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

  if (!src || hasError) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-blue-100 to-cyan-100 ${className}`}>
        <span className="text-6xl">💊</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50 animate-pulse">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      )}
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
// ALTERNATIVE CARD FOR DETAILS PAGE
// ============================================
function AlternativeOption({ alternative, quantity, onSelect, selecting }) {
  const getMatchTypeBadge = () => {
    switch (alternative.match_type) {
      case 'generic_equivalent':
        return (
          <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">
            <Shield size={12} />
            Generic Equivalent
          </span>
        );
      case 'same_category':
        return (
          <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">
            <Package size={12} />
            Same Category
          </span>
        );
      case 'ai_similar':
        return (
          <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-medium">
            <Sparkles size={12} />
            AI Recommended
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="border border-gray-200 rounded-xl p-4 hover:border-green-300 hover:bg-green-50/30 transition-all cursor-pointer"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className="font-semibold text-gray-800">{alternative.name}</h4>
            {getMatchTypeBadge()}
          </div>
          
          {alternative.generic_name && (
            <p className="text-xs text-gray-500">{alternative.generic_name}</p>
          )}
          
          <div className="flex items-center gap-3 mt-2">
            <span className="text-lg font-bold text-green-600">₹{alternative.unit_price}</span>
            <span className="text-sm text-gray-400 line-through">₹{alternative.original_price}</span>
            <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-medium">
              Save {alternative.savings_percentage}%
            </span>
          </div>
          
          {alternative.why_suggested && (
            <p className="text-xs text-gray-500 mt-2">💡 {alternative.why_suggested}</p>
          )}
        </div>
        
        <button
          disabled={selecting}
          className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg transition disabled:opacity-50"
        >
          {selecting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Add This'
          )}
        </button>
      </div>
    </motion.div>
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
  
  // Price optimization states
  const [alternatives, setAlternatives] = useState([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [addingAlternative, setAddingAlternative] = useState(null);

  useEffect(() => {
    loadMedicine();
  }, [medicineId]);

  const loadMedicine = async () => {
    try {
      setLoading(true);
      const response = await customerService.getMedicineDetails(medicineId);
      if (response.success) {
        setMedicine(response.data);
        // Load alternatives after medicine loads
        loadAlternatives();
      }
    } catch (error) {
      toast.error('Failed to load medicine details');
      navigate('/customer/medicines');
    } finally {
      setLoading(false);
    }
  };

  const loadAlternatives = async () => {
    try {
      setLoadingAlternatives(true);
      const response = await customerService.getMedicineAlternatives(medicineId, quantity, 5);
      if (response.success && response.data.alternatives) {
        setAlternatives(response.data.alternatives);
      }
    } catch (error) {
      console.error('Failed to load alternatives:', error);
    } finally {
      setLoadingAlternatives(false);
    }
  };

  // Reload alternatives when quantity changes
  useEffect(() => {
    if (medicine) {
      loadAlternatives();
    }
  }, [quantity]);

  const handleAddToCart = async () => {
    setAdding(true);
    const result = await addToCart(medicineId, quantity);
    setAdding(false);
    
    if (result.success) {
      toast.success('Added to cart!');
    }
  };

  const handleAddAlternative = async (alternative) => {
    setAddingAlternative(alternative.id);
    const result = await addToCart(alternative.id, quantity);
    setAddingAlternative(null);
    
    if (result.success) {
      toast.success(`Added ${alternative.name} to cart!`);
    }
  };

  const getCartQuantity = () => {
    const item = cart.items?.find(i => i.medicine_id === medicineId);
    return item?.quantity || 0;
  };

  if (loading) return <Loading fullScreen text="Loading medicine details..." />;
  if (!medicine) return null;

  const inCart = getCartQuantity();
  const hasCheaperAlternatives = alternatives.length > 0;
  const bestSavings = alternatives[0]?.savings_per_unit * quantity || 0;

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
          <div className="bg-white rounded-2xl shadow-md border p-4 sticky top-28">
            {/* Medicine Image */}
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

            {/* Cheaper Alternative Alert */}
            {hasCheaperAlternatives && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl"
              >
                <div className="flex items-center gap-2 text-green-700 mb-1">
                  <TrendingDown size={18} />
                  <span className="font-semibold">Save up to ₹{bestSavings.toFixed(2)}!</span>
                </div>
                <p className="text-xs text-green-600">
                  {alternatives.length} cheaper alternative{alternatives.length > 1 ? 's' : ''} available
                </p>
                <button
                  onClick={() => setShowAlternatives(!showAlternatives)}
                  className="mt-2 text-sm text-green-700 font-medium flex items-center gap-1"
                >
                  {showAlternatives ? 'Hide' : 'View'} alternatives
                  {showAlternatives ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </motion.div>
            )}

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
                    Add to Cart - ₹{(medicine.price * quantity).toFixed(2)}
                  </>
                )}
              </button>
            )}

            {inCart > 0 && (
              <p className="text-center text-sm text-green-600 mt-2">
                ✓ {inCart} in cart
              </p>
            )}

            {/* Alternatives Section */}
            <AnimatePresence>
              {showAlternatives && alternatives.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-4 border-t border-gray-200 space-y-3 overflow-hidden"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={16} className="text-purple-500" />
                    <span className="font-semibold text-gray-700 text-sm">Cheaper Alternatives</span>
                  </div>
                  {loadingAlternatives ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                    </div>
                  ) : (
                    alternatives.map((alt) => (
                      <AlternativeOption
                        key={alt.id}
                        alternative={alt}
                        quantity={quantity}
                        onSelect={() => handleAddAlternative(alt)}
                        selecting={addingAlternative === alt.id}
                      />
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Details */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Basic Info */}
          <div className="bg-white rounded-2xl shadow-md border p-6">
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
                <p className="font-medium text-gray-800">{medicine.brand || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-500">Dosage:</span>
                <p className="font-medium text-gray-800">{medicine.dosage || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-500">Manufacturer:</span>
                <p className="font-medium text-gray-800">{medicine.manufacturer || 'N/A'}</p>
              </div>
            </div>

            {medicine.description && (
              <div className="mt-4 pt-4 border-t">
                <h3 className="font-semibold text-gray-800 mb-2">Description</h3>
                <p className="text-gray-600">{medicine.description}</p>
              </div>
            )}
          </div>

          {/* AI Alternatives Section (Desktop) */}
          {hasCheaperAlternatives && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl shadow-md border border-green-200 p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingDown size={20} className="text-green-600" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-800">💰 Save Money with Alternatives</h2>
                  <p className="text-sm text-gray-600">
                    Same quality medicines at lower prices
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {alternatives.map((alt, index) => (
                  <motion.div
                    key={alt.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-xl p-4 border border-green-100 hover:border-green-300 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-gray-800">{alt.name}</h4>
                          {alt.match_type === 'generic_equivalent' && (
                            <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                              🧬 Generic
                            </span>
                          )}
                          {alt.match_type === 'ai_similar' && (
                            <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">
                              🤖 AI Match
                            </span>
                          )}
                        </div>
                        {alt.generic_name && (
                          <p className="text-xs text-gray-500">{alt.generic_name}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-lg font-bold text-green-600">₹{alt.unit_price}</span>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            Save ₹{alt.savings_per_unit}/unit
                          </span>
                        </div>
                        {alt.why_suggested && (
                          <p className="text-xs text-gray-500 mt-1">💡 {alt.why_suggested}</p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-xs text-gray-500 mb-1">For {quantity} units</p>
                        <p className="font-bold text-green-600">₹{(alt.unit_price * quantity).toFixed(2)}</p>
                        <p className="text-xs text-green-600">Save ₹{(alt.savings_per_unit * quantity).toFixed(2)}</p>
                        <button
                          onClick={() => handleAddAlternative(alt)}
                          disabled={addingAlternative === alt.id}
                          className="mt-2 px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
                        >
                          {addingAlternative === alt.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Add This'
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

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