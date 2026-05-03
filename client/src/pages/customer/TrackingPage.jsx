import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';
import { useCart } from '../../context/CartContext';
import { ChefHat, Coffee, Check, Loader2, CreditCard, Sparkles, Activity, ArrowRight, Plus, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../../components/customer/Navbar';

import { playOrderSuccessSound } from '../../lib/utils';

const STATUS_STEPS = [
  { id: 'placed', label: 'Order Received', icon: Coffee },
  { id: 'preparing', label: 'Preparing', icon: ChefHat },
  { id: 'ready', label: 'Ready to Serve', icon: Check },
  { id: 'completed', label: 'Enjoying Meal', icon: Check },
];

const TrackingPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const { dispatch } = useCart();
  const [order, setOrder] = useState(null);
  const [relatedOrders, setRelatedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [showTimeNotification, setShowTimeNotification] = useState(false);
  const [showOrderConfirmed, setShowOrderConfirmed] = useState(false);

  // Success Notification & Fetch Effect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isSuccess = urlParams.get('success') === 'true';

    if (isSuccess) {
      console.log("🎯 Success detected, triggering notification...");
      playOrderSuccessSound();
      setShowOrderConfirmed(true);

      // capture shadow cart before clearing
      dispatch({ type: 'CLONE_TO_SHADOW' });
      dispatch({ type: 'SET_RELATED_ORDER', payload: orderId });
      
      // Clear cart upon successful payment
      dispatch({ type: 'CLEAR_CART' });
      dispatch({ type: 'SET_CART_OPEN', payload: false });
      
      const timer = setTimeout(() => setShowOrderConfirmed(false), 10000);
      
      // Remove query param from URL without refreshing
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }

    const fetchOrder = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/orders/${orderId}`);
        setOrder(res.data);

        // Fetch session chain
        try {
          const relatedRes = await axios.get(`${import.meta.env.VITE_API_URL}/orders/related/${orderId}`);
          setRelatedOrders(relatedRes.data);
        } catch (e) {
          console.error("Failed to fetch related orders:", e);
        }
        
        if (isSuccess) {
          try {
            const verifyRes = await axios.get(`${import.meta.env.VITE_API_URL}/payment/verify-session/${orderId}`);
            if (verifyRes.data.order) {
              setOrder(verifyRes.data.order);
            }
          } catch (e) {
            console.error("Background verification failed:", e);
          }
        }
      } catch (error) {
        console.error('Failed to fetch order:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();

    if (socket) {
      socket.emit('join:order', orderId);

      socket.on('order:statusUpdate', (data) => {
        if (data.orderId === orderId) {
          setOrder(prev => {
            if (!prev) return null;
            return {
              ...prev,
              orderStatus: data.status,
              estimatedReadyTime: data.estimatedReadyTime || prev.estimatedReadyTime
            };
          });
        }
      });

      socket.on('order:update', (updatedOrder) => {
        if (updatedOrder._id === orderId) {
          setOrder(updatedOrder);
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('order:statusUpdate');
        socket.off('order:update');
      }
    };
  }, [orderId, socket]); // Run when orderId or socket changes

  useEffect(() => {
    if (!order?.estimatedReadyTime) return;

    // Show notification when estimation changes
    setShowTimeNotification(true);
    const timer = setTimeout(() => setShowTimeNotification(false), 5000);

    const interval = setInterval(() => {
      const now = new Date();
      const readyTime = new Date(order.estimatedReadyTime);
      const diff = readyTime - now;

      if (diff <= 0) {
        setTimeLeft('Ready!');
        clearInterval(interval);
      } else {
        const mins = Math.floor(diff / 1000 / 60);
        const secs = Math.floor((diff / 1000) % 60);
        setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [order?.estimatedReadyTime]);

  const handleStripePayment = async () => {
    setLoadingPayment(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/checkout`, {
        orderId: order._id
      });
      window.location.href = res.data.url;
    } catch (error) {
      console.error('Payment error:', error);
      const errorMsg = error.response?.data?.details || error.message || 'Unknown error';
      alert(`❌ Payment Failed: ${errorMsg}`);
    } finally {
      setLoadingPayment(false);
    }
  };

  const handleOrderReceived = async () => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/orders/${orderId}/status`, { orderStatus: 'completed' });
      setOrder(prev => ({ ...prev, orderStatus: 'completed' }));
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

  if (!order) {
    return <div className="text-center mt-20 text-text-muted">Order not found.</div>;
  }

  const currentStepIndex = STATUS_STEPS.findIndex(s => s.id === order.orderStatus);

  return (
    <div className="relative min-h-screen bg-background font-sans overflow-x-hidden">
      <Navbar />

      <div className="max-w-6xl mx-auto p-8 pt-24">
        <header className="py-10 text-center relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-primary/20 rounded-full blur-[80px] -z-10" />
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-5xl md:text-7xl font-serif font-black text-white mb-2">Order Journey</h1>
            <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
              <span className="text-primary-light text-[10px] font-black uppercase tracking-[0.4em] bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20">
                {order.orderType === 'takeaway' ? '🥡 Takeaway' : '🪑 Dine-in'}
              </span>
              <span className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em]">ID: {order._id.slice(-6)}</span>
              {order.customerName && (
                <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.4em] border-l border-white/10 pl-4">{order.customerName}</span>
              )}
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-white/5 border border-white/10 text-white font-black uppercase text-[11px] tracking-[0.2em] hover:bg-white/10 transition-all shadow-xl backdrop-blur-md"
              >
                <Plus className="w-4 h-4 text-primary" /> Add More Items
              </button>
              <button
                onClick={() => {
                  dispatch({ type: 'RESTORE_FROM_SHADOW' });
                  navigate('/');
                }}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-primary text-background font-black uppercase text-[11px] tracking-[0.2em] hover:bg-primary-light transition-all shadow-[0_15px_35px_rgba(245,158,11,0.3)]"
              >
                <RefreshCcw className="w-4 h-4" /> Repeat Previous Order
              </button>
            </div>
          </motion.div>
        </header>

        {/* Session Hub: Multi-Order Switcher */}
        {relatedOrders.length > 1 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 flex flex-col items-center"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Active Session Hub</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4 bg-white/5 p-2 rounded-[30px] border border-white/10 backdrop-blur-md shadow-2xl">
              {relatedOrders.map((ro, idx) => (
                <button
                  key={ro._id}
                  onClick={() => navigate(`/track/${ro._id}`)}
                  className={`px-6 py-3 rounded-2xl flex items-center gap-3 transition-all ${
                    ro._id === orderId 
                    ? 'bg-primary text-background font-black shadow-lg shadow-primary/20' 
                    : 'text-white/40 hover:text-white hover:bg-white/5 font-bold'
                  }`}
                >
                  <span className="text-[10px] opacity-40">#{idx + 1}</span>
                  <span className="text-xs uppercase tracking-widest whitespace-nowrap">
                    {ro.orderStatus === 'completed' ? 'Done' : ro.orderStatus}
                  </span>
                  {ro._id === orderId && <div className="w-1.5 h-1.5 bg-background rounded-full animate-pulse" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <div className="space-y-20 mt-12">
          {(relatedOrders.length > 0 ? relatedOrders : [order]).map((currentOrder, oIdx) => {
            const currentStepIndex = STATUS_STEPS.findIndex(s => s.id === currentOrder.orderStatus);
            
            return (
              <motion.div 
                key={currentOrder._id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: oIdx * 0.1 }}
                className="relative"
              >
                {/* Order Separator / Header */}
                <div className="flex items-center gap-4 mb-8">
                   <div className="h-px flex-1 bg-white/5" />
                   <span className="text-[10px] font-black text-primary uppercase tracking-[0.5em] bg-primary/5 px-6 py-2 rounded-full border border-primary/10">
                     Order #{oIdx + 1} • {currentOrder._id.slice(-6)}
                   </span>
                   <div className="h-px flex-1 bg-white/5" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  {/* Status Column */}
                  <div className="lg:col-span-4 space-y-8">
                    <div className="glass-card p-10 relative overflow-hidden h-full">
                      <h3 className="font-serif font-bold text-2xl mb-10 text-white flex items-center gap-3">
                        <Activity className="w-5 h-5 text-primary" />
                        Live Tracker
                      </h3>

                      <div className="relative">
                        {/* Connecting line */}
                        <div className="absolute left-6 top-10 bottom-10 w-0.5 bg-white/5 -ml-px z-0">
                          <motion.div
                            className="absolute top-0 w-full bg-primary shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                            initial={{ height: 0 }}
                            animate={{ height: `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
                            transition={{ duration: 1, ease: "easeInOut" }}
                          />
                        </div>

                        <div className="space-y-12 relative z-10">
                          {STATUS_STEPS.map((step, index) => {
                            const isCompleted = index <= currentStepIndex;
                            const isActive = index === currentStepIndex;
                            const Icon = step.icon;

                            return (
                              <div key={step.id} className="flex items-center gap-8">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-700 ${isCompleted ? 'bg-primary text-background shadow-[0_0_30px_rgba(245,158,11,0.3)] rotate-0' : 'bg-surface-dark text-text-muted border border-white/5 rotate-[-10deg]'
                                  }`}>
                                  <Icon className="w-6 h-6" />
                                </div>
                                <div className="flex flex-col">
                                  <h3 className={`text-xl font-bold font-serif ${isCompleted ? 'text-white' : 'text-text-muted opacity-40'}`}>
                                    {step.label}
                                  </h3>
                                  {isActive && (
                                    <motion.span
                                      animate={{ opacity: [1, 0.4, 1] }}
                                      transition={{ duration: 2, repeat: Infinity }}
                                      className="text-primary text-[9px] font-black uppercase tracking-[0.2em] mt-1"
                                    >
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
                  </div>

                  {/* Payment & Receipt Column */}
                  <div className="lg:col-span-8 space-y-8">
                    {/* Payment Options Section (Only if Pending and Case is QR/Table) */}
                    {currentOrder.paymentStatus === 'pending' && currentOrder.orderType === 'dinein-qr' && (
                      <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-10 border-primary/20 relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl -z-10" />
                        <div className="flex items-center justify-between mb-10">
                          <div>
                            <h3 className="font-serif font-black text-3xl text-white mb-2">Complete Payment</h3>
                            <p className="text-text-muted/60 text-xs uppercase tracking-widest font-bold">Choose your preferred method</p>
                          </div>
                          <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                          {/* Stripe Card */}
                          <div
                            className="group relative p-8 rounded-[35px] bg-white/5 border border-white/10 hover:border-primary/40 transition-all hover:bg-primary/5 flex flex-col"
                          >
                            <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-background transition-colors duration-500">
                              <CreditCard className="w-7 h-7 text-primary group-hover:text-background" />
                            </div>
                            <h4 className="text-white font-serif text-2xl mb-2">Online Payment</h4>
                            <p className="text-text-muted text-[10px] uppercase font-black tracking-widest opacity-60 mb-8">Secure UPI, Card, NetBanking</p>

                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={handleStripePayment}
                              disabled={loadingPayment}
                              className="mt-auto w-full bg-primary text-background font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-xl flex items-center justify-center gap-2"
                            >
                              {loadingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Pay Now <ArrowRight className="w-3 h-3" /></>}
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Receipt Summary */}
                    <div className="glass-card p-10 h-full flex flex-col">
                      <div className="flex items-center justify-between mb-10 border-b border-white/10 pb-6">
                        <h3 className="font-serif font-black text-3xl text-white">Receipt Summary</h3>
                        {currentOrder.paymentStatus === 'paid' ? (
                          <span className="bg-emerald-500/20 text-emerald-400 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-500/20 flex items-center gap-2">
                            <Check className="w-3 h-3" /> Paid In Full
                          </span>
                        ) : (
                          <span className="bg-orange-500/20 text-orange-400 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-orange-500/20 animate-pulse">
                            Payment Pending
                          </span>
                        )}
                      </div>

                      <div className="space-y-6 flex-1">
                        {currentOrder.items.map(item => (
                          <div key={item._id} className="flex justify-between items-center group">
                            <div className="flex flex-col">
                              <span className="text-white font-serif text-xl group-hover:text-primary transition-colors cursor-default">{item.name}</span>
                              <span className="text-primary text-[10px] font-black uppercase tracking-widest">Quantity: {item.quantity}</span>
                            </div>
                            <span className="font-black text-2xl text-white">₹{(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-12 pt-8 border-t-2 border-dashed border-white/10 flex justify-between items-center">
                        <div>
                          <span className="font-serif text-4xl text-white font-black">Total</span>
                          <p className="text-text-muted/40 text-[9px] font-black uppercase tracking-[0.4em] mt-1">Order Total Amount</p>
                        </div>
                        <span className="font-black text-5xl text-primary drop-shadow-[0_0_20px_rgba(245,158,11,0.3)]">₹{currentOrder.total.toFixed(2)}</span>
                      </div>

                      {currentOrder.orderStatus === 'ready' && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleOrderReceived}
                          className="mt-8 w-full bg-primary text-background font-black py-4 rounded-2xl uppercase tracking-widest shadow-[0_10px_25px_rgba(245,158,11,0.3)] hover:shadow-[0_15px_35px_rgba(245,158,11,0.5)] transition-all"
                        >
                          I've Received my Order!
                        </motion.button>
                      )}

                      {currentOrder.orderStatus === 'completed' && (
                        <div className="mt-8">
                          <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center">
                            <p className="text-emerald-400 font-bold font-serif text-lg mb-1">Enjoy your meal! ✨</p>
                            <p className="text-emerald-400/60 text-xs uppercase tracking-widest font-black">Thank you for visiting</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Global Action Footer */}
        <div className="mt-20 max-w-2xl mx-auto space-y-6">
          <div className="flex gap-4">
            <button
              onClick={() => { window.location.href = '/'; }}
              className="flex-1 font-black py-5 rounded-3xl uppercase tracking-[0.2em] text-[10px] bg-primary text-background shadow-xl hover:bg-primary-light transition-all"
            >
              Order More Items?
            </button>
            <button
              onClick={() => {
                dispatch({ type: 'SET_LAST_ORDER_ID', payload: null });
                window.location.href = '/';
              }}
              className="flex-1 font-black py-5 rounded-3xl uppercase tracking-[0.2em] text-[10px] bg-surface-light border border-white/10 text-white hover:bg-surface-dark transition-all"
            >
              I'm Done
            </button>
          </div>
          <p className="text-center text-[9px] text-white/20 font-black uppercase tracking-[0.4em]">
            Thank you for dining with Ca Phe Bistro
          </p>
        </div>
      </div>

      <AnimatePresence>
        {showOrderConfirmed && (
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
              className="relative max-w-md w-full bg-surface-dark border border-white/10 rounded-[50px] p-12 text-center shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] overflow-hidden"
            >
              {/* Background ambient light */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -z-10" />
              
              <div className="relative mb-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
                  className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(245,158,11,0.4)]"
                >
                  <Check className="w-12 h-12 text-background stroke-[4px]" />
                </motion.div>
                
                {/* Floating sparkles */}
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      y: [-10, -30, -10],
                      x: [0, (i % 2 === 0 ? 20 : -20), 0],
                      opacity: [0, 1, 0]
                    }}
                    transition={{ 
                      duration: 2 + Math.random(), 
                      repeat: Infinity,
                      delay: i * 0.2
                    }}
                    className="absolute text-primary text-xl"
                    style={{ 
                      top: '20%', 
                      left: `${15 + i * 15}%` 
                    }}
                  >
                    ✨
                  </motion.div>
                ))}
              </div>

              <h2 className="text-4xl font-serif font-black text-white mb-4">Order Placed!</h2>
              <p className="text-text-muted text-sm leading-relaxed mb-10 font-light italic">
                Your culinary journey has begun. Our master chefs are now preparing your delicacies with artisan soul.
              </p>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  playOrderSuccessSound();
                  setShowOrderConfirmed(false);
                }}
                className="w-full bg-white text-background font-black py-5 rounded-3xl uppercase tracking-[0.2em] text-[10px] shadow-2xl hover:bg-primary transition-colors"
              >
                Track My Journey
              </motion.button>
              
              <p className="mt-6 text-[9px] text-white/30 font-black uppercase tracking-[0.4em]">Ca Phe Bistro Sanctuary</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TrackingPage;
