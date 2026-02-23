import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts"
import { motion } from "framer-motion"

/* ---------- DATA ---------- */

const data = [
  { day: "Mon", orders: 80 },
  { day: "Tue", orders: 95 },
  { day: "Wed", orders: 110 },
  { day: "Thu", orders: 100 },
  { day: "Fri", orders: 140 },
  { day: "Sat", orders: 120 },
  { day: "Sun", orders: 70 },
]

const total = data.reduce(
  (acc, item) => acc + item.orders,
  0
)

/* ---------- COMPONENT ---------- */

export default function WeeklyOrdersChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-white p-6 rounded-2xl shadow-lg"
    >

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">

        <div>
          <h2 className="font-semibold text-gray-800">
            Orders This Week
          </h2>
          <p className="text-xs text-gray-400">
            Weekly order distribution
          </p>
        </div>

        {/* TOTAL BADGE */}
        <div className="bg-teal-100 text-teal-600 px-3 py-1 rounded-full text-sm font-medium">
          {total} total
        </div>

      </div>

      {/* CHART */}
      <ResponsiveContainer width="100%" height={260}>

        <BarChart data={data} barSize={38}>

          {/* GRID */}
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
          />

          {/* AXIS */}
          <XAxis
            dataKey="day"
            tick={{ fontSize: 12 }}
          />

          <YAxis
            tick={{ fontSize: 12 }}
          />

          {/* TOOLTIP */}
          <Tooltip
            cursor={{ fill: "rgba(20,184,166,0.1)" }}
            contentStyle={{
              borderRadius: "10px",
              border: "none",
              boxShadow: "0 4px 14px rgba(0,0,0,0.1)"
            }}
          />

          {/* GRADIENT */}
          <defs>
            <linearGradient
              id="colorOrders"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#14b8a6"
                stopOpacity={1}
              />
              <stop
                offset="100%"
                stopColor="#0f766e"
                stopOpacity={0.9}
              />
            </linearGradient>
          </defs>

          {/* BARS */}
          <Bar
            dataKey="orders"
            fill="url(#colorOrders)"
            radius={[10, 10, 0, 0]}
            animationDuration={1500}
          />

        </BarChart>

      </ResponsiveContainer>

    </motion.div>
  )
}