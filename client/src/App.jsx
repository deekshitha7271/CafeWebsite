import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { SocketProvider } from './context/SocketContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import GuestRoute from './components/auth/GuestRoute';
import ErrorBoundary from './components/ErrorBoundary';
import PageLoader from './components/PageLoader';
import { useLenis } from './hooks/useLenis';

// ─── Lazy-loaded Customer Pages ──────────────────────────────────────────────
const MenuPage = lazy(() => import('./pages/customer/MenuPage'));
const MenuItemDetailsPage = lazy(() => import('./pages/customer/MenuItemDetailsPage'));
const PaymentSuccessPage = lazy(() => import('./pages/customer/PaymentSuccessPage'));
const TrackingPage = lazy(() => import('./pages/customer/TrackingPage'));
const LoginPage = lazy(() => import('./pages/customer/LoginPage'));

// ─── Lazy-loaded Admin Pages ──────────────────────────────────────────────────
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const KDSDashboard = lazy(() => import('./pages/admin/KDSDashboard'));
const AdminMenu = lazy(() => import('./pages/admin/AdminMenu'));
const AdminCustomers = lazy(() => import('./pages/admin/AdminCustomers'));
const AdminInventory = lazy(() => import('./pages/admin/AdminInventory'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const AdminStaff = lazy(() => import('./pages/admin/AdminStaff'));
const AdminPayments = lazy(() => import('./pages/admin/AdminPayments'));
const AdminOffers = lazy(() => import('./pages/admin/AdminOffers'));
const AdminNotifications = lazy(() => import('./pages/admin/AdminNotifications'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const KitchenPrintPage = lazy(() => import('./pages/admin/KitchenPrintPage'));

function App() {
  useLenis(); // smooth scroll — non-blocking (replaces CDN script in index.html)
  return (
    <ErrorBoundary>
      <Router>
        <SocketProvider>
          <AuthProvider>
            <CartProvider>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* ── Public Customer Routes ───────────────────────────── */}
                  <Route path="/" element={<MenuPage />} />
                  <Route path="/menu/item/:id" element={<MenuItemDetailsPage />} />

                  {/* ── PUBLIC payment & tracking (no auth required) ─────── */}
                  {/* TrackingPage must be public so guests can land after Stripe */}
                  <Route path="/payment/success" element={<PaymentSuccessPage />} />
                  <Route path="/track" element={<TrackingPage />} />
                  <Route path="/track/:orderId" element={<TrackingPage />} />



                  {/* ── Staff Login Routes ─────────────────────────────────── */}
                  <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />

                  {/* ── Protected Admin / Worker Routes ───────────────────── */}
                  <Route element={<ProtectedRoute allowedRoles={['admin', 'worker']} />}>
                    {/* Kitchen Print Page — full-screen, outside AdminLayout */}
                    <Route path="/kitchen" element={<KitchenPrintPage />} />

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
                      <Route path="notifications" element={<AdminNotifications />} />
                      <Route path="settings" element={<AdminSettings />} />
                    </Route>
                  </Route>
                </Routes>
              </Suspense>
            </CartProvider>
          </AuthProvider>
        </SocketProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
