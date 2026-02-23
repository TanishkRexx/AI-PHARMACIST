import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Eye, EyeOff, Heart } from "lucide-react"
import { useNavigate } from "react-router-dom"
import authService from "../../services/authService";

export default function LoginPopup({
isOpen,
onClose,
openSignup, // trigger signup popup
role,
}) {
const [form, setForm] = useState({
email: "",
password: "",
})

const [errors, setErrors] = useState({})
const [showPass, setShowPass] = useState(false)
const [showForgot, setShowForgot] = useState(false)
const [forgotEmail, setForgotEmail] = useState("")
const navigate = useNavigate()


if (!isOpen) return null

const handleChange = (e) => {
setForm({ ...form, [e.target.name]: e.target.value })
}

const validate = () => {
let newErrors = {}

if (!form.email.match(/^\S+@\S+\.\S+$/))
  newErrors.email = "Enter valid email"

if (form.password.length < 6)
  newErrors.password = "Password must be 6+ chars"

setErrors(newErrors)
return Object.keys(newErrors).length === 0

}

const handleSubmit = async (e) => {
  e.preventDefault();

  if (!validate()) return;

  // Call backend login API
  const res = await authService.login(
    form.email,
    form.password
  );

  if (res.success) {
    alert("Login Successful 🚀");

    const userRole = res.user.role;

    // Redirect based on backend role
    if (userRole === "customer") {
      navigate("/patient/dashboard");
    } 
    else if (userRole === "pharmacy") {
      navigate("/pharmacist/dashboard");
    } 
    else if (userRole === "distributor") {
      navigate("/distributor/dashboard");
    }

    onClose();
  } 
  else {
    setErrors({
      general: res.error || "Invalid credentials",
    });
  }
};

const handleForgotSubmit = (e) => {
e.preventDefault()
alert("Password reset link sent 📧")
setShowForgot(false)
}

return ( <AnimatePresence>
<motion.div
className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
exit={{ opacity: 0 }}
>
<motion.div
initial={{ scale: 0.7, opacity: 0, y: 80 }}
animate={{ scale: 1, opacity: 1, y: 0 }}
exit={{ scale: 0.7, opacity: 0, y: 80 }}
className="relative w-[95%] max-w-md rounded-2xl bg-white p-8 shadow-2xl"
>
{/* Close */} <button
         onClick={onClose}
         className="absolute right-4 top-4 bg-gray-100 p-2 rounded-full"
       > <X className="h-5 w-5 text-gray-700" /> </button>

      {/* Logo */}
      <div className="flex flex-col items-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
          <Heart className="h-6 w-6" />
        </div>

        <h2 className="mt-4 text-xl font-bold text-gray-800">
          Welcome Back
        </h2>
      </div>

      {/* LOGIN FORM */}
      {!showForgot ? (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">

          {/* Email */}
          <div>
            <input
              name="email"
              placeholder="Email Address"
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
            />
            <p className="text-red-500 text-xs">
              {errors.email}
            </p>
          </div>

          {/* Password */}
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              name="password"
              placeholder="Password"
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
            />

            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-2.5 text-gray-500"
            >
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>

            {errors.general && (
  <p className="text-red-500 text-xs text-center">
    {errors.general}
  </p>
)}
          </div>

          {/* Forgot Password */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="text-sm text-blue-600 hover:underline"
            >
              Forgot password?
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 py-2 text-white font-semibold hover:bg-blue-700 transition"
          >
            Log In
          </button>

          {/* Register */}
          <p className="text-center text-sm text-gray-600">
            Don’t have an account?{" "}
            <button
              type="button"
              onClick={() => {
                onClose()
                openSignup()
              }}
              className="text-blue-600 font-medium hover:underline"
            >
              Register
            </button>
          </p>

        </form>
      ) : (
        /* FORGOT PASSWORD FORM */
        <form
          onSubmit={handleForgotSubmit}
          className="mt-6 space-y-4"
        >
          <p className="text-sm text-gray-600 text-center">
            Enter your email to reset password
          </p>

          <input
            placeholder="Email Address"
            onChange={(e) =>
              setForgotEmail(e.target.value)
            }
            className="w-full rounded-lg border border-gray-300 px-4 py-2"
          />

          <button className="w-full bg-blue-600 text-white py-2 rounded">
            Send Reset Link
          </button>

          <button
            type="button"
            onClick={() => setShowForgot(false)}
            className="w-full text-sm text-gray-500 hover:underline"
          >
            Back to Login
          </button>
        </form>
      )}
    </motion.div>
  </motion.div>
</AnimatePresence>


)
}
