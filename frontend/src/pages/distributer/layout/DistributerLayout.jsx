import DistributerSlidebar from "../components/DistributerSlidebar.jsx"
import { Outlet } from "react-router-dom"

export default function PatientLayout() {
return ( <div className="flex">

  {/* Sidebar */}
  <DistributerSlidebar />

  {/* Changing Content */}
  <div className="flex-1 overflow-y-auto h-screen bg-white">
    <Outlet />
  </div>

</div>


)
}
