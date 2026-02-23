import { useState } from "react"
import { useNavigate } from "react-router-dom"

export default function AdminAuth() {

  const [isLogin, setIsLogin] =
    useState(true)

  const [email, setEmail] =
    useState("")

  const [password, setPassword] =
    useState("")

  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()

    /* Fake Auth */
    localStorage.setItem(
      "adminAuth",
      "true"
    )

    navigate("/admin/dashboard")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-600 to-teal-500">

      <div className="bg-white p-8 rounded-2xl shadow-xl w-[400px]">

        <h2 className="text-2xl font-bold mb-6 text-center">
          {isLogin
            ? "Admin Login"
            : "Admin Signup"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">

          <input
            type="email"
            placeholder="Email"
            required
            className="w-full border p-3 rounded-xl"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
          />

          <input
            type="password"
            placeholder="Password"
            required
            className="w-full border p-3 rounded-xl"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
          />

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-xl"
          >
            {isLogin
              ? "Login"
              : "Signup"}
          </button>

        </form>

        <p
          onClick={() =>
            setIsLogin(!isLogin)
          }
          className="text-sm text-center text-blue-600 mt-4 cursor-pointer"
        >
          {isLogin
            ? "Create Account"
            : "Already have account?"}
        </p>

      </div>

    </div>
  )
}