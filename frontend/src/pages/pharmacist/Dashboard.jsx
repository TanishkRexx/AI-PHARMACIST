import DashboardHeader from "./components/DashboardHeader"
import StatCard from "./components/StatCard"
import WeeklyOrdersChart from "./components/WeeklyOrdersChart"
import QuickActions from "./components/QuickActions"
// import CriticalStock from "./components/CriticalStock"
import RiskMonitor from "./components/RiskMonitor"

import { Users, ShoppingCart, AlertTriangle, Brain } from "lucide-react"

export default function Dashboard() {
  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-8">

      <DashboardHeader />

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-6">
        <StatCard
          title="Active Patients"
          value="248"
          change="+12"
          icon={<Users />}
          color="blue"
        />
        <StatCard
          title="Orders Today"
          value="134"
          change="+28%"
          icon={<ShoppingCart />}
          color="green"
        />
        <StatCard
          title="Low Stock Alerts"
          value="7"
          change="-2"
          icon={<AlertTriangle />}
          color="orange"
        />
        <StatCard
          title="High Risk Patients"
          value="5"
          change="+1"
          icon={<Brain />}
          color="red"
        />
      </div>

      {/* Chart + Side Widgets */}
      <div className="grid grid-cols-3 gap-6">

        {/* Orders Chart - 2/3 */}
        <div className="col-span-2">
          <WeeklyOrdersChart />
        </div>

        {/* Side Widgets - 1/3 */}
        <div className="space-y-6">
          <QuickActions />
          {/* <CriticalStock /> */}
        </div>

      </div>

      {/* Full Width Risk Monitor */}
      <RiskMonitor />

    </div>
  )
}