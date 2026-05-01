import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { SocketProvider } from './context/SocketContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Pages - Customer
import MenuPage from './pages/customer/MenuPage';
import MenuItemDetailsPage from './pages/customer/MenuItemDetailsPage';
import SuccessPage from './pages/customer/SuccessPage';
import TrackingPage from './pages/customer/TrackingPage';
import OrderAgainPage from './pages/customer/OrderAgainPage';
import LoginPage from './pages/customer/LoginPage';
import RegisterPage from './pages/customer/RegisterPage';

// Pages - Admin
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminMenu from './pages/admin/AdminMenu';
import AdminOrders from './pages/admin/AdminOrders';
import AdminQR from './pages/admin/AdminQR';

function App() {
  return (
    <Router>
      <SocketProvider>
        <AuthProvider>
          <CartProvider>
            <Routes>
              {/* Customer Routes */}
              <Route path="/" element={<MenuPage />} />
              <Route path="/menu/item/:id" element={<MenuItemDetailsPage />} />
              <Route path="/checkout/success" element={<SuccessPage />} />
              <Route path="/track/:orderId" element={<TrackingPage />} />
              <Route path="/repeat/:orderId" element={<OrderAgainPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected Admin/Worker Routes */}
              <Route element={<ProtectedRoute allowedRoles={['admin', 'worker']} />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="menu" element={<AdminMenu />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="qr" element={<AdminQR />} />
                </Route>
              </Route>
            </Routes>
          </CartProvider>
        </AuthProvider>
      </SocketProvider>
    </Router>
  );
}

export default App;
