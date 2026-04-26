import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { SocketProvider } from './context/SocketContext';

// Pages - Customer
import MenuPage from './pages/customer/MenuPage';
import SuccessPage from './pages/customer/SuccessPage';
import TrackingPage from './pages/customer/TrackingPage';

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
        <CartProvider>
          <Routes>
            {/* Customer Routes */}
            <Route path="/" element={<MenuPage />} />
            <Route path="/checkout/success" element={<SuccessPage />} />
            <Route path="/track/:orderId" element={<TrackingPage />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="menu" element={<AdminMenu />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="qr" element={<AdminQR />} />
            </Route>
          </Routes>
        </CartProvider>
      </SocketProvider>
    </Router>
  );
}

export default App;
