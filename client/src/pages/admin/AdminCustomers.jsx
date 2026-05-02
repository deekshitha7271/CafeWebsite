import { useState, useEffect } from 'react';
import { Search, Filter, Star, Phone, Mail, Award, TrendingUp, User, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

const tagColors = {
    VIP: 'bg-primary/20 text-primary border-primary/30',
    Platinum: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    Regular: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    New: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

const AdminCustomers = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        axios.get(`${import.meta.env.VITE_API_URL}/admin/customers`)
            .then(res => setCustomers(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const filtered = customers.filter(c =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search)
    );

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

    const totalSpent = customers.reduce((a, c) => a + (c.spent || 0), 0);
    const totalPoints = customers.reduce((a, c) => a + (c.points || 0), 0);
    const vipCount = customers.filter(c => c.tag === 'VIP' || c.tag === 'Platinum').length;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-serif font-black text-white">Customers</h2>
                <p className="text-text-muted text-sm mt-1">{customers.length} registered customers</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Customers', value: customers.length, icon: User, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
                    { label: 'VIP / Platinum', value: vipCount, icon: Award, color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
                    { label: 'Total Revenue', value: `₹${totalSpent.toLocaleString('en-IN')}`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
                    { label: 'Points Issued', value: totalPoints.toLocaleString(), icon: Star, color: 'text-violet-400', bg: 'bg-violet-400/10 border-violet-400/20' },
                ].map((s, i) => {
                    const Icon = s.icon;
                    return (
                        <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                            className={`bg-surface border ${s.bg} rounded-2xl p-4 flex items-center gap-4`}>
                            <div className={`w-10 h-10 rounded-xl ${s.bg} border flex items-center justify-center`}><Icon className={`w-5 h-5 ${s.color}`} /></div>
                            <div><p className="text-[10px] text-white/40 uppercase font-black tracking-widest">{s.label}</p>
                                <p className="text-xl font-black text-white">{s.value}</p></div>
                        </motion.div>
                    );
                })}
            </div>

            <div className="bg-surface border border-white/5 rounded-3xl overflow-hidden">
                <div className="p-5 border-b border-white/5 flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, phone..."
                            className="w-full bg-surface-dark border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:border-primary/40 placeholder:text-white/20" />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="border-b border-white/5">
                            {['Customer', 'Contact', 'Orders', 'Total Spent', 'Points', 'Last Visit', 'Tag'].map(h => (
                                <th key={h} className="text-left text-[10px] font-black text-white/30 uppercase tracking-widest px-5 py-4">{h}</th>
                            ))}
                        </tr></thead>
                        <tbody>
                            {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-16 text-white/20">No registered customers yet.</td></tr>}
                            {filtered.map((c, i) => (
                                <motion.tr key={c._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-black text-primary text-sm flex-shrink-0">
                                                {(c.name || 'U')[0].toUpperCase()}
                                            </div>
                                            <p className="font-bold text-white text-[13px]">{c.name}</p>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        {c.phone && <p className="text-white/60 text-[11px] flex items-center gap-1.5"><Phone className="w-3 h-3" />{c.phone}</p>}
                                        <p className="text-white/30 text-[10px] mt-1 flex items-center gap-1.5"><Mail className="w-3 h-3" />{c.email}</p>
                                    </td>
                                    <td className="px-5 py-4 font-black text-white">{c.orders}</td>
                                    <td className="px-5 py-4 font-black text-primary">₹{(c.spent || 0).toLocaleString('en-IN')}</td>
                                    <td className="px-5 py-4"><div className="flex items-center gap-1.5"><Star className="w-3 h-3 text-primary" /><span className="font-black text-white text-[12px]">{c.points}</span></div></td>
                                    <td className="px-5 py-4 text-white/40 text-[11px]">{c.last}</td>
                                    <td className="px-5 py-4"><span className={`px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${tagColors[c.tag] || tagColors.New}`}>{c.tag}</span></td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminCustomers;
