import { useState, useEffect, useRef } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, TrendingDown, ShoppingBag, Users, Clock, XCircle, IndianRupee, Activity, Loader2, Power, Lock, X, Download, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import * as XLSX from 'xlsx';

const COLORS = ['#F59E0B', '#FBBF24', '#D97706', '#92400E', '#78350F'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface-dark border border-white/10 rounded-2xl p-3 shadow-2xl">
        <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-2">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-sm font-bold" style={{ color: p.color || '#F59E0B' }}>
            {p.name === 'revenue' ? `₹${Number(p.value).toLocaleString('en-IN')}` : `${p.value} orders`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week');
  const [isOrdering, setIsOrdering] = useState(true);
  const [togglingOrder, setTogglingOrder] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const ORDERING_PIN = '1234'; // Change this PIN as needed
  const pinInputRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/admin/dashboard`);
        setData(res.data);
      } catch (err) {
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };
    // Also fetch current ordering status
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/admin/settings`);
        setIsOrdering(res.data.isOrderingEnabled !== false);
      } catch (err) { /* ignore */ }
    };
    fetchData();
    fetchSettings();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleRequest = () => {
    setPin('');
    setPinError('');
    setShowPinModal(true);
    setTimeout(() => pinInputRef.current?.focus(), 100);
  };

  const handlePinSubmit = async () => {
    if (pin !== ORDERING_PIN) {
      setPinError('Incorrect PIN. Try again.');
      setPin('');
      return;
    }
    setShowPinModal(false);
    setTogglingOrder(true);
    try {
      const res = await axios.put(`${import.meta.env.VITE_API_URL}/admin/settings`, {
        isOrderingEnabled: !isOrdering
      });
      setIsOrdering(res.data.isOrderingEnabled);
    } catch (err) {
      console.error('Failed to toggle ordering:', err);
    } finally {
      setTogglingOrder(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
      <Loader2 className="w-12 h-12 animate-spin text-primary" />
      <p className="text-primary text-xs font-black uppercase tracking-widest">Loading Live Data...</p>
    </div>
  );

  const makeSheet = (rows) => {
    if (!rows.length) return XLSX.utils.json_to_sheet([{ Note: 'No data available' }]);
    const ws = XLSX.utils.json_to_sheet(rows);
    const colWidths = Object.keys(rows[0]).map(key => ({
      wch: Math.max(key.length, ...rows.map(r => String(r[key] ?? '').length)) + 2
    }));
    ws['!cols'] = colWidths;
    return ws;
  };

  const downloadReport = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/orders`);
      const orders = res.data;
      const wb = XLSX.utils.book_new();
      const IST = 'en-IN';

      // Sheet 1: All Orders
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
      XLSX.utils.book_append_sheet(wb, makeSheet(allRows), '📋 All Orders');

      // Sheet 2: By Day
      const dayMap = {};
      orders.forEach(order => {
        const d = new Date(order.timestamp);
        const key = d.toLocaleDateString(IST, { day: '2-digit', month: 'short', year: 'numeric' });
        if (!dayMap[key]) dayMap[key] = { date: key, weekday: d.toLocaleDateString(IST, { weekday: 'long' }), totalOrders: 0, paidOrders: 0, totalRevenue: 0, takeaway: 0, dinein: 0, items: {} };
        const day = dayMap[key];
        day.totalOrders++;
        if (order.paymentStatus === 'paid') { day.paidOrders++; day.totalRevenue += order.total; }
        if (order.orderType === 'takeaway') day.takeaway++; else day.dinein++;
        order.items.forEach(i => { day.items[i.name] = (day.items[i.name] || 0) + i.quantity; });
      });
      const dayRows = Object.values(dayMap).map(d => ({
        'Date': d.date, 'Day': d.weekday,
        'Total Orders': d.totalOrders, 'Paid Orders': d.paidOrders,
        'Total Revenue (₹)': parseFloat(d.totalRevenue.toFixed(2)),
        'Avg Order Value (₹)': d.paidOrders > 0 ? parseFloat((d.totalRevenue / d.paidOrders).toFixed(2)) : 0,
        'Takeaway Orders': d.takeaway, 'Dine-In Orders': d.dinein,
        'Top Selling Item': Object.entries(d.items).sort((a, b) => b[1] - a[1])[0]?.[0] || '-',
      }));
      XLSX.utils.book_append_sheet(wb, makeSheet(dayRows), '📅 By Day');

      // Sheet 3: By Week
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
      XLSX.utils.book_append_sheet(wb, makeSheet(weekRows), '📆 By Week');

      // Sheet 4: By Month
      const monthMap = {};
      orders.forEach(order => {
        const d = new Date(order.timestamp);
        const key = d.toLocaleDateString(IST, { month: 'long', year: 'numeric' });
        if (!monthMap[key]) monthMap[key] = { month: key, sortKey: d.getFullYear() * 100 + d.getMonth(), totalOrders: 0, paidOrders: 0, totalRevenue: 0, takeaway: 0, dinein: 0, items: {}, customers: new Set() };
        const mo = monthMap[key];
        mo.totalOrders++;
        if (order.paymentStatus === 'paid') { mo.paidOrders++; mo.totalRevenue += order.total; }
        if (order.orderType === 'takeaway') mo.takeaway++; else mo.dinein++;
        if (order.customerName) mo.customers.add(order.customerName);
        order.items.forEach(i => { mo.items[i.name] = (mo.items[i.name] || 0) + i.quantity; });
      });
      const monthRows = Object.values(monthMap).sort((a, b) => a.sortKey - b.sortKey).map(m => ({
        'Month': m.month, 'Total Orders': m.totalOrders, 'Paid Orders': m.paidOrders,
        'Total Revenue (₹)': parseFloat(m.totalRevenue.toFixed(2)),
        'Avg Order Value (₹)': m.paidOrders > 0 ? parseFloat((m.totalRevenue / m.paidOrders).toFixed(2)) : 0,
        'Takeaway Orders': m.takeaway, 'Dine-In Orders': m.dinein,
        'Unique Customers': m.customers.size,
        'Top 3 Items': Object.entries(m.items).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, q]) => `${n} (${q})`).join(', ') || '-',
      }));
      XLSX.utils.book_append_sheet(wb, makeSheet(monthRows), '🗓️ By Month');

      const today = new Date().toLocaleDateString(IST, { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
      XLSX.writeFile(wb, `CaPhe-Bistro-Report-${today}.xlsx`);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export report. Please try again.');
    }
  };

  const kpis = [
    { label: 'Total Revenue', value: `₹${Number(data?.kpis?.totalRevenue || 0).toLocaleString('en-IN')}`, change: data?.kpis?.revenueGrowth || '0%', up: !String(data?.kpis?.revenueGrowth).startsWith('-'), icon: IndianRupee, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
    { label: 'Total Orders', value: data?.kpis?.totalOrders || 0, change: 'Today', up: true, icon: ShoppingBag, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
    { label: 'Active Orders', value: data?.kpis?.activeOrders || 0, change: 'Live Now', up: true, icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
    { label: 'Customers Today', value: data?.kpis?.customersToday || 0, change: 'Unique visitors', up: true, icon: Users, color: 'text-violet-400', bg: 'bg-violet-400/10', border: 'border-violet-400/20' },
    { label: 'Stock Alerts', value: data?.lowStockAlerts || 0, change: data?.lowStockAlerts > 0 ? 'Needs attention' : 'All stocked', up: data?.lowStockAlerts === 0, icon: Clock, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20' },
    { label: 'Cancelled', value: data?.kpis?.cancelledOrders || 0, change: 'Today', up: false, icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
  ];

  const statusCounts = data?.statusCounts || {};
  const orderStatusCards = [
    { label: 'Pending', count: statusCounts.placed || 0, color: 'bg-orange-500', light: 'bg-orange-500/10 border-orange-500/20 text-orange-400' },
    { label: 'Preparing', count: statusCounts.preparing || 0, color: 'bg-blue-500', light: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
    { label: 'Ready', count: statusCounts.ready || 0, color: 'bg-primary', light: 'bg-primary/10 border-primary/20 text-primary' },
    { label: 'Completed', count: statusCounts.completed || 0, color: 'bg-emerald-500', light: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
  ];

  return (
    <div className="space-y-8">
      {/* PIN Modal */}
      <AnimatePresence>
        {showPinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowPinModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-surface-dark border border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center"
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${ isOrdering ? 'bg-red-500/10 border border-red-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
                <Lock className={`w-7 h-7 ${isOrdering ? 'text-red-400' : 'text-emerald-400'}`} />
              </div>
              <h3 className="text-white font-serif font-black text-2xl mb-1">
                {isOrdering ? 'Disable Ordering' : 'Enable Ordering'}
              </h3>
              <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest mb-6">
                Enter your admin PIN to confirm
              </p>
              <div className="relative mb-3">
                <input
                  ref={pinInputRef}
                  type="password"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => { setPin(e.target.value); setPinError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
                  placeholder="••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-center text-2xl font-black text-white tracking-[0.4em] focus:border-primary outline-none transition-all"
                />
              </div>
              {pinError && (
                <p className="text-red-400 text-[11px] font-bold uppercase tracking-widest mb-3">{pinError}</p>
              )}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowPinModal(false)}
                  className="flex-1 bg-white/5 border border-white/10 text-white/60 font-black text-[11px] uppercase tracking-widest py-3.5 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button
                  onClick={handlePinSubmit}
                  className={`flex-1 font-black text-[11px] uppercase tracking-widest py-3.5 rounded-xl transition-all ${ isOrdering ? 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white' : 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-white' }`}
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div {...fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif font-black text-white">Dashboard</h2>
          <p className="text-text-muted text-sm mt-1">Live data from your café. Refreshes every 30s.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Ordering Toggle */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleToggleRequest}
            disabled={togglingOrder}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border font-black text-[11px] uppercase tracking-widest transition-all ${
              isOrdering
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
            } disabled:opacity-50`}
          >
            {togglingOrder
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Power className={`w-4 h-4 ${isOrdering ? 'text-emerald-400' : 'text-red-400'}`} />}
            <span>{isOrdering ? 'Ordering: ON' : 'Ordering: OFF'}</span>
            <div className={`w-2 h-2 rounded-full ${isOrdering ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
          </motion.button>
          {/* Kitchen Printer — opens in new tab */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => window.open('/kitchen', '_blank')}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border border-violet-500/30 bg-violet-500/10 text-violet-400 font-black text-[11px] uppercase tracking-widest hover:bg-violet-500 hover:text-white transition-all"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Kitchen Printer</span>
          </motion.button>
          {/* Download Report */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={downloadReport}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border border-primary/30 bg-primary/10 text-primary font-black text-[11px] uppercase tracking-widest hover:bg-primary hover:text-background transition-all"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download Report</span>
          </motion.button>
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-emerald-400 text-[9px] font-black uppercase tracking-widest">Live</span>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className={`bg-surface border ${kpi.border} rounded-2xl p-4 hover:border-primary/30 transition-colors`}>
              <div className={`w-9 h-9 rounded-xl ${kpi.bg} border ${kpi.border} flex items-center justify-center mb-3`}>
                <Icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-black mb-1">{kpi.label}</p>
              <p className="text-xl font-black text-white leading-none">{kpi.value}</p>
              <div className="flex items-center gap-1 mt-2">
                {kpi.up ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-red-400" />}
                <span className={`text-[10px] font-bold ${kpi.up ? 'text-emerald-400' : 'text-red-400'}`}>{kpi.change}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Order Status Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {orderStatusCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.07 }}
            className={`flex items-center gap-4 p-4 rounded-2xl border ${s.light}`}>
            <div className={`w-3 h-10 rounded-full ${s.color}`} />
            <div>
              <p className="text-[10px] uppercase font-black tracking-widest opacity-70">{s.label}</p>
              <p className="text-3xl font-black text-white">{s.count}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Revenue Chart + Top Items */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
          className="xl:col-span-2 bg-surface border border-white/5 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white font-serif font-bold text-xl">Revenue Trend</h3>
              <p className="text-primary text-[10px] uppercase tracking-widest font-black mt-1">Last 7 Days</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data?.weeklyRevenue || []}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" name="revenue" stroke="#F59E0B" strokeWidth={2.5} fill="url(#colorRev)" dot={{ fill: '#F59E0B', strokeWidth: 0, r: 4 }} activeDot={{ r: 6, fill: '#FBBF24' }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
          className="bg-surface border border-white/5 rounded-3xl p-6">
          <h3 className="text-white font-serif font-bold text-xl mb-1">Top Items</h3>
          <p className="text-primary text-[10px] uppercase tracking-widest font-black mb-4">By Volume (30 days)</p>
          {(data?.topItems?.length > 0) ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={data.topItems} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                    {data.topItems.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} stroke="transparent" />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} sold`, '']} contentStyle={{ background: '#2E160C', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#FDF8F5' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {data.topItems.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-[11px] text-white/60 font-medium truncate max-w-[120px]">{item.name}</span>
                    </div>
                    <span className="text-[11px] font-black text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-white/20 text-sm">No order data yet</div>
          )}
        </motion.div>
      </div>

      {/* Peak Hours + Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="xl:col-span-2 bg-surface border border-white/5 rounded-3xl p-6">
          <h3 className="text-white font-serif font-bold text-xl mb-1">Peak Order Timings</h3>
          <p className="text-primary text-[10px] uppercase tracking-widest font-black mb-6">Today's Activity by Hour</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data?.peakHours || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="hour" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="orders" name="orders" fill="#F59E0B" radius={[6, 6, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-surface border border-white/5 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white font-serif font-bold text-xl">Live Activity</h3>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-emerald-400 text-[9px] font-black uppercase tracking-widest">Live</span>
            </div>
          </div>
          <div className="space-y-4 overflow-y-auto max-h-56 pr-1">
            {(data?.recentActivity || []).map((a, i) => (
              <div key={a._id} className="flex gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${a.orderStatus === 'completed' ? 'bg-emerald-400' : a.orderStatus === 'placed' ? 'bg-blue-400' : 'bg-primary'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-white">{a.billNumber || `Order #${a._id.toString().slice(-4).toUpperCase()}`}</p>
                  <p className="text-[10px] text-white/40 mt-0.5">{a.customerName || 'Walk-in'} • ₹{a.total} • {a.orderStatus}</p>
                </div>
                <span className="text-[9px] text-white/20 font-bold flex-shrink-0 mt-0.5">
                  {new Date(a.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            {(!data?.recentActivity?.length) && (
              <p className="text-white/20 text-sm text-center py-8">No recent activity</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
