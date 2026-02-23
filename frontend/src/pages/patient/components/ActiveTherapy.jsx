import therapyData from "../../../data/therapyData"
import { motion } from "framer-motion"
import { Pill } from "lucide-react"

export default function ActiveTherapy() {
  return (
    <div className="bg-white p-6 rounded-2xl shadow border w-full">

      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Pill size={18} />
        Active Therapy
      </h3>

      <p className="text-sm text-gray-500 mb-4">
        Hypertension Management
      </p>

      <div className="space-y-3">

        {therapyData.map((med, i) => (

          <motion.div
            key={med.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex justify-between items-center p-4 bg-gray-50 rounded-xl hover:shadow transition"
          >

            {/* LEFT */}
            <div>

              <p className="font-medium text-gray-800">
                {med.name}
              </p>

              <p className="text-sm text-gray-500">
                {med.dosage} • {med.frequency}
              </p>

              <div className="flex gap-2 mt-1 text-xs">

                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  🕒 {med.time}
                </span>

                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                  🍽 {med.meal}
                </span>

              </div>

            </div>

            {/* RIGHT */}
            <div className="text-right">

              <p className="font-semibold text-gray-800">
                {med.remainingDoses}
              </p>

              <p className="text-xs text-gray-500">
                doses left
              </p>

            </div>

          </motion.div>

        ))}

      </div>

    </div>
  )
}
