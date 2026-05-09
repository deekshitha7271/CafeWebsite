import React, { useEffect, useState } from 'react';
import { ShoppingBag, Crown, Navigation, Activity, ChefHat, Package, LogOut } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';

const Navbar = () => {
  const { cartCount, dispatch, state } = useCart();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 50);
  });

  const activeOrderId = (state.activeOrders && state.activeOrders.length > 0) ? state.activeOrders[0] : null;

  const handleOrderTypeChange = (type) => {
    dispatch({ type: 'SET_ORDER_TYPE', payload: type });
  };

  return (
    <motion.div
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled
        ? 'bg-surface-dark/70 backdrop-blur-2xl border-b border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.8)] py-3 md:py-5'
        : 'bg-transparent border-b border-transparent py-4 md:py-8'
        }`}
    >
      <div className="max-w-[1600px] mx-auto px-3 md:px-6 lg:px-12 flex items-center justify-between gap-2 md:gap-4">
        {/* Hidden Staff Login Portal */}
        <div onClick={() => navigate('/login')} className="absolute top-0 left-0 w-12 h-12 z-[100] cursor-default opacity-0" />

        {/* Brand / Logo */}
        <button onClick={() => navigate('/')} className="flex items-center gap-2 md:gap-4 group shrink-0">
          <motion.div
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.5, ease: "anticipate" }}
            className={`p-2 md:p-3 rounded-xl md:rounded-2xl group-hover:bg-primary/30 transition-colors ${isScrolled ? 'bg-primary/20' : 'bg-surface-dark/50 border border-white/5 backdrop-blur-md'}`}
          >
            <Crown className="w-6 h-6 md:w-8 md:h-8 text-primary" />
          </motion.div>
          <div className="text-left hidden lg:block">
            <h1 className="font-serif font-bold text-2xl leading-none text-white tracking-wide">Ca Phe</h1>
            <span className="text-[10px] uppercase font-bold text-primary tracking-widest mt-1 block">Bistro</span>
          </div>
        </button>

        {/* Global Order Type Selector */}
        <div className="flex items-center bg-white/5 backdrop-blur-md rounded-full p-1 border border-white/10 shrink-1 hidden sm:flex">
          <button
            onClick={() => handleOrderTypeChange('dinein-web')}
            className={`flex items-center gap-2 px-3 py-2 md:px-6 md:py-2.5 rounded-full transition-all duration-500 ${state.orderType === 'dinein-web'
              ? 'bg-primary text-background shadow-lg md:scale-105'
              : 'text-text-muted hover:text-white'
              }`}
          >
            <ChefHat className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">Dine In</span>
          </button>

          <button
            onClick={() => handleOrderTypeChange('takeaway')}
            className={`flex items-center gap-2 px-3 py-2 md:px-6 md:py-2.5 rounded-full transition-all duration-500 ${state.orderType === 'takeaway'
              ? 'bg-primary text-background shadow-lg md:scale-105'
              : 'text-text-muted hover:text-white'
              }`}
          >
            <Package className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">Takeaway</span>
          </button>
        </div>

        {/* Right side links */}
        <div className="flex items-center gap-2 md:gap-6 shrink-0">

          {/* Dynamic Status Badge */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (activeOrderId) navigate(`/track/${activeOrderId}`);
            }}
            disabled={!activeOrderId}
            className={`flex items-center gap-2 transition-all px-3 py-2 md:px-4 md:py-2.5 rounded-full border ${activeOrderId
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)] cursor-pointer'
              : 'hidden'
              }`}
          >
            {activeOrderId ? (
              <>
                <div className="relative flex h-2.5 w-2.5 md:h-3 md:w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 md:h-3 md:w-3 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]"></span>
                </div>
                <span className="text-[9px] md:text-[10px] font-black tracking-widest uppercase hidden md:block">Active Order</span>
              </>
            ) : (
              <>
                <div className="h-3 w-3 rounded-full bg-text-muted/30"></div>
                <span className="text-[10px] font-black tracking-widest uppercase hidden md:block">No Order</span>
              </>
            )}
          </motion.button>

          {user && (user.role === 'admin' || user.role === 'worker') && (
            <div className="flex items-center gap-1.5 md:gap-3 px-2 py-1.5 md:px-4 md:py-2.5 rounded-full border border-white/10 bg-white/5 text-white">
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center gap-1 md:gap-2 text-[9px] md:text-[10px] uppercase tracking-[0.3em] font-black text-primary hover:text-primary-light border-r border-white/10 pr-1.5 md:pr-3 mr-0.5 md:mr-1"
              >
                <Activity className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Portal</span>
              </button>
              <span className="text-[9px] md:text-[10px] uppercase tracking-[0.3em] font-black max-w-[50px] md:max-w-none truncate">{user.name}</span>
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="text-[9px] md:text-[10px] uppercase tracking-[0.3em] font-black text-white/40 hover:text-white border-l border-white/10 pl-1.5 md:pl-3 flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5 md:hidden" />
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          )}

          {/* Cafe Info Injection */}
          {state.settings && (
            <div className="hidden lg:flex flex-col items-end mr-2 text-white/80">
              <span className="text-[10px] font-black tracking-widest uppercase flex items-center gap-1">
                {state.settings.phone || '+91 123 456 7890'}
              </span>
              <span className="text-[9px] font-bold tracking-widest text-primary flex items-center gap-1">
                {state.settings.weekdayHours || '08:30 AM – 11:00 PM'}
                {!state.isOrderingActive && <span className="text-red-500 ml-1">(Closed)</span>}
              </span>
            </div>
          )}

          {/* Premium Cart Button */}
          {state.isOrderingActive && (
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => dispatch({ type: 'TOGGLE_CART' })}
            className="flex items-center gap-2 md:gap-3 bg-gradient-to-tr from-primary-dark to-primary hover:to-primary-light text-background px-3 py-2 md:px-7 md:py-3.5 rounded-full transition-all font-bold shadow-[0_10px_25px_-5px_rgba(245,158,11,0.5)] border border-primary-light/50"
          >
            <div className="relative">
              <ShoppingBag className="w-4 h-4 md:w-5 md:h-5" />
              {cartCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 md:-top-3 md:-right-3 bg-white text-primary text-[9px] md:text-[10px] font-black w-4 h-4 md:w-5 md:h-5 flex items-center justify-center rounded-full shadow-lg"
                >
                  {cartCount}
                </motion.span>
              )}
            </div>
            <span className="text-xs font-black tracking-widest uppercase hidden sm:block ml-1">Cart</span>
          </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Navbar;
