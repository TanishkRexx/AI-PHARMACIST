import { useParams } from "react-router-dom"
import { Heart } from "lucide-react"

export default function RoleLogin() {
const { role } = useParams()

const roleConfig = {
patient: {
title: "Patient Portal",
color: "bg-blue-600",
},
pharmacist: {
title: "Pharmacist Portal",
color: "bg-purple-600",
},
distributor: {
title: "Distributor Portal",
color: "bg-emerald-600",
},
}

const currentRole = roleConfig[role] || roleConfig.patient

return ( <div className="min-h-screen flex items-center justify-center bg-white">

```
  <div className="w-full max-w-md p-8 border rounded-2xl shadow-lg">

    {/* Logo */}
    <div className="flex flex-col items-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
        <Heart />
      </div>

      <h2 className="mt-4 text-xl font-bold">
        GoMed
      </h2>

      {/* Role Badge */}
      <span
        className={`mt-3 text-white px-4 py-1 rounded-full text-sm ${currentRole.color}`}
      >
        {currentRole.title}
      </span>
    </div>

    {/* Welcome */}
    <h3 className="mt-6 text-center text-lg font-semibold">
      Welcome Back
    </h3>

    <p className="text-center text-gray-500 text-sm mb-6">
      Sign in to your account
    </p>

    {/* FORM */}
    <input
      placeholder="Email or Phone"
      className="w-full mb-3 p-2 border rounded"
    />

    <input
      type="password"
      placeholder="Password"
      className="w-full mb-4 p-2 border rounded"
    />

    <button
      className={`w-full text-white py-2 rounded ${currentRole.color}`}
    >
      Sign In
    </button>

    <p className="text-center text-sm mt-4">
      Don’t have an account?{" "}
      <span className="text-blue-600 cursor-pointer">
        Register
      </span>
    </p>

  </div>
</div>

)
}
