import pastTherapy from "../../data/pastTherapy.json"
import { motion } from "framer-motion"
import { Calendar, Activity, History } from "lucide-react"

export default function PastTherapy() {

  return (

    <div className="p-8 bg-gradient-to-br from-blue-50 via-white to-cyan-50 min-h-screen">

      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-800">
          Past Therapy
        </h1>

        <p className="text-gray-500 mt-1">
          Review your completed and past therapy records.
        </p>
      </motion.div>

      {/* THERAPY CARDS */}
      <div className="space-y-6">

        {pastTherapy.map((therapy, i) => (

          <motion.div
            key={therapy.id}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-2xl shadow border hover:shadow-lg transition"
          >

            {/* TOP SECTION */}
            <div className="flex justify-between items-start mb-6">

              {/* LEFT */}
              <div className="flex items-center gap-4">

                <div className="p-3 bg-cyan-100 text-cyan-600 rounded-xl">
                  <History />
                </div>

                <div>
                  <h3 className="font-semibold text-lg text-gray-800">
                    {therapy.title}
                  </h3>

                  <p className="text-sm text-gray-500">
                    {therapy.date}
                  </p>
                </div>

              </div>

              {/* STATUS BADGE */}
              <span
                className={`px-4 py-1 text-xs font-semibold rounded-full

                ${
                  therapy.status === "Completed"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }
                `}
              >
                {therapy.status}
              </span>

            </div>

            {/* INFO BOXES */}
            <div className="grid grid-cols-2 gap-4 mb-4">

              {/* Duration */}
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">

                <Calendar size={18} className="text-gray-500" />

                <div>
                  <p className="text-xs text-gray-500">
                    Duration
                  </p>
                  <p className="font-semibold text-sm">
                    {therapy.duration}
                  </p>
                </div>

              </div>

              {/* Adherence */}
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">

                <Activity size={18} className="text-gray-500" />

                <div>
                  <p className="text-xs text-gray-500">
                    Adherence
                  </p>
                  <p className="font-semibold text-sm">
                    {therapy.adherence}%
                  </p>
                </div>

              </div>

            </div>

            {/* PROGRESS */}
            <div>

              <div className="flex justify-between text-sm mb-1">

                <span className="text-gray-500">
                  Final Adherence
                </span>

                <span className="font-medium">
                  {therapy.adherence}%
                </span>

              </div>

              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">

                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${therapy.adherence}%` }}
                  transition={{ duration: 1 }}
                  className={`h-3 rounded-full

                  ${
                    therapy.status === "Completed"
                      ? "bg-green-500"
                      : "bg-red-500"
                  }
                  `}
                />

              </div>

            </div>

          </motion.div>

        ))}

      </div>

    </div>
  )
}
