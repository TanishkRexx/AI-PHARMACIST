import { Navigate, Outlet } from "react-router-dom"

export default function AdminLayout() {

  const isAuth =
    localStorage.getItem("adminAuth")

  if (!isAuth)
    return <Navigate to="/admin" />

  return <Outlet />
}