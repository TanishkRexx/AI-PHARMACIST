import prescription from "../../data/prescription.json"
import {
Calendar,
Clock,
FileText,
Stethoscope,
Download,
Printer,
} from "lucide-react"
import { motion } from "framer-motion"

export default function CurrentPrescription() {

/* -------- PDF DOWNLOAD -------- */
const downloadPDF = () => {
window.print()
}

return ( <div className="p-6 bg-gradient-to-br from-blue-50 via-white to-cyan-50 min-h-screen">

  {/* HEADER */}
  <motion.div
    initial={{ opacity: 0, y: -30 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex justify-between items-start mb-6"
  >

    <div>
      <h1 className="text-3xl font-bold text-gray-800">
        Current Prescription
      </h1>

      <p className="text-gray-500 text-sm">
        Prescription ID: {prescription.id}
      </p>
    </div>

    <div className="flex gap-3">

      <button className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded-lg text-sm hover:bg-gray-300 transition">
        <Printer size={16} />
        Print
      </button>

      <button
        onClick={downloadPDF}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition shadow"
      >
        <Download size={16} />
        Download PDF
      </button>

    </div>

  </motion.div>

  {/* STATUS CARDS */}
  <div className="grid grid-cols-4 gap-4 mb-6">

    <AnimatedCard
      title="Status"
      value={prescription.status}
      color="bg-red-100 text-red-600"
      delay={0}
    />

    <AnimatedCard
      title="Issued Date"
      value={prescription.issuedDate}
      icon={<Calendar />}
      delay={0.1}
    />

    <AnimatedCard
      title="Valid Until"
      value={prescription.validUntil}
      icon={<Clock />}
      delay={0.2}
    />

    <AnimatedCard
      title="Days Remaining"
      value={`${prescription.daysRemaining} days`}
      icon={<FileText />}
      delay={0.3}
    />

  </div>

  {/* DOCTOR + DIAGNOSIS */}
  <div className="grid grid-cols-3 gap-6 mb-6">

    {/* DOCTOR */}
    <motion.div
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white p-6 rounded-2xl shadow border hover:shadow-lg transition"
    >

      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Stethoscope size={18} />
        Prescribing Doctor
      </h3>

      <p className="font-medium">
        {prescription.doctor.name}
      </p>

      <p className="text-sm text-gray-500 mb-3">
        {prescription.doctor.specialization}
      </p>

      <p className="text-sm">
        {prescription.doctor.hospital}
      </p>

      <p className="text-sm">
        {prescription.doctor.phone}
      </p>

      <p className="text-sm">
        License: {prescription.doctor.license}
      </p>

    </motion.div>

    {/* DIAGNOSIS */}
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      className="col-span-2 bg-white p-6 rounded-2xl shadow border hover:shadow-lg transition"
    >

      <h3 className="font-semibold mb-4">
        Diagnosis & Instructions
      </h3>
      <p className="text-gray-600 text-sm mb-2">Diagnosis</p> 

      <p className="font-medium mb-3">
        {prescription.diagnosis}
      </p>

        <p className="text-gray-600 text-sm mb-2">Doctor's Notes</p> 
      <div className="bg-blue-50 p-3 rounded-lg text-sm border">
        {prescription.notes}
      </div>

    </motion.div>

  </div>

  {/* MEDICINES */}
  <div className="bg-white p-6 rounded-2xl shadow border">

    <h3 className="font-semibold mb-6">
      Prescribed Medicines
    </h3>

    <div className="space-y-4">

      {prescription.medicines.map((med, i) => (

        <motion.div
          key={med.id}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="border rounded-xl p-4 hover:shadow-md transition bg-gradient-to-r from-white to-blue-50"
        >

          {/* SERIAL + CONTENT */}
          <div className="flex gap-4">

            {/* NUMBER BADGE */}
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold shadow">
              {i + 1}
            </div>

            {/* MEDICINE GRID */}
            <div className="grid grid-cols-4 gap-4 w-full">

              <div>
                <p className="text-sm text-gray-500">
                  Medicine
                </p>
                <p className="font-medium">
                  {med.name}
                </p>
                <p className="text-sm text-gray-500">
                  {med.strength}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Dosage
                </p>
                <p>{med.dosage}</p>
                <p className="text-sm text-gray-500">
                  {med.frequency}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Timing
                </p>
                <p>{med.timing}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Quantity
                </p>
                <p>{med.quantity}</p>
                <p className="text-sm text-gray-500">
                  {med.duration}
                </p>
              </div>

            </div>

          </div>

          {/* INSTRUCTIONS */}
          <div className="mt-3 text-sm text-gray-600 bg-gray-100 p-2 rounded">
            Instructions: {med.instructions}
          </div>

        </motion.div>

      ))}

    </div>

  </div>

</div>

)
}

/* ---------- ANIMATED CARD ---------- */

function AnimatedCard({
title,
value,
icon,
color,
delay,
}) {
return (
<motion.div
initial={{ opacity: 0, y: -20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay }}
className="bg-white p-4 rounded-xl shadow border flex items-center gap-3 hover:shadow-lg transition"
>
  <div
    className={`p-2 rounded-lg ${
      color || "bg-blue-100 text-blue-600"
    }`}
  >
    {icon}
  </div>

  <div>
    <p className="text-sm text-gray-500">
      {title}
    </p>
    <p className="font-semibold">
      {value}
    </p>
  </div>

</motion.div>

)
}
