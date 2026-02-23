import { motion } from "framer-motion"
import { AlertTriangle } from "lucide-react"

export default function CriticalStock() {

  const items = [
    { name: "Insulin Glargine", left: 12, percent: 20 },
    { name: "Metformin 500mg", left: 45, percent: 45 },
    { name: "Amoxicillin 250mg", left: 8, percent: 10 },
  ]

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg">

      <h2 className="font-semibold mb-4 flex items-center gap-2">
        <AlertTriangle className="text-red-500" size={18} />
        Critical Stock
      </h2>

      {items.map((item, i) => (
        <motion.div
          key={i}
          whileHover={{ scale: 1.02 }}
          className="mb-4"
        >
          <div className="flex justify-between text-sm">
            <span>{item.name}</span>
            <span className="text-red-500 font-medium">
              {item.left} left
            </span>
          </div>

          <div className="h-2 bg-gray-200 rounded-full mt-2">
            <div
              className="h-2 bg-red-500 rounded-full"
              style={{ width: `${item.percent}%` }}
            />
          </div>
        </motion.div>
      ))}

    </div>
  )
}