import { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { IndianRupee, TrendingUp, ShoppingBag, Smartphone, Loader2 } from 'lucide-react';
import axios from 'axios';

const COLORS = ['#F59E0B', '#FBBF24', '#D97706'];

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-surface-dark border border-white/10 rounded-2xl p-3 shadow-2xl">
                <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-2">{label}</p>
                {payload.map((p, i) => (
                    <p key={i} className="text-sm font-bold" style={{ color: p.color || '#F59E0B' }}>
                        {p.name === 'revenue' || p.name === 'profit' ? `₹${Number(p.value).toLocaleString('en-IN')}` : p.value}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const AdminAnalytics = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get(`${import.meta.env.VITE_API_URL}/admin/analytics`)
            .then(res => setData(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

    const k = data?.kpis || {};

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-serif font-black text-white">Analytics & Reports</h2>
                <p className="text-text-muted text-sm mt-1">All-time business intelligence from your database</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Revenue', value: `₹${Number(k.totalRevenue || 0).toLocaleString('en-IN')}`, icon: IndianRupee, color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
                    { label: 'Net Profit (~38%)', value: `₹${Number(k.netProfit || 0).toLocaleString('en-IN')}`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
                    { label: 'Total Orders', value: k.totalOrders || 0, icon: ShoppingBag, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
                    { label: 'Online Orders', value: k.onlineOrders || 0, icon: Smartphone, color: 'text-violet-400', bg: 'bg-violet-400/10 border-violet-400/20' },
                ].map((s, i) => {
                    const Icon = s.icon;
                    return (
                        <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                            className={`bg-surface border ${s.bg} rounded-2xl p-4`}>
                            <div className={`w-9 h-9 rounded-xl ${s.bg} border flex items-center justify-center mb-3`}><Icon className={`w-4 h-4 ${s.color}`} /></div>
                            <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">{s.label}</p>
                            <p className="text-2xl font-black text-white mt-1">{s.value}</p>
                        </motion.div>
                    );
                })}
            </div>

            {/* Revenue & Profit Chart */}
            <div className="bg-surface border border-white/5 rounded-3xl p-6">
                <h3 className="text-white font-serif font-bold text-xl mb-1">Revenue vs Profit</h3>
                <p className="text-primary text-[10px] uppercase tracking-widest font-black mb-6">Monthly Trend</p>
                {(data?.monthlyData?.length > 0) ? (
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={data.monthlyData}>
                            <defs>
                                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.25} /><stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} /><stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend formatter={v => <span className="text-white/50 text-[11px] capitalize">{v}</span>} />
                            <Area type="monotone" dataKey="revenue" name="revenue" stroke="#F59E0B" strokeWidth={2} fill="url(#revGrad)" />
                            <Area type="monotone" dataKey="profit" name="profit" stroke="#10B981" strokeWidth={2} fill="url(#profGrad)" />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : <div className="flex items-center justify-center h-40 text-white/20">No sales data yet. Start accepting orders!</div>}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Platform Breakdown */}
                <div className="bg-surface border border-white/5 rounded-3xl p-6">
                    <h3 className="text-white font-serif font-bold text-xl mb-1">Order Type Breakdown</h3>
                    <p className="text-primary text-[10px] uppercase tracking-widest font-black mb-6">By Order Source</p>
                    <div className="space-y-5">
                        {(data?.platformData || []).map((p, i) => {
                            const maxOrders = Math.max(...(data?.platformData || [{ orders: 1 }]).map(x => x.orders), 1);
                            const pct = (p.orders / maxOrders) * 100;
                            return (
                                <div key={p.platform} className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-white font-bold text-sm">{p.platform}</span>
                                        <div className="text-right">
                                            <span className="text-white font-black text-sm">{p.orders} orders</span>
                                            <span className="text-white/30 text-sm"> • ₹{Number(p.revenue || 0).toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: i * 0.1 + 0.3, duration: 0.8 }}
                                            className="h-full rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                                    </div>
                                </div>
                            );
                        })}
                        {!data?.platformData?.length && <p className="text-white/20 text-sm text-center py-8">No order data yet</p>}
                    </div>
                </div>

                {/* Top Items */}
                <div className="bg-surface border border-white/5 rounded-3xl p-6">
                    <h3 className="text-white font-serif font-bold text-xl mb-1">Top Selling Items</h3>
                    <p className="text-primary text-[10px] uppercase tracking-widest font-black mb-6">By Revenue (All-time)</p>
                    <div className="space-y-4">
                        {(data?.topItems || []).map((item, i) => (
                            <div key={item.name} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-colors">
                                <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-black text-primary text-[11px] flex-shrink-0">{i + 1}</div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-white text-[13px] truncate">{item.name}</p>
                                    <p className="text-white/30 text-[11px]">{item.orders} units sold</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-white text-[13px]">₹{Number(item.revenue || 0).toLocaleString('en-IN')}</p>
                                </div>
                            </div>
                        ))}
                        {!data?.topItems?.length && <p className="text-white/20 text-sm text-center py-8">No sales data yet</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminAnalytics;
