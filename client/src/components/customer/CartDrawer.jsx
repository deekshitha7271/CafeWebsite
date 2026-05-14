import { useEffect, useState, useMemo } from 'react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { X, Minus, Plus, Loader2, Sparkles, Activity, Clock, ShoppingBag, Check, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { playOrderSuccessSound } from '../../lib/utils';

const ARRIVAL_OPTIONS = ['10', '20', '30']; // minutes

const CartDrawer = () => {
  const { state, dispatch, cartTotal, rawCartTotal, sessionStats, discount } = useCart();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shakeFields, setShakeFields] = useState(false);
  const [inputErrors, setInputErrors] = useState({ name: false, phone: false, arrival: false });

  // ── Arrival time is stored as a string: "10", "20", or "30" ────────────────
  const selectedArrival = state.arrivalTime || '';

  const handleArrivalSelect = (mins) => {
    // Toggle off if already selected
    const newVal = selectedArrival === mins ? '' : mins;
    dispatch({ type: 'SET_ARRIVAL_TIME', payload: newVal });
    if (inputErrors.arrival) setInputErrors(prev => ({ ...prev, arrival: false }));
  };

  const isAlreadyOrdered = useMemo(() => (itemId) => {
    return state.sessionOrders?.some(order =>
      order.items.some(i => i.menuItemId === itemId || i._id === itemId)
    );
  }, [state.sessionOrders]);

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

  // ── Calculate fees for display in the cart ─────────────────────────────────
  const { totalItemCount, isDineIn, isTakeaway, takeawayFee, extraFee, grandTotal, gstAmount, gstRate } = useMemo(() => {
    const itemCount = state.items.reduce((s, i) => s + i.quantity, 0);
    const dineIn = state.orderType === 'dinein-web';
    const takeaway = state.orderType === 'takeaway';
    const tFee = takeaway ? itemCount * 10 : 0;
    const fee = tFee;
    let total = cartTotal + fee;

    const rate = state.settings?.gstRate ?? 5;
    const gst = (total * rate) / 100;
    total += gst;

    return {
      totalItemCount: itemCount,
      isDineIn: dineIn,
      isTakeaway: takeaway,
      takeawayFee: tFee,
      extraFee: fee,
      grandTotal: total,
      gstAmount: gst,
      gstRate: rate
    };
  }, [state.items, state.orderType, cartTotal, state.settings?.gstRate]);

  const handleCheckout = async () => {
    if (state.items.length === 0) return;

    const isArrivalMissing = !selectedArrival || String(selectedArrival).trim().length === 0 || selectedArrival === 'null';

    if (!customerName?.trim() || !customerPhone?.trim() || isArrivalMissing) {
      setInputErrors({
        name: !customerName?.trim(),
        phone: !customerPhone?.trim(),
        arrival: isArrivalMissing
      });
      setShakeFields(true);
      setTimeout(() => setShakeFields(false), 500);
      return;
    }

    setLoading(true);
    try {
      // 1. Create Razorpay order on backend
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/payment/razorpay/create-order`, {
        items: state.items,
        total: grandTotal,
        orderType: state.orderType,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        arrivalTime: selectedArrival || null,
        couponCode: state.coupon?.code,
      });

      const { razorpayOrderId, amount, currency, key, orderId } = res.data;

      // 2. Configure Razorpay options
      const options = {
        key: key,
        amount: amount,
        currency: currency,
        name: "Cá Phê Bistro",
        description: "Order Payment",
        order_id: razorpayOrderId,
        handler: async function (response) {
          // 3. Verify payment on backend
          try {
            setLoading(true);
            const verifyRes = await axios.post(`${import.meta.env.VITE_API_URL}/payment/razorpay/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId: orderId
            });

            if (verifyRes.data.success) {
              playOrderSuccessSound();
              dispatch({ type: 'CLEAR_CART' });
              window.location.href = `/payment/success?orderId=${orderId}`;
            } else {
              alert("❌ Payment verification failed.");
            }
          } catch (err) {
            console.error("Verification error:", err);
            alert("❌ Something went wrong while verifying payment.");
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: customerName.trim(),
          contact: customerPhone.trim(),
        },
        theme: {
          color: "#f59e0b", // Primary gold color
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          }
        }
      };

      // 4. Open Razorpay modal
      const rzp1 = new window.Razorpay(options);
      rzp1.on('payment.failed', function (response) {
        setLoading(false);
        alert(`❌ Payment Failed: ${response.error.description}`);
      });
      rzp1.open();

    } catch (error) {
      console.error('Checkout error:', error);
      const errorMsg = error.response?.data?.details || error.response?.data?.error || error.message;
      alert(`❌ Checkout failed: ${errorMsg}`);
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
                  <p className="text-[10px] text-primary font-black uppercase tracking-widest">{state.items.length} unique items</p>
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
            </div>

            {/* Scrollable Content */}
            <div
              className="flex-1 overflow-y-auto px-6 py-4 space-y-10 custom-scrollbar relative"
              data-lenis-prevent
            >


              {/* Active Selection Section */}
              <div className="space-y-6">
                {/* Active Selection Header - Clean & Non-Sticky */}
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-amber-400"></div>
                    Your Selection
                  </h3>
                  <span className="text-[9px] font-bold text-text-muted">{state.items.length} items</span>
                </div>

                {state.items.length === 0 ? (
                  <div className="py-12 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center gap-4 text-center px-6">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-text-muted/30" />
                    </div>
                    <p className="text-sm font-serif italic text-text-muted opacity-50">Empty selection.<br />Pick something delicious!</p>
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

              {/* Promo Section */}
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
                  {/* ── Summary & Fees: In Scroll View to clear space for items ─────── */}
                  <div className="space-y-4 pt-6 border-t border-white/5">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-2">
                      Order Summary
                    </h3>

                    <div className="space-y-3 px-1 bg-white/[0.02] p-4 rounded-3xl border border-white/5 shadow-inner">
                      <div className="flex justify-between text-sm">
                        <span className="text-text-muted">Subtotal ({totalItemCount} items)</span>
                        <span className="text-white font-bold">₹{cartTotal.toFixed(0)}</span>
                      </div>

                      {isTakeaway && (
                        <div className="flex justify-between text-sm">
                          <span className="text-text-muted">Handling Fee (₹10/item)</span>
                          <span className="text-primary-light font-bold">+ ₹{takeawayFee.toFixed(0)}</span>
                        </div>
                      )}

                      {discount > 0 && (
                        <div className="flex justify-between text-sm text-emerald-400">
                          <span className="flex items-center gap-2 font-bold tracking-tight">
                            <Sparkles size={14} /> Discount ({state.coupon?.code})
                          </span>
                          <span className="font-bold">-₹{discount.toFixed(0)}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-sm">
                        <span className="text-text-muted">GST ({gstRate}%)</span>
                        <span className="text-white font-bold">+ ₹{gstAmount.toFixed(0)}</span>
                      </div>

                      <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                        <span className="text-xs font-black uppercase tracking-widest text-white">Grand Total</span>
                        <span className="text-xl font-serif font-black text-primary">₹{grandTotal.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Large Spacer to ensure Order Summary scrolls ABOVE the sticky footer */}
              <div className="h-[280px]"></div>
            </div>

            {/* Ultra-Compact Sticky Footer */}
            <div className="p-4 md:p-6 bg-surface-dark/98 backdrop-blur-3xl border-t border-white/10 shadow-[0_-30px_60px_rgba(0,0,0,0.8)] z-30">
              <div className="space-y-5">
                {/* ── Arrival Time + Guest Info: Compressed Footer Group ──────────── */}
                {state.items.length > 0 && (
                  <div className="space-y-4">
                    {/* Arrival Picker - Small Row */}
                    <div className="flex items-center justify-between gap-4">
                      <h3 className={`text-[9px] font-black uppercase tracking-[0.15em] flex-shrink-0 flex items-center gap-1.5 transition-colors ${inputErrors.arrival ? 'text-red-500' : 'text-primary'}`}>
                        <Clock size={12} /> ARRIVAL <span className="text-red-500 font-bold">*</span>:
                      </h3>
                      <div className="flex-1 grid grid-cols-3 gap-1.5">
                        {ARRIVAL_OPTIONS.map((mins) => (
                          <button
                            key={mins}
                            onClick={() => handleArrivalSelect(mins)}
                            className={`py-2 px-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${selectedArrival === mins
                              ? 'bg-primary text-background border-primary shadow-sm'
                              : inputErrors.arrival
                                ? 'bg-red-500/5 text-red-400 border-red-500/20'
                                : 'bg-white/5 text-white/40 border-white/10'
                              }`}
                          >
                            {mins}m
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Guest Inputs - Compact Duo */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-white/40 tracking-widest uppercase flex items-center gap-1 ml-1">
                          Name <span className="text-red-500 font-bold">*</span>
                        </label>
                        <div className="relative">
                          <input
                            id="guest-name"
                            type="text"
                            placeholder="Enter Name"
                            value={customerName}
                            onChange={(e) => {
                              setCustomerName(e.target.value);
                              if (inputErrors.name) setInputErrors(prev => ({ ...prev, name: false }));
                            }}
                            className={`w-full bg-white/5 border ${inputErrors.name ? 'border-red-500' : 'border-white/10'} rounded-lg px-3 py-2.5 text-[10px] font-black tracking-widest text-white outline-none focus:border-primary placeholder:text-white/20`}
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-white/40 tracking-widest uppercase flex items-center gap-1 ml-1">
                          Phone <span className="text-red-500 font-bold">*</span>
                        </label>
                        <div className="relative">
                          <input
                            id="guest-phone"
                            type="tel"
                            placeholder="Enter Phone"
                            value={customerPhone}
                            onChange={(e) => {
                              setCustomerPhone(e.target.value.replace(/\D/g, ''));
                              if (inputErrors.phone) setInputErrors(prev => ({ ...prev, phone: false }));
                            }}
                            maxLength={15}
                            className={`w-full bg-white/5 border ${inputErrors.phone ? 'border-red-500' : 'border-white/10'} rounded-lg px-3 py-2.5 text-[10px] font-black tracking-widest text-white outline-none focus:border-primary placeholder:text-white/20`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={handleCheckout}
                  disabled={state.items.length === 0 || loading}
                  className="w-full relative group disabled:opacity-50 h-[64px]"
                >
                  <div className="absolute inset-0 bg-primary/40 rounded-[20px] blur-2xl group-hover:bg-primary/60 transition-all"></div>
                  <div className="relative h-full bg-gradient-to-br from-amber-400 to-primary text-background rounded-2xl font-black uppercase tracking-[0.2em] text-[12px] flex items-center justify-between px-6 border border-white/20 shadow-xl overflow-hidden">
                    <div className="flex flex-col items-start leading-tight">
                      <span className="text-[10px] opacity-70">Complete Order</span>
                      <span className="text-xl">₹{grandTotal.toFixed(0)}</span>
                    </div>

                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                      <div className="bg-background/20 p-2 rounded-xl border border-white/20 backdrop-blur-sm">
                        <ArrowRight size={18} className="text-white" />
                      </div>
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
