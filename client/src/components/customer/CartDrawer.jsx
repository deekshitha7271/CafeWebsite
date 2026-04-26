import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { loadStripe } from '@stripe/stripe-js';
import axios from 'axios';
import { X, Minus, Plus, Loader2, Sparkles, Banknote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const CartDrawer = () => {
  const { state, dispatch, cartTotal } = useCart();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handlePlaceOrder = async () => {
    if (state.items.length === 0) return;
    
    if (!state.table) {
      alert("⚠️ Table Assignment Missing! Please scan a Table QR code to place an order.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/orders/cash`, {
        items: state.items.map(i => ({
          menuItemId: i._id,
          name: i.name,
          price: i.price,
          quantity: i.quantity
        })),
        table: state.table,
        total: cartTotal,
      });

      // Save order ID and navigate
      localStorage.setItem('lastOrderId', response.data._id);
      dispatch({ type: 'CLEAR_CART' });
      dispatch({ type: 'SET_CART_OPEN', payload: false });
      navigate(`/track/${response.data._id}`);
    } catch (error) {
      console.error('Order placement error:', error);
      alert("❌ Failed to place order. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {state.isCartOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={() => dispatch({ type: 'SET_CART_OPEN', payload: false })}
            className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 mix-blend-overlay"
          />
          
          <motion.div 
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200, mass: 0.8 }}
            className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto glass-panel rounded-t-[40px] z-[60] overflow-hidden flex flex-col max-h-[85vh] border-t border-white/20 border-x border-white/10"
          >
            {/* Ambient inner glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-primary/20 rounded-full blur-[60px] pointer-events-none"></div>

            <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 z-10 bg-surface-dark/40 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-serif font-bold text-white tracking-wide">Your Order</h2>
              </div>
              <motion.button 
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => dispatch({ type: 'SET_CART_OPEN', payload: false })}
                className="p-2 bg-surface border border-white/10 rounded-full text-text-muted hover:text-white transition-colors hover:bg-surface-light shadow-lg"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            <div className="p-4 md:p-6 overflow-y-auto flex-1 hide-scrollbar bg-gradient-to-b from-transparent to-surface-dark/50">
              {state.items.length === 0 ? (
                <div className="text-center text-text-muted py-20 flex flex-col items-center justify-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-surface border border-white/5 flex items-center justify-center">
                     <span className="opacity-50 text-2xl">🍽️</span>
                  </div>
                  <p className="font-serif text-lg tracking-wide">Your cart is empty.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence>
                    {state.items.map((item, index) => (
                      <motion.div 
                        key={item._id} 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20, scale: 0.9 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-4 bg-surface-light/40 backdrop-blur-md p-4 rounded-3xl border border-white/10 hover:border-primary/30 transition-colors shadow-lg"
                      >
                         {item.image ? (
                             <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-2xl shadow-inner border border-white/5" />
                         ) : (
                             <div className="w-16 h-16 rounded-2xl bg-surface-dark flex items-center justify-center border border-white/5">
                                 <span className="opacity-30 text-xs">IMG</span>
                             </div>
                         )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-serif font-bold text-base text-white truncate">{item.name}</h4>
                          <p className="text-primary font-black text-sm mt-0.5 tracking-wider">₹{(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                        
                        <div className="flex items-center gap-3 bg-surface-dark/80 px-2 py-1.5 rounded-full border border-white/5 shadow-inner">
                          <motion.button 
                            whileTap={{ scale: 0.8 }}
                            onClick={() => dispatch({ type: 'DECREMENT_ITEM', payload: item._id })}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-light text-text-muted transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </motion.button>
                          <span className="text-sm font-black w-4 text-center text-white">{item.quantity}</span>
                          <motion.button 
                            whileTap={{ scale: 0.8 }}
                            onClick={() => dispatch({ type: 'ADD_ITEM', payload: item })}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-light text-primary transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            <div className="p-6 bg-surface-dark/90 backdrop-blur-2xl border-t border-white/10 pb-10 shadow-[0_-20px_40px_rgba(0,0,0,0.5)]">
              <div className="flex justify-between items-end mb-6 text-sm">
                <div className="flex flex-col gap-1">
                   <span className="text-text-muted font-black tracking-widest uppercase text-xs">Total Amount</span>
                   {!state.table && (
                     <button 
                        onClick={() => dispatch({ type: 'SET_TABLE', payload: 1 })}
                        className="text-[9px] text-primary underline underline-offset-4 font-bold tracking-widest opacity-60 hover:opacity-100 transition-opacity"
                     >
                        Assign to Table 01 (Test)
                     </button>
                   )}
                </div>
                <span className="text-3xl font-black text-white drop-shadow-lg">₹{cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex flex-col gap-3">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePlaceOrder}
                  disabled={state.items.length === 0 || loading}
                  className="relative w-full group disabled:opacity-50 overflow-hidden"
                >
                  {/* Button Glow Background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-dark via-primary to-primary-light rounded-2xl blur-lg opacity-70 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  <div className="relative bg-gradient-to-r from-primary-dark to-primary text-background font-black py-4 rounded-2xl uppercase tracking-[0.15em] flex items-center justify-center gap-3 border border-primary-light/50 shadow-xl">
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin text-background" />
                    ) : (
                      <>
                        <span>Place Order Now</span>
                        <Sparkles className="w-4 h-4 opacity-70" />
                      </>
                    )}
                  </div>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;
