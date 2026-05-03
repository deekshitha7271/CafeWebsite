import { useEffect, useState } from 'react';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const socket = useSocket();

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/orders`);
      setOrders(res.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Fail-safe polling every 30 seconds
    const interval = setInterval(fetchOrders, 30000);
    const timeInterval = setInterval(() => setNow(new Date()), 1000);

    if (socket) {
      socket.on('order:new', (newOrder) => {
        setOrders(prev => {
          if (prev.some(o => o._id === newOrder._id)) return prev;
          return [newOrder, ...prev];
        });
      });

      socket.on('order:update', (updatedOrder) => {
        setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
      });
    }

    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
      if (socket) {
        socket.off('order:new');
        socket.off('order:update');
      }
    };
  }, [socket]);

  const updateStatus = async (orderId, newStatus, newPaymentStatus, estimatedReadyTime) => {
    try {
      const updateData = {};
      if (newStatus) updateData.orderStatus = newStatus;
      if (newPaymentStatus) updateData.paymentStatus = newPaymentStatus;
      if (estimatedReadyTime) updateData.estimatedReadyTime = estimatedReadyTime;

      // Optimistic Update
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, ...updateData } : o));

      await axios.put(`${import.meta.env.VITE_API_URL}/orders/${orderId}/status`, updateData);
    } catch (error) {
      console.error('Failed to update status:', error);
      fetchOrders(); // Rollback on error
    }
  };

  if (loading) {
    return <div className="flex justify-center p-20"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
  }

  const activeOrders = Array.isArray(orders) ? orders.filter(o => o.orderStatus !== 'ready') : [];
  const pastOrders = Array.isArray(orders) ? orders.filter(o => o.orderStatus === 'ready') : [];

  const OrderCard = ({ order, isActive }) => {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`glass-panel p-6 ${isActive ? 'border-2 border-primary/50 shadow-[0_0_20px_rgba(245,158,11,0.15)] bg-surface/50' : 'bg-surface-dark/40 opacity-70'}`}
      >
        <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-4">
          <div>
            <h3 className="font-serif font-bold text-2xl text-white">
              {order.orderType === 'takeaway' ? '🥡 Takeaway' : '🪑 Dine-in'}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <p className="text-[10px] text-text-muted uppercase tracking-widest border border-white/10 px-2 py-0.5 rounded-md bg-surface-dark">{new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              {order.customerName && (
                <span className="text-[10px] text-primary font-black uppercase tracking-widest px-2 py-0.5 bg-primary/10 rounded-md border border-primary/20">
                  {order.customerName}
                </span>
              )}
            </div>
            {order.arrivalTime && (
              <div className="flex items-center gap-2 mt-3">
                <span className={`flex items-center gap-1.5 text-[10px] border px-3 py-1.5 rounded-full font-black uppercase tracking-[0.2em] shadow-inner transition-colors duration-500 ${(() => {
                  const diff = new Date(order.arrivalTime) - now;
                  if (diff <= 0) return "bg-red-500/10 text-red-500 border-red-500/30";
                  if (diff <= 300000) return "bg-orange-500/10 text-orange-400 border-orange-500/30";
                  return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
                })()
                  }`}>
                  {(() => {
                    const diff = new Date(order.arrivalTime) - now;
                    if (diff <= 0) {
                      return <><div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></div> ARRIVED</>;
                    }
                    const mins = Math.floor(diff / 60000);
                    const secs = Math.floor((diff % 60000) / 1000);
                    return <><div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div> IN {mins}:{secs.toString().padStart(2, '0')} MINS</>;
                  })()}
                </span>
              </div>
            )}
          </div>
          <div className="text-right">
            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${order.orderStatus === 'placed' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' :
              order.orderStatus === 'preparing' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}>
              {order.orderStatus}
            </span>
            {order.paymentStatus === 'paid' ? (
              <div className="flex flex-col items-end gap-2">
                <p className="text-[10px] mt-3 text-emerald-400 font-black tracking-widest uppercase flex items-center justify-end gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  PAID
                </p>
                {order.relatedOrderId && (
                  <span className="text-[9px] font-black text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full uppercase tracking-widest">
                    Linked Order
                  </span>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-end gap-2">
                <p className="text-[10px] mt-3 text-orange-400 font-black tracking-widest uppercase flex items-center justify-end gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span>
                  CASH PENDING
                </p>
                {order.relatedOrderId && (
                  <span className="text-[9px] font-black text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full uppercase tracking-widest">
                    Linked Order
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3 mb-6 bg-surface-dark/50 p-4 rounded-xl border border-white/5">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center text-sm">
              <span className="text-text-muted font-medium"><span className="font-bold text-primary mr-3 text-base">{item.quantity}×</span> {item.name}</span>
            </div>
          ))}
        </div>

        {/* Actions Section */}
        <div className="flex flex-col gap-3 mt-6">
          {isActive && (
            <div className="flex gap-4">
              {order.orderStatus === 'placed' && (
                <button
                  onClick={() => updateStatus(order._id, 'preparing')}
                  className="flex-1 bg-surface-light border border-white/10 hover:border-white/30 hover:bg-surface text-white py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all"
                >
                  Start Preparing
                </button>
              )}
              {order.orderStatus === 'preparing' && (
                <div className="flex flex-col gap-3 w-full">
                  <div className="flex gap-2 mb-2 overflow-x-auto pb-2 hide-scrollbar">
                    {[10, 15, 20].map(mins => (
                      <button
                        key={mins}
                        onClick={() => {
                          const readyAt = new Date();
                          readyAt.setMinutes(readyAt.getMinutes() + mins);
                          updateStatus(order._id, null, null, readyAt);
                        }}
                        className="whitespace-nowrap px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-white hover:border-primary hover:bg-primary/10 transition-all flex-shrink-0"
                      >
                        +{mins}m
                      </button>
                    ))}
                  </div>
                  {order.estimatedReadyTime && (
                    <div className="bg-primary/10 border border-primary/20 p-3 rounded-xl mb-2 text-center">
                      <p className="text-[10px] font-black uppercase text-primary tracking-widest">
                        Target Ready: {new Date(order.estimatedReadyTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() => updateStatus(order._id, 'ready')}
                    className="w-full bg-primary hover:bg-primary-light hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] text-background py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all transform hover:scale-[1.02]"
                  >
                    Mark Ready
                  </button>
                </div>
              )}
            </div>
          )}

          {order.paymentStatus === 'pending' && (
            <button
              onClick={() => updateStatus(order._id, null, 'paid')}
              className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-background py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all mt-2"
            >
              Confirm Cash Payment Received
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div>
      <header className="mb-12 border-b border-white/10 pb-6">
        <h2 className="text-4xl font-serif font-bold text-white mb-2">Live Fleet</h2>
        <p className="text-primary text-sm uppercase tracking-widest font-bold">Real-time Kitchen Display</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7">
          <h3 className="text-2xl font-serif font-bold text-white mb-6 flex items-center gap-3">
            Active Priority
            <span className="bg-primary text-background font-sans text-sm font-black w-8 h-8 flex items-center justify-center rounded-full">
              {activeOrders.length}
            </span>
          </h3>
          <div className="space-y-6">
            <AnimatePresence>
              {activeOrders.map(order => <OrderCard key={order._id} order={order} isActive={true} />)}
              {activeOrders.length === 0 && (
                <div className="text-center py-20 bg-surface/30 rounded-3xl border border-white/5">
                  <p className="text-text-muted text-lg font-serif">No active orders right now.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="lg:col-span-5 relative">
          <div className="sticky top-10">
            <h3 className="text-xl font-serif font-bold text-text-muted mb-6">Completed / Pending</h3>
            <div className="space-y-4">
              {pastOrders.slice(0, 10).map(order => <OrderCard key={order._id} order={order} isActive={false} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOrders;
