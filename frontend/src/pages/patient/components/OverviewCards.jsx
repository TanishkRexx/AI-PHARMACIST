import { Activity, ShieldCheck, Pill } from "lucide-react"
import { motion } from "framer-motion"

export default function OverviewCards() {

  const cards = [
    {
      title: "Adherence Rate",
      value: "85%",
      sub: "18 of 30 days completed",
      progress: 85,
      icon: <Activity size={18} />,
      color: "blue"
    },
    {
      title: "Risk Level",
      value: "Stable",
      sub: "Great job! Keep following your therapy.",
      progress:90,
      icon: <ShieldCheck size={18} />,
      color: "green",
      highlight: true
    },
    {
      title: "Therapy Progress",
      value: "12",
      valueSub: "days left",
      sub: "18 of 30 days completed",
      progress: 60,
      icon: <Pill size={18} />,
      color: "purple"
    }
  ]

  const colorStyles = {
    blue: {
      iconBg: "bg-blue-100 text-blue-600",
      bar: "bg-blue-500"
    },
    green: {
      iconBg: "bg-green-100 text-green-600",
      bar: "bg-green-500"
    },
    purple: {
      iconBg: "bg-purple-100 text-purple-600",
      bar: "bg-purple-500"
    }
  }

  return (
    <div className="grid grid-cols-3 gap-6">

      {cards.map((card, i) => {

        const style = colorStyles[card.color]

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15 }}
            whileHover={{ y: -4 }}
            className={`
              bg-white p-6 rounded-2xl shadow border transition-all
              ${card.highlight ? "border-green-400 shadow-lg" : ""}
            `}
          >

            {/* TOP */}
            <div className="flex justify-between items-start">

              <div>

                <p className="text-sm text-gray-500">
                  {card.title}
                </p>

                {/* VALUE */}
                <div className="flex items-end gap-2 mt-2">

                  <p className="text-3xl font-bold text-gray-800">
                    {card.value}
                  </p>

                  {card.valueSub && (
                    <span className="text-gray-500 text-sm mb-1">
                      {card.valueSub}
                    </span>
                  )}

                </div>

                <p className="text-xs text-gray-400 mt-1">
                  {card.sub}
                </p>

              </div>

              {/* ICON */}
              <div className={`p-3 rounded-xl ${style.iconBg}`}>
                {card.icon}
              </div>

            </div>

            {/* PROGRESS BAR */}
            <div className="mt-6">

              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">

                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${card.progress}%` }}
                  transition={{ duration: 1 }}
                  className={`h-2 rounded-full ${style.bar}`}
                />

              </div>

            </div>

          </motion.div>
        )
      })}

    </div>
  )
}
