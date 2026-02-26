import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Landing
import LandingPage from './components/landing/LandingPage';

// Auth
import ProtectedRoute from './components/common/ProtectedRoute';

// Customer Pages
import CustomerLayout from './pages/customer/CustomerLayout';
import CustomerDashboard from './pages/customer/Dashboard';
import Medicines from './pages/customer/Medicines';
import MedicineDetails from './pages/customer/MedicineDetails';
import Cart from './pages/customer/Cart';
import Checkout from './pages/customer/Checkout';
import Orders from './pages/customer/Orders';
import OrderDetails from './pages/customer/OrderDetails';
import OrderTracking from './pages/customer/OrderTracking';
import AIChat from './pages/customer/AIChat';
import Recommendations from './pages/customer/Recommendations';
import CustomerProfile from './pages/customer/Profile';

// Pharmacy Pages
import PharmacyLayout from './pages/pharmacy/PharmacyLayout';
import PharmacyDashboard from './pages/pharmacy/Dashboard';
import Inventory from './pages/pharmacy/Inventory';
import AddMedicine from './pages/pharmacy/AddMedicine';
import PharmacyOrders from './pages/pharmacy/Orders';
import PharmacyOrderDetails from './pages/pharmacy/OrderDetails';
import Procurement from './pages/pharmacy/Procurement';
import CreateProcurement from './pages/pharmacy/CreateProcurement';
import Analytics from './pages/pharmacy/Analytics';
import AIForecasting from './pages/pharmacy/AIForecasting';

// Distributor Pages
import DistributorLayout from './pages/distributor/DistributorLayout';
import DistributorDashboard from './pages/distributor/Dashboard';
import DistributorOrders from './pages/distributor/Orders';
import DistributorOrderDetails from './pages/distributor/OrderDetails';
import DistributorAnalytics from './pages/distributor/Analytics';

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminUserDetails from './pages/admin/UserDetails';
import AdminAllOrders from './pages/admin/AllOrders';
import SystemInventory from './pages/admin/SystemInventory';
import SystemAnalytics from './pages/admin/SystemAnalytics';
import AIObservability from './pages/admin/AIObservability';

function App() {
  return (
    <>
      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
            borderRadius: '12px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      <Routes>
        {/* ==================== PUBLIC ROUTES ==================== */}
        <Route path="/" element={<LandingPage />} />

        {/* ==================== CUSTOMER ROUTES ==================== */}
        <Route
          path="/customer"
          element={
            <ProtectedRoute allowedRoles={['customer']}>
              <CustomerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<CustomerDashboard />} />
          <Route path="medicines" element={<Medicines />} />
          <Route path="medicines/:medicineId" element={<MedicineDetails />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:orderId" element={<OrderDetails />} />
          <Route path="orders/:orderId/track" element={<OrderTracking />} />
          <Route path="chat" element={<AIChat />} />
          <Route path="recommendations" element={<Recommendations />} />
          <Route path="profile" element={<CustomerProfile />} />
        </Route>

        {/* ==================== PHARMACY ROUTES ==================== */}
        <Route
          path="/pharmacy"
          element={
            <ProtectedRoute allowedRoles={['pharmacy']}>
              <PharmacyLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<PharmacyDashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="inventory/add" element={<AddMedicine />} />
          <Route path="orders" element={<PharmacyOrders />} />
          <Route path="orders/:orderId" element={<PharmacyOrderDetails />} />
          <Route path="procurement" element={<Procurement />} />
          <Route path="procurement/create" element={<CreateProcurement />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="ai-forecasting" element={<AIForecasting />} />
        </Route>

        {/* ==================== DISTRIBUTOR ROUTES ==================== */}
        <Route
          path="/distributor"
          element={
            <ProtectedRoute allowedRoles={['distributor']}>
              <DistributorLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DistributorDashboard />} />
          <Route path="orders" element={<DistributorOrders />} />
          <Route path="orders/:orderId" element={<DistributorOrderDetails />} />
          <Route path="analytics" element={<DistributorAnalytics />} />
        </Route>

        {/* ==================== ADMIN ROUTES ==================== */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="users/:userId" element={<AdminUserDetails />} />
          <Route path="orders" element={<AdminAllOrders />} />
          <Route path="inventory" element={<SystemInventory />} />
          <Route path="analytics" element={<SystemAnalytics />} />
          <Route path="ai-observability" element={<AIObservability />} />
        </Route>

        {/* ==================== CATCH ALL ==================== */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;