import { Bell } from "lucide-react"
import { useLocation } from "react-router-dom"

export default function PharmacistTopbar() {

  const location = useLocation()

  /* ---------- GET TITLE FROM ROUTE ---------- */

  const getTitle = () => {

    if (location.pathname.includes("dashboard"))
      return "Dashboard"

    if (location.pathname.includes("Inventory"))
      return "Inventory"

    if (location.pathname.includes("current-prescription"))
      return "Prescription"

    if (location.pathname.includes("suppliers"))
      return "Suppliers"

    return "Pharmacist Portal"
  }

  /* ---------- DATE ---------- */

  const today = new Date().toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  )

  return (
    <div className="h-16 bg-white border-b flex items-center justify-between px-6 shadow-sm">

      {/* LEFT */}
      <div>
        <h1 className="font-semibold text-lg">
          {getTitle()}
        </h1>

        <p className="text-xs text-gray-500">
          {today}
        </p>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-4">

        {/* Notification */}
        <div className="relative cursor-pointer">
          <Bell className="text-gray-600" />
          <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
        </div>

        {/* Avatar */}
        <div className="h-9 w-9 bg-teal-500 text-white flex items-center justify-center rounded-full">
          P
        </div>

      </div>

    </div>
  )
}