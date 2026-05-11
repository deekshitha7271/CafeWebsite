import React, { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';
import { Loader2, Download, Printer, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// xlsx dynamically imported inside downloadExcel() — not in the initial bundle

// ─── PrinterStatusBadge ──────────────────────────────────────────────────────
const PrinterStatusBadge = ({ online }) => (
  <motion.div
    layout
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
    title={online ? 'Thermal printer bridge is connected' : 'Thermal printer bridge is offline'}
    className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl border text-[10px] font-black uppercase tracking-[0.18em] select-none backdrop-blur-md transition-colors duration-700 ${online
        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
        : 'bg-white/5 border-white/10 text-text-muted'
      }`}
  >
    <span className="relative flex h-2 w-2">
      {online ? (
        <>
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
        </>
      ) : (
        <span className="relative inline-flex rounded-full h-2 w-2 bg-white/20" />
      )}
    </span>
    {online ? <Printer className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
    {online ? 'Printer Online' : 'Printer Offline'}
  </motion.div>
);

// ─── OrderCard ───────────────────────────────────────────────────────────────
const OrderCard = React.memo(({ order, isActive, updateStatus, now, socket, printerOnline }) => {
  const handleReprint = useCallback(() => {
    if (socket) {
      socket.emit('admin_reprint_order', order);
      console.log('🔁 Reprint emitted for order', order._id || order.billNumber);
    }
  }, [socket, order]);

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
          <h3 className="font-serif font-bold text-2xl text-white flex items-center gap-3">
            <span className="text-primary">{order.billNumber || `#${order._id.slice(-4)}`}</span>
            <span>{order.orderType === 'takeaway' ? '🥡 Takeaway' : '🪑 Dine-in'}</span>
          </h3>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <p className="text-[10px] text-text-muted uppercase tracking-widest border border-white/10 px-2 py-0.5 rounded-md bg-surface-dark">
              {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
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
                if (diff <= 0) return 'bg-red-500/10 text-red-500 border-red-500/30';
                if (diff <= 300000) return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
                return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
              })()}`}>
                {(() => {
                  const diff = new Date(order.arrivalTime) - now;
                  if (diff <= 0) return <><div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" /> ARRIVED</>;
                  const mins = Math.floor(diff / 60000);
                  const secs = Math.floor((diff % 60000) / 1000);
                  return <><div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> IN {mins}:{secs.toString().padStart(2, '0')} MINS</>;
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
            <p className="text-[10px] mt-3 text-emerald-400 font-black tracking-widest uppercase flex items-center justify-end gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> PAID
            </p>
          ) : (
            <p className="text-[10px] mt-3 text-orange-400 font-black tracking-widest uppercase flex items-center justify-end gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" /> PAYMENT PENDING
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3 mb-6 bg-surface-dark/50 p-4 rounded-xl border border-white/5">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center text-sm">
            <span className="text-text-muted font-medium">
              <span className="font-bold text-primary mr-3 text-base">{item.quantity}×</span> {item.name}
            </span>
          </div>
        ))}
      </div>

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
            Confirm Payment (Override)
          </button>
        )}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleReprint}
          disabled={!socket}
          title={printerOnline ? 'Reprint KOT to kitchen printer' : 'Printer bridge is offline'}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border mt-1 text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${printerOnline
              ? 'bg-transparent border-white/10 text-text-muted hover:border-primary/40 hover:text-primary hover:bg-primary/5'
              : 'bg-transparent border-white/5 text-white/20 cursor-not-allowed'
            }`}
        >
          <Printer className="w-3 h-3" />
          Reprint KOT
        </motion.button>
      </div>
    </motion.div>
  );
});

