import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Save,
  Heart,
  Activity,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  ShoppingBag,
  DollarSign,
  Pill,
  AlertCircle,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../api/authService';
import { customerService } from '../../api/customerService';
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

  // Health Profile State
  const [healthProfile, setHealthProfile] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [adherenceData, setAdherenceData] = useState(null);
  const [showAllInsights, setShowAllInsights] = useState(false);

  // Load Health Profile on mount
  useEffect(() => {
    loadHealthProfile();
  }, []);

  const loadHealthProfile = async () => {
    try {
      setHealthLoading(true);
      
      const [profileRes, adherenceRes] = await Promise.all([
        customerService.getHealthProfile(),
        customerService.getMedicationAdherence()
      ]);

      console.log('Health Profile:', profileRes);
      console.log('Adherence Data:', adherenceRes);

      if (profileRes.success && profileRes.data?.success) {
        setHealthProfile(profileRes.data);
      }

      if (adherenceRes.success && adherenceRes.data?.success) {
        setAdherenceData(adherenceRes.data);
      }
    } catch (error) {
      console.error('Failed to load health profile:', error);
      toast.error('Failed to load health insights');
    } finally {
      setHealthLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await updateProfile(form);

    if (result.success) {
      toast.success('Profile updated successfully!');
      loadHealthProfile(); // Reload health data
    } else {
      toast.error('Failed to update profile');
    }

    setLoading(false);
  };

  const handleAddAllergy = async () => {
    if (!newAllergy.allergen.trim()) {
      toast.error('Please enter an allergen name');
      return;
    }

    const updatedAllergies = [...allergies, newAllergy];

    setAllergiesLoading(true);
    try {
      await authService.updateAllergies(updatedAllergies);
      setAllergies(updatedAllergies);
      setNewAllergy({ allergen: '', severity: 'moderate' });
      toast.success('Allergy added successfully');
      loadHealthProfile(); // Reload to get updated insights
    } catch (error) {
      console.error('Add allergy error:', error);
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
      loadHealthProfile();
    } catch (error) {
      console.error('Remove allergy error:', error);
      toast.error('Failed to remove allergy');
    } finally {
      setAllergiesLoading(false);
    }
  };

  const severityColors = {
    mild: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    moderate: 'bg-orange-100 text-orange-700 border-orange-300',
    severe: 'bg-red-100 text-red-700 border-red-300'
  };

  const priorityColors = {
    high: 'border-red-500 bg-red-50',
    medium: 'border-orange-500 bg-orange-50',
    low: 'border-blue-500 bg-blue-50'
  };

  const insightTypeIcons = {
    warning: AlertTriangle,
    recommendation: TrendingUp,
    info: Info,
    alert: AlertCircle
  };

  const getHealthScoreColor = (score) => {
    if (score >= 80) return { bg: 'from-green-500 to-emerald-600', text: 'text-green-600', border: 'border-green-200' };
    if (score >= 60) return { bg: 'from-yellow-500 to-orange-600', text: 'text-yellow-600', border: 'border-yellow-200' };
    return { bg: 'from-red-500 to-pink-600', text: 'text-red-600', border: 'border-red-200' };
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">My Profile</h1>
          <p className="text-gray-500 mt-1">Manage your health and personal information</p>
        </div>
        {healthProfile && (
          <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-200 rounded-xl">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <span className="text-sm font-medium text-purple-700">AI-Powered Insights</span>
          </div>
        )}
      </div>

      {/* AI Health Score Banner */}
      {!healthLoading && healthProfile?.health_score && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`relative overflow-hidden p-6 rounded-2xl shadow-lg border-2 ${getHealthScoreColor(healthProfile.health_score.score).border}`}
        >
          <div className={`absolute inset-0 bg-gradient-to-r ${getHealthScoreColor(healthProfile.health_score.score).bg} opacity-10`}></div>
          
          <div className="relative flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-full bg-gradient-to-r ${getHealthScoreColor(healthProfile.health_score.score).bg}`}>
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    Health Score: {healthProfile.health_score.status}
                  </h2>
                  <p className="text-sm text-gray-600">AI-powered health awareness assessment</p>
                </div>
              </div>
              
              <div className="mt-3 flex flex-wrap gap-2">
                {healthProfile.health_score.factors.map((factor, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-full text-sm text-gray-700"
                  >
                    {factor}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="text-center">
              <div className={`text-6xl font-bold bg-gradient-to-r ${getHealthScoreColor(healthProfile.health_score.score).bg} bg-clip-text text-transparent`}>
                {healthProfile.health_score.score}
              </div>
              <p className="text-sm text-gray-500 mt-1">out of 100</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Loading State */}
      {healthLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-3 text-gray-500">Loading health insights...</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Personal Information Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-6 rounded-2xl shadow-md border border-gray-200"
        >
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <User size={20} className="text-blue-500" />
            Personal Information
          </h2>

          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Full Name</label>
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition">
                <User size={18} className="text-gray-400" />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="flex-1 bg-transparent outline-none text-gray-800"
                  placeholder="Enter your name"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Email Address</label>
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-100 rounded-xl border border-gray-200 cursor-not-allowed">
                <Mail size={18} className="text-gray-400" />
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="flex-1 bg-transparent outline-none text-gray-500 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1 ml-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Phone Number</label>
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition">
                <Phone size={18} className="text-gray-400" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="flex-1 bg-transparent outline-none text-gray-800"
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Delivery Address</label>
              <div className="flex items-start gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition">
                <MapPin size={18} className="text-gray-400 mt-1" />
                <textarea
                  rows="3"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="flex-1 bg-transparent outline-none resize-none text-gray-800"
                  placeholder="Enter your complete delivery address"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving Changes...
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

        {/* Medical Information Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-6 rounded-2xl shadow-md border border-gray-200"
        >
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Shield size={20} className="text-red-500" />
            Medical Information
          </h2>

          {/* Chronic Conditions */}
          {healthProfile?.profile?.chronic_conditions?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Activity size={16} className="text-blue-500" />
                Chronic Conditions
              </h3>
              <div className="flex flex-wrap gap-2">
                {healthProfile.profile.chronic_conditions.map((condition, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-sm font-medium"
                  >
                    {condition}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Allergies Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-orange-500" />
              Known Allergies
            </h3>

            {allergies.length > 0 ? (
              <div className="space-y-2 mb-4">
                {allergies.map((allergy, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200"
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle size={16} className="text-orange-500" />
                      <span className="font-medium text-gray-800">
                        {allergy.allergen}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${severityColors[allergy.severity]}`}>
                        {allergy.severity}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveAllergy(index)}
                      disabled={allergiesLoading}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                      title="Remove allergy"
                    >
                      <X size={16} />
                    </button>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200 text-center">
                <AlertTriangle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No allergies added yet</p>
              </div>
            )}

            {/* Add New Allergy */}
            <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Plus size={16} className="text-orange-600" />
                Add New Allergy
              </h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Allergen name (e.g., Penicillin)"
                  value={newAllergy.allergen}
                  onChange={(e) => setNewAllergy({ ...newAllergy, allergen: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddAllergy()}
                  className="flex-1 px-3 py-2 border border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <select
                  value={newAllergy.severity}
                  onChange={(e) => setNewAllergy({ ...newAllergy, severity: e.target.value })}
                  className="px-3 py-2 border border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
                <button
                  onClick={handleAddAllergy}
                  disabled={allergiesLoading || !newAllergy.allergen.trim()}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {allergiesLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus size={18} />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Safety Info Box */}
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-blue-800 mb-1">AI Safety Protection</h4>
                <p className="text-xs text-blue-700">
                  Our AI automatically checks all your orders against your allergies and medical conditions to prevent dangerous interactions.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* AI Health Insights */}
      {!healthLoading && healthProfile?.health_insights && healthProfile.health_insights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl shadow-md border border-gray-200"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <Sparkles size={20} className="text-purple-500" />
              AI Health Insights
              <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                {healthProfile.health_insights.length} insights
              </span>
            </h2>
            <button
              onClick={() => setShowAllInsights(!showAllInsights)}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              {showAllInsights ? 'Show Less' : 'Show All'}
            </button>
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {(showAllInsights ? healthProfile.health_insights : healthProfile.health_insights.slice(0, 3)).map((insight, index) => {
                const IconComponent = insightTypeIcons[insight.type] || Info;
                
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 rounded-xl border-l-4 ${priorityColors[insight.priority]} hover:shadow-md transition-shadow`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">{insight.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-gray-800">{insight.title}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            insight.priority === 'high' ? 'bg-red-100 text-red-700' :
                            insight.priority === 'medium' ? 'bg-orange-100 text-orange-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {insight.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">{insight.message}</p>
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                          <span className="capitalize">{insight.type}</span>
                          <span>•</span>
                          <span>{insight.category}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Medication Adherence Tracking */}
      {!healthLoading && adherenceData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl shadow-md border border-gray-200"
        >
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Clock size={20} className="text-green-500" />
            Medication Adherence Tracking
          </h2>

          {adherenceData.medications && adherenceData.medications.length > 0 ? (
            <>
              {adherenceData.adherence_score !== null && (
                <div className="mb-4 p-5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Overall Adherence Score</p>
                      <p className="text-3xl font-bold text-green-600">{adherenceData.adherence_score}%</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {adherenceData.adherence_score >= 80 ? 'Excellent adherence!' : 'Needs improvement'}
                      </p>
                    </div>
                    {adherenceData.adherence_score >= 80 ? (
                      <CheckCircle className="w-16 h-16 text-green-500" />
                    ) : (
                      <XCircle className="w-16 h-16 text-orange-500" />
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {adherenceData.medications.map((med, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border-2 ${
                      med.is_overdue ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Pill className={med.is_overdue ? 'text-red-600' : 'text-green-600'} size={18} />
                          <h3 className="font-semibold text-gray-800">{med.medicine}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            med.is_overdue ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'
                          }`}>
                            {med.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500 text-xs">Refills</p>
                            <p className="font-semibold text-gray-800">{med.refill_count}x</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">Avg Interval</p>
                            <p className="font-semibold text-gray-800">{med.avg_refill_interval_days} days</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">Last Refill</p>
                            <p className="font-semibold text-gray-800">{med.days_since_last_refill} days ago</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">Next Refill</p>
                            <p className={`font-semibold ${med.is_overdue ? 'text-red-600' : 'text-green-600'}`}>
                              {med.is_overdue ? 'Overdue!' : `In ${med.next_refill_in} days`}
                            </p>
                          </div>
                        </div>
                      </div>

                      {med.is_overdue && (
                        <button className="ml-4 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition flex items-center gap-2">
                          <ShoppingBag size={16} />
                          Reorder Now
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {adherenceData.overdue_count > 0 && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-800">
                        {adherenceData.overdue_count} Medication{adherenceData.overdue_count > 1 ? 's' : ''} Overdue
                      </p>
                      <p className="text-xs text-red-700 mt-1">
                        Consistent medication is important for managing chronic conditions. Consider reordering soon.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <Clock className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-700 mb-2">No Adherence Data Yet</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Adherence tracking requires at least 2 purchases of the same medicine to detect refill patterns.
                Keep ordering and we'll start tracking your medication adherence automatically!
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Medication Summary Stats */}
      {!healthLoading && healthProfile?.medication_summary && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white p-6 rounded-2xl shadow-lg"
        >
          <h2 className="font-bold mb-4 text-xl">Medication Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-white/10 backdrop-blur-sm rounded-xl">
              <ShoppingBag className="w-8 h-8 mx-auto mb-2" />
              <p className="text-3xl font-bold">{healthProfile.medication_summary.total_orders}</p>
              <p className="text-sm opacity-90 mt-1">Total Orders</p>
            </div>
            <div className="text-center p-4 bg-white/10 backdrop-blur-sm rounded-xl">
              <Pill className="w-8 h-8 mx-auto mb-2" />
              <p className="text-3xl font-bold">{healthProfile.medication_summary.unique_medicines}</p>
              <p className="text-sm opacity-90 mt-1">Unique Medicines</p>
            </div>
            <div className="text-center p-4 bg-white/10 backdrop-blur-sm rounded-xl">
              <DollarSign className="w-8 h-8 mx-auto mb-2" />
              <p className="text-3xl font-bold">₹{healthProfile.medication_summary.total_spent.toFixed(0)}</p>
              <p className="text-sm opacity-90 mt-1">Total Spent</p>
            </div>
            <div className="text-center p-4 bg-white/10 backdrop-blur-sm rounded-xl">
              <Activity className="w-8 h-8 mx-auto mb-2" />
              <p className="text-3xl font-bold">
                {healthProfile.medication_summary.top_categories.length > 0 
                  ? healthProfile.medication_summary.top_categories[0][0] 
                  : 'N/A'}
              </p>
              <p className="text-sm opacity-90 mt-1">Top Category</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}