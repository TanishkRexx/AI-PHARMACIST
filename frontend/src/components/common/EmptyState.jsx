import { motion } from 'framer-motion';

export default function EmptyState({
  icon,
  title,
  description,
  action,
  actionLabel
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      {icon && (
        <div className="text-gray-300 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-500 text-sm text-center max-w-md mb-6">
          {description}
        </p>
      )}
      {action && actionLabel && (
        <button
          onClick={action}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}