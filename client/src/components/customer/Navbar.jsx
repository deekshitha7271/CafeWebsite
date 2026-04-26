import React, { useEffect, useState } from 'react';
import { ShoppingBag, Crown, Navigation, Activity } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';

const Navbar = () => {
  const { cartCount, dispatch, state } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 50);
  });

  const activeOrderId = localStorage.getItem('lastOrderId');

  // We define dynamic navbar styles taking advantage of framer motion transition
  return (
    <motion.div 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled 
          ? 'bg-surface-dark/70 backdrop-blur-2xl border-b border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.8)] py-5' 
          : 'bg-transparent border-b border-transparent py-8'
      }`}
    >
      <div className="max-w-[1600px] mx-auto px-6 lg:px-12 flex items-center justify-between">
        
        {/* Brand / Logo */}
        <button onClick={() => navigate('/')} className="flex items-center gap-4 group">
          <motion.div 
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.5, ease: "anticipate" }}
            className={`p-3 rounded-2xl group-hover:bg-primary/30 transition-colors ${isScrolled ? 'bg-primary/20' : 'bg-surface-dark/50 border border-white/5 backdrop-blur-md'}`}
          >
            <Crown className="w-8 h-8 text-primary" />
          </motion.div>
          <div className="text-left">
            <h1 className="font-serif font-bold text-2xl leading-none text-white tracking-wide">Premium</h1>
            <span className="text-[10px] uppercase font-bold text-primary tracking-widest mt-1 block">Cafe System</span>
          </div>
        </button>
        
        {/* Right side links */}
        <div className="flex items-center gap-6">
          
          {/* Table ID Badge (New) */}
          {state.table && (
            <div className={`hidden lg:flex items-center gap-2 px-4 py-2.5 rounded-full border border-primary/20 bg-primary/5 text-primary`}>
               <Navigation className="w-3.5 h-3.5" />
               <span className="text-[10px] font-black tracking-widest uppercase">Table {state.table}</span>
            </div>
          )}

          {/* Dynamic Status Badge */}
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (activeOrderId) navigate(`/track/${activeOrderId}`);
            }} 
            disabled={!activeOrderId}
            className={`flex items-center gap-2 transition-all px-4 py-2.5 rounded-full border ${
              activeOrderId 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)] cursor-pointer' 
                : 'bg-surface-light border-white/5 text-text-muted opacity-50 cursor-not-allowed hidden md:flex'
            }`}
          >
            {activeOrderId ? (
              <>
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]"></span>
                </div>
                <span className="text-[10px] font-black tracking-widest uppercase hidden md:block">Active Order</span>
              </>
            ) : (
              <>
                <div className="h-3 w-3 rounded-full bg-text-muted/30"></div>
                <span className="text-[10px] font-black tracking-widest uppercase hidden md:block">No Order</span>
              </>
            )}
          </motion.button>
          
          {/* Premium Cart Button */}
          <motion.button 
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => dispatch({ type: 'TOGGLE_CART' })}
            className="flex items-center gap-3 bg-gradient-to-tr from-primary-dark to-primary hover:to-primary-light text-background px-7 py-3.5 rounded-full transition-all font-bold shadow-[0_10px_25px_-5px_rgba(245,158,11,0.5)] border border-primary-light/50"
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-3 -right-3 bg-white text-primary text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-lg"
                >
                  {cartCount}
                </motion.span>
              )}
            </div>
            <span className="text-xs font-black tracking-widest uppercase hidden sm:block ml-1">Cart</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default Navbar;
