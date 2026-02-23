import { motion } from "framer-motion"
import OverviewCards from "./components/OverviewCards"
import TherapyChart from "./components/TherapyChart"
import ActiveTherapy from "./components/ActiveTherapy"

export default function Dashboard() {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">

      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-3xl font-bold">
          Welcome back, John! 👋
        </h1>
        <p className="text-gray-500">
          Here's an overview of your therapy and health progress.
        </p>
      </motion.div>

      {/* OVERVIEW */}
      <OverviewCards />

      {/* CHART */}
      <div className="mt-6">
        <TherapyChart />
      </div>

      {/* LOWER GRID */}
      <div className=" gap-6 mt-6">

        <div className="col-span-2">
          <ActiveTherapy />
        </div>


      </div>

    </div>
  )
}
