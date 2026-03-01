import {
  Calendar,
  Clock,
  FileText,
  Stethoscope,
  Download,
  Printer,
  ShoppingCart,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import axios from "axios";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const MONTH_MAP = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  january: 1, february: 2, march: 3, april: 4, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

// Parses any reasonable date string into a Date object
const parseFlexibleDate = (dateStr) => {
  if (!dateStr) return null;
  const s = String(dateStr).trim();

  // ── dash / slash separated: "04-09-2023", "30-Aug-2023", "2023/09/04" ──
  const dashParts = s.split(/[-\/]/);
  if (dashParts.length === 3) {
    const [a, b, c] = dashParts;

    // DD-Mon-YYYY  e.g. 30-Aug-2023
    if (isNaN(b) && MONTH_MAP[b.toLowerCase()]) {
      const day = parseInt(a), month = MONTH_MAP[b.toLowerCase()], year = parseInt(c);
      if (day && month && year) return new Date(year, month - 1, day);
    }

    // YYYY-MM-DD  e.g. 2023-09-04
    if (parseInt(a) > 31) {
      const d = new Date(`${a}-${b.padStart(2,"0")}-${c.padStart(2,"0")}`);
      if (!isNaN(d.getTime())) return d;
    }

    // DD-MM-YYYY  e.g. 04-09-2023
    if (parseInt(c) > 31) {
      return new Date(parseInt(c), parseInt(b) - 1, parseInt(a));
    }
  }

  // ── space separated: "30 Aug 2023", "August 30 2023" ──
  const spaceParts = s.replace(/,/g, "").split(/\s+/);
  if (spaceParts.length === 3) {
    let day, month, year;
    for (const part of spaceParts) {
      const num = parseInt(part);
      const word = part.toLowerCase();
      if (MONTH_MAP[word]) month = MONTH_MAP[word];
      else if (!isNaN(num)) {
        if (num > 31) year = num;
        else if (!day) day = num;
        else year = num;
      }
    }
    if (day && month && year) return new Date(year, month - 1, day);
  }

  // ── fallback: native Date parse ──
  const direct = new Date(s);
  if (!isNaN(direct.getTime())) return direct;

  return null;
};

// Always outputs "30-Aug-2023" format
const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const d = parseFlexibleDate(dateStr);
  if (!d) return dateStr; // return raw string if unparseable
  const day = String(d.getDate()).padStart(2, "0");
  const mon = MONTH_ABBR[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${mon}-${year}`;
};

const parseQuantity = (quantityStr) => {
  if (!quantityStr) return 1;
  const match = String(quantityStr).match(/\d+/);
  return match ? parseInt(match[0]) : 1;
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export default function CurrentPrescription() {
  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cartStatus, setCartStatus] = useState({});

  useEffect(() => {
    const handleGetPrescription = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        const response = await axios.get(
          "http://localhost:8000/api/customer/show-prescription",
          { params: { patient_id: user?.id } }
        );
        setPrescription(response.data);
        localStorage.setItem('prescription_id',prescription.prescription.id)
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    handleGetPrescription();
  }, []);

  const handleAddToCart = async (med, index) => {
    if (cartStatus[index] === "loading") return;
    setCartStatus((prev) => ({ ...prev, [index]: "loading" }));

    try {
      const token = localStorage.getItem("token");
      const prescriptionId = prescription?.prescription?._id;
      const quantity = parseQuantity(med?.quantity);

      await axios.post(
        "http://localhost:8000/api/customer/cart/add-from-prescription",
        {
          prescription_id: prescriptionId,
          medicine_name: med?.medicine_name,
          quantity,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCartStatus((prev) => ({ ...prev, [index]: "success" }));
      setTimeout(() => {
        setCartStatus((prev) => ({ ...prev, [index]: "idle" }));
      }, 2500);
    } catch (error) {
      console.error("Add to cart failed:", error);
      const errMsg = error?.response?.data?.detail || "Failed to add to cart. Try again.";
      setCartStatus((prev) => ({ ...prev, [index]: "error", [`${index}_msg`]: errMsg }));
      setTimeout(() => {
        setCartStatus((prev) => ({ ...prev, [index]: "idle", [`${index}_msg`]: undefined }));
      }, 3000);
    }
  };

  // ── Derived values ──────────────────────────
  const issuedDate = prescription?.prescription?.issued_date;
  const expiredDate = prescription?.prescription?.expired_date;

  let daysRemaining = null;
  let daysLabel = "-";
  let prescriptionStatus = prescription?.prescription?.status || "-";

  if (issuedDate && expiredDate) {
    const issued = parseFlexibleDate(issuedDate);
    const expired = parseFlexibleDate(expiredDate);
    if (issued && expired) {
      const today = new Date();
      daysRemaining = Math.floor((expired.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysRemaining > 0) { daysLabel = `${daysRemaining} days`; prescriptionStatus = "Active"; }
      else if (daysRemaining === 0) { daysLabel = "Expires today"; prescriptionStatus = "Expires Today"; }
      else { daysLabel = `Expired ${Math.abs(daysRemaining)} days ago`; prescriptionStatus = "Expired"; }
    }
  }

  const statusColor =
    prescriptionStatus === "Active" ? "bg-green-100 text-green-600"
    : prescriptionStatus === "Expires Today" ? "bg-yellow-100 text-yellow-600"
    : "bg-red-100 text-red-600";

  const daysColor =
    daysRemaining > 7 ? "bg-green-100 text-green-600"
    : daysRemaining > 0 ? "bg-yellow-100 text-yellow-600"
    : "bg-red-100 text-red-600";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-gray-500 text-lg"
        >
          Loading Prescription...
        </motion.div>
      </div>
    );
  }

  if (!prescription || prescription?.message === "No prescription found") {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <p className="text-gray-500 text-lg">No Prescription Found</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 via-white to-cyan-50 min-h-screen">

      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-start mb-6"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Current Prescription</h1>
          <p className="text-gray-500 text-sm">Prescription ID: {prescription?.prescription?._id}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded-lg text-sm hover:bg-gray-300 transition"
          >
            <Printer size={16} /> Print
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition shadow"
          >
            <Download size={16} /> Download PDF
          </button>
        </div>
      </motion.div>

      {/* STATUS CARDS */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <AnimatedCard title="Status" value={prescriptionStatus} icon={<FileText size={18} />} color={statusColor} delay={0} />
        <AnimatedCard title="Issued Date" value={formatDate(issuedDate)} icon={<Calendar size={18} />} delay={0.1} />
        <AnimatedCard title="Valid Until" value={formatDate(expiredDate)} icon={<Clock size={18} />} delay={0.2} />
        <AnimatedCard title="Days Remaining" value={daysLabel} icon={<FileText size={18} />} color={daysColor} delay={0.3} />
      </div>

      {/* DOCTOR + DIAGNOSIS */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-6 rounded-2xl shadow border hover:shadow-lg transition"
        >
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Stethoscope size={18} /> Prescribing Doctor
          </h3>
          <p className="font-medium">{prescription?.doc_info?.name}</p>
          <p className="text-sm text-gray-500 mb-3">{prescription?.doc_info?.qualification}</p>
          <p className="text-sm">{prescription?.doc_info?.clinic_name}</p>
          <p className="text-sm">{prescription?.doc_info?.clinic_no}</p>
          <p className="text-sm">License: {prescription?.doc_info?.license_number}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          className="col-span-2 bg-white p-6 rounded-2xl shadow border hover:shadow-lg transition"
        >
          <h3 className="font-semibold mb-4">Diagnosis & Instructions</h3>
          <p className="text-gray-600 text-sm mb-2">Diagnosis</p>
          <p className="font-medium mb-3">{prescription?.prescription?.diagnosis}</p>
          <p className="text-gray-600 text-sm mb-2">Doctor's Notes</p>
          <div className="bg-blue-50 p-3 rounded-lg text-sm border">
            {prescription?.prescription?.doctors_note}
          </div>
        </motion.div>
      </div>

      {/* MEDICINES */}
      <div className="bg-white p-6 rounded-2xl shadow border">
        <h3 className="font-semibold mb-6">Prescribed Medicines</h3>
        <div className="space-y-4">
          {prescription?.medicine_info && prescription.medicine_info.length > 0 ? (
            prescription.medicine_info.map((med, i) => {
              const status = cartStatus[i] || "idle";
              const errorMsg = cartStatus[`${i}_msg`];
              const parsedQty = parseQuantity(med?.quantity);

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="border rounded-xl p-4 hover:shadow-md transition bg-gradient-to-r from-white to-blue-50"
                >
                  {/* ── TOP ROW: number + medicine info + cart button ── */}
                  <div className="flex items-center gap-4">

                    {/* Index badge */}
                    <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold shadow">
                      {i + 1}
                    </div>

                    {/* Medicine details — 4 columns, takes remaining space */}
                    <div className="grid grid-cols-4 gap-4 flex-1">
                      <div>
                        <p className="text-sm text-gray-500">Medicine</p>
                        <p className="font-medium">{med?.medicine_name || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Dosage</p>
                        <p>{med?.dosage || "-"}</p>
                        <p className="text-sm text-gray-400">{med?.frequency || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Indications</p>
                        <p>{med?.indications || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Quantity</p>
                        <p>
                          {med?.quantity || "-"}
                          {med?.quantity && (
                            <span className="ml-1 text-xs text-blue-500 font-medium">
                              ({parsedQty} units)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Add to Cart button — pinned to the right, same line */}
                    <motion.button
                      onClick={() => handleAddToCart(med, i)}
                      disabled={status === "loading" || status === "success"}
                      whileTap={{ scale: 0.95 }}
                      className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow whitespace-nowrap
                        ${status === "success"
                          ? "bg-green-500 text-white cursor-default"
                          : status === "error"
                          ? "bg-red-500 text-white hover:bg-red-600"
                          : status === "loading"
                          ? "bg-blue-400 text-white cursor-wait"
                          : "bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:shadow-lg hover:from-blue-700 hover:to-cyan-600"
                        }`}
                    >
                      <AnimatePresence mode="wait">
                        {status === "loading" && (
                          <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            Adding...
                          </motion.span>
                        )}
                        {status === "success" && (
                          <motion.span key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                            <CheckCircle size={15} /> Added!
                          </motion.span>
                        )}
                        {status === "error" && (
                          <motion.span key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                            <XCircle size={15} /> Retry
                          </motion.span>
                        )}
                        {(status === "idle" || !status) && (
                          <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                            <ShoppingCart size={15} />
                            Add to Cart
                            <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-xs">
                              {parsedQty}
                            </span>
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>

                  </div>

                  {/* ── BELOW: instructions + error message ── */}
                  {med?.instructions && (
                    <div className="mt-3 text-sm text-gray-600 bg-gray-100 p-2 rounded">
                      Instructions: {med.instructions}
                    </div>
                  )}

                  <AnimatePresence>
                    {status === "error" && errorMsg && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
                      >
                        {errorMsg}
                      </motion.div>
                    )}
                  </AnimatePresence>

                </motion.div>
              );
            })
          ) : (
            <div className="text-center text-gray-500 py-6">
              No medicines found in this prescription.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────
// ANIMATED CARD
// ─────────────────────────────────────────────
function AnimatedCard({ title, value, icon, color, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white p-4 rounded-xl shadow border flex items-center gap-3 hover:shadow-lg transition"
    >
      <div className={`p-2 rounded-lg ${color || "bg-blue-100 text-blue-600"}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </motion.div>
  );
}