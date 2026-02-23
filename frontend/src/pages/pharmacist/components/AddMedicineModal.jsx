import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"

export default function AddMedicineModal({
  isOpen,
  onClose,
  onAdd,
}) {
  const [form, setForm] = useState({
    name: "",
    category: "",
    stock: "",
    maxStock: "",
    unit: "",
    expiry: "",
    supplier: "",
    price: "",
  })

  if (!isOpen) return null

  const handleSubmit = () => {
    onAdd({
      ...form,
      stock: Number(form.stock),
      maxStock: Number(form.maxStock),
      price: Number(form.price),
    })
    onClose()
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/40 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white w-[500px] p-6 rounded-2xl"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
        >
          <div className="flex justify-between mb-4">
            <h2 className="font-bold">
              Add Medicine
            </h2>
            <X onClick={onClose} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {Object.keys(form).map(
              (field) => (
                <input
                  key={field}
                  placeholder={field}
                  className="border p-2 rounded"
                  onChange={(e) =>
                    setForm({
                      ...form,
                      [field]:
                        e.target.value,
                    })
                  }
                />
              )
            )}
          </div>

          <button
            onClick={handleSubmit}
            className="w-full mt-4 bg-teal-500 text-white py-2 rounded"
          >
            Add Medicine
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}