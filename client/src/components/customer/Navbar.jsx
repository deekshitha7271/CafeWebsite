import React, { useEffect, useState } from 'react';
import { ShoppingBag, Crown, Navigation, Activity, ChefHat, Package, LogOut, Phone } from 'lucide-react';
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
        ? 'bg-surface-dark/80 backdrop-blur-2xl border-b border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.8)] py-2 md:py-5'
        : 'bg-transparent border-b border-transparent py-4 md:py-8'
        }`}
    >
      <div className="max-w-[1600px] mx-auto px-3 md:px-6 lg:px-12 flex items-center justify-between gap-2 md:gap-4">
        {/* Hidden Staff Login Portal */}
        <div onClick={() => navigate('/login')} className="absolute top-0 left-0 w-12 h-12 z-[100] cursor-default opacity-0" />

        {/* Brand / Logo */}
        <button
          onClick={() => {
            if (location.pathname === '/') {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              navigate('/');
              setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
            }
          }}
          className="flex items-center gap-2 md:gap-4 group shrink-0"
          aria-label="Cá Phê Bistro Home"
        >
          <motion.div
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.5, ease: "anticipate" }}
            className={`p-1.5 md:p-3 rounded-xl md:rounded-2xl group-hover:bg-primary/30 transition-colors ${isScrolled ? 'bg-primary/20' : 'bg-surface-dark/50 border border-white/5 backdrop-blur-md'}`}
          >
            <Crown className="w-5 h-5 md:w-8 md:h-8 text-primary" />
          </motion.div>
          <div className="text-left hidden lg:block">
            <h1 className="font-serif font-bold text-2xl leading-none text-white tracking-wide">Cá Phê</h1>
            <span className="text-[10px] uppercase font-bold text-primary tracking-widest mt-1 block">Bistro</span>
          </div>
        </button>

        {/* Global Order Type Selector */}
        <div className="flex items-center bg-white/5 backdrop-blur-md rounded-full p-0.5 md:p-1 border border-white/10 shrink-0">
          <button
            onClick={() => handleOrderTypeChange('dinein-web')}
            aria-label="Select Dine In"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 md:px-6 md:py-2.5 rounded-full transition-all duration-500 ${state.orderType === 'dinein-web'
              ? 'bg-primary text-background shadow-lg shadow-primary/20'
              : 'text-text-muted hover:text-white'
              }`}
          >
            <ChefHat className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest block">Dine In</span>
          </button>

          <button
            onClick={() => handleOrderTypeChange('takeaway')}
            aria-label="Select Takeaway"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 md:px-6 md:py-2.5 rounded-full transition-all duration-500 ${state.orderType === 'takeaway'
              ? 'bg-primary text-background shadow-lg shadow-primary/20'
              : 'text-text-muted hover:text-white'
              }`}
          >
            <Package className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest block">Takeaway</span>
          </button>
        </div>

        {/* Right side links */}
        <div className="flex items-center gap-2 md:gap-6 shrink-0">

          {/* Dynamic Status Badge */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Track your active order"
            onClick={() => {
              if (activeOrderId) navigate(`/track/${activeOrderId}`);
            }}
            disabled={!activeOrderId}
            className={`flex items-center gap-2 transition-all px-2.5 py-1.5 md:px-4 md:py-2.5 rounded-full border ${activeOrderId
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)] cursor-pointer'
              : 'hidden'
              }`}
          >
            {activeOrderId && (
              <>
                <div className="relative flex h-2.5 w-2.5 md:h-3 md:w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 md:h-3 md:w-3 bg-emerald-500"></span>
                </div>
                <span className="text-[9px] font-black tracking-widest uppercase hidden sm:block">Live Order</span>
              </>
            )}
          </motion.button>

          {/* Cafe Info - Simplified for mobile to prevent overflow */}
          {state.settings && (
            <div className="hidden sm:flex flex-col items-end mr-2 text-white/80">
              <a
                href={`https://wa.me/${(state.settings.phone || '+91 79811 44753').replace(/\D/g, '')}?text=Hi%20C%C3%A1%20Ph%C3%AA%20Bistro`}
                target="_blank"
                rel="noreferrer"
                className="text-[9px] md:text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5 hover:text-primary transition-colors text-white/90"
              >
                <Phone className="w-3 h-3 md:w-3.5 md:h-3.5 text-primary" />
                <span className="">{state.settings.phone || '+91 79811 44753'}</span>
              </a>
              <span className="text-[8px] md:text-[9px] font-bold tracking-widest text-primary flex items-center gap-1">
                {state.settings.weekdayHours || '08:30 AM – 11:00 PM'}
              </span>
            </div>
          )}

          {/* Directions Button - Compact on mobile */}
          <a
            href="https://maps.google.com/?q=Ca+Phe+Bistro+Financial+District"
            target="_blank"
            rel="noreferrer"
            aria-label="Get directions to the bistro"
            className="flex items-center gap-1.5 md:gap-2 bg-primary text-background px-3 py-2 md:px-6 md:py-3.5 rounded-full font-black text-[9px] md:text-[10px] tracking-widest uppercase transition-all hover:scale-105 shadow-[0_5px_15px_rgba(245,158,11,0.3)] border border-primary-light/50"
          >
            <Navigation className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden lg:block">Directions</span>
          </a>

          {/* Premium Cart Button */}
          {state.isOrderingActive && (
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              aria-label={`Open shopping cart (${cartCount} items)`}
              onClick={() => dispatch({ type: 'TOGGLE_CART' })}
              className="flex items-center gap-2 md:gap-3 bg-gradient-to-tr from-primary-dark to-primary hover:to-primary-light text-background px-3 py-2 md:px-7 md:py-3.5 rounded-full transition-all shadow-[0_10px_25px_-5px_rgba(245,158,11,0.5)] border border-primary-light/50"
            >
              <div className="relative">
                <ShoppingBag className="w-4 h-4 md:w-5 md:h-5" />
                {cartCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 md:-top-3 md:-right-3 bg-white text-primary text-[8px] md:text-[10px] font-black w-3.5 h-3.5 md:w-5 md:h-5 flex items-center justify-center rounded-full shadow-lg"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </div>
              <span className="text-[10px] font-black tracking-widest uppercase hidden md:block ml-1">Cart</span>
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Navbar;
