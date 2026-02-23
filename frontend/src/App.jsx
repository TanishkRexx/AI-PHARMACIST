import { Routes, Route } from "react-router-dom"
import Landing from "./components/Landing"
import RoleLogin from "./components/pages/RoleLogin.jsx"
import Login from "./components/pages/Login.jsx"

import PatientLayout from "./pages/patient/layout/PatientLayout.jsx"
import PatientDashboard from "./pages/patient/PatientDashboard.jsx"
import Medicines from "./pages/patient/Medicines.jsx"
import Therapy from "./pages/patient/Therapy.jsx"
import Profile from "./pages/patient/Profile.jsx"
import PastTherapy from "./pages/patient/PastTherapy.jsx"
import CurrentPrescription from "./pages/patient/CurrentPrescription.jsx"
import Cart from "./pages/patient/Cart.jsx"
import UploadPrescription from "./pages/patient/UploadPrescription.jsx"

import PharmacistLayout from "./pages/pharmacist/layout/PharmacistLayout.jsx"
import Inventory from "./pages/pharmacist/Inventory.jsx"
import PrescriptionQueue from "./pages/pharmacist/PrescriptionQueue.jsx"
import Dashboard from "./pages/pharmacist/Dashboard.jsx"
import Orders from "./pages/pharmacist/Orders.jsx"

import AdminAuth from "./pages/admin/AdminAuth"
import AdminLayout from "./pages/admin/AdminLayout"
import AdminDashboard from "./pages/admin/AdminDashboard"

import DistributerLayout from "./pages/distributer/layout/DistributerLayout.jsx"

function App() {
  return (
    <Routes>

      {/* Landing */}
      <Route path="/" element={<Landing />} />

      {/* Login */}
      <Route path="/login/:role" element={<RoleLogin />} />
      <Route path="/login" element={<Login />} />

      {/* ================= PATIENT ================= */}
      <Route path="/patient" element={<PatientLayout />}>

        <Route path="dashboard" element={<PatientDashboard />} />
        <Route path="medicines" element={<Medicines />} />
        <Route path="therapy" element={<Therapy />} />
        <Route path="profile" element={<Profile />} />
        <Route path="current-prescription" element={<CurrentPrescription />} />
        <Route path="past-therapy" element={<PastTherapy />} />
        <Route path="cart" element={<Cart />} />
        <Route path="upload-prescription"element={<UploadPrescription />}/>

      </Route>

      {/* ================= PHARMACIST ================= */}
      <Route path="/pharmacist" element={<PharmacistLayout />}>

        <Route path="dashboard" element={<Dashboard />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="current-prescription" element={<PrescriptionQueue />} />
        <Route path="orders" element={<Orders />} />

      </Route>

      /* ADMIN ROUTES */
      <Route path="/admin" element={<AdminAuth />} />

      <Route path="/admin" element={<AdminLayout />}>
      <Route path="dashboard"element={<AdminDashboard />}/>
      </Route>

      {/* ================= DISTRIBUTOR ================= */}
      <Route path="/distributor" element={<DistributerLayout />}>

        {/* Add distributor child routes here */}

      </Route>

    </Routes>
  )
}

export default App