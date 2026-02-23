import adminData from "../../data/adminData.json"
import { Users, Pill, Truck } from "lucide-react"

export default function AdminDashboard() {

  const { users, pharmacists, distributors } =
    adminData

  return (
    <div className="p-8 bg-gray-50 min-h-screen">

      <h1 className="text-2xl font-bold mb-8">
        Admin Panel Overview
      </h1>

      <div className="grid grid-cols-3 gap-6">

        <StatCard
          title="Total Users"
          value={users}
          icon={<Users />}
          color="blue"
        />

        <StatCard
          title="Total Pharmacists"
          value={pharmacists}
          icon={<Pill />}
          color="green"
        />

        <StatCard
          title="Total Distributors"
          value={distributors}
          icon={<Truck />}
          color="orange"
        />

      </div>

    </div>
  )
}

function StatCard({ title, value, icon, color }) {

  const colors = {
    blue: "from-blue-500 to-blue-700",
    green: "from-green-500 to-green-700",
    orange: "from-orange-500 to-orange-700"
  }

  return (
    <div
      className={`bg-gradient-to-r ${colors[color]} text-white p-6 rounded-2xl shadow-lg`}
    >
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm">{title}</p>
          <p className="text-3xl font-bold mt-2">
            {value}
          </p>
        </div>
        <div className="text-4xl opacity-80">
          {icon}
        </div>
      </div>
    </div>
  )
}