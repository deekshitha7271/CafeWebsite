import { Outlet, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Users, Package, BarChart3,
  UserCog, CreditCard, Tag, Star, Bell, Globe, Settings,
  Crown, LogOut, User as UserIcon, Activity, ChevronDown, X, Menu, Coffee
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const allLinks = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin'], end: true },
  { to: '/admin/orders', icon: ClipboardList, label: 'Live Orders', roles: ['admin', 'worker'] },

  { to: '/admin/menu', icon: Coffee, label: 'Menu Management', roles: ['admin'] },
  { to: '/admin/customers', icon: Users, label: 'Customers', roles: ['admin'] },
  { to: '/admin/inventory', icon: Package, label: 'Inventory', roles: ['admin'] },
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics & Reports', roles: ['admin'] },
  { to: '/admin/staff', icon: UserCog, label: 'Staff Management', roles: ['admin'] },
  { to: '/admin/payments', icon: CreditCard, label: 'Payments & Billing', roles: ['admin'] },
  { to: '/admin/offers', icon: Tag, label: 'Offers & Coupons', roles: ['admin'] },
  { to: '/admin/notifications', icon: Bell, label: 'Notifications', roles: ['admin'] },
  { to: '/admin/settings', icon: Settings, label: 'Settings', roles: ['admin'] },
];

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (isAdmin) {
      const fetchNotifications = async () => {
        try {
          const res = await axios.get(`${import.meta.env.VITE_API_URL}/admin/notifications`, { withCredentials: true });
          const unread = res.data.filter(n => !n.read).length;
          setUnreadNotifications(unread);
        } catch (error) {
          console.error("Failed to fetch notifications", error);
        }
      };

      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  const allowedLinks = allLinks.filter(link => link.roles.includes(user?.role)).map(link => {
    if (link.label === 'Notifications' && unreadNotifications > 0) {
      return { ...link, badge: unreadNotifications };
    }
    return link;
  });

  if (user?.role === 'worker' && location.pathname === '/admin') {
    return <Navigate to="/admin/orders" replace />;
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-primary/20 p-2.5 rounded-2xl border border-primary/30 shadow-lg shadow-primary/10 flex-shrink-0">
            <Crown className="w-6 h-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-serif font-bold text-white truncate">
              {isAdmin ? 'Admin' : 'Worker'}
              <span className="ml-2 text-[9px] text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 font-sans">Portal</span>
            </h1>
            <p className="text-[9px] text-primary/70 uppercase font-black tracking-widest">Cá Phê Bistro</p>
          </div>
        </div>

        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/50 hover:bg-primary hover:text-background hover:border-primary transition-all duration-300 group"
        >
          <Activity className="w-3.5 h-3.5 text-primary group-hover:text-background transition-colors" />
          Exit to Home
        </button>
      </div>

      {/* Nav Links */}
      <nav data-lenis-prevent="true" className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent min-h-0">
        {allowedLinks.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setMobileSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all group relative ${isActive
                  ? 'bg-primary text-background shadow-lg shadow-primary/20'
                  : 'text-white/50 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-background' : 'text-primary/60'}`} />
                  <span className={`text-[11px] font-bold tracking-wide truncate ${isActive ? 'text-background' : ''}`}>
                    {link.label}
                  </span>
                  {link.badge && !isActive && (
                    <span className="ml-auto bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {link.badge}
                    </span>
                  )}
                  {isActive && (
                    <motion.div layoutId="active-pill" className="absolute right-3 w-1.5 h-1.5 rounded-full bg-background" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 pb-8 border-t border-white/5">
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <UserIcon className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.name}</p>
              <p className="text-[9px] text-primary/60 uppercase font-black tracking-widest mt-0.5">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 hover:bg-red-500/10 rounded-lg text-white/30 hover:text-red-400 transition-colors flex-shrink-0"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`${location.pathname.includes('/kds') ? 'h-screen overflow-hidden' : 'min-h-screen'} bg-background flex text-text font-sans selection:bg-primary/20`}>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-surface border-r border-white/5 fixed top-0 bottom-0 left-0 z-20 shadow-2xl overflow-hidden">
        <SidebarContent />
      </aside>

      {/* COMPENSATE FOR FIXED SIDEBAR ON DESKTOP */}
      <div className="hidden md:block w-72 shrink-0" />

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-40 md:hidden"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30 }}
              className="fixed top-0 left-0 w-72 h-full bg-surface border-r border-white/5 z-50 md:hidden shadow-2xl"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col overflow-x-hidden">
        {/* Mobile Topbar */}
        <div className="md:hidden bg-surface/90 backdrop-blur border-b border-white/5 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shrink-0">
          <button onClick={() => setMobileSidebarOpen(true)} className="p-2 text-white/60 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-primary" />
            <span className="text-sm font-serif font-bold text-white">Cá Phê Bistro</span>
          </div>
          <button onClick={logout} className="p-2 text-white/40 hover:text-red-400">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* KDS gets full height; every other page gets the padded container */}
        {location.pathname.includes('/kds') ? (
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col px-4 md:px-6 lg:px-8">
            <Outlet />
          </div>
        ) : (
          <div className="p-4 md:p-8 lg:p-10 max-w-[1600px] mx-auto w-full">
            <Outlet />
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminLayout;
