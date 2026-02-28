import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Truck,
  Plus,
  Package,
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye,
  Download,
  Copy
} from "lucide-react";
import { pharmacyService } from "../../api/pharmacyService";
import Loading from "../../components/common/Loading";
import Pagination from "../../components/common/Pagination";
import EmptyState from "../../components/common/EmptyState";
import toast from "react-hot-toast";

export default function Procurement() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState("orders");

  const limit = 10;

  useEffect(() => {
    loadData();
  }, [page]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordersRes, suggestionsRes] = await Promise.all([
        pharmacyService.getProcurementOrders({ page, limit }),
        pharmacyService.getReorderSuggestions(),
      ]);

      if (ordersRes.success) {
        setOrders(ordersRes.data.orders);
        setTotalPages(ordersRes.data.pagination.pages);
      }

      if (suggestionsRes.success) {
        setSuggestions(suggestionsRes.data.suggestions);
      }
    } catch (error) {
      toast.error("Failed to load procurement data");
    } finally {
      setLoading(false);
    }
  };

  const handleReceive = async (poId) => {
    try {
      const response = await pharmacyService.receiveProcurement(poId);
      if (response.success) {
        toast.success("Order received and stock updated!");
        loadData();
      }
    } catch (error) {
      toast.error("Failed to receive order");
    }
  };

  const statusConfig = {
    pending: { label: "Pending", color: "bg-yellow-100 text-yellow-600" },
    approved: { label: "Approved", color: "bg-blue-100 text-blue-600" },
    shipped: { label: "Shipped", color: "bg-purple-100 text-purple-600" },
    delivered: { label: "Delivered", color: "bg-green-100 text-green-600" },
    cancelled: { label: "Cancelled", color: "bg-red-100 text-red-600" },
  };

  const priorityConfig = {
    critical: {
      label: "Critical",
      color: "bg-red-100 text-red-600 border-red-200",
    },
    high: {
      label: "High",
      color: "bg-orange-100 text-orange-600 border-orange-200",
    },
    medium: {
      label: "Medium",
      color: "bg-yellow-100 text-yellow-600 border-yellow-200",
    },
  };

  if (loading) return <Loading fullScreen text="Loading procurement..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Procurement</h1>
          <p className="text-sm text-gray-500">Order stock from distributors</p>
        </div>
        <button
          onClick={() => navigate("/pharmacy/procurement/create")}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition"
        >
          <Plus size={18} />
          Create Order
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b">
        <button
          onClick={() => setActiveTab("orders")}
          className={`pb-3 px-4 font-medium transition ${
            activeTab === "orders"
              ? "text-purple-600 border-b-2 border-purple-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Procurement Orders
        </button>
        <button
          onClick={() => setActiveTab("suggestions")}
          className={`pb-3 px-4 font-medium transition flex items-center gap-2 ${
            activeTab === "suggestions"
              ? "text-purple-600 border-b-2 border-purple-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          AI Suggestions
          {suggestions.length > 0 && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
              {suggestions.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "orders" ? (
        /* Orders List */
        orders.length === 0 ? (
          <EmptyState
            icon={<Truck size={48} />}
            title="No procurement orders"
            description="Create your first procurement order to restock inventory"
            action={() => navigate("/pharmacy/procurement/create")}
            actionLabel="Create Order"
          />
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                      PO Number
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                      Items
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                      Total
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                      Status
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                      Tracking
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, index) => {
                    const status =
                      statusConfig[order.status] || statusConfig.pending;

                    return (
                      <motion.tr
                        key={order.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-gray-800">
                              {order.po_number}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(order.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium">
                            {order.items_count} items
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-gray-800">
                            ₹{order.total_amount}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {order.tracking_number ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-800">
                                {order.tracking_number}
                              </span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    order.tracking_number,
                                  );
                                  toast.success("Copied!");
                                }}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                <Copy size={14} className="text-gray-400" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400 italic">
                              {order.status === "shipped"
                                ? "Awaiting..."
                                : order.status === "delivered"
                                  ? "Delivered"
                                  : "Not shipped yet"}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                navigate(`/pharmacy/procurement/${order.id}`)
                              }
                              className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                            {order.status === "shipped" && (
                              <button
                                onClick={() => handleReceive(order.id)}
                                className="px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition flex items-center gap-1"
                              >
                                <Download size={14} />
                                Receive
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
        )
      ) : /* AI Suggestions */
      suggestions.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800">
            All Stock Levels Healthy!
          </h3>
          <p className="text-gray-500">No reorder suggestions at this time</p>
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((item, index) => {
            const priority =
              priorityConfig[item.priority] || priorityConfig.medium;

            return (
              <motion.div
                key={item.medicine_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-white p-5 rounded-2xl shadow-md border-l-4 ${
                  item.priority === "critical"
                    ? "border-l-red-500"
                    : item.priority === "high"
                      ? "border-l-orange-500"
                      : "border-l-yellow-500"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-gray-800">
                        {item.medicine_name}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${priority.color}`}
                      >
                        {priority.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Current Stock</span>
                        <p className="font-bold text-red-600">
                          {item.current_stock}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Reorder Level</span>
                        <p className="font-bold text-gray-800">
                          {item.reorder_level}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Suggested Qty</span>
                        <p className="font-bold text-green-600">
                          {item.suggested_quantity}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Est. Cost</span>
                        <p className="font-bold text-gray-800">
                          ₹{item.estimated_cost}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      navigate("/pharmacy/procurement/create", {
                        state: {
                          preselected: [
                            {
                              medicine_id: item.medicine_id,
                              quantity: item.suggested_quantity,
                            },
                          ],
                        },
                      })
                    }
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition"
                  >
                    Order Now
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
