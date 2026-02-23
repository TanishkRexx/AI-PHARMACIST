import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { User, Building2, Truck, X } from "lucide-react"
import { useNavigate } from "react-router-dom"
import authService from "../../services/authService";

export default function SignupPopup({ isOpen, onClose }) {
const [form, setForm] = useState({
firstName: "",
lastName: "",
phone: "",
email: "",
password: "",
role: "",
address : "",
})
const navigate = useNavigate()


const [errors, setErrors] = useState({})

if (!isOpen) return null

const roles = [
{
title: "Patient",
icon: <User className="h-5 w-5" />,
},
{
title: "Pharmacist",
icon: <Building2 className="h-5 w-5" />,
},
{
title: "Distributor",
icon: <Truck className="h-5 w-5" />,
},
]

const handleChange = (e) => {
setForm({ ...form, [e.target.name]: e.target.value })
}

const validate = () => {
let newErrors = {}


if (!form.firstName.trim())
  newErrors.firstName = "First name required"

if (!form.lastName.trim())
  newErrors.lastName = "Last name required"

if (!form.phone.match(/^[0-9]{10}$/))
  newErrors.phone = "Enter valid 10-digit phone"

if (!form.email.match(/^\S+@\S+\.\S+$/))
  newErrors.email = "Enter valid email"

if (form.password.length < 6)
  newErrors.password = "Password must be 6+ chars"

if (!form.role)
  newErrors.role = "Please select role"

if (!form.address.trim())
  newErrors.address = "Address required"

setErrors(newErrors)
return Object.keys(newErrors).length === 0


}

const handleSubmit = async (e) => {
  e.preventDefault();

  if (!validate()) return;

    const mappedRole =
    form.role === "Patient"
      ? "customer"
      : form.role === "Pharmacist"
      ? "pharmacy"
      : "distributor";

  // Convert frontend form → backend format
  const userData = {
    name: `${form.firstName} ${form.lastName}`,
    email: form.email,
    password: form.password,
    phone: form.phone,
    role: mappedRole,
    address: form.address,
  };

  // Call Backend Register API
  const res = await authService.register(userData);

  if (res.success) {
    alert("Signup Successful 🚀");

    // Role based navigation
    if (res.user.role === "customer") {
      navigate("/patient/dashboard");
    } 
    else if (res.user.role === "pharmacy") {
      navigate("/pharmacist/dashboard");
    } 
    else if (res.user.role === "distributor") {
      navigate("/distributor/dashboard");
    }

    onClose();
  } 
  else {
    alert(res.error || "Signup Failed");
  }
};

return ( <AnimatePresence>
<motion.div
className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
exit={{ opacity: 0 }}
>
<motion.div
initial={{ scale: 0.8, opacity: 0, y: 60 }}
animate={{ scale: 1, opacity: 1, y: 0 }}
exit={{ scale: 0.8, opacity: 0 }}
className="relative w-[95%] max-w-2xl rounded-2xl bg-white p-8 shadow-2xl border border-gray-200"
>
<button
  onClick={() => {
    onClose();
  }}
  className="absolute right-4 top-4 rounded-full bg-gray-100 p-2 hover:bg-gray-200 transition"
>
  <X className="h-5 w-5 text-gray-700" />
</button>


      <h2 className="text-2xl font-bold text-center text-gray-800">
        Create Account
      </h2>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">

        {/* First + Last */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <input
              name="firstName"
              placeholder="First Name"
              onChange={handleChange}
              className="w-full p-2 rounded border border-gray-300 bg-white text-gray-800"
            />
            <p className="text-red-400 text-xs">
              {errors.firstName}
            </p>
          </div>

          <div>
            <input
              name="lastName"
              placeholder="Last Name"
              onChange={handleChange}
              className="w-full p-2 rounded border border-gray-300 bg-white text-gray-800"
            />
            <p className="text-red-400 text-xs">
              {errors.lastName}
            </p>
          </div>
        </div>

        {/* Phone */}
        <div>
          <input
            name="phone"
            placeholder="Phone Number"
            onChange={handleChange}
            className="w-full p-2 rounded border border-gray-300 bg-white text-gray-800"
          />
          <p className="text-red-400 text-xs">
            {errors.phone}
          </p>
        </div>

        {/* Email */}
        <div>
          <input
            name="email"
            placeholder="Email Address"
            onChange={handleChange}
            className="w-full p-2 rounded border border-gray-300 bg-white text-gray-800"
          />
          <p className="text-red-400 text-xs">
            {errors.email}
          </p>
        </div>

        {/* Password */}
        <div>
          <input
            type="password"
            name="password"
            placeholder="Password"
            onChange={handleChange}
            className="w-full p-2 rounded border border-gray-300 bg-white text-gray-800"
          />
          <p className="text-red-400 text-xs">
            {errors.password}
          </p>
        </div>

        {/* Address */}
    <div>
  <textarea
    name="address"
    placeholder="Enter Full Address"
    onChange={handleChange}
    className="w-full p-2 rounded border border-gray-300 bg-white text-gray-800"
    rows="3"
  />
  <p className="text-red-400 text-xs">
    {errors.address}
  </p>
   </div>

        {/* ROLE AFTER PASSWORD */}
        <div>
          <p className="text-sm mb-2 text-gray-700">
            Select Role
          </p>

          <div className="grid grid-cols-3 gap-3">
            {roles.map((r) => (
              <div
                key={r.title}
                onClick={() =>
                  setForm({ ...form, role: r.title })
                }
                className={`cursor-pointer rounded-lg border p-3 text-center text-sm flex flex-col items-center gap-1
                ${
                  form.role === r.title
                    ? "border-cyan-500 bg-cyan-50"
                    : "border-gray-300 bg-white"
                }`}
              >
                {r.icon}
                {r.title}
              </div>
            ))}
          </div>

          <p className="text-red-400 text-xs mt-1">
            {errors.role}
          </p>
        </div>
        

        {/* Submit */}
        <button className="w-full bg-cyan-500 py-2 rounded font-semibold">
          Sign Up
        </button>

      </form>
    </motion.div>
  </motion.div>
</AnimatePresence>


)
}
