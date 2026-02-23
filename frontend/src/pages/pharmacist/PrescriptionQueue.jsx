import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import prescriptionsData from "../../data/inventoryprescription.json"
import {
  FileText,
  CheckCircle,
  XCircle,
  X,
  Clock,
  ShieldCheck,
  ShieldX
} from "lucide-react"

export default function PrescriptionQueue() {

  const [prescriptions, setPrescriptions] =
    useState(prescriptionsData)

  const [selected, setSelected] = useState(null)

  /* ================= COUNTERS ================= */

  const stats = useMemo(() => {

    let pending = 0
    let approved = 0
    let rejected = 0

    prescriptions.forEach((p) => {
      if (p.status === "Pending") pending++
      else if (p.status === "Approved") approved++
      else if (p.status === "Rejected") rejected++
    })

    return { pending, approved, rejected }

  }, [prescriptions])

  /* ================= APPROVE ================= */

  const approvePrescription = () => {

    setPrescriptions((prev) =>
      prev.map((p) =>
        p.id === selected.id
          ? { ...p, status: "Approved" }
          : p
      )
    )

    setSelected({ ...selected, status: "Approved" })
  }

  /* ================= REJECT ================= */

  const rejectPrescription = () => {

    setPrescriptions((prev) =>
      prev.map((p) =>
        p.id === selected.id
          ? { ...p, status: "Rejected" }
          : p
      )
    )

    setSelected({ ...selected, status: "Rejected" })
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen relative">

      {/* ================= STAT CARDS ================= */}

      <div className="grid grid-cols-3 gap-6 mb-8">

        <StatCard
          title="Pending Review"
          value={stats.pending}
          icon={<Clock />}
          gradient="from-yellow-400 to-orange-500"
        />

        <StatCard
          title="Approved"
          value={stats.approved}
          icon={<ShieldCheck />}
          gradient="from-green-400 to-emerald-600"
        />

        <StatCard
          title="Rejected"
          value={stats.rejected}
          icon={<ShieldX />}
          gradient="from-red-400 to-rose-600"
        />

      </div>

      {/* ================= FULL WIDTH QUEUE ================= */}

      <div className="bg-white rounded-2xl shadow overflow-hidden">

        <div className="p-4 font-semibold border-b flex items-center gap-2">
          <FileText size={18} />
          Prescription Queue
        </div>

        {prescriptions.map((p) => (

          <motion.div
            key={p.id}
            whileHover={{ scale: 1.01 }}
            onClick={() => setSelected(p)}
            className="p-5 border-b cursor-pointer hover:bg-gray-50 transition"
          >
            <div className="flex justify-between items-center">

              <div>
                <p className="font-semibold text-gray-800">
                  {p.patient}
                </p>

                <p className="text-sm text-gray-500">
                  {p.id} • {p.doctor}
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  {p.date} • {p.medicines.length} medicines
                </p>
              </div>

              <StatusBadge status={p.status} />

            </div>
          </motion.div>

        ))}

      </div>

      {/* ================= SLIDE DRAWER ================= */}

      <AnimatePresence>
        {selected && (

          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
            />

            <motion.div
              className="fixed top-0 right-0 h-full w-[480px] bg-white shadow-2xl z-50 p-6 overflow-y-auto"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 120 }}
            >

              <div className="flex justify-between items-center mb-6">
                <h2 className="font-semibold text-lg">
                  Prescription Detail
                </h2>

                <X
                  className="cursor-pointer"
                  onClick={() => setSelected(null)}
                />
              </div>

              <div className="h-40 border-2 border-dashed rounded-xl flex items-center justify-center text-gray-400 mb-6">
                Prescription Image
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">

                <InfoCard
                  title="Patient"
                  value={selected.patient}
                />

                <InfoCard
                  title="Doctor"
                  value={selected.doctor}
                />

              </div>

              <h3 className="text-sm font-semibold text-gray-500 mb-3">
                Extracted Medications
              </h3>

              <div className="space-y-3 mb-6">

                {selected.medicines.map((m, i) => (

                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-between bg-gray-50 p-3 rounded-xl"
                  >
                    <div>
                      <p className="font-medium">
                        {m.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {m.dosage}
                      </p>
                    </div>

                    <p className="font-semibold">
                      Qty: {m.qty}
                    </p>
                  </motion.div>

                ))}

              </div>

              {selected.status === "Pending" && (

                <div className="flex gap-3">

                  <button
                    onClick={approvePrescription}
                    className="flex-1 bg-green-500 text-white py-2 rounded-xl flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={18} />
                    Approve
                  </button>

                  <button
                    onClick={rejectPrescription}
                    className="flex-1 bg-red-500 text-white py-2 rounded-xl flex items-center justify-center gap-2"
                  >
                    <XCircle size={18} />
                    Reject
                  </button>

                </div>
              )}

            </motion.div>

          </>
        )}
      </AnimatePresence>

    </div>
  )
}

/* ================= STAT CARD ================= */

function StatCard({ title, value, icon, gradient }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`bg-gradient-to-r ${gradient} text-white p-6 rounded-2xl shadow-lg flex items-center justify-between`}
    >
      <div>
        <p className="text-sm opacity-80">{title}</p>
        <p className="text-3xl font-bold mt-1">{value}</p>
      </div>

      <div className="bg-white/20 p-3 rounded-xl">
        {icon}
      </div>
    </motion.div>
  )
}

/* ================= STATUS BADGE ================= */

function StatusBadge({ status }) {

  const colors = {
    Pending: "bg-yellow-100 text-yellow-600",
    Approved: "bg-green-100 text-green-600",
    Rejected: "bg-red-100 text-red-600",
  }

  return (
    <span
      className={`px-3 py-1 text-xs rounded-full font-medium ${colors[status]}`}
    >
      {status}
    </span>
  )
}

/* ================= INFO CARD ================= */

function InfoCard({ title, value }) {
  return (
    <div className="bg-gray-50 p-4 rounded-xl">
      <p className="text-xs text-gray-500">{title}</p>
      <p className="font-semibold">{value}</p>
    </div>
  )
}