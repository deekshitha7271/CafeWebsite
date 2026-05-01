import { Outlet, NavLink, Navigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Menu as MenuIcon, ClipboardList, Crown, QrCode, LogOut, User as UserIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === 'admin';

  const allLinks = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true, roles: ['admin'] },
    { to: '/admin/orders', icon: ClipboardList, label: 'Live Orders', roles: ['admin', 'worker'] },
    { to: '/admin/menu', icon: MenuIcon, label: 'Menu Control', roles: ['admin'] },
    { to: '/admin/qr', icon: QrCode, label: 'QR Studio', roles: ['admin'] },
  ];

  const allowedLinks = allLinks.filter(link => link.roles.includes(user?.role));

  // If a worker tries to access /admin (dashboard) directly, redirect to /admin/orders
  if (user?.role === 'worker' && location.pathname === '/admin') {
    return <Navigate to="/admin/orders" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row text-text font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-80 bg-surface border-r border-white/5 order-2 md:order-1 fixed bottom-0 md:sticky md:top-0 md:h-screen z-20 shadow-2xl flex flex-col">
        <div className="p-8 hidden md:block border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
          <div className="flex items-center gap-4">
            <div className="bg-primary/20 p-2.5 rounded-2xl border border-primary/30 shadow-lg shadow-primary/10">
              <Crown className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-white tracking-wide">
                {isAdmin ? 'Admin Portal' : 'Worker Portal'}
              </h1>
              <p className="text-primary text-[9px] uppercase font-black tracking-[0.2em] mt-1 opacity-80">
                {isAdmin ? 'Core Systems' : 'Operation Lead'}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex md:flex-col p-4 md:p-6 gap-3 overflow-x-auto flex-1">
          {allowedLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `flex items-center gap-4 px-5 py-4 rounded-xl transition-all group relative ${isActive
                    ? 'bg-primary text-background shadow-[0_10px_25px_rgba(245,158,11,0.3)]'
                    : 'text-text-muted hover:bg-white/5 hover:text-white border border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-background' : 'text-primary/70'}`} />
                    <span className={`hidden md:inline font-bold tracking-wide ${isActive ? 'text-background' : 'text-text-muted'}`}>
                      {link.label}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="active-pill"
                        className="absolute right-3 w-1.5 h-1.5 rounded-full bg-background"
                      />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile / Logout Section */}
        <div className="p-6 mt-auto border-t border-white/5 hidden md:block">
          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-surface-light flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate uppercase tracking-wider">{user?.name}</p>
                <p className="text-[10px] text-text-muted capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 hover:bg-red-500/10 rounded-lg text-text-muted hover:text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24 md:pb-0 order-1 md:order-2">
        <div className="md:hidden bg-surface p-6 border-b border-white/5 flex items-center justify-between shadow-xl relative z-10">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-serif font-bold text-white">
              {isAdmin ? 'Admin Portal' : 'Worker Portal'}
            </h1>
          </div>
          <button onClick={logout} className="p-2 text-text-muted">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 md:p-12 lg:p-16 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
