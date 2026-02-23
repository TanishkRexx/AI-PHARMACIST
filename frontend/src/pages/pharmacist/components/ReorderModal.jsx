import {
  motion,
  AnimatePresence,
} from "framer-motion"
import { useState } from "react"
import { X } from "lucide-react"

export default function ReorderModal({
  medicine,
  onClose,
}) {
  const [qty, setQty] = useState(0)
  const [processing, setProcessing] =
    useState(false)

  if (!medicine) return null

  const placeOrder = () => {
    setProcessing(true)

    setTimeout(() => {
      setProcessing(false)
      onClose()
      alert(
        "Order sent to supplier 🚚"
      )
    }, 2000)
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/40 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="bg-white w-[420px] p-6 rounded-2xl"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
        >
          <div className="flex justify-between mb-4">
            <h2 className="font-bold">
              Place Reorder
            </h2>
            <X onClick={onClose} />
          </div>

          <p className="font-medium">
            {medicine.name}
          </p>

          <input
            type="number"
            className="border p-2 w-full mt-3"
            onChange={(e) =>
              setQty(e.target.value)
            }
          />

          <p className="text-sm mt-2">
            Estimated Cost:
            ₹{qty * medicine.price}
          </p>

          <button
            onClick={placeOrder}
            className="w-full mt-4 bg-teal-500 text-white py-2 rounded"
          >
            {processing
              ? "Processing..."
              : "Place Order"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}