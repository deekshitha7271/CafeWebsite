import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';
import { ChefHat, Coffee, Check, Loader2, CreditCard, Banknote, Sparkles, Activity, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Navbar from '../../components/customer/Navbar';

const STATUS_STEPS = [
  { id: 'placed', label: 'Order Received', icon: Coffee },
  { id: 'preparing', label: 'Preparing', icon: ChefHat },
  { id: 'ready', label: 'Ready to Serve', icon: Check },
  { id: 'completed', label: 'Enjoying Meal', icon: Check },
];

const TrackingPage = () => {
  const { orderId } = useParams();
  const socket = useSocket();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingPayment, setLoadingPayment] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/orders/${orderId}`);
        setOrder(res.data);
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
          setOrder(prev => prev ? { ...prev, orderStatus: data.status } : null);
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('order:statusUpdate');
      }
    };
  }, [orderId, socket]);

  const handleStripePayment = async () => {
    setLoadingPayment(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/checkout`, {
        orderId: order._id
      });
      window.location.href = res.data.url;
    } catch (error) {
      console.error('Payment error:', error);
      alert('Failed to initiate payment. Please try again.');
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
             <div className="flex items-center justify-center gap-4 mt-6">
                <span className="text-primary-light text-[10px] font-black uppercase tracking-[0.4em] bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20">Table {order.table}</span>
                <span className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em]">ID: {order._id.slice(-6)}</span>
             </div>
           </motion.div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mt-12">
          {/* Status Column */}
          <div className="lg:col-span-4 space-y-8">
            <div className="glass-card p-10 relative overflow-hidden">
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
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-700 ${
                          isCompleted ? 'bg-primary text-background shadow-[0_0_30px_rgba(245,158,11,0.3)] rotate-0' : 'bg-surface-dark text-text-muted border border-white/5 rotate-[-10deg]'
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
            {/* Payment Options Section (Only if Pending) */}
            {order.paymentStatus === 'pending' && (
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

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                    {/* Cash Card */}
                    <div 
                      className="group relative p-8 rounded-[35px] bg-white/5 border border-white/10 hover:border-emerald-500/40 transition-all hover:bg-emerald-500/5 flex flex-col"
                    >
                       <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6">
                          <Banknote className="w-7 h-7 text-emerald-400" />
                       </div>
                       <h4 className="text-white font-serif text-2xl mb-2">Cash at Counter</h4>
                       <p className="text-text-muted text-[10px] uppercase font-black tracking-widest opacity-60 mb-8">Pay via Cash/Scanner at the Desk</p>
                       
                       <button 
                         onClick={() => alert("✅ Choice Recorded! Please visit the counter to settle your bill.")}
                         className="mt-auto w-full bg-surface-light border border-white/10 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] hover:bg-surface-dark transition-all"
                       >
                          I'll Pay Cash
                       </button>
                    </div>
                 </div>
               </motion.div>
            )}

            {/* Receipt Summary */}
            <div className="glass-card p-10">
              <div className="flex items-center justify-between mb-10 border-b border-white/10 pb-6">
                 <h3 className="font-serif font-black text-3xl text-white">Receipt Summary</h3>
                 {order.paymentStatus === 'paid' ? (
                   <span className="bg-emerald-500/20 text-emerald-400 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-500/20 flex items-center gap-2">
                      <Check className="w-3 h-3" /> Paid In Full
                   </span>
                 ) : (
                   <span className="bg-orange-500/20 text-orange-400 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-orange-500/20 animate-pulse">
                      Payment Pending
                   </span>
                 )}
              </div>
              
              <div className="space-y-6">
                {order.items.map(item => (
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
                   <span className="font-serif text-4xl text-white font-black">Grand Total</span>
                   <p className="text-text-muted/40 text-[9px] font-black uppercase tracking-[0.4em] mt-1">Includes all service charges</p>
                </div>
                <span className="font-black text-5xl text-primary drop-shadow-[0_0_20px_rgba(245,158,11,0.3)]">₹{order.total.toFixed(2)}</span>
              </div>

            {order.orderStatus === 'ready' && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleOrderReceived}
                className="mt-8 w-full bg-primary text-background font-black py-4 rounded-2xl uppercase tracking-widest shadow-[0_10px_25px_rgba(245,158,11,0.3)] hover:shadow-[0_15px_35px_rgba(245,158,11,0.5)] transition-all"
              >
                I've Received my Order!
              </motion.button>
            )}

            {order.orderStatus === 'completed' && (
              <div className="mt-8 space-y-4">
                <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center">
                  <p className="text-emerald-400 font-bold font-serif text-lg mb-1">Enjoy your meal! ✨</p>
                  <p className="text-emerald-400/60 text-xs uppercase tracking-widest font-black">Thank you for visiting</p>
                </div>
                
                <div className="flex gap-4">
                  <button 
                    onClick={() => window.location.href = '/'}
                    className="flex-1 bg-surface-light border border-white/10 hover:border-white/30 text-white font-bold py-4 rounded-xl uppercase tracking-widest text-[10px] transition-all"
                  >
                    Order Again?
                  </button>
                  <button 
                    onClick={() => { localStorage.removeItem('lastOrderId'); window.location.href = '/'; }}
                    className="flex-1 bg-surface border border-white/10 hover:bg-surface-dark text-text-muted font-bold py-4 rounded-xl uppercase tracking-widest text-[10px] transition-all hover:text-white"
                  >
                    I'm Done
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackingPage;
