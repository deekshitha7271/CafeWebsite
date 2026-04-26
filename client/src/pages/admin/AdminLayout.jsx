import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Menu as MenuIcon, ClipboardList, Crown, QrCode } from 'lucide-react';

const AdminLayout = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row text-text font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-surface border-r border-white/5 order-2 md:order-1 fixed bottom-0 md:sticky md:top-0 md:h-screen z-20 shadow-2xl flex flex-col">
        <div className="p-8 hidden md:block border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-xl">
              <Crown className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-white tracking-wide">Admin Portal</h1>
              <p className="text-primary text-[10px] uppercase font-bold tracking-widest mt-1">Cafe Management</p>
            </div>
          </div>
        </div>
        
        <nav className="flex md:flex-col p-4 md:p-6 gap-3 overflow-x-auto">
          {[
            { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
            { to: '/admin/orders', icon: ClipboardList, label: 'Live Orders' },
            { to: '/admin/menu', icon: MenuIcon, label: 'Menu Control' },
            { to: '/admin/qr', icon: QrCode, label: 'QR Studio' },
          ].map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => 
                  `flex items-center gap-4 px-5 py-4 rounded-xl transition-all font-medium ${
                    isActive 
                      ? 'bg-primary text-background shadow-[0_0_20px_rgba(245,158,11,0.3)]' 
                      : 'text-text-muted hover:bg-surface-light hover:text-white border border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-5 h-5 ${isActive ? 'text-background' : 'text-primary/70'}`} />
                    <span className={`hidden md:inline font-bold tracking-wide ${isActive ? 'text-background' : 'text-text-muted'}`}>
                      {link.label}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24 md:pb-0 order-1 md:order-2">
        <div className="md:hidden bg-surface p-6 border-b border-white/5 flex items-center justify-center gap-2 shadow-xl relative z-10">
          <Crown className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-serif font-bold text-white">Admin Portal</h1>
        </div>
        <div className="p-6 md:p-12 lg:p-16 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
