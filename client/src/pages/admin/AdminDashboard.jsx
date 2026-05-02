import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, TrendingDown, ShoppingBag, Users, Clock, XCircle, IndianRupee, Activity, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

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
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
      <Loader2 className="w-12 h-12 animate-spin text-primary" />
      <p className="text-primary text-xs font-black uppercase tracking-widest">Loading Live Data...</p>
    </div>
  );

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
      <motion.div {...fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif font-black text-white">Dashboard</h2>
          <p className="text-text-muted text-sm mt-1">Live data from your café. Refreshes every 30s.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full w-fit">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-emerald-400 text-[9px] font-black uppercase tracking-widest">Live</span>
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
              <p className="text-primary text-[10px] uppercase tracking-widest font-black mt-1">Weekly Overview</p>
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
                  <p className="text-[11px] font-bold text-white">Order #{a._id.toString().slice(-4).toUpperCase()}</p>
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
