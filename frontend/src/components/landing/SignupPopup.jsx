import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Building2, Truck, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function SignupPopup({ isOpen, onClose, openLogin }) {
  const { register, getDashboardPath } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    role: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const roles = [
    { title: 'Patient', icon: <User className="h-5 w-5" /> },
    { title: 'Pharmacist', icon: <Building2 className="h-5 w-5" /> },
    { title: 'Distributor', icon: <Truck className="h-5 w-5" /> }
  ];

  if (!isOpen) return null;

  const validate = () => {
    const newErrors = {};
    if (!form.firstName.trim()) newErrors.firstName = 'First name required';
    if (!form.lastName.trim()) newErrors.lastName = 'Last name required';
    if (!form.phone.match(/^[0-9]{10}$/)) newErrors.phone = 'Valid 10-digit phone required';
    if (!form.email.match(/^\S+@\S+\.\S+$/)) newErrors.email = 'Valid email required';
    if (form.password.length < 8) newErrors.password = 'Password must be 8+ characters';
    if (!form.role) newErrors.role = 'Please select a role';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const result = await register(form);
    setLoading(false);

    if (result.success) {
      onClose();
      navigate(getDashboardPath());
    } else {
      setErrors({ api: result.error });
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg bg-white rounded-2xl p-8 shadow-2xl mx-4 max-h-[90vh] overflow-y-auto"
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>

          <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
            Create Account
          </h2>

          {errors.api && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {errors.api}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  placeholder="First Name"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className={`w-full px-4 py-3 rounded-lg border ${
                    errors.firstName ? 'border-red-300' : 'border-gray-200'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <input
                  placeholder="Last Name"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className={`w-full px-4 py-3 rounded-lg border ${
                    errors.lastName ? 'border-red-300' : 'border-gray-200'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
              </div>
            </div>

            <div>
              <input
                placeholder="Phone Number"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.phone ? 'border-red-300' : 'border-gray-200'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>

            <div>
              <input
                type="email"
                placeholder="Email Address"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.email ? 'border-red-300' : 'border-gray-200'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <input
                type="password"
                placeholder="Password (min 8 characters)"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.password ? 'border-red-300' : 'border-gray-200'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Select Role</p>
              <div className="grid grid-cols-3 gap-3">
                {roles.map((r) => (
                  <div
                    key={r.title}
                    onClick={() => setForm({ ...form, role: r.title })}
                    className={`cursor-pointer rounded-xl border-2 p-4 text-center transition ${
                      form.role === r.title
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`mx-auto mb-2 ${form.role === r.title ? 'text-blue-600' : 'text-gray-400'}`}>
                      {r.icon}
                    </div>
                    <span className={`text-sm font-medium ${form.role === r.title ? 'text-blue-600' : 'text-gray-600'}`}>
                      {r.title}
                    </span>
                  </div>
                ))}
              </div>
              {errors.role && <p className="text-red-500 text-xs mt-2">{errors.role}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>

            <p className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={openLogin}
                className="text-blue-600 font-medium hover:underline"
              >
                Sign In
              </button>
            </p>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}