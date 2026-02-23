import { useLocation } from "react-router-dom"
import { motion } from "framer-motion"
import {Plus,Minus,Trash2,ShoppingBag} from "lucide-react"
import { useState } from "react"

export default function Cart() {

const location = useLocation()
const [cart, setCart] = useState(
location.state?.cart || []
)

/* -------- INCREASE -------- */
const increaseQty = (id) => {
setCart(prev =>
prev.map(item =>
item.id === id
? { ...item, qty: item.qty + 1 }
: item
)
)
}

/* -------- DECREASE -------- */
const decreaseQty = (id) => {
setCart(prev =>
prev
.map(item =>
item.id === id
? { ...item, qty: item.qty - 1 }
: item
)
.filter(item => item.qty > 0)
)
}

/* -------- REMOVE -------- */
const removeItem = (id) => {
setCart(prev =>
prev.filter(item => item.id !== id)
)
}

/* -------- PRICE -------- */
const subtotal = cart.reduce(
(acc, item) =>
acc + item.price * item.qty,
0
)

const delivery = subtotal > 500 ? 0 : 50
const total = subtotal + delivery

return (
<div className="p-8 bg-gradient-to-br from-blue-50 via-white to-cyan-50 min-h-screen">

  {/* HEADER */}
  <motion.h1
    initial={{ opacity: 0, y: -30 }}
    animate={{ opacity: 1, y: 0 }}
    className="text-3xl font-bold mb-6"
  >
    Your Cart 🛒
  </motion.h1>

  {cart.length === 0 ? (
    <div className="text-center mt-20 text-gray-500">
      <ShoppingBag size={40} className="mx-auto mb-3" />
      Cart is empty
    </div>
  ) : (

    <div className="grid lg:grid-cols-3 gap-8">

      {/* -------- ITEMS -------- */}
      <div className="lg:col-span-2 space-y-4">

        {cart.map((item, i) => (

          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-4 rounded-xl shadow border flex justify-between items-center"
          >

            {/* INFO */}
            <div>
              <p className="font-semibold">
                {item.name}
              </p>

              <p className="text-sm text-gray-500">
                ₹{item.price} / strip
              </p>
            </div>

            {/* STEPPER */}
            <div className="flex items-center gap-4">

              <div className="flex items-center bg-blue-50 border rounded-full px-3 py-1">

                <button
                  onClick={() =>
                    decreaseQty(item.id)
                  }
                >
                  <Minus size={16} />
                </button>

                <span className="px-3 font-semibold">
                  {item.qty}
                </span>

                <button
                  onClick={() =>
                    increaseQty(item.id)
                  }
                >
                  <Plus size={16} />
                </button>

              </div>

              {/* REMOVE */}
              <button
                onClick={() =>
                  removeItem(item.id)
                }
                className="text-red-500"
              >
                <Trash2 size={18} />
              </button>

            </div>

          </motion.div>

        ))}

      </div>

      {/* -------- SUMMARY -------- */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-white p-6 rounded-xl shadow border h-fit"
      >

        <h3 className="font-semibold mb-4">
          Order Summary
        </h3>

        <div className="space-y-2 text-sm">

          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>₹{subtotal}</span>
          </div>

          <div className="flex justify-between">
            <span>Delivery</span>
            <span>
              {delivery === 0
                ? "Free"
                : `₹${delivery}`}
            </span>
          </div>

          <hr />

          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>₹{total}</span>
          </div>

        </div>

        {/* CHECKOUT */}
        <button className="mt-6 w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-2 rounded-lg font-semibold hover:shadow-lg">
          Proceed to Checkout
        </button>

        {/* PRESCRIPTION */}
        <button className="mt-3 w-full border py-2 rounded-lg text-sm">
          Upload Prescription
        </button>

      </motion.div>

    </div>

  )}

</div>

)
}