// ─── AdminOrders ─────────────────────────────────────────────────────────────
const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [printerOnline, setPrinterOnline] = useState(false);
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

  // xlsx download — only imports the 220kB library when the button is clicked
  const makeSheet = (XLSX, rows) => {
    if (!rows.length) return XLSX.utils.json_to_sheet([{ Note: 'No data available' }]);
    const ws = XLSX.utils.json_to_sheet(rows);
    const colWidths = Object.keys(rows[0]).map(key => ({
      wch: Math.max(key.length, ...rows.map(r => String(r[key] ?? '').length)) + 2
    }));
    ws['!cols'] = colWidths;
    return ws;
  };

  const downloadExcel = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const IST = 'en-IN';

    const allRows = orders.map(order => ({
      'Bill No': order.billNumber || order._id.slice(-6).toUpperCase(),
      'Date': new Date(order.timestamp).toLocaleDateString(IST, { day: '2-digit', month: 'short', year: 'numeric' }),
      'Day': new Date(order.timestamp).toLocaleDateString(IST, { weekday: 'long' }),
      'Time': new Date(order.timestamp).toLocaleTimeString(IST, { hour: '2-digit', minute: '2-digit' }),
      'Customer Name': order.customerName || 'Walk-in',
      'Phone': order.customerPhone || '-',
      'Order Type': order.orderType === 'takeaway' ? 'Takeaway' : 'Dine-In',
      'Items': order.items.map(i => `${i.name} x${i.quantity}`).join(', '),
      'Item Count': order.items.reduce((s, i) => s + i.quantity, 0),
      'Subtotal (₹)': order.total,
      'Payment': order.paymentStatus.toUpperCase(),
      'Order Status': order.orderStatus.toUpperCase(),
    }));
    XLSX.utils.book_append_sheet(wb, makeSheet(XLSX, allRows), '📋 All Orders');

    const dayMap = {};
    orders.forEach(order => {
      const d = new Date(order.timestamp);
      const key = d.toLocaleDateString(IST, { day: '2-digit', month: 'short', year: 'numeric' });
      const weekday = d.toLocaleDateString(IST, { weekday: 'long' });
      if (!dayMap[key]) dayMap[key] = { date: key, weekday, totalOrders: 0, paidOrders: 0, totalRevenue: 0, takeaway: 0, dinein: 0, items: {} };
      const day = dayMap[key];
      day.totalOrders++;
      if (order.paymentStatus === 'paid') { day.paidOrders++; day.totalRevenue += order.total; }
      if (order.orderType === 'takeaway') day.takeaway++; else day.dinein++;
      order.items.forEach(i => { day.items[i.name] = (day.items[i.name] || 0) + i.quantity; });
    });
    const dayRows = Object.values(dayMap).map(d => ({
      'Date': d.date, 'Day': d.weekday, 'Total Orders': d.totalOrders, 'Paid Orders': d.paidOrders,
      'Total Revenue (₹)': parseFloat(d.totalRevenue.toFixed(2)),
      'Avg Order Value (₹)': d.paidOrders > 0 ? parseFloat((d.totalRevenue / d.paidOrders).toFixed(2)) : 0,
      'Takeaway Orders': d.takeaway, 'Dine-In Orders': d.dinein,
      'Top Selling Item': Object.entries(d.items).sort((a, b) => b[1] - a[1])[0]?.[0] || '-',
    }));
    XLSX.utils.book_append_sheet(wb, makeSheet(XLSX, dayRows), '📅 By Day');

    const weekMap = {};
    orders.forEach(order => {
      const d = new Date(order.timestamp);
      const startOfWeek = new Date(d); startOfWeek.setDate(d.getDate() - d.getDay());
      const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6);
      const fmt = dt => dt.toLocaleDateString(IST, { day: '2-digit', month: 'short' });
      const key = `${fmt(startOfWeek)} – ${fmt(endOfWeek)}`;
      if (!weekMap[key]) weekMap[key] = { week: key, sortKey: startOfWeek.getTime(), totalOrders: 0, paidOrders: 0, totalRevenue: 0, takeaway: 0, dinein: 0, items: {} };
      const week = weekMap[key];
      week.totalOrders++;
      if (order.paymentStatus === 'paid') { week.paidOrders++; week.totalRevenue += order.total; }
      if (order.orderType === 'takeaway') week.takeaway++; else week.dinein++;
      order.items.forEach(i => { week.items[i.name] = (week.items[i.name] || 0) + i.quantity; });
    });
    const weekRows = Object.values(weekMap).sort((a, b) => a.sortKey - b.sortKey).map(w => ({
      'Week': w.week, 'Total Orders': w.totalOrders, 'Paid Orders': w.paidOrders,
      'Total Revenue (₹)': parseFloat(w.totalRevenue.toFixed(2)),
      'Avg Order Value (₹)': w.paidOrders > 0 ? parseFloat((w.totalRevenue / w.paidOrders).toFixed(2)) : 0,
      'Takeaway Orders': w.takeaway, 'Dine-In Orders': w.dinein,
      'Top Selling Item': Object.entries(w.items).sort((a, b) => b[1] - a[1])[0]?.[0] || '-',
    }));
    XLSX.utils.book_append_sheet(wb, makeSheet(XLSX, weekRows), '📆 By Week');

    const monthMap = {};
    orders.forEach(order => {
      const d = new Date(order.timestamp);
      const key = d.toLocaleDateString(IST, { month: 'long', year: 'numeric' });
      const sortKey = d.getFullYear() * 100 + d.getMonth();
      if (!monthMap[key]) monthMap[key] = { month: key, sortKey, totalOrders: 0, paidOrders: 0, totalRevenue: 0, takeaway: 0, dinein: 0, items: {}, customers: new Set() };
      const mo = monthMap[key];
      mo.totalOrders++;
      if (order.paymentStatus === 'paid') { mo.paidOrders++; mo.totalRevenue += order.total; }
      if (order.orderType === 'takeaway') mo.takeaway++; else mo.dinein++;
      if (order.customerName) mo.customers.add(order.customerName);
      order.items.forEach(i => { mo.items[i.name] = (mo.items[i.name] || 0) + i.quantity; });
    });
    const monthRows = Object.values(monthMap).sort((a, b) => a.sortKey - b.sortKey).map(m => {
      const topItems = Object.entries(m.items).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, q]) => `${n} (${q})`).join(', ');
      return {
        'Month': m.month, 'Total Orders': m.totalOrders, 'Paid Orders': m.paidOrders,
        'Total Revenue (₹)': parseFloat(m.totalRevenue.toFixed(2)),
        'Avg Order Value (₹)': m.paidOrders > 0 ? parseFloat((m.totalRevenue / m.paidOrders).toFixed(2)) : 0,
        'Takeaway Orders': m.takeaway, 'Dine-In Orders': m.dinein,
        'Unique Customers': m.customers.size, 'Top 3 Items': topItems || '-',
      };
    });
    XLSX.utils.book_append_sheet(wb, makeSheet(XLSX, monthRows), '🗓️ By Month');

    const today = new Date().toLocaleDateString(IST, { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
    XLSX.writeFile(wb, `CaPhe-Bistro-Report-${today}.xlsx`);
  };

  useEffect(() => {
    fetchOrders();
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
      socket.on('printer_status', ({ online }) => {
        setPrinterOnline(online);
      });
    }

    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
      if (socket) {
        socket.off('order:new');
        socket.off('order:update');
        socket.off('printer_status');
      }
    };
  }, [socket]);

  const updateStatus = async (orderId, newStatus, newPaymentStatus, estimatedReadyTime) => {
    try {
      const updateData = {};
      if (newStatus) updateData.orderStatus = newStatus;
      if (newPaymentStatus) updateData.paymentStatus = newPaymentStatus;
      if (estimatedReadyTime) updateData.estimatedReadyTime = estimatedReadyTime;
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, ...updateData } : o));
      await axios.put(`${import.meta.env.VITE_API_URL}/orders/${orderId}/status`, updateData);
    } catch (error) {
      console.error('Failed to update status:', error);
      fetchOrders();
    }
  };

  const { activeOrders, pastOrders } = useMemo(() => ({
    activeOrders: orders.filter(o => o.paymentStatus === 'paid' && o.orderStatus !== 'completed' && o.orderStatus !== 'ready'),
    pastOrders: orders.filter(o => o.orderStatus === 'ready' || o.orderStatus === 'completed')
  }), [orders]);

  if (loading) return (
    <div className="flex justify-center p-20">
      <Loader2 className="w-12 h-12 animate-spin text-primary" />
    </div>
  );

  return (
    <div>
      <header className="mb-12 border-b border-white/10 pb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-4xl font-serif font-bold text-white mb-2">Live Fleet</h2>
          <p className="text-primary text-sm uppercase tracking-widest font-bold">Real-time Kitchen Display</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <PrinterStatusBadge online={printerOnline} />
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={downloadExcel}
            disabled={orders.length === 0}
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-background transition-all disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            Download Excel
          </motion.button>
        </div>
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
              {activeOrders.map(order => (
                <OrderCard key={order._id} order={order} isActive={true} updateStatus={updateStatus} now={now} socket={socket} printerOnline={printerOnline} />
              ))}
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
              {pastOrders.slice(0, 10).map(order => (
                <OrderCard key={order._id} order={order} isActive={false} updateStatus={updateStatus} now={now} socket={socket} printerOnline={printerOnline} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOrders;
