import { motion } from "framer-motion"

export default function StatCard({
  title,
  value,
  change,
  icon,
  color
}) {

  const colors = {
    blue: "text-blue-600 bg-blue-100",
    green: "text-green-600 bg-green-100",
    orange: "text-orange-600 bg-orange-100",
    red: "text-red-600 bg-red-100",
  }

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="bg-white p-6 rounded-2xl shadow flex justify-between items-center"
    >
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-gray-500">
          {title}
        </p>
        <p className="text-xs mt-2 text-green-500">
          {change}
        </p>
      </div>

      <div className={`p-3 rounded-xl ${colors[color]}`}>
        {icon}
      </div>
    </motion.div>
  )
}