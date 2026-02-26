import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  Calendar,
  ShoppingBag,
  AlertTriangle,
  UserCheck,
  UserX,
  Loader2
} from 'lucide-react';
import { adminService } from '../../api/adminService';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

export default function AdminUserDetails() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadUser();
  }, [userId]);

  const loadUser = async () => {
    try {
      setLoading(true);
      const response = await adminService.getUserDetails(userId);
      if (response.success) {
        setUser(response.data);
      }
    } catch (error) {
      toast.error('Failed to load user');
      navigate('/admin/users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    setUpdating(true);
    try {
      const response = await adminService.updateUserStatus(userId, !user.is_active);
      if (response.success) {
        toast.success(`User ${!user.is_active ? 'activated' : 'deactivated'}`);
        loadUser();
      }
    } catch (error) {
      toast.error('Failed to update user');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <Loading fullScreen text="Loading user details..." />;
  if (!user) return null;

  const roleColors = {
    customer: 'from-blue-600 to-cyan-500',
    pharmacy: 'from-purple-600 to-pink-500',
    distributor: 'from-green-600 to-emerald-500',
    admin: 'from-red-600 to-orange-500'
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/admin/users')}
        className="flex items-center gap-2 text-gray-400 hover:text-white"
      >
        <ArrowLeft size={20} />
        Back to Users
      </button>

      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gradient-to-r ${roleColors[user.role] || roleColors.customer} p-6 rounded-2xl text-white`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 bg-white/20 rounded-full flex items-center justify-center text-3xl font-bold">
              {user.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{user.name}</h1>
              <p className="opacity-80">{user.email}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-sm capitalize">
                {user.role}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${
              user.is_active ? 'bg-green-500/30' : 'bg-red-500/30'
            }`}>
              {user.is_active ? '● Active' : '● Inactive'}
            </span>
          </div>
        </div>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gray-800 p-6 rounded-2xl border border-gray-700"
        >
          <h2 className="font-bold text-white mb-4 flex items-center gap-2">
            <User size={20} className="text-cyan-400" />
            Basic Information
          </h2>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-xl">
              <Mail className="text-gray-400" size={18} />
              <div>
                <p className="text-xs text-gray-400">Email</p>
                <p className="text-white">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-xl">
              <Phone className="text-gray-400" size={18} />
              <div>
                <p className="text-xs text-gray-400">Phone</p>
                <p className="text-white">{user.phone}</p>
              </div>
            </div>

            {user.address && (
              <div className="flex items-start gap-3 p-3 bg-gray-700/50 rounded-xl">
                <MapPin className="text-gray-400 mt-1" size={18} />
                <div>
                  <p className="text-xs text-gray-400">Address</p>
                  <p className="text-white">{user.address}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-xl">
              <Calendar className="text-gray-400" size={18} />
              <div>
                <p className="text-xs text-gray-400">Joined</p>
                <p className="text-white">
                  {new Date(user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats & Actions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          {/* Stats */}
          {user.role === 'customer' && (
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
              <h2 className="font-bold text-white mb-4 flex items-center gap-2">
                <ShoppingBag size={20} className="text-cyan-400" />
                Customer Stats
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-700/50 rounded-xl text-center">
                  <p className="text-3xl font-bold text-white">{user.orders_count || 0}</p>
                  <p className="text-sm text-gray-400">Total Orders</p>
                </div>
                <div className="p-4 bg-gray-700/50 rounded-xl text-center">
                  <p className="text-3xl font-bold text-white">
                    {user.medical_info?.allergies?.length || 0}
                  </p>
                  <p className="text-sm text-gray-400">Allergies</p>
                </div>
              </div>
            </div>
          )}

          {/* Medical Info */}
          {user.role === 'customer' && user.medical_info && (
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
              <h2 className="font-bold text-white mb-4 flex items-center gap-2">
                <Shield size={20} className="text-red-400" />
                Medical Information
              </h2>

              {user.medical_info.allergies?.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-gray-400 mb-2">Allergies</p>
                  <div className="flex flex-wrap gap-2">
                    {user.medical_info.allergies.map((allergy, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm"
                      >
                        {allergy.allergen} ({allergy.severity})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {user.medical_info.chronic_conditions?.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-gray-400 mb-2">Chronic Conditions</p>
                  <div className="flex flex-wrap gap-2">
                    {user.medical_info.chronic_conditions.map((condition, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm"
                      >
                        {condition}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {user.medical_info.current_medications?.length > 0 && (
                <div>
                  <p className="text-sm text-gray-400 mb-2">Current Medications</p>
                  <div className="flex flex-wrap gap-2">
                    {user.medical_info.current_medications.map((med, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm"
                      >
                        {med}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
            <h2 className="font-bold text-white mb-4">Actions</h2>

            {user.role !== 'admin' && (
              <button
                onClick={handleToggleStatus}
                disabled={updating}
                className={`w-full py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${
                  user.is_active
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                }`}
              >
                {updating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Updating...
                  </>
                ) : user.is_active ? (
                  <>
                    <UserX size={20} />
                    Deactivate User
                  </>
                ) : (
                  <>
                    <UserCheck size={20} />
                    Activate User
                  </>
                )}
              </button>
            )}

            {user.role === 'admin' && (
              <p className="text-center text-gray-400 py-4">
                Admin accounts cannot be modified
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}