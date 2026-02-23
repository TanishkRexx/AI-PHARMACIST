import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { FileCheck, Package, AlertTriangle } from "lucide-react"

export default function QuickActions() {

  const navigate = useNavigate()

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg">

      <h2 className="font-semibold mb-4">
        ⚡ Quick Actions
      </h2>

      <Action
        title="Validate Prescriptions"
        count="3"
        icon={<FileCheck />}
        color="bg-blue-500"
        onClick={() =>
          navigate("/pharmacist/current-prescription")
        }
      />

      <Action
        title="Process Orders"
        count="8"
        icon={<Package />}
        color="bg-green-500"
        onClick={() =>
          navigate("/pharmacist/orders")
        }
      />

      <Action
        title="Reorder Stock"
        count="7"
        icon={<AlertTriangle />}
        color="bg-orange-500"
        onClick={() =>
          navigate("/pharmacist/inventory")
        }
      />

    </div>
  )
}

function Action({ title, count, icon, color, onClick }) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      onClick={onClick}
      className="flex justify-between items-center p-4 rounded-xl bg-gray-50 hover:shadow-md cursor-pointer transition mb-3"
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg text-white ${color}`}>
          {icon}
        </div>
        <span className="text-sm font-medium">
          {title}
        </span>
      </div>

      <span className="bg-gray-200 px-2 py-1 text-xs rounded-full">
        {count}
      </span>
    </motion.div>
  )
}