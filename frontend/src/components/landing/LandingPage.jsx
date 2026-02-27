import { motion } from 'framer-motion';
import { Heart, User, Building2, Truck, ArrowRight, Shield, Clock, Activity, Bot } from 'lucide-react';
import { useState } from 'react';
import LoginPopup from './LoginPopup';
import SignupPopup from './SignupPopup';

export default function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');

  const portals = [
    {
      title: 'Patient Portal',
      role: 'Patient',
      description: 'Order medicines, chat with AI pharmacist, track orders and get personalized recommendations.',
      icon: <User className="h-6 w-6" />,
      gradient: 'from-blue-500 to-cyan-500',
      features: ['AI Chat', 'Medicine Search', 'Order Tracking', 'Refill Reminders']
    },
    {
      title: 'Pharmacy Portal',
      role: 'Pharmacist',
      description: 'Manage inventory, process orders, AI-powered demand forecasting and analytics.',
      icon: <Building2 className="h-6 w-6" />,
      gradient: 'from-purple-500 to-pink-500',
      features: ['Inventory Management', 'Order Processing', 'AI Analytics', 'Procurement']
    },
    {
      title: 'Distributor Portal',
      role: 'Distributor',
      description: 'Manage pharmacy orders, track shipments, and optimize distribution.',
      icon: <Truck className="h-6 w-6" />,
      gradient: 'from-emerald-500 to-green-500',
      features: ['Order Management', 'Shipment Tracking', 'Analytics', 'Delivery Updates']
    }
  ];

  const features = [
    {
      icon: <Bot className="h-5 w-5" />,
      title: 'AI-Powered Chat',
      desc: 'Get medicine recommendations by describing symptoms'
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: 'Drug Safety Checks',
      desc: 'Automatic allergy and interaction warnings'
    },
    {
      icon: <Clock className="h-5 w-5" />,
      title: 'Smart Refill Reminders',
      desc: 'AI predicts when you need to reorder'
    },
    {
      icon: <Activity className="h-5 w-5" />,
      title: 'Demand Forecasting',
      desc: 'ML-powered inventory optimization'
    }
  ];

  const handlePortalClick = (role) => {
    setSelectedRole(role);
    setShowLogin(true);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-cyan-50 via-white to-blue-50">
      {/* Animated Background */}
      <motion.div
        animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
        transition={{ duration: 12, repeat: Infinity }}
        className="absolute w-96 h-96 bg-cyan-300/20 rounded-full blur-3xl top-10 left-10"
      />
      <motion.div
        animate={{ x: [0, -60, 0], y: [0, -40, 0] }}
        transition={{ duration: 14, repeat: Infinity }}
        className="absolute w-96 h-96 bg-blue-300/20 rounded-full blur-3xl bottom-10 right-10"
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 lg:px-12 bg-white/60 backdrop-blur-xl border-b">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg">
            <Heart className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold text-gray-800">GoMed</span>
        </motion.div>

        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowLogin(true)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
          >
            Sign In
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowSignup(true)}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-semibold shadow-lg"
          >
            Get Started
          </motion.button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-20 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6"
        >
          <Bot className="w-4 h-4" />
          Powered by AI Multi-Agent System
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent pb-2"
        >
          Smart Healthcare Platform
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 max-w-xl text-gray-600 text-lg"
        >
          AI-powered pharmacy management connecting patients, pharmacies, and distributors
        </motion.p>
      </section>

      {/* Portals */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-16">
        <div className="grid gap-8 md:grid-cols-3">
          {portals.map((portal, i) => (
            <motion.div
              key={portal.title}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              whileHover={{ scale: 1.03, y: -5 }}
              className="rounded-2xl bg-white/80 backdrop-blur-xl p-6 shadow-lg border hover:shadow-2xl transition cursor-pointer group"
              onClick={() => handlePortalClick(portal.role)}
            >
              <div className={`flex h-14 w-14 items-center justify-center rounded-xl text-white bg-gradient-to-r ${portal.gradient} shadow-lg mb-4`}>
                {portal.icon}
              </div>

              <h3 className="font-bold text-lg text-gray-800">{portal.title}</h3>
              <p className="text-gray-600 text-sm mt-2 mb-4">{portal.description}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                {portal.features.map((feature) => (
                  <span key={feature} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    {feature}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 text-blue-600 font-medium group-hover:gap-3 transition-all">
                Enter Portal <ArrowRight className="h-4 w-4" />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 bg-white/60 backdrop-blur-xl border-t px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold text-center mb-12">AI-Powered Features</h2>
          <div className="grid gap-8 md:grid-cols-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow mx-auto mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-gray-800">{f.title}</h3>
                <p className="text-sm text-gray-600 mt-2">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-white border-t px-6 py-6 text-center text-sm text-gray-500">
        © 2024 GoMed Healthcare Platform • Built with AI for better health outcomes
      </footer>

      {/* Popups */}
      <LoginPopup
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        openSignup={() => {
          setShowLogin(false);
          setShowSignup(true);
        }}
        defaultRole={selectedRole}
      />

      <SignupPopup
        isOpen={showSignup}
        onClose={() => setShowSignup(false)}
        openLogin={() => {
          setShowSignup(false);
          setShowLogin(true);
        }}
      />
    </div>
  );
}