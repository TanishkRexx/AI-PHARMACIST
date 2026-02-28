import { motion } from 'framer-motion';
import { Heart, User, Building2, Truck, ArrowRight, Shield, Clock, Activity, Bot } from 'lucide-react';
import { useState } from 'react';
import LoginPopup from './LoginPopup';
import SignupPopup from './SignupPopup';
import AgentArchitecture from './AgentArchitecture';

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
<header className="fixed top-0 left-0 w-full z-50 px-6 pt-3">
  <div className="
    relative max-w-7xl mx-auto flex items-center justify-between
    px-6 py-3 rounded-full
    bg-white/30 backdrop-blur-xl
    border border-white/40
    shadow-lg
    overflow-hidden
  ">

    {/* Gloss Shine */}
    <div className="absolute inset-0 bg-gradient-to-r from-white/40 via-white/10 to-transparent opacity-40 pointer-events-none" />

    {/* Logo */}
    <motion.div
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 relative z-10"
    >
  <div className="h-9 w-9 overflow-hidden">
    <img
      src="/mainlogo.png"
      alt="GoMed Logo"
      className="h-full w-full object-contain"
    />
  </div>

      <span className="text-lg font-semibold text-gray-800 tracking-tight">
        GoMed
      </span>
    </motion.div>

    {/* Buttons */}
    <div className="flex items-center gap-4 relative z-10">

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowLogin(true)}
        className="text-sm font-medium text-gray-700 hover:text-black transition"
      >
        Sign In
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowSignup(true)}
        className="px-5 py-2 text-sm font-semibold rounded-full
        bg-gray-900 text-white shadow hover:bg-black transition"
      >
        Get Started
      </motion.button>

    </div>
  </div>
</header>

{/* HERO SECTION */}
<section className="relative z-10 px-6 pt-24 pb-20 text-center">

  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    className="inline-flex items-center gap-2 bg-blue-100 text-blue-600 px-4 py-1 rounded-full text-xs font-semibold mb-6"
  >
    <Bot size={14}/>
    AUTONOMOUS AI SYSTEM
  </motion.div>

<motion.h1
  initial={{ opacity: 0, y: 60 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.2 }}
  className="text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black leading-[1.05] tracking-tight"
>
  The Future of
  <br />
  <span className="bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">
    Therapy Continuity.
  </span>
</motion.h1>

  <motion.p
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.4 }}
    className="max-w-2xl mx-auto mt-6 text-gray-600"
  >
    GoMed is an intelligent multi-agent ecosystem that monitors therapy silently,
    predicts drift, and automates healthcare logistics with clinical precision.
  </motion.p>

</section>

      {/* Portals */}
<section className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
  <div className="grid gap-10 md:grid-cols-3">

    {portals.map((portal, i) => (
      <motion.div
        key={portal.title}
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.15 }}
        whileHover={{ y: -12, scale: 1.04 }}
        className="relative group cursor-pointer rounded-3xl border border-white/40
        bg-white/30 backdrop-blur-xl p-7 shadow-lg overflow-hidden
        hover:shadow-2xl transition-all duration-300"
        onClick={() => handlePortalClick(portal.role)}
      >

        {/* Glow background */}
        <div className={`absolute -top-20 -right-20 w-56 h-56 rounded-full opacity-20 blur-3xl bg-gradient-to-r ${portal.gradient}`} />

        {/* Icon */}
        <div className={`flex h-14 w-14 items-center justify-center rounded-xl
        bg-gradient-to-r ${portal.gradient} text-white shadow-lg mb-5`}>
          {portal.icon}
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900">
          {portal.title}
        </h3>

        {/* Description */}
        <p className="text-gray-600 text-sm mt-2 mb-5 leading-relaxed">
          {portal.description}
        </p>

        {/* Features */}
        <div className="flex flex-wrap gap-2 mb-6">
          {portal.features.map((feature) => (
            <span
              key={feature}
              className="text-xs font-medium bg-white/60 backdrop-blur
              border border-gray-200 px-3 py-1 rounded-full text-gray-700"
            >
              {feature}
            </span>
          ))}
        </div>

        {/* Enter button */}
        <div className="flex items-center gap-2 text-sm font-semibold text-blue-600
        group-hover:gap-3 transition-all duration-300">

          Enter Portal

          <motion.div
            whileHover={{ x: 4 }}
          >
            <ArrowRight className="h-4 w-4" />
          </motion.div>

        </div>

      </motion.div>
    ))}

  </div>
</section>
<AgentArchitecture/>
      {/* Features */}
<section className="relative z-10 py-24 bg-gradient-to-b from-white via-blue-50 to-cyan-50">

  <div className="mx-auto max-w-7xl px-6">

    {/* Title */}
    <motion.div
      initial={{opacity:0,y:30}}
      whileInView={{opacity:1,y:0}}
      viewport={{once:true}}
      className="text-center mb-16"
    >
      <p className="text-xs tracking-widest text-blue-600 mb-3 font-semibold">
        AI SYSTEM CAPABILITIES
      </p>

      <h2 className="text-4xl font-bold text-gray-900">
        AI-Powered Healthcare Intelligence
      </h2>

      <p className="text-gray-600 mt-4 max-w-xl mx-auto">
        Autonomous agents collaborate to analyze medical data, optimize therapy,
        and provide intelligent healthcare recommendations.
      </p>
    </motion.div>


    {/* Feature Cards */}
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">

      {features.map((f, i) => (

        <motion.div
          key={f.title}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1 }}
          whileHover={{ y: -8, scale: 1.03 }}
          className="group bg-white/70 backdrop-blur-lg rounded-2xl p-6 shadow-lg hover:shadow-2xl transition border border-white/40"
        >

          {/* Icon */}
          <div className="flex h-14 w-14 items-center justify-center rounded-xl 
          bg-gradient-to-r from-[#60c4dc] to-[#3fb1c8] text-white shadow-md mb-5
          group-hover:scale-110 transition">

            {f.icon}

          </div>


          {/* Title */}
          <h3 className="font-semibold text-lg text-gray-800 mb-2">
            {f.title}
          </h3>


          {/* Description */}
          <p className="text-sm text-gray-600 leading-relaxed">
            {f.desc}
          </p>

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