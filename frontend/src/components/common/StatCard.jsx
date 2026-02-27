import { motion } from 'framer-motion';

const colorStyles = {
  blue: 'text-blue-600 bg-blue-100',
  green: 'text-green-600 bg-green-100',
  orange: 'text-orange-600 bg-orange-100',
  red: 'text-red-600 bg-red-100',
  purple: 'text-purple-600 bg-purple-100',
  cyan: 'text-cyan-600 bg-cyan-100',
};

const gradientStyles = {
  blue: 'from-blue-500 to-cyan-500',
  green: 'from-green-500 to-emerald-500',
  orange: 'from-orange-500 to-amber-500',
  red: 'from-red-500 to-rose-500',
  purple: 'from-purple-500 to-pink-500',
  cyan: 'from-cyan-500 to-teal-500',
};

export default function StatCard({
  title,
  value,
  subtitle,
  change,
  icon,
  color = 'blue',
  gradient = false,
  onClick
}) {
  if (gradient) {
    return (
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        onClick={onClick}
        className={`bg-gradient-to-r ${gradientStyles[color]} text-white p-6 rounded-2xl shadow-lg cursor-pointer`}
      >
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm opacity-80">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-sm opacity-80 mt-1">{subtitle}</p>}
            {change && (
              <p className="text-xs mt-2 bg-white/20 px-2 py-1 rounded-full inline-block">
                {change}
              </p>
            )}
          </div>
          {icon && (
            <div className="bg-white/20 p-3 rounded-xl">
              {icon}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      onClick={onClick}
      className="bg-white p-6 rounded-2xl shadow-md border hover:shadow-lg transition cursor-pointer"
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          {change && (
            <p className={`text-xs mt-2 ${
              change.startsWith('+') ? 'text-green-500' : 'text-red-500'
            }`}>
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div className={`p-3 rounded-xl ${colorStyles[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  );
}