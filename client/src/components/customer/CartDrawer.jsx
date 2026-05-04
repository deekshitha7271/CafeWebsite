import { useEffect, useState } from 'react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { X, Minus, Plus, Loader2, Sparkles, Activity, Clock, Receipt, History, ShoppingBag, Check, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { playOrderSuccessSound } from '../../lib/utils';

const CartDrawer = () => {
  const { state, dispatch, cartTotal, sessionStats, discount, rawCartTotal } = useCart();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [arrivalTime, setArrivalTime] = useState(state.arrivalTime || '');
  const navigate = useNavigate();

  const isAlreadyOrdered = (itemId) => {
    return state.sessionOrders?.some(order => 
      order.items.some(i => i.menuItemId === itemId || i._id === itemId)
    );
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/coupons/validate`, { code: couponCode });
      dispatch({ type: 'APPLY_COUPON', payload: res.data });
      setCouponCode('');
    } catch (err) {
      setCouponError(err.response?.data?.error || 'Invalid coupon code');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (state.items.length === 0) return;

    if (!user) {
      navigate('/login', { state: { from: { pathname: window.location.pathname, search: window.location.search } } });
      dispatch({ type: 'SET_CART_OPEN', payload: false });
      return;
    }

    setLoading(true);
    try {
      let arrivalDate;
      if (arrivalTime) {
        arrivalDate = new Date(Date.now() + parseInt(arrivalTime, 10) * 60000).toISOString();
      }

        const res = await axios.post(`${import.meta.env.VITE_API_URL}/payment/checkout`, {
        items: state.items,
        total: cartTotal,
        orderType: state.orderType,
        customerName: user?.name || '',
        customerPhone: '',
        arrivalTime: arrivalDate,
        couponCode: state.coupon?.code,
      });
      window.location.href = res.data.url;
    } catch (error) {
      console.error('Checkout error:', error);
      const errorMsg = error.response?.data?.details || error.response?.data?.error || error.message;
      alert(`❌ Checkout failed: ${errorMsg}`);
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
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-surface-dark/95 backdrop-blur-2xl z-[60] shadow-2xl flex flex-col border-l border-white/10"
          >
            {/* Header */}
            <div className="p-6 md:p-8 flex items-center justify-between border-b border-white/5 bg-surface-dark/50 backdrop-blur-md sticky top-0 z-20">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-serif font-black text-white tracking-tight">Visit Bag</h2>
                  <p className="text-[10px] text-primary font-black uppercase tracking-widest">{sessionStats.itemsCount} items total</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => dispatch({ type: 'SET_CART_OPEN', payload: false })}
                className="w-10 h-10 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-text-muted hover:text-white transition-all shadow-lg"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>            {/* Scrollable Content */}
            <div 
              className="flex-1 overflow-y-auto px-6 py-4 space-y-10 custom-scrollbar relative"
              data-lenis-prevent
            >
              
              {/* Journey Summary Dashboard */}
              <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-[32px] p-6 relative overflow-hidden group mt-4">
                <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Activity className="w-32 h-32 text-primary" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-6">
                    <Activity className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/80">Visit Journey Summary</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Ordered</p>
                      <p className="text-2xl font-serif font-black text-white">{sessionStats.itemsCount} <span className="text-xs text-text-muted">Items</span></p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Amount Paid</p>
                      <p className="text-2xl font-serif font-black text-emerald-400">₹{sessionStats.paidAmount.toFixed(0)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Pending</p>
                      <p className={`text-2xl font-serif font-black ${discount > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>₹{sessionStats.pendingAmount.toFixed(0)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Total Visit</p>
                      <p className={`text-2xl font-serif font-black ${discount > 0 ? 'text-emerald-400' : 'text-primary'}`}>₹{sessionStats.totalSpend.toFixed(0)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Selection Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between sticky top-[-16px] bg-surface-dark/95 backdrop-blur-md py-4 z-10 -mx-6 px-6 border-b border-white/5 shadow-xl shadow-black/20">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></div>
                    Active Selection
                  </h3>
                  <span className="text-[10px] font-bold text-text-muted bg-white/5 px-3 py-1 rounded-full">{state.items.length} items</span>
                </div>

                {state.items.length === 0 ? (
                  <div className="py-12 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center gap-4 text-center px-6">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-text-muted/30" />
                    </div>
                    <p className="text-sm font-serif italic text-text-muted opacity-50">Empty selection.<br/>Pick something delicious!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {state.items.map((item) => (
                      <motion.div
                        layout
                        key={item._id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="group bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-primary/20 p-4 rounded-3xl transition-all duration-300 relative"
                      >
                        {isAlreadyOrdered(item._id) && (
                          <div className="absolute -top-2 -right-2 bg-primary text-background text-[8px] font-black px-3 py-1 rounded-full shadow-lg border border-primary-light/50">
                            RE-ORDERING 👀
                          </div>
                        )}
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex-shrink-0 bg-surface">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center opacity-20 text-[10px]">IMG</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm md:text-base font-serif font-black text-white truncate">{item.name}</h4>
                            <p className="text-primary font-black text-xs mt-1 tracking-wider">₹{item.price.toFixed(2)}</p>
                          </div>
                          <div className="flex items-center gap-3 bg-black/40 px-3 py-1.5 rounded-2xl border border-white/5 shadow-inner">
                            <button onClick={() => dispatch({ type: 'DECREMENT_ITEM', payload: item._id })} className="text-text-muted hover:text-white transition-colors"><Minus size={14} /></button>
                            <span className="text-xs font-black text-white w-4 text-center">{item.quantity}</span>
                            <button onClick={() => dispatch({ type: 'ADD_ITEM', payload: item })} className="text-primary hover:text-primary-light transition-colors"><Plus size={14} /></button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Promo Section - MOVED UP for prominence */}
              {state.items.length > 0 && (
                <div className="space-y-4 pt-4">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-2">
                    <Sparkles size={14} /> Offers & Coupons
                  </h3>
                  {state.coupon ? (
                    <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-[24px] shadow-lg shadow-emerald-900/10">
                      <div className="flex items-center gap-3">
                        <div className="bg-emerald-500 text-background p-1.5 rounded-lg">
                          <Check size={14} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-white">{state.coupon.code}</p>
                          <p className="text-[9px] text-emerald-400 uppercase font-bold tracking-wider">{state.coupon.description}</p>
                        </div>
                      </div>
                      <button onClick={() => dispatch({ type: 'REMOVE_COUPON' })} className="p-2 hover:bg-white/5 rounded-full text-text-muted hover:text-white transition-all">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="ENTER PROMO CODE"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        onKeyPress={(e) => e.key === 'Enter' && handleApplyCoupon()}
                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-[10px] font-black tracking-widest text-white focus:border-primary outline-none transition-all placeholder:text-text-muted/30"
                      />
                      <button 
                        onClick={handleApplyCoupon} 
                        disabled={couponLoading || !couponCode.trim()} 
                        className="px-6 py-4 bg-surface-light border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:border-primary hover:bg-primary/10 transition-all disabled:opacity-30"
                      >
                        {couponLoading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Apply'}
                      </button>
                    </div>
                  )}
                  {couponError && <p className="text-[10px] text-red-400 font-bold ml-2 flex items-center gap-1"><X size={10} /> {couponError}</p>}
                </div>
              )}

              {/* Arrival Time */}
              {state.items.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-white/5">
                   <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-2">
                    <Clock size={14} /> Planned Arrival
                  </h3>
                  <div className="relative group">
                    <input
                      type="number"
                      placeholder="ESTIMATED MINUTES"
                      value={arrivalTime}
                      onChange={(e) => { setArrivalTime(e.target.value); dispatch({ type: 'SET_ARRIVAL_TIME', payload: e.target.value }); }}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-[10px] font-black tracking-widest text-white focus:border-primary outline-none transition-all placeholder:text-text-muted/30"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-bold text-text-muted/40">MINS</div>
                  </div>
                </div>
              )}

              {/* Order History Section */}
              <div className="space-y-6 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between sticky top-[-16px] bg-surface-dark/95 backdrop-blur-md py-4 z-10 -mx-6 px-6 border-b border-white/5">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-2">
                    <History className="w-3.5 h-3.5" />
                    Visit History
                  </h3>
                  {user && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">₹{sessionStats.paidAmount.toFixed(0)} Paid</span>
                  )}
                </div>

                {!user ? (
                  <div className="bg-white/5 border border-white/10 p-8 rounded-[32px] text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                      <Lock className="w-5 h-5 text-text-muted/30" />
                    </div>
                    <p className="text-xs text-text-muted font-serif italic">Sign in to track your complete spending journey and order history.</p>
                    <button onClick={() => navigate('/login')} className="w-full py-4 bg-primary text-background text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-primary-light transition-all shadow-xl shadow-primary/20">
                      Sign In Now
                    </button>
                  </div>
                ) : state.sessionOrders.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-[32px] opacity-30">
                    <Receipt className="w-8 h-8 mx-auto mb-3" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Your history starts here</p>
                  </div>
                ) : (
                  <div className="space-y-8 pb-10">
                    {state.sessionOrders.map((order, idx) => (
                      <div key={order._id} className="relative pl-6 border-l-2 border-white/10 group pb-4">
                        <div className="absolute top-0 left-[-6px] w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] border-2 border-surface-dark"></div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-white">Order #{order._id.slice(-4)}</span>
                            <span className="text-[9px] font-bold text-text-muted/40 uppercase tracking-widest">{new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <span className="text-[11px] font-black text-emerald-400">₹{order.total.toFixed(0)}</span>
                        </div>
                        <div className="space-y-3">
                          {order.items.map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 opacity-60 group-hover:opacity-100 transition-all hover:bg-white/[0.04]">
                              <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black text-primary bg-primary/10 w-8 h-8 flex items-center justify-center rounded-lg">{item.quantity}×</span>
                                <span className="text-sm font-serif font-bold text-white/90">{item.name}</span>
                              </div>
                              <button 
                                onClick={() => dispatch({ type: 'ADD_ITEM', payload: item })}
                                className="text-[9px] font-black uppercase tracking-widest text-primary hover:text-white px-4 py-2 bg-primary/5 rounded-xl border border-primary/20 hover:bg-primary transition-all active:scale-95"
                              >
                                Reorder
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Padding for scroll */}
              <div className="h-40"></div>
            </div>

            {/* Sticky Footer Summary */}
            <div className="p-6 md:p-8 bg-surface-dark/98 backdrop-blur-3xl border-t border-white/10 shadow-[0_-30px_60px_rgba(0,0,0,0.8)] z-30">
              <div className="space-y-6">
                {discount > 0 && (
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                    <span className="flex items-center gap-2"><Sparkles size={12} /> Saving ({state.coupon?.code})</span>
                    <span>-₹{discount.toFixed(0)}</span>
                  </div>
                )}
                <div className="flex justify-between items-end gap-6">
                  <div className="flex-shrink-0">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted block mb-1">Pay Total</span>
                    <p className="text-4xl font-serif font-black text-white tracking-tighter">₹{cartTotal.toFixed(0)}</p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCheckout}
                    disabled={state.items.length === 0 || loading}
                    className="flex-1 relative group disabled:opacity-50 h-[72px]"
                  >
                    <div className="absolute inset-0 bg-primary/30 rounded-[24px] blur-xl group-hover:bg-primary/50 transition-all"></div>
                    <div className="relative h-full bg-gradient-to-r from-primary to-primary-dark text-background rounded-[24px] font-black uppercase tracking-[0.15em] text-xs flex items-center justify-center gap-3 border border-white/20 shadow-2xl overflow-hidden">
                      <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500"></div>
                      {loading ? <Loader2 className="animate-spin w-6 h-6" /> : (
                        <div className="relative flex items-center gap-3">
                          Complete Order
                          <div className="bg-background/20 p-1.5 rounded-lg">
                            <Sparkles size={16} />
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;


