import { useState, useMemo } from "react"
import { Search, Plus, RefreshCw } from "lucide-react"
import { motion } from "framer-motion"

import inventoryData from "../../data/inventoryData.json"
import AddMedicineModal from "./components/AddMedicineModal"
import ReorderModal from "./components/ReorderModal"

export default function Inventory() {

  const [medicines, setMedicines] =
    useState(inventoryData)

  const [search, setSearch] = useState("")
  const [openAdd, setOpenAdd] = useState(false)
  const [selectedMed, setSelectedMed] =
    useState(null)

  /* ---------------- HEALTH ---------------- */

  const getPercent = (stock, max) =>
    Math.round((stock / max) * 100)

  const getStatus = (p) => {
    if (p <= 30) return "Critical"
    if (p <= 70) return "Low Stock"
    return "In Stock"
  }

  /* ---------------- COUNTERS ---------------- */

  const counters = useMemo(() => {
    let critical = 0,
      low = 0,
      sufficient = 0

    medicines.forEach((m) => {
      const s = getStatus(
        getPercent(m.stock, m.maxStock)
      )

      if (s === "Critical") critical++
      else if (s === "Low Stock") low++
      else sufficient++
    })

    return { critical, low, sufficient }
  }, [medicines])

/* ---------------- FILTER ---------------- */

const filtered = medicines.filter((m) => {

  const text = search.toLowerCase()

  const matchesName =
    m.name.toLowerCase().includes(text)

  const matchesCategory =
    m.category.toLowerCase().includes(text)

  return matchesName || matchesCategory
})

  /* ---------------- ADD ---------------- */

  const handleAddMedicine = (med) => {
    setMedicines([
      ...medicines,
      { ...med, id: Date.now() },
    ])
  }

  return (
    <div className="p-8 bg-gradient-to-br from-slate-100 to-slate-200 min-h-screen">

      {/* ================= STAT CARDS ================= */}

      <div className="grid grid-cols-3 gap-6 mb-8">

        <StatCard
          title="Critical"
          value={counters.critical}
          color="red"
        />

        <StatCard
          title="Low Stock"
          value={counters.low}
          color="yellow"
        />

        <StatCard
          title="Sufficient"
          value={counters.sufficient}
          color="green"
        />

      </div>

      {/* ================= SEARCH ================= */}

      <div className="flex justify-between mb-6">

        <div className="flex items-center bg-white px-6 py-4 rounded-full shadow-lg w-[800px]">

          <Search className="mr-3 text-gray-400" />

          <input
            placeholder="Search medicines, categories..."
            className="outline-none w-full"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />
        </div>

        <button
          onClick={() => setOpenAdd(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-teal-500 text-white px-6 py-3 rounded-full shadow-lg"
        >
          <Plus size={18} />
          Add Medicine
        </button>

      </div>

      {/* ================= TABLE ================= */}

      <div className="bg-white rounded-2xl shadow overflow-hidden">

        <div className="p-4 font-semibold border-b">
          Inventory ({medicines.length} items)
        </div>

        <table className="w-full text-sm">

          <thead className="bg-slate-50 text-gray-600">
            <tr>
              <th className="p-4 text-left">
                Medicine
              </th>
              <th className="text-left">Category</th>
              <th className="text-left">Stock Health</th>
              <th className="text-left">Stock</th>
              <th className="text-left">Expiry</th>
              <th className="text-left">Supplier</th>
              <th className="text-left">Status</th>
              <th className="text-left">Action</th>
            </tr>
          </thead>

          <tbody>

            {filtered.map((med, i) => {

              const percent =
                getPercent(
                  med.stock,
                  med.maxStock
                )

              const status =
                getStatus(percent)

              return (
                <motion.tr
                  key={med.id}
                  initial={{
                    opacity: 0,
                    y: 20,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay: i * 0.05,
                  }}
                  className="border-t hover:bg-slate-50"
                >

                  <td className="p-4">
                    <p className="font-medium">
                      {med.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      ₹{med.price}/unit
                    </p>
                  </td>

                  <td>{med.category}</td>

                  {/* HEALTH BAR */}
                  <td className="w-44">
                    <div className="text-xs mb-1">
                      {percent}%
                    </div>

                    <div className="h-2 bg-gray-200 rounded-full">
                      <div
                        className={`h-2 rounded-full ${
                          percent <= 30
                            ? "bg-red-500"
                            : percent <= 70
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }`}
                        style={{
                          width: `${percent}%`,
                        }}
                      />
                    </div>
                  </td>

                  <td>
                    <span className="font-semibold">
                      {med.stock}
                    </span>{" "}
                    {med.unit}
                  </td>

                  <td>{med.expiry}</td>
                  <td>{med.supplier}</td>

                  <td>
                    <StatusBadge
                      status={status}
                    />
                  </td>

                  <td>
                    <button
                      onClick={() =>
                        setSelectedMed(med)
                      }
                      className="flex items-center gap-1 bg-teal-500 text-white px-3 py-1 rounded-full text-xs"
                    >
                      <RefreshCw size={14} />
                      Reorder
                    </button>
                  </td>

                </motion.tr>
              )
            })}

          </tbody>
        </table>
      </div>

      {/* MODALS */}

      <AddMedicineModal
        isOpen={openAdd}
        onClose={() => setOpenAdd(false)}
        onAdd={handleAddMedicine}
      />

      <ReorderModal
        medicine={selectedMed}
        onClose={() =>
          setSelectedMed(null)
        }
      />

    </div>
  )
}

/* ================= COMPONENTS ================= */

function StatCard({
  title,
  value,
  color,
}) {
  const styles = {
    red: "from-red-50 to-red-100 text-red-600",
    yellow:
      "from-yellow-50 to-yellow-100 text-yellow-600",
    green:
      "from-green-50 to-green-100 text-green-600",
  }

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className={`p-6 rounded-2xl shadow bg-gradient-to-br ${styles[color]}`}
    >
      <p className="text-sm text-gray-500">
        {title}
      </p>
      <p className="text-3xl font-bold">
        {value}
      </p>
    </motion.div>
  )
}

function StatusBadge({ status }) {
  const styles = {
    Critical:
      "bg-red-100 text-red-600 border border-red-200",
    "Low Stock":
      "bg-yellow-100 text-yellow-700 border border-yellow-200",
    "In Stock":
      "bg-green-100 text-green-600 border border-green-200",
  }

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  )
}