import { motion } from "framer-motion"
import {
  Heart,
  User,
  Building2,
  Truck,
  ArrowRight,
  Shield,
  Clock,
  Activity,
} from "lucide-react"
import { useState } from "react"
import SignupPopup from "./SignupPopup"
import LoginPopup from "./LoginPopup"

export default function LandingHero() {
  const [openSignup, setOpenSignup] = useState(false)
  const [openLogin, setOpenLogin] = useState(false)
  const [selectedRole, setSelectedRole] = useState("")

  /* ---------------- PORTALS ---------------- */

  const portals = [
    {
      title: "Patient Portal",
      role: "patient",
      description:
        "Track prescriptions, manage therapy adherence, and order medicines easily.",
      icon: <User className="h-6 w-6" />,
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      title: "Pharmacy Portal",
      role: "pharmacist",
      description:
        "Manage inventory, validate prescriptions, and process orders efficiently.",
      icon: <Building2 className="h-6 w-6" />,
      gradient: "from-purple-500 to-pink-500",
    },
    {
      title: "Distributor Portal",
      role: "distributor",
      description:
        "Track supply chains and optimize distribution networks.",
      icon: <Truck className="h-6 w-6" />,
      gradient: "from-emerald-500 to-green-500",
    },
  ]

  /* ---------------- FEATURES ---------------- */

  const features = [
    {
      icon: <Shield className="h-5 w-5" />,
      title: "Secure & Compliant",
      desc: "Healthcare-grade security with encrypted protection.",
    },
    {
      icon: <Clock className="h-5 w-5" />,
      title: "Real-time Tracking",
      desc: "Monitor therapy & supply chain live.",
    },
    {
      icon: <Activity className="h-5 w-5" />,
      title: "Smart Analytics",
      desc: "AI-driven healthcare insights.",
    },
  ]

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-cyan-100 via-white to-blue-100 text-gray-800">

      {/* 🌈 FLOATING BLOBS BACKGROUND */}

      <motion.div
        animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
        transition={{ duration: 12, repeat: Infinity }}
        className="absolute w-96 h-96 bg-cyan-300/30 rounded-full blur-3xl top-10 left-10"
      />

      <motion.div
        animate={{ x: [0, -60, 0], y: [0, -40, 0] }}
        transition={{ duration: 14, repeat: Infinity }}
        className="absolute w-96 h-96 bg-blue-300/30 rounded-full blur-3xl bottom-10 right-10"
      />

      {/* ---------------- HEADER ---------------- */}

      <header className="flex items-center justify-between px-6 py-4 lg:px-12 border-b bg-white/60 backdrop-blur-xl shadow-sm relative z-10">

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-pink-500 to-red-500 text-white shadow-lg">
            <Heart className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold">GoMed</span>
        </motion.div>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600">
          <span className="hover:text-black cursor-pointer transition">
            About
          </span>
          <span className="hover:text-black cursor-pointer transition">
            Contact
          </span>
        </nav>

        {/* Signup */}
        <motion.button
          onClick={() => setOpenSignup(true)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-6 py-2 text-sm font-semibold shadow-lg hover:shadow-xl transition"
        >
          Sign Up
        </motion.button>
      </header>

      {/* ---------------- HERO ---------------- */}

      <section className="flex flex-col items-center text-center px-6 pt-24 pb-16 relative z-10">

        <motion.h1
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-4xl font-bold lg:text-6xl bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent pb-1"
        >
          From Prescription to Progress
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-4 max-w-xl text-gray-600"
        >
          Connecting patients, pharmacies, and distributors on one unified
          healthcare ecosystem.
        </motion.p>
      </section>

      {/* ---------------- PORTALS ---------------- */}

      <section className="mx-auto max-w-6xl px-6 pb-20 relative z-10">
        <div className="grid gap-8 md:grid-cols-3">

          {portals.map((portal, i) => (
            <motion.div
              key={portal.title}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              whileHover={{ scale: 1.05 }}
              className="rounded-2xl border bg-white/70 backdrop-blur-xl p-6 shadow-lg hover:shadow-2xl transition group"
            >

              {/* ICON */}
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-xl text-white bg-gradient-to-r ${portal.gradient} shadow-lg`}
              >
                {portal.icon}
              </div>

              <h3 className="mt-4 font-semibold text-lg">
                {portal.title}
              </h3>

              <p className="text-gray-600 text-sm mt-2">
                {portal.description}
              </p>

              <button
                onClick={() => {
                  setSelectedRole(portal.role)
                  setOpenLogin(true)
                }}
                className="mt-4 flex items-center gap-1 text-sm text-blue-600 group-hover:gap-2 transition-all"
              >
                Login <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          ))}

        </div>
      </section>

      {/* ---------------- FEATURES ---------------- */}

      <section className="border-t px-6 py-16 bg-white/60 backdrop-blur-xl relative z-10">
        <div className="mx-auto max-w-6xl grid gap-10 md:grid-cols-3">

          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              className="flex gap-4"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow">
                {f.icon}
              </div>

              <div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {f.desc}
                </p>
              </div>
            </motion.div>
          ))}

        </div>
      </section>

      {/* ---------------- FOOTER ---------------- */}

      <footer className="border-t px-6 py-6 text-center text-xs text-gray-500 bg-white relative z-10">
        © 2026 GoMed Healthcare Platform • Built for better health outcomes.
      </footer>

      {/* ---------------- POPUPS ---------------- */}

      <SignupPopup
        isOpen={openSignup}
        onClose={() => setOpenSignup(false)}
      />

      <LoginPopup
        isOpen={openLogin}
        onClose={() => setOpenLogin(false)}
        openSignup={() => setOpenSignup(true)}
        role={selectedRole}
      />
    </div>
  )
}
