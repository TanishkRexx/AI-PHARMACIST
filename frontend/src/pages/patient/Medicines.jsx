import { useState } from "react"
import { motion } from "framer-motion"
import {Search,ShoppingCart,Pill,Plus,Minus,Upload,Mic,} from "lucide-react"
import { useNavigate } from "react-router-dom"
import medicinesData from "../../data/medicines.json"
import VoiceAgentPopup from "../../components/VoicePopup"

export default function Medicines() {

/* ---------------- STATE ---------------- */

const [search, setSearch] = useState("")
const [category, setCategory] = useState("All")
const [cart, setCart] = useState([])
const navigate = useNavigate()
const [openVoice, setOpenVoice] =useState(false)

/* ---------------- CATEGORIES ---------------- */

const categories = [
"All","Pain Relief","Antibiotics","Digestive","Allergy","Diabetes","Heart Care","Vitamins",
]

/* ---------------- FILTER ---------------- */

const filteredMeds = medicinesData.filter((med) => {
const matchesSearch = med.name
.toLowerCase()
.includes(search.toLowerCase())

const matchesCategory =
category === "All" ||
med.category === category

return matchesSearch && matchesCategory
})

/* ---------------- ADD TO CART ---------------- */

const addToCart = (medicine) => {
setCart([...cart,
{ ...medicine, qty: 1 },
])
}

/* ---------------- INCREASE ---------------- */

const increaseQty = (id) => {
setCart((prev) =>
prev.map((item) =>
item.id === id
? { ...item, qty: item.qty + 1 }
: item
)
)
}

/* ---------------- DECREASE ---------------- */

const decreaseQty = (id) => {
setCart((prev) =>
prev
.map((item) =>
item.id === id
? { ...item, qty: item.qty - 1 }
: item
)
.filter((item) => item.qty > 0)
)
}

/* ---------------- GET QTY ---------------- */

const getQty = (id) => {
const item = cart.find((c) => c.id === id)
return item ? item.qty : 0
}

/* ---------------- UI ---------------- */

return (

<div className="p-8 bg-gradient-to-br from-blue-50 via-white to-cyan-50 min-h-screen">

{/* HEADER */}
<motion.div
initial={{ opacity: 0, y: -30 }}
animate={{ opacity: 1, y: 0 }}
className="mb-8"

>
<h1 className="text-4xl font-bold text-gray-800">

  Medicines
</h1>
<p className="text-gray-500 mt-1">
  Browse and order medicines from our trusted pharmacy network.
</p>

</motion.div>

{/* SEARCH + ACTIONS */}
<motion.div
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
className="flex flex-col lg:flex-row gap-4 justify-between mb-8"
>

{/* 🔍 BIG SEARCH BAR */}
<div className="flex items-center bg-white border rounded-full px-6 py-3 w-full lg:w-[650px] shadow-md">

  <Search className="w-5 h-5 text-gray-400 mr-3" />

  <input
    type="text"
    placeholder="Search medicines by name ..."
    value={search}
    onChange={(e) =>
      setSearch(e.target.value)
    }
    className="outline-none w-full text-sm"
  />

</div>

{/* 🔥 ACTION BUTTONS GROUP */}
<div className="flex items-center gap-3">

  {/* 🎤 VOICE ASSISTANT */}
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.9 }}
  onClick={() => setOpenVoice(true)}
  className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-3 rounded-full shadow font-medium"
>
  <Mic size={18} />
  Voice
</motion.button>

  {/* 📄 UPLOAD PRESCRIPTION */}
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.9 }}
    className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-3 rounded-full shadow font-medium"
    onClick={() => navigate("/patient/upload-prescription")
}
  >
    <Upload size={18} />
    Prescription
  </motion.button>

  {/* 🛒 CART */}
  <motion.div
  whileHover={{ scale: 1.05 }}
  onClick={() =>
    navigate("/patient/cart", {
      state: { cart }
    })
  }
  className="flex items-center gap-2 bg-white px-5 py-3 rounded-full shadow border font-medium cursor-pointer"
>
  <ShoppingCart className="w-5 h-5" />
  Cart(
  {cart.reduce(
    (acc, item) => acc + item.qty,
    0
  )}
  )
</motion.div>
</div>

</motion.div>


{/* CATEGORY FILTER */}

  <div className="flex flex-wrap gap-3 mb-8">

{categories.map((cat) => (
  <motion.button
    key={cat}
    whileTap={{ scale: 0.9 }}
    onClick={() => setCategory(cat)}
    className={`px-5 py-2 rounded-full text-sm border transition font-medium shadow-sm
    ${
      category === cat
        ? "bg-blue-600 text-white"
        : "bg-white hover:bg-blue-50"
    }`}
  >
    {cat}
  </motion.button>
))}

  </div>

{/* COUNT */}

  <p className="text-sm text-gray-500 mb-6">
    Showing {filteredMeds.length} medicines
  </p>

{/* MEDICINE GRID */}

  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">

{filteredMeds.map((med) => {

  const qty = getQty(med.id)

  return (
    <motion.div
      key={med.id}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{
        scale: 1.04,
      }}
      className="bg-white rounded-2xl shadow-md border p-5 transition"
    >

      {/* IMAGE */}
      <div className="h-32 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl flex items-center justify-center mb-4">

        <Pill className="w-12 h-12 text-blue-600" />

      </div>

      {/* CATEGORY */}
      <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full font-medium">
        {med.category}
      </span>

      {/* NAME */}
      <h3 className="font-semibold mt-2 text-gray-800">
        {med.name}
      </h3>

      <p className="text-sm text-gray-500">
        {med.manufacturer}
      </p>

      {/* PRICE */}
      <p className="font-bold mt-2 text-lg">
        ₹{med.price}
        <span className="text-sm font-normal text-gray-500">
          /strip
        </span>
      </p>

      {/* BUTTON / STEPPER */}
      {qty === 0 ? (

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => addToCart(med)}
          className="mt-4 w-full py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:shadow-lg transition"
        >
          Add to Cart
        </motion.button>

      ) : (

        <motion.div
          layout
          className="mt-4 flex items-center justify-between bg-blue-50 border rounded-full px-4 py-2"
        >

          <button
            onClick={() =>
              decreaseQty(med.id)
            }
            className="text-blue-600"
          >
            <Minus size={18} />
          </button>

          <span className="font-semibold">
            {qty}
          </span>

          <button
            onClick={() =>
              increaseQty(med.id)
            }
            className="text-blue-600"
          >
            <Plus size={18} />
          </button>

        </motion.div>

      )}

    </motion.div>
  )
})}

  </div>
  <VoiceAgentPopup
  isOpen={openVoice}
  onClose={() => setOpenVoice(false)}
/>

</div>

)

}
