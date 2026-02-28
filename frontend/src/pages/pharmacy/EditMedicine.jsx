import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { pharmacyService } from '../../api/pharmacyService';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

export default function EditMedicine() {
  const { medicineId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    generic_name: '',
    brand: '',
    category: 'painkiller',
    dosage: '',
    unit_price: '',
    stock_quantity: '',
    reorder_level: 50,
    prescription_required: false,
    description: '',
    manufacturer: '',
    contraindications: '',
    drug_interactions: '',
    side_effects: '',
    is_active: true
  });
  
  const [originalData, setOriginalData] = useState(null);
  const [errors, setErrors] = useState({});

  const categories = [
    { value: 'painkiller', label: 'Painkiller' },
    { value: 'antibiotic', label: 'Antibiotic' },
    { value: 'antidiabetic', label: 'Antidiabetic' },
    { value: 'cardiovascular', label: 'Cardiovascular' },
    { value: 'respiratory', label: 'Respiratory' },
    { value: 'gastrointestinal', label: 'Gastrointestinal' },
    { value: 'vitamin', label: 'Vitamin' },
    { value: 'dermatological', label: 'Dermatological' },
    { value: 'neurological', label: 'Neurological' },
    { value: 'hormonal', label: 'Hormonal' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    loadMedicine();
  }, [medicineId]);

  const loadMedicine = async () => {
    try {
      setLoading(true);
      const response = await pharmacyService.getMedicineDetails(medicineId);
      
      if (response.success) {
        const med = response.data;
        setForm({
          name: med.name || '',
          generic_name: med.generic_name || '',
          brand: med.brand || '',
          category: med.category || 'other',
          dosage: med.dosage || '',
          unit_price: med.unit_price?.toString() || '',
          stock_quantity: med.stock_quantity?.toString() || '',
          reorder_level: med.reorder_level || 50,
          prescription_required: med.prescription_required || false,
          description: med.description || '',
          manufacturer: med.manufacturer || '',
          contraindications: Array.isArray(med.contraindications) 
            ? med.contraindications.join(', ') 
            : '',
          drug_interactions: Array.isArray(med.drug_interactions) 
            ? med.drug_interactions.join(', ') 
            : '',
          side_effects: Array.isArray(med.side_effects) 
            ? med.side_effects.join(', ') 
            : '',
          is_active: med.is_active !== false
        });
        setOriginalData(med);
      }
    } catch (error) {
      toast.error('Failed to load medicine');
      navigate('/pharmacy/inventory');
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (!form.generic_name.trim()) newErrors.generic_name = 'Generic name is required';
    if (!form.brand.trim()) newErrors.brand = 'Brand is required';
    if (!form.dosage.trim()) newErrors.dosage = 'Dosage is required';
    if (!form.unit_price || parseFloat(form.unit_price) <= 0) newErrors.unit_price = 'Valid price required';
    if (form.stock_quantity === '' || parseInt(form.stock_quantity) < 0) newErrors.stock_quantity = 'Valid stock required';
    if (!form.manufacturer.trim()) newErrors.manufacturer = 'Manufacturer is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        generic_name: form.generic_name,
        brand: form.brand,
        category: form.category,
        dosage: form.dosage,
        unit_price: parseFloat(form.unit_price),
        stock_quantity: parseInt(form.stock_quantity),
        reorder_level: parseInt(form.reorder_level),
        prescription_required: form.prescription_required,
        description: form.description || null,
        manufacturer: form.manufacturer,
        contraindications: form.contraindications.split(',').map(s => s.trim()).filter(Boolean),
        drug_interactions: form.drug_interactions.split(',').map(s => s.trim()).filter(Boolean),
        side_effects: form.side_effects.split(',').map(s => s.trim()).filter(Boolean),
        is_active: form.is_active
      };

      const response = await pharmacyService.updateMedicine(medicineId, payload);
      if (response.success) {
        toast.success('Medicine updated successfully!');
        navigate('/pharmacy/inventory');
      }
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to update medicine';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // Soft delete - set is_active to false
      const response = await pharmacyService.updateMedicine(medicineId, { is_active: false });
      if (response.success) {
        toast.success('Medicine deleted successfully!');
        navigate('/pharmacy/inventory');
      }
    } catch (error) {
      toast.error('Failed to delete medicine');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const hasChanges = () => {
    if (!originalData) return false;
    return JSON.stringify(form) !== JSON.stringify({
      name: originalData.name || '',
      generic_name: originalData.generic_name || '',
      brand: originalData.brand || '',
      category: originalData.category || 'other',
      dosage: originalData.dosage || '',
      unit_price: originalData.unit_price?.toString() || '',
      stock_quantity: originalData.stock_quantity?.toString() || '',
      reorder_level: originalData.reorder_level || 50,
      prescription_required: originalData.prescription_required || false,
      description: originalData.description || '',
      manufacturer: originalData.manufacturer || '',
      contraindications: Array.isArray(originalData.contraindications) 
        ? originalData.contraindications.join(', ') 
        : '',
      drug_interactions: Array.isArray(originalData.drug_interactions) 
        ? originalData.drug_interactions.join(', ') 
        : '',
      side_effects: Array.isArray(originalData.side_effects) 
        ? originalData.side_effects.join(', ') 
        : '',
      is_active: originalData.is_active !== false
    });
  };

  if (loading) return <Loading fullScreen text="Loading medicine details..." />;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/pharmacy/inventory')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Inventory
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Edit Medicine</h1>
            <p className="text-sm text-gray-500">Update medicine details and stock information</p>
          </div>
          {hasChanges() && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm rounded-full">
              Unsaved changes
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl shadow-md border"
        >
          <h2 className="font-bold text-gray-800 mb-4">Basic Information</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Medicine Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent ${errors.name ? 'border-red-300' : 'border-gray-200'}`}
                placeholder="e.g., Paracetamol 500mg"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Generic Name *</label>
              <input
                type="text"
                value={form.generic_name}
                onChange={(e) => setForm({ ...form, generic_name: e.target.value })}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent ${errors.generic_name ? 'border-red-300' : 'border-gray-200'}`}
                placeholder="e.g., Paracetamol"
              />
              {errors.generic_name && <p className="text-red-500 text-xs mt-1">{errors.generic_name}</p>}
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Brand *</label>
              <input
                type="text"
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent ${errors.brand ? 'border-red-300' : 'border-gray-200'}`}
                placeholder="e.g., Crocin"
              />
              {errors.brand && <p className="text-red-500 text-xs mt-1">{errors.brand}</p>}
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Dosage *</label>
              <input
                type="text"
                value={form.dosage}
                onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent ${errors.dosage ? 'border-red-300' : 'border-gray-200'}`}
                placeholder="e.g., 500mg"
              />
              {errors.dosage && <p className="text-red-500 text-xs mt-1">{errors.dosage}</p>}
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Manufacturer *</label>
              <input
                type="text"
                value={form.manufacturer}
                onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent ${errors.manufacturer ? 'border-red-300' : 'border-gray-200'}`}
                placeholder="e.g., GSK"
              />
              {errors.manufacturer && <p className="text-red-500 text-xs mt-1">{errors.manufacturer}</p>}
            </div>
          </div>
        </motion.div>

        {/* Pricing & Stock */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-2xl shadow-md border"
        >
          <h2 className="font-bold text-gray-800 mb-4">Pricing & Stock</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Unit Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.unit_price}
                onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent ${errors.unit_price ? 'border-red-300' : 'border-gray-200'}`}
                placeholder="0.00"
              />
              {errors.unit_price && <p className="text-red-500 text-xs mt-1">{errors.unit_price}</p>}
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Current Stock *</label>
              <input
                type="number"
                min="0"
                value={form.stock_quantity}
                onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent ${errors.stock_quantity ? 'border-red-300' : 'border-gray-200'}`}
                placeholder="0"
              />
              {errors.stock_quantity && <p className="text-red-500 text-xs mt-1">{errors.stock_quantity}</p>}
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Reorder Level</label>
              <input
                type="number"
                min="0"
                value={form.reorder_level}
                onChange={(e) => setForm({ ...form, reorder_level: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="50"
              />
            </div>
          </div>

          {/* Stock Status Indicator */}
          {originalData && (
            <div className="mt-4 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Stock Level</span>
                <span className={`text-sm font-medium ${
                  parseInt(form.stock_quantity) === 0 ? 'text-red-600' :
                  parseInt(form.stock_quantity) <= form.reorder_level ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {parseInt(form.stock_quantity) === 0 ? 'Out of Stock' :
                   parseInt(form.stock_quantity) <= form.reorder_level ? 'Low Stock' :
                   'In Stock'}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    parseInt(form.stock_quantity) === 0 ? 'bg-red-500' :
                    parseInt(form.stock_quantity) <= form.reorder_level ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ 
                    width: `${Math.min(100, (parseInt(form.stock_quantity) / form.reorder_level) * 50)}%` 
                  }}
                />
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center gap-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.prescription_required}
                onChange={(e) => setForm({ ...form, prescription_required: e.target.checked })}
                className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Prescription Required</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Active (Available for sale)</span>
            </label>
          </div>
        </motion.div>

        {/* Safety Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-2xl shadow-md border"
        >
          <h2 className="font-bold text-gray-800 mb-4">Safety Information</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Description</label>
              <textarea
                rows="3"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Medicine description..."
              />
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Contraindications (comma separated)</label>
              <input
                type="text"
                value={form.contraindications}
                onChange={(e) => setForm({ ...form, contraindications: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="e.g., Liver disease, Pregnancy"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Drug Interactions (comma separated)</label>
              <input
                type="text"
                value={form.drug_interactions}
                onChange={(e) => setForm({ ...form, drug_interactions: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="e.g., Warfarin, Alcohol"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Side Effects (comma separated)</label>
              <input
                type="text"
                value={form.side_effects}
                onChange={(e) => setForm({ ...form, side_effects: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="e.g., Nausea, Drowsiness"
              />
            </div>
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-red-50 p-6 rounded-2xl border border-red-200"
        >
          <h2 className="font-bold text-red-800 mb-2 flex items-center gap-2">
            <AlertTriangle size={20} />
            Danger Zone
          </h2>
          <p className="text-sm text-red-600 mb-4">
            Deleting this medicine will remove it from your inventory. This action cannot be undone.
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition flex items-center gap-2"
          >
            <Trash2 size={18} />
            Delete Medicine
          </button>
        </motion.div>

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate('/pharmacy/inventory')}
            className="flex-1 py-3 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !hasChanges()}
            className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="text-red-600" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Delete Medicine?</h3>
                <p className="text-sm text-gray-500">This will remove {form.name}</p>
              </div>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this medicine? This action cannot be undone and 
              will remove the medicine from your inventory.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}