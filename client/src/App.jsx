import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { SocketProvider } from './context/SocketContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import GuestRoute from './components/auth/GuestRoute';
import ErrorBoundary from './components/ErrorBoundary';
import PageLoader from './components/PageLoader';

// ─── Lazy-loaded Customer Pages ──────────────────────────────────────────────
// Each import() call becomes a separate JS chunk. The browser only downloads
// a chunk when the user actually navigates to that route.
const MenuPage             = lazy(() => import('./pages/customer/MenuPage'));
const MenuItemDetailsPage  = lazy(() => import('./pages/customer/MenuItemDetailsPage'));
const SuccessPage          = lazy(() => import('./pages/customer/SuccessPage'));
const TrackingPage         = lazy(() => import('./pages/customer/TrackingPage'));
const OrderAgainPage       = lazy(() => import('./pages/customer/OrderAgainPage'));
const LoginPage            = lazy(() => import('./pages/customer/LoginPage'));
const RegisterPage         = lazy(() => import('./pages/customer/RegisterPage'));

// ─── Lazy-loaded Admin Pages (heavy — chart libs, tables, etc.) ───────────────
const AdminLayout          = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard       = lazy(() => import('./pages/admin/AdminDashboard'));
const KDSDashboard         = lazy(() => import('./pages/admin/KDSDashboard'));
const AdminMenu            = lazy(() => import('./pages/admin/AdminMenu'));
const AdminCustomers       = lazy(() => import('./pages/admin/AdminCustomers'));
const AdminInventory       = lazy(() => import('./pages/admin/AdminInventory'));
const AdminAnalytics       = lazy(() => import('./pages/admin/AdminAnalytics'));
const AdminStaff           = lazy(() => import('./pages/admin/AdminStaff'));
const AdminPayments        = lazy(() => import('./pages/admin/AdminPayments'));
const AdminOffers          = lazy(() => import('./pages/admin/AdminOffers'));
const AdminNotifications   = lazy(() => import('./pages/admin/AdminNotifications'));
const AdminCMS             = lazy(() => import('./pages/admin/AdminCMS'));
const AdminSettings        = lazy(() => import('./pages/admin/AdminSettings'));

function App() {
  return (
    // ErrorBoundary wraps everything — if any chunk fails to load or a component
    // throws, the user sees a clean "Something went wrong" screen instead of a
    // blank white page.
    <ErrorBoundary>
      <Router>
        <SocketProvider>
          <AuthProvider>
            <CartProvider>
              {/* Suspense provides the fallback UI while a lazy chunk is loading */}
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* ── Customer Routes ─────────────────────────────────── */}
                  <Route path="/"               element={<MenuPage />} />
                  <Route path="/menu/item/:id"  element={<MenuItemDetailsPage />} />

                  {/* ── Protected Customer Routes ────────────────────────── */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="/checkout/success"  element={<SuccessPage />} />
                    <Route path="/track"             element={<TrackingPage />} />
                    <Route path="/track/:orderId"    element={<TrackingPage />} />
                    <Route path="/repeat/:orderId"   element={<OrderAgainPage />} />
                  </Route>

                  {/* ── Guest-only Routes ────────────────────────────────── */}
                  <Route path="/login"    element={<GuestRoute><LoginPage /></GuestRoute>} />
                  <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

                  {/* ── Protected Admin / Worker Routes ──────────────────── */}
                  <Route element={<ProtectedRoute allowedRoles={['admin', 'worker']} />}>
                    <Route path="/admin" element={<AdminLayout />}>
                      <Route index          element={<AdminDashboard />} />
                      <Route path="orders"        element={<KDSDashboard />} />
                      <Route path="menu"          element={<AdminMenu />} />
                      <Route path="customers"     element={<AdminCustomers />} />
                      <Route path="inventory"     element={<AdminInventory />} />
                      <Route path="analytics"     element={<AdminAnalytics />} />
                      <Route path="staff"         element={<AdminStaff />} />
                      <Route path="payments"      element={<AdminPayments />} />
                      <Route path="offers"        element={<AdminOffers />} />
                      <Route path="notifications" element={<AdminNotifications />} />
                      <Route path="cms"           element={<AdminCMS />} />
                      <Route path="settings"      element={<AdminSettings />} />
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
