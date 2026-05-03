import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { SocketProvider } from './context/SocketContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import GuestRoute from './components/auth/GuestRoute';

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
import KDSDashboard from './pages/admin/KDSDashboard';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminInventory from './pages/admin/AdminInventory';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminStaff from './pages/admin/AdminStaff';
import AdminPayments from './pages/admin/AdminPayments';
import AdminOffers from './pages/admin/AdminOffers';
import AdminReviews from './pages/admin/AdminReviews';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminCMS from './pages/admin/AdminCMS';
import AdminSettings from './pages/admin/AdminSettings';
import AdminMenu from './pages/admin/AdminMenu';
import AdminActivity from './pages/admin/AdminActivity';

import { useEffect } from 'react';

function App() {
  useEffect(() => {
    const unlockAudio = () => {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      // Once unlocked, remove the listener
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  return (
    <Router>
      <SocketProvider>
        <AuthProvider>
          <CartProvider>
            <Routes>
              {/* Customer Routes */}
              <Route path="/" element={<MenuPage />} />
              <Route path="/menu/item/:id" element={<MenuItemDetailsPage />} />

              {/* Protected Customer Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/checkout/success" element={<SuccessPage />} />
                <Route path="/track/:orderId" element={<TrackingPage />} />
                <Route path="/repeat/:orderId" element={<OrderAgainPage />} />
              </Route>

              {/* Guest Only Routes */}
              <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
              <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

              {/* Protected Admin/Worker Routes */}
              <Route element={<ProtectedRoute allowedRoles={['admin', 'worker']} />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="orders" element={<KDSDashboard />} />
                  <Route path="menu" element={<AdminMenu />} />
                  <Route path="customers" element={<AdminCustomers />} />
                  <Route path="inventory" element={<AdminInventory />} />
                  <Route path="analytics" element={<AdminAnalytics />} />
                  <Route path="staff" element={<AdminStaff />} />
                  <Route path="payments" element={<AdminPayments />} />
                  <Route path="offers" element={<AdminOffers />} />
                  <Route path="reviews" element={<AdminReviews />} />
                  <Route path="notifications" element={<AdminNotifications />} />
                  <Route path="cms" element={<AdminCMS />} />
                  <Route path="settings" element={<AdminSettings />} />
                  <Route path="activity" element={<AdminActivity />} />
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
