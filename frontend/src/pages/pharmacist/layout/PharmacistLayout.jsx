import PharmacistSliderbar from "../components/PharmacistSliderbar"
import PharmacistTopbar from "../components/PharmacistTopbar"
import { Outlet } from "react-router-dom"

export default function PharmacistLayout() {
  return (
    <div className="flex">

      {/* Sidebar */}
      <PharmacistSliderbar />

      {/* Right Side */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* Dynamic Header */}
        <PharmacistTopbar />

        {/* Pages */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <Outlet />
        </div>

      </div>

    </div>
  )
}