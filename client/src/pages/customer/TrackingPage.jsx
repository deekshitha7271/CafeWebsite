import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';
import { ChefHat, Coffee, Check, Loader2 } from 'lucide-react';
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
    <div className="relative min-h-screen bg-background font-sans">
      <Navbar />

      <div className="max-w-4xl mx-auto p-8">
        <header className="py-10 text-center">
          <h1 className="text-5xl font-serif font-bold text-white mb-2">Track Your Order</h1>
          <p className="text-text-muted mt-1 text-lg">Table {order.table}</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
          <div className="glass-card p-8">
            <h3 className="font-serif font-bold text-2xl mb-6 text-primary-light border-b border-white/10 pb-4">Live Status</h3>
            <div className="relative">
              {/* Connecting line */}
              <div className="absolute left-6 top-10 bottom-10 w-0.5 bg-surface-light -ml-px z-0">
                <motion.div 
                  className="absolute top-0 w-full bg-primary"
                  initial={{ height: 0 }}
                  animate={{ height: `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              <div className="space-y-10 relative z-10">
                {STATUS_STEPS.map((step, index) => {
                  const isCompleted = index <= currentStepIndex;
                  const isActive = index === currentStepIndex;
                  const Icon = step.icon;

                  return (
                    <div key={step.id} className="flex items-center gap-6">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-500 shadow-lg ${
                        isCompleted ? 'bg-primary text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'bg-surface text-text-muted border border-white/5'
                      }`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className={`text-xl font-bold font-serif ${isCompleted ? 'text-white' : 'text-text-muted'}`}>
                          {step.label}
                        </h3>
                        {isActive && (
                          <p className="text-primary text-sm font-medium mt-1 animate-pulse tracking-wide">
                            Currently happening...
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="glass-card p-8">
            <h3 className="font-serif font-bold text-2xl mb-6 text-white border-b border-white/10 pb-4">Receipt</h3>
            <div className="space-y-4">
              {order.items.map(item => (
                <div key={item._id} className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                  <span className="text-text-muted"><span className="text-primary font-bold mr-2 uppercase">{item.quantity}X</span> {item.name}</span>
                  <span className="font-bold text-white">₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 pt-4 border-t border-white/10 flex justify-between items-center">
              <span className="font-serif text-2xl text-text-muted">Total</span>
              <span className="font-bold text-3xl text-primary">₹{order.total.toFixed(2)}</span>
            </div>
            {order.paymentStatus === 'paid' && (
              <div className="mt-6 inline-block bg-primary/20 text-primary px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border border-primary/30">
                Payment Completed
              </div>
            )}

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
  );
};

export default TrackingPage;
