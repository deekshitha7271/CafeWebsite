import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';
import { useCart } from '../../context/CartContext';
import { ChefHat, Coffee, Check, Loader2, CreditCard, Sparkles, Activity, ArrowRight, History, PackageCheck, Utensils, AlertCircle, X, Star, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../../components/customer/Navbar';
import { playOrderSuccessSound } from '../../lib/utils';

const STATUS_STEPS = [
  { id: 'placed', label: 'Order Received', icon: Coffee },
  { id: 'preparing', label: 'Preparing', icon: ChefHat },
  { id: 'ready', label: 'Ready to Serve', icon: PackageCheck },
  { id: 'completed', label: 'Enjoying Meal', icon: Utensils },
];

const TrackingPage = () => {
  const { orderId: primaryOrderId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const { state: cartState, dispatch: cartDispatch } = useCart();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(primaryOrderId);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [showOrderConfirmed, setShowOrderConfirmed] = useState(false);
  // Payment canceled toast
  const [showCanceledToast, setShowCanceledToast] = useState(false);

  // Handle ?success=true and ?canceled=true query params from Stripe redirects
  useEffect(() => {
    const isSuccess = searchParams.get('success') === 'true';
    const isCanceled = searchParams.get('canceled') === 'true';

    if (isSuccess) {
      setShowOrderConfirmed(true);
      cartDispatch({ type: 'CLEAR_CART' });
      cartDispatch({ type: 'SET_CART_OPEN', payload: false });
      const timer = setTimeout(() => setShowOrderConfirmed(false), 10000);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return () => clearTimeout(timer);
    }

    if (isCanceled) {
      setShowCanceledToast(true);
      const timer = setTimeout(() => setShowCanceledToast(false), 8000);
      window.history.replaceState({}, document.title, window.location.pathname);
      return () => clearTimeout(timer);
    }
  }, [searchParams, cartDispatch]);

  // Fetch all tracked orders — uses PUBLIC endpoint so guests can access without login
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const orderIds = [...new Set([primaryOrderId, ...cartState.activeOrders])].filter(Boolean);
        if (orderIds.length === 0) {
          setLoading(false);
          return;
        }

        // Use the public /orders/public/:id endpoint (no auth required)
        const requests = orderIds.map(id =>
          axios.get(`${import.meta.env.VITE_API_URL}/orders/public/${id}`)
        );
        const responses = await Promise.allSettled(requests);

        const fetchedOrders = responses
          .filter(r => r.status === 'fulfilled')
          .map(r => r.value.data);

        setOrders(fetchedOrders);

        fetchedOrders.forEach(o => {
          if (o.orderStatus !== 'completed' && !cartState.activeOrders.includes(o._id)) {
            cartDispatch({ type: 'ADD_ACTIVE_ORDER', payload: o._id });
          }
        });

      } catch (error) {
        console.error('Failed to fetch orders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [primaryOrderId, cartState.activeOrders]);

  // Socket listener for all tracked orders
  useEffect(() => {
    if (!socket) return;

    orders.forEach(order => {
      socket.emit('join:order', order._id);
    });

    const handleStatusUpdate = (data) => {
      setOrders(prev => prev.map(o =>
        o._id === data.orderId
          ? { ...o, orderStatus: data.status, estimatedReadyTime: data.estimatedReadyTime || o.estimatedReadyTime }
          : o
      ));
    };

    const handleOrderUpdate = (updatedOrder) => {
      setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
    };

    socket.on('order:statusUpdate', handleStatusUpdate);
    socket.on('order:update', handleOrderUpdate);

    return () => {
      socket.off('order:statusUpdate', handleStatusUpdate);
      socket.off('order:update', handleOrderUpdate);
    };
  }, [socket, orders.length]);

  const activeOrder = useMemo(() => orders.find(o => o._id === activeTab) || orders[0], [orders, activeTab]);

  const handleStripePayment = async (orderToPay) => {
    setLoadingPayment(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/payment/checkout`, {
        orderId: orderToPay._id
      });
      window.location.href = res.data.url;
    } catch (error) {
      console.error('Payment error:', error);
      alert(`❌ Payment Failed: ${error.message}`);
    } finally {
      setLoadingPayment(false);
    }
  };

  const handleOrderReceived = async (id) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/orders/${id}/status`, { orderStatus: 'completed' });
      setOrders(prev => prev.map(o => o._id === id ? { ...o, orderStatus: 'completed' } : o));
      cartDispatch({ type: 'REMOVE_ACTIVE_ORDER', payload: id });
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex bg-background h-screen w-full items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center pt-40">
          <History className="w-16 h-16 text-text-muted/20 mb-4" />
          <h2 className="text-2xl font-serif text-white opacity-50">No active orders found</h2>
          <button onClick={() => navigate('/')} className="mt-6 text-primary font-black uppercase tracking-widest text-xs">Back to Menu</button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background font-sans overflow-x-hidden">
      <Navbar />

      {/* Payment Canceled Toast */}
      <AnimatePresence>
        {showCanceledToast && (
          <motion.div
            initial={{ opacity: 0, y: -80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -80 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[99999] w-full max-w-md px-4"
          >
            <div className="flex items-center gap-4 bg-red-500 text-white px-6 py-4 rounded-2xl shadow-[0_20px_60px_rgba(239,68,68,0.5)] border border-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="font-black uppercase tracking-widest text-sm flex-1">Payment did not go through.</p>
              <button onClick={() => setShowCanceledToast(false)} className="opacity-70 hover:opacity-100 transition-opacity">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto p-4 md:p-8 pt-24">
        <header className="py-6 md:py-10 text-center relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-primary/20 rounded-full blur-[80px] -z-10" />
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl md:text-7xl font-serif font-black text-white mb-2">Order Journey</h1>
            <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
              <span className="text-primary-light text-[10px] font-black uppercase tracking-[0.4em] bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20">
                {activeOrder.orderType === 'takeaway' ? '🥡 Takeaway' : '🪑 Dine-in'}
              </span>
              <span className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em]">ID: {activeOrder.billNumber || activeOrder._id.slice(-6)}</span>
              {activeOrder.customerName && (
                <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.4em] border-l border-white/10 pl-4">{activeOrder.customerName}</span>
              )}
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  cartDispatch({ type: 'CLEAR_CART' });
                  cartDispatch({ type: 'REMOVE_COUPON' });
                  navigate('/');
                }}
                className="group relative inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-primary text-background font-black uppercase text-xs tracking-[0.2em] hover:bg-primary-light transition-all shadow-[0_20px_50px_rgba(245,158,11,0.4)] overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span className="relative z-10">New Order</span>
                <ArrowRight className="w-4 h-4 relative z-10" />
              </motion.button>
            </div>
          </motion.div>
        </header>

        {/* Multi-Order Tab Selector */}
        {orders.length > 1 && (
          <div className="flex items-center justify-center gap-3 overflow-x-auto pb-4 hide-scrollbar mb-10 border-b border-white/5 pt-4">
            <div className="flex items-center gap-3 bg-surface-dark/50 p-2 rounded-3xl border border-white/5 backdrop-blur-md">
              {orders.map((o) => (
                <button
                  key={o._id}
                  onClick={() => setActiveTab(o._id)}
                  className={`flex-shrink-0 px-6 py-3 rounded-2xl transition-all flex items-center gap-3 ${activeTab === o._id
                    ? 'bg-primary text-background shadow-[0_10px_30px_rgba(245,158,11,0.3)]'
                    : 'text-text-muted hover:text-white hover:bg-white/5'
                    }`}
                >
                  <div className={`w-2 h-2 rounded-full ${o.orderStatus === 'completed' ? 'bg-emerald-500' : 'bg-orange-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)]'}`} />
                  <span className="font-black text-[10px] uppercase tracking-widest">
                    {o.billNumber || `Track #${o._id.slice(-4)}`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10 mt-12">
          {/* Status Column */}
          <div className="lg:col-span-4 space-y-8">
            <LiveTracker order={activeOrder} />
          </div>

          {/* Receipt Column */}
          <div className="lg:col-span-8 space-y-8">
            {/* Payment Options Section (for dinein-qr orders only) */}
            {activeOrder.paymentStatus === 'pending' && activeOrder.orderType === 'dinein-qr' && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 md:p-10 border-primary/20 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl -z-10" />
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h3 className="font-serif font-black text-2xl md:text-3xl text-white mb-2">Complete Payment</h3>
                    <p className="text-text-muted/60 text-[10px] uppercase tracking-widest font-bold">Secure your meal session</p>
                  </div>
                  <CreditCard className="w-8 h-8 text-primary animate-pulse" />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleStripePayment(activeOrder)}
                  disabled={loadingPayment}
                  className="w-full bg-primary text-background font-black py-4 md:py-5 rounded-2xl uppercase tracking-widest text-[10px] shadow-xl flex items-center justify-center gap-3"
                >
                  {loadingPayment ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Pay Online Now <ArrowRight className="w-4 h-4" /></>}
                </motion.button>
              </motion.div>
            )}

            {/* Receipt Summary */}
            <div className="glass-card p-6 md:p-10">
              <div className="flex items-center justify-between mb-10 border-b border-white/10 pb-6">
                <h3 className="font-serif font-black text-2xl md:text-3xl text-white">Receipt Summary</h3>
                {activeOrder.paymentStatus === 'paid' ? (
                  <span className="bg-emerald-500/20 text-emerald-400 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border border-emerald-500/20 flex items-center gap-2">
                    <Check className="w-3 h-3" /> Paid
                  </span>
                ) : (
                  <span className="bg-orange-500/20 text-orange-400 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border border-orange-500/20 animate-pulse">
                    Pending
                  </span>
                )}
              </div>

              {/* Itemized list */}
              <div className="space-y-6">
                {activeOrder.items.map(item => (
                  <div key={item._id} className="flex justify-between items-center group">
                    <div className="flex flex-col">
                      <span className="text-white font-serif text-lg group-hover:text-primary transition-colors cursor-default">{item.name}</span>
                      <span className="text-primary text-[10px] font-black uppercase tracking-widest">Qty: {item.quantity}</span>
                    </div>
                    <span className="font-black text-xl text-white">₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Fee breakdown */}
              {(() => {
                const subtotal = activeOrder.items.reduce((s, i) => s + i.price * i.quantity, 0);
                const isDineIn = activeOrder.orderType === 'dinein-web';
                const isTakeaway = activeOrder.orderType === 'takeaway';
                const totalItems = activeOrder.items.reduce((s, i) => s + i.quantity, 0);
                const fee = isDineIn ? subtotal * 0.05 : isTakeaway ? totalItems * 10 : 0;
                return fee > 0 ? (
                  <div className="mt-6 pt-6 border-t border-white/5 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Subtotal</span>
                      <span className="text-white/70">₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">
                        {isDineIn ? 'Service Charge (5%)' : `Takeaway Handling (₹10 × ${totalItems})`}
                      </span>
                      <span className="text-primary font-bold">₹{fee.toFixed(2)}</span>
                    </div>
                  </div>
                ) : null;
              })()}

              <div className="mt-12 pt-8 border-t-2 border-dashed border-white/10 flex justify-between items-center">
                <span className="font-serif text-3xl text-white font-black">Total</span>
                <span className="font-black text-4xl text-primary drop-shadow-[0_0_20px_rgba(245,158,11,0.3)]">₹{activeOrder.total.toFixed(2)}</span>
              </div>

              {activeOrder.orderStatus === 'ready' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleOrderReceived(activeOrder._id)}
                  className="mt-8 w-full bg-primary text-background font-black py-4 rounded-2xl uppercase tracking-widest shadow-xl transition-all"
                >
                  I've Received my Order!
                </motion.button>
              )}

              {activeOrder.orderStatus === 'completed' && (
                <div className="mt-8 space-y-4">
                  <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center">
                    <p className="text-emerald-400 font-bold font-serif text-lg mb-1">Enjoy your meal! ✨</p>
                    <p className="text-emerald-400/60 text-[10px] uppercase tracking-widest font-black">Thank you for visiting</p>
                  </div>

                  {!activeOrder.feedbackSubmitted && (
                    <FeedbackForm order={activeOrder} onSubmitted={() => {
                      setOrders(prev => prev.map(o => o._id === activeOrder._id ? { ...o, feedbackSubmitted: true } : o));
                    }} />
                  )}

                  <div className="flex flex-col md:flex-row gap-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { cartDispatch({ type: 'CLEAR_CART' }); cartDispatch({ type: 'REMOVE_COUPON' }); navigate('/'); }}
                      className="flex-1 bg-primary text-background font-black py-5 rounded-2xl uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-primary/20 hover:bg-primary-light transition-all"
                    >
                      New Order
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        cartDispatch({ type: 'REMOVE_ACTIVE_ORDER', payload: activeOrder._id });
                        cartDispatch({ type: 'SET_LAST_ORDER_ID', payload: null });
                        const remainingOrders = orders.filter(o => o._id !== activeOrder._id);
                        if (remainingOrders.length > 0) {
                          setOrders(remainingOrders);
                          setActiveTab(remainingOrders[0]._id);
                        } else {
                          navigate('/');
                        }
                      }}
                      className="flex-1 bg-surface-dark border border-white/10 text-white/40 font-black py-5 rounded-2xl uppercase tracking-[0.2em] text-[10px] hover:text-white hover:border-white/20 transition-all"
                    >
                      I'm Done
                    </motion.button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showOrderConfirmed && (
          <OrderConfirmedOverlay onClose={() => setShowOrderConfirmed(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Helper Components ─────────────────────────────────────────────────────────
const LiveTracker = React.memo(({ order }) => {
  const [timeLeft, setTimeLeft] = useState(null);
  const [alertTriggered, setAlertTriggered] = useState(false);
  const [showAlertMessage, setShowAlertMessage] = useState(false);
  const currentStepIndex = STATUS_STEPS.findIndex(s => s.id === order.orderStatus);

  useEffect(() => {
    const targetTimeStr = order?.arrivalTime || order?.estimatedReadyTime;
    if (!targetTimeStr) return;
    
    // Request notification permission if needed
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const interval = setInterval(() => {
      const now = new Date();
      const targetTime = new Date(targetTimeStr);
      const diff = targetTime - now;
      
      if (diff <= 0) {
        setTimeLeft('0:00');
        clearInterval(interval);
      } else {
        const totalSecs = Math.floor(diff / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);

        // Trigger alert at exactly 1 minute remaining
        if (mins === 1 && secs === 0 && !alertTriggered) {
          setAlertTriggered(true);
          playOrderSuccessSound();
          setShowAlertMessage(true);
          
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('Order Almost Ready!', {
              body: '1 minute remaining for your order!',
              icon: '/vite.svg'
            });
          }
          
          // Hide UI alert after 10 seconds
          setTimeout(() => setShowAlertMessage(false), 10000);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [order?.arrivalTime, order?.estimatedReadyTime, alertTriggered]);

  return (
    <div className="glass-card p-6 md:p-10 relative overflow-hidden">
      <h3 className="font-serif font-bold text-2xl mb-10 text-white flex items-center gap-3">
        <Activity className="w-5 h-5 text-primary" />
        Live Tracker
      </h3>

      <AnimatePresence>
        {showAlertMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 p-4 bg-amber-500/20 border border-amber-500 text-amber-400 rounded-2xl flex items-center gap-3 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
          >
            <Sparkles className="w-6 h-6 animate-pulse" />
            <div>
              <p className="font-black uppercase tracking-widest text-xs">Almost Ready!</p>
              <p className="text-[10px] opacity-80">1 minute remaining for your order to get ready.</p>
            </div>
            <button onClick={() => setShowAlertMessage(false)} className="ml-auto opacity-70 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {timeLeft && order.orderStatus !== 'completed' && order.orderStatus !== 'ready' && (
        <div className="mb-8 p-6 bg-primary/10 border border-primary/20 rounded-[30px] text-center shadow-inner relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-shimmer" />
          <p className="text-text-muted/60 text-[10px] font-black uppercase tracking-widest mb-1 relative z-10">Stopwatch Timer</p>
          <div className="font-mono text-5xl font-black text-primary tracking-tighter relative z-10 flex items-center justify-center gap-2">
            <Clock className="w-8 h-8 opacity-50 animate-pulse" />
            {timeLeft}
          </div>
        </div>
      )}

      {order.arrivalMinutes && (
        <div className="mb-6 px-5 py-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <p className="text-[10px] font-black uppercase tracking-widest text-white/50">
            Customer arriving in ~{order.arrivalMinutes} mins
          </p>
        </div>
      )}

      <div className="relative">
        <div className="absolute left-6 top-10 bottom-10 w-0.5 bg-white/5 -ml-px z-0">
          <motion.div
            className="absolute top-0 w-full bg-primary"
            initial={{ height: 0 }}
            animate={{ height: `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
            transition={{ duration: 1, ease: "circOut" }}
          />
        </div>

        <div className="space-y-12 relative z-10">
          {STATUS_STEPS.map((step, index) => {
            const isCompleted = index <= currentStepIndex;
            const isActive = index === currentStepIndex;
            const Icon = step.icon;
            return (
              <div key={step.id} className="flex items-center gap-8">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-700 relative ${isCompleted ? 'bg-primary text-background' : 'bg-surface-dark text-text-muted border border-white/5'}`}>
                  {isActive && (
                    <motion.div
                      layoutId="pulse"
                      className="absolute inset-0 rounded-2xl bg-primary"
                      animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                  <Icon className={`w-6 h-6 relative z-10 ${isActive ? 'animate-bounce' : ''}`} />
                </div>
                <div>
                  <h3 className={`text-xl font-bold font-serif ${isCompleted ? 'text-white' : 'text-text-muted opacity-40'}`}>
                    {step.label}
                  </h3>
                  {isActive && (
                    <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }} className="text-primary text-[9px] font-black uppercase tracking-widest mt-1">
                      Live Update
                    </motion.span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

const OrderConfirmedOverlay = React.memo(({ onClose }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[99999] flex items-center justify-center p-6 bg-background/60 backdrop-blur-3xl"
  >
    <motion.div
      initial={{ scale: 0.8, y: 40, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ scale: 0.8, y: 40, opacity: 0 }}
      className="relative max-w-md w-full bg-surface-dark border border-white/10 rounded-[40px] md:rounded-[50px] p-6 md:p-12 text-center shadow-2xl overflow-hidden"
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -z-10" />
      <div className="relative mb-10">
        <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto">
          <Check className="w-12 h-12 text-background stroke-[4px]" />
        </div>
      </div>
      <h2 className="text-4xl font-serif font-black text-white mb-4">Order Placed!</h2>
      <p className="text-text-muted text-sm mb-10">Our master chefs are now preparing your delicacies with artisan soul.</p>
      <button onClick={() => { playOrderSuccessSound(); onClose(); }} className="w-full bg-white text-background font-black py-5 rounded-3xl uppercase tracking-widest text-[10px] shadow-2xl hover:bg-primary transition-colors">
        Track My Journey
      </button>
    </motion.div>
  </motion.div>
));

const FeedbackForm = React.memo(({ order, onSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) return;
    setLoading(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/reviews/public`, {
        orderId: order._id,
        customerName: order.customerName,
        rating,
        comment
      });
      setSubmitted(true);
      setTimeout(() => {
        onSubmitted();
      }, 2000);
    } catch (error) {
      console.error('Feedback error:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-6 bg-primary/10 border border-primary/20 rounded-2xl text-center"
      >
        <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
        <h4 className="text-white font-serif font-black text-lg mb-1">Thank You!</h4>
        <p className="text-white/60 text-sm">Your feedback helps us improve.</p>
      </motion.div>
    );
  }

  return (
    <div className="p-6 bg-surface-dark border border-white/5 rounded-2xl mt-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[40px] -z-10" />
      <h4 className="text-white font-serif font-black text-xl mb-4 text-center">How was your experience?</h4>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex justify-center gap-2 mb-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star
                className={`w-8 h-8 ${star <= (hoverRating || rating)
                  ? 'fill-primary text-primary drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                  : 'text-white/20'
                  } transition-colors`}
              />
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Tell us what you loved (optional)"
          className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition-colors resize-none h-24"
        />
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={rating === 0 || loading}
          className={`w-full py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${rating === 0
            ? 'bg-white/5 text-white/30 cursor-not-allowed'
            : 'bg-primary text-background shadow-lg shadow-primary/20 hover:bg-primary-light'
            }`}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Submit Feedback <ArrowRight className="w-3 h-3" /></>}
        </motion.button>
      </form>
    </div>
  );
});

export default React.memo(TrackingPage);
