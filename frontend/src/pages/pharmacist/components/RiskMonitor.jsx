import { motion } from "framer-motion"

export default function RiskMonitor() {

  const data = [
    {
      name: "Mohan Verma",
      condition: "Hypertension",
      risk: "High",
      adherence: 45
    },
    {
      name: "Sunita Gupta",
      condition: "Diabetes T2",
      risk: "Medium",
      adherence: 72
    },
    {
      name: "Ravi Kumar",
      condition: "Heart Failure",
      risk: "High",
      adherence: 38
    },
    {
      name: "Anjali Singh",
      condition: "Asthma",
      risk: "Low",
      adherence: 92
    }
  ]

  /* ---------- Adherence Color Logic ---------- */

  const getAdherenceColor = (value) => {
    if (value < 50)
      return "bg-red-500"
    if (value < 75)
      return "bg-yellow-500"
    return "bg-green-500"
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg">

      <h2 className="font-semibold mb-6">
        🧠 AI Risk Monitor — Patients
      </h2>

      <table className="w-full text-sm">
        <thead className="text-gray-500 border-b">
          <tr>
            <th className="text-left pb-3">Patient</th>
            <th className="text-left pb-3">Condition</th>
            <th className="text-left pb-3">Risk Level</th>
            <th className="text-left pb-3">Adherence</th>
            <th className="text-left pb-3">Action</th>
          </tr>
        </thead>

        <tbody>
          {data.map((p, i) => (
            <motion.tr
              key={i}
              whileHover={{ backgroundColor: "#f9fafb" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="border-b"
            >
              <td className="py-4 font-medium">
                {p.name}
              </td>

              <td>{p.condition}</td>

              {/* Risk Badge */}
              <td>
                <span className={`px-3 py-1 text-xs rounded-full
                  ${p.risk === "High"
                    ? "bg-red-100 text-red-600"
                    : p.risk === "Medium"
                    ? "bg-yellow-100 text-yellow-600"
                    : "bg-green-100 text-green-600"
                  }`}>
                  {p.risk}
                </span>
              </td>

              {/* Animated Health Bar */}
              <td>
                <div className="flex items-center gap-3">

                  <div className="w-28 h-2 bg-gray-200 rounded-full overflow-hidden">

                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${p.adherence}%` }}
                      transition={{ duration: 1 }}
                      className={`h-2 rounded-full ${getAdherenceColor(p.adherence)} shadow-sm`}
                    />

                  </div>

                  <span className="text-sm font-medium">
                    {p.adherence}%
                  </span>

                </div>
              </td>

              <td>
                <button className="text-blue-600 text-sm hover:underline">
                  Send Reminder
                </button>
              </td>

            </motion.tr>
          ))}
        </tbody>
      </table>

    </div>
  )
}