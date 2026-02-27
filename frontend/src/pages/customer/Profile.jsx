import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  AlertTriangle,
  Plus,
  X,
  Loader2,
  Save
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../api/authService';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, updateProfile } = useAuth();

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || ''
  });
  const [allergies, setAllergies] = useState(
    user?.medical_info?.allergies || []
  );
  const [newAllergy, setNewAllergy] = useState({ allergen: '', severity: 'moderate' });
  const [loading, setLoading] = useState(false);
  const [allergiesLoading, setAllergiesLoading] = useState(false);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await updateProfile(form);

    if (result.success) {
      toast.success('Profile updated!');
    }

    setLoading(false);
  };

  const handleAddAllergy = async () => {
    if (!newAllergy.allergen.trim()) {
      toast.error('Please enter an allergen');
      return;
    }

    const updatedAllergies = [...allergies, newAllergy];

    setAllergiesLoading(true);
    try {
      await authService.updateAllergies(updatedAllergies);
      setAllergies(updatedAllergies);
      setNewAllergy({ allergen: '', severity: 'moderate' });
      toast.success('Allergy added');
    } catch (error) {
      toast.error('Failed to add allergy');
    } finally {
      setAllergiesLoading(false);
    }
  };

  const handleRemoveAllergy = async (index) => {
    const updatedAllergies = allergies.filter((_, i) => i !== index);

    setAllergiesLoading(true);
    try {
      await authService.updateAllergies(updatedAllergies);
      setAllergies(updatedAllergies);
      toast.success('Allergy removed');
    } catch (error) {
      toast.error('Failed to remove allergy');
    } finally {
      setAllergiesLoading(false);
    }
  };

  const severityColors = {
    mild: 'bg-yellow-100 text-yellow-700',
    moderate: 'bg-orange-100 text-orange-700',
    severe: 'bg-red-100 text-red-700'
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
        <p className="text-sm text-gray-500">Manage your personal information and health data</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Personal Information */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-6 rounded-2xl shadow-md border"
        >
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <User size={20} className="text-blue-500" />
            Personal Information
          </h2>

          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Full Name</label>
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border">
                <User size={18} className="text-gray-400" />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="flex-1 bg-transparent outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Email</label>
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-100 rounded-xl border">
                <Mail size={18} className="text-gray-400" />
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="flex-1 bg-transparent outline-none text-gray-500"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Phone</label>
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border">
                <Phone size={18} className="text-gray-400" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="flex-1 bg-transparent outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Address</label>
              <div className="flex items-start gap-3 px-4 py-3 bg-gray-50 rounded-xl border">
                <MapPin size={18} className="text-gray-400 mt-1" />
                <textarea
                  rows="2"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="flex-1 bg-transparent outline-none resize-none"
                  placeholder="Enter your delivery address"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
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
          </form>
        </motion.div>

        {/* Medical Information */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-6 rounded-2xl shadow-md border"
        >
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Shield size={20} className="text-red-500" />
            Medical Information
          </h2>

          {/* Allergies */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-orange-500" />
              Known Allergies
            </h3>

            {allergies.length > 0 ? (
              <div className="space-y-2 mb-4">
                {allergies.map((allergy, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-800">
                        {allergy.allergen}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${severityColors[allergy.severity]}`}>
                        {allergy.severity}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveAllergy(index)}
                      disabled={allergiesLoading}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-4">No allergies added</p>
            )}

            {/* Add Allergy */}
            <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Add New Allergy</h4>
              <div className="flex gap-1">
                <input
                  type="text"
                  placeholder="Allergen name"
                  value={newAllergy.allergen}
                  onChange={(e) => setNewAllergy({ ...newAllergy, allergen: e.target.value })}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <select
                  value={newAllergy.severity}
                  onChange={(e) => setNewAllergy({ ...newAllergy, severity: e.target.value })}
                  className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
                <button
                  onClick={handleAddAllergy}
                  disabled={allergiesLoading}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition disabled:opacity-50"
                >
                  {allergiesLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={18} />}
                </button>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <h4 className="text-sm font-semibold text-blue-800 mb-1">Why add allergies?</h4>
            <p className="text-xs text-blue-700">
              Our AI pharmacist will automatically check for drug allergies and warn you about potential reactions when you're ordering medicines.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Account Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white p-6 rounded-2xl"
      >
        <h2 className="font-bold mb-4">Account Overview</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold">{user?.orders_count || 0}</p>
            <p className="text-sm opacity-80">Total Orders</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">{allergies.length}</p>
            <p className="text-sm opacity-80">Allergies Listed</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">Active</p>
            <p className="text-sm opacity-80">Account Status</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}