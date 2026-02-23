import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts"

const data = [
  { day: "Mon", adherence: 60 },
  { day: "Tue", adherence: 70 },
  { day: "Wed", adherence: 75 },
  { day: "Thu", adherence: 80 },
  { day: "Fri", adherence: 85 },
  { day: "Sat", adherence: 90 },
  { day: "Sun", adherence: 88 },
]

export default function TherapyChart() {
  return (
    <div className="bg-white p-6 rounded-2xl shadow border">
      <h3 className="font-semibold mb-4">
        Weekly Adherence Trend
      </h3>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="adherence"
            stroke="#3b82f6"
            strokeWidth={3}
          />
        </LineChart>
      </ResponsiveContainer>

    </div>
  )
}
