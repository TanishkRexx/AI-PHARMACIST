import { useState } from "react"
import { motion } from "framer-motion"
import ordersData from "../../data/ordersData.json"
import {
  Search,
  Clock,
  Truck,
  CheckCircle
} from "lucide-react"

export default function Orders() {

  const [orders, setOrders] =
    useState(ordersData)

  const [search, setSearch] =
    useState("")

  const [activeTab, setActiveTab] =
    useState("All")

  /* ================= STATUS FLOW ================= */

  const updateStatus = (id) => {

    setOrders((prev) =>
      prev.map((o) => {

        if (o.id !== id) return o

        if (o.status === "Pending")
          return { ...o, status: "Processing" }

        if (o.status === "Processing")
          return { ...o, status: "Dispatched" }

        if (o.status === "Dispatched")
          return { ...o, status: "Delivered" }

        return o
      })
    )
  }

  /* ================= FILTER COUNTS ================= */

  const getCount = (status) => {
    if (status === "All")
      return orders.length
    return orders.filter(
      (o) => o.status === status
    ).length
  }

  /* ================= FILTER ================= */

  const filtered = orders
    .filter((o) =>
      activeTab === "All"
        ? true
        : o.status === activeTab
    )
    .filter((o) =>
      o.patient
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      o.id
        .toLowerCase()
        .includes(search.toLowerCase())
    )

  /* ================= UI ================= */

  return (
    <div className="p-8 bg-gray-50 min-h-screen">

      {/* ================= STATUS TABS ================= */}

      <div className="flex gap-3 mb-6 flex-wrap">

        {[
          "All",
          "Pending",
          "Processing",
          "Dispatched",
          "Delivered"
        ].map((tab) => (

          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition
            ${
              activeTab === tab
                ? "bg-gradient-to-r from-blue-600 to-teal-500 text-white shadow"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            {tab} ({getCount(tab)})
          </button>

        ))}

      </div>

      {/* ================= SEARCH ================= */}

      <div className="flex items-center bg-white px-6 py-3 rounded-full shadow mb-8 w-full">

        <Search className="text-gray-400 mr-3" />

        <input
          placeholder="Search orders, patients..."
          className="outline-none w-full"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />
      </div>

      {/* ================= ORDERS ================= */}

      <div className="space-y-6">

        {filtered.map((order) => (

          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01 }}
            className="bg-white rounded-2xl shadow p-6 flex justify-between items-center"
          >

            {/* LEFT */}
            <div className="flex gap-4">

              <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-teal-500 text-white flex items-center justify-center font-bold">
                {order.patient[0]}
              </div>

              <div>

                <p className="font-semibold text-gray-800">
                  {order.patient}
                </p>

                <p className="text-sm text-gray-500">
                  {order.id} • {order.date}
                </p>

                <div className="flex flex-wrap gap-2 mt-2">

                  {order.items.map((item, i) => (
                    <span
                      key={i}
                      className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs"
                    >
                      {item}
                    </span>
                  ))}

                </div>

              </div>

            </div>

            {/* RIGHT */}
            <div className="text-right">

              <p className="font-bold text-lg">
                ₹{order.amount}
              </p>

              <StatusBadge status={order.status} />

              {order.status === "Delivered" && (
                <p className="text-green-600 text-xs mt-1">
                  {order.payment}
                </p>
              )}

              <ActionButton
                order={order}
                onClick={() =>
                  updateStatus(order.id)
                }
              />

            </div>

          </motion.div>

        ))}

      </div>

    </div>
  )
}

/* ================= STATUS BADGE ================= */

function StatusBadge({ status }) {

  const styles = {
    Pending:
      "bg-yellow-100 text-yellow-600",
    Processing:
      "bg-blue-100 text-blue-600",
    Dispatched:
      "bg-purple-100 text-purple-600",
    Delivered:
      "bg-green-100 text-green-600"
  }

  return (
    <span
      className={`px-3 py-1 text-xs rounded-full font-medium inline-block mt-2 ${styles[status]}`}
    >
      {status}
    </span>
  )
}

/* ================= ACTION BUTTON ================= */

function ActionButton({ order, onClick }) {

  if (order.status === "Pending")
    return (
      <button
        onClick={onClick}
        className="mt-3 bg-teal-500 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2"
      >
        <Clock size={16} />
        Start Processing
      </button>
    )

  if (order.status === "Processing")
    return (
      <button
        onClick={onClick}
        className="mt-3 bg-blue-500 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2"
      >
        <Truck size={16} />
        Dispatch Order
      </button>
    )

  if (order.status === "Dispatched")
    return (
      <button
        onClick={onClick}
        className="mt-3 bg-green-500 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2"
      >
        <CheckCircle size={16} />
        Mark Delivered
      </button>
    )

  return null
}