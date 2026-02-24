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
// import MedicineDetails from './pages/customer/MedicineDetails';
import Cart from './pages/customer/Cart';
import Checkout from './pages/customer/Checkout';
import Orders from './pages/customer/Orders';
import OrderDetails from './pages/customer/OrderDetails';
import OrderTracking from './pages/customer/OrderTracking';
import AIChat from './pages/customer/AIChat';
import Recommendations from './pages/customer/Recommendations';
import CustomerProfile from './pages/customer/Profile';

// Pharmacy Pages (Placeholder for now)
import PharmacyLayout from './pages/pharmacy/PharmacyLayout';
import PharmacyDashboard from './pages/pharmacy/Dashboard';
import Inventory from './pages/pharmacy/Inventory';
import PharmacyOrders from './pages/pharmacy/Orders';
import Analytics from './pages/pharmacy/Analytics';
import Procurement from './pages/pharmacy/Procurement';
import AddMedicine from './pages/pharmacy/AddMedicine';
import AIForecasting from './pages/pharmacy/AIForecasting';

// Distributor Pages (Placeholder)
import DistributorLayout from './pages/distributor/DistributorLayout';
import DistributorDashboard from './pages/distributor/Dashboard';
import DistributorOrders from './pages/distributor/Orders';
import DistributorAnalytics from './pages/distributor/Analytics';
import DistributorOrderDetails from './pages/distributor/OrderDetails';

// Admin Pages (Placeholder)
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
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
        {/* Public Route */}
        <Route path="/" element={<LandingPage />} />

        {/* Customer Routes */}
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
          {/* <Route path="medicines/:medicineId" element={<MedicineDetails />} /> */}
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:orderId" element={<OrderDetails />} />
          <Route path="orders/:orderId/track" element={<OrderTracking />} />
          <Route path="chat" element={<AIChat />} />
          <Route path="recommendations" element={<Recommendations />} />
          <Route path="profile" element={<CustomerProfile />} />
        </Route>

        {/* Pharmacy Routes */}
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
          <Route path="orders" element={<PharmacyOrders />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="procurement" element={<Procurement />} />
          <Route path="add-medicine" element={<AddMedicine />} />
          <Route path="ai-forecasting" element={<AIForecasting />} />
        </Route>

        {/* Distributor Routes */}
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
          <Route path="analytics" element={<DistributorAnalytics />} />
          <Route path="orders/:orderId" element={<DistributorOrderDetails />} />
        </Route>

        {/* Admin Routes */}
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
          <Route path="ai-observability" element={<AIObservability />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;