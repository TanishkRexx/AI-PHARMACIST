import {
LayoutDashboard,LogOut,
Pill,
ClipboardMinus,
Activity,
User,
Heart,
CalendarClock
} from "lucide-react"
import { NavLink } from "react-router-dom"
import { useNavigate } from "react-router-dom"


export default function PatientSidebar() {
    const navigate = useNavigate()

  const logout = () => {
    localStorage.removeItem("user")
    navigate("/")
  }
return ( <div className="w-64 min-h-screen bg-white border-r flex flex-col justify-between">

  {/* Logo */}
  <div>
    <div className="flex items-center gap-3 px-6 py-5 border-b">
      <div className="h-10 w-10 bg-blue-600 text-white flex items-center justify-center rounded-xl">
        <Heart size={20} />
      </div>

      <div>
        <h2 className="font-bold">GoMed</h2>
        <p className="text-xs text-gray-500">
          Patient Portal
        </p>
      </div>
    </div>

    {/* Menu */}
    <nav className="mt-4 space-y-1 px-3">

      <NavItem
        to="/patient/dashboard"
        icon={<LayoutDashboard size={18} />}
        label="Dashboard"
      />

      <NavItem
        to="/patient/medicines"
        icon={<Pill size={18} />}
        label="Medicines"
      />

         <NavItem
        to="/patient/current-prescription"
        icon={<ClipboardMinus size={18} />}
        label="Current Prescription"
      />

      <NavItem
        to="/patient/therapy"
        icon={<Activity size={18} />}
        label="Therapy"
      />

      <NavItem
        to="/patient/pastTherapy"
        icon={<CalendarClock size={18} />}
        label="Past Therapy"
      />

      <NavItem
        to="/patient/profile"
        icon={<User size={18} />}
        label="Profile"
      />


    </nav>
  </div>
  
{/* Logout Section */}
<div className="border-t p-4">

  <button
    onClick={logout}
    className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 py-2 rounded-lg text-sm font-medium hover:bg-red-300 transition"
  >
    <LogOut size={18} />
    Logout
  </button>

</div>


</div>


)
}

/* Nav Item */
function NavItem({ to, icon, label }) {
return (
<NavLink
to={to}
className={({ isActive }) =>
`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition
        ${
          isActive
            ? "bg-blue-100 text-blue-600 font-medium"
            : "text-gray-600 hover:bg-gray-100"
        }`
}
>
{icon}
{label} </NavLink>
)
}
