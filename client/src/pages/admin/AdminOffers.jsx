import { useState, useEffect } from 'react';
import { Tag, Plus, Calendar, Percent, Trash2, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const catColors = {
    General: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Coffee: 'bg-primary/10 text-primary border-primary/20',
    Promotional: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    Weekend: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Loyalty: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

const EMPTY = { code: '', type: 'percent', value: '', description: '', category: 'General', maxUses: 100, expiry: '' };

const AdminOffers = () => {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState(EMPTY);

    const fetchCoupons = () => {
        axios.get(`${import.meta.env.VITE_API_URL}/admin/coupons`)
            .then(res => setCoupons(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchCoupons(); }, []);

    const handleCreate = async () => {
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/admin/coupons`, form);
            setShowCreate(false); setForm(EMPTY); fetchCoupons();
        } catch (err) { alert(err.response?.data?.error || 'Failed to create coupon'); }
    };

    const handleToggle = async (id, active) => {
        await axios.put(`${import.meta.env.VITE_API_URL}/admin/coupons/${id}`, { active: !active });
        fetchCoupons();
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this coupon?')) return;
        await axios.delete(`${import.meta.env.VITE_API_URL}/admin/coupons/${id}`);
        fetchCoupons();
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-serif font-black text-white">Offers & Coupons</h2>
                    <p className="text-text-muted text-sm mt-1">{coupons.filter(c => c.active).length} active promotions in database</p>
                </div>
                <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-5 py-3 bg-primary text-background rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-primary-light transition-all w-fit">
                    <Plus className="w-4 h-4" /> Create Coupon
                </button>
            </div>

            <AnimatePresence>
                {showCreate && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="bg-surface border border-primary/30 rounded-3xl p-6 overflow-hidden">
                        <h3 className="text-white font-serif font-bold text-xl mb-5">New Coupon</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
                            {[
                                { key: 'code', label: 'Coupon Code', type: 'text', placeholder: 'e.g. SAVE20' },
                                { key: 'value', label: 'Discount Value', type: 'number', placeholder: 'e.g. 20' },
                                { key: 'maxUses', label: 'Max Uses', type: 'number', placeholder: 'e.g. 500' },
                                { key: 'expiry', label: 'Expiry Date', type: 'date', placeholder: '' },
                                { key: 'description', label: 'Description', type: 'text', placeholder: 'Describe the offer...' },
                                { key: 'category', label: 'Category', type: 'text', placeholder: 'General / Coffee / Weekend' },
                            ].map(f => (
                                <div key={f.key}>
                                    <label className="text-[10px] text-white/40 uppercase font-black tracking-widest block mb-2">{f.label}</label>
                                    <input type={f.type} placeholder={f.placeholder} value={form[f.key]}
                                        onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                                        className="w-full bg-surface-dark border border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary/50 text-white placeholder:text-white/20" />
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <button onClick={handleCreate} className="px-6 py-3 bg-primary text-background rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-primary-light transition-all">Save to Database</button>
                            <button onClick={() => setShowCreate(false)} className="px-6 py-3 border border-white/10 text-white/40 rounded-xl text-[11px] font-black uppercase tracking-widest hover:text-white transition-all">Cancel</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Active', value: coupons.filter(c => c.active).length, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
                    { label: 'Total Redeemed', value: coupons.reduce((a, c) => a + (c.uses || 0), 0), color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
                    { label: 'Expiring Soon', value: coupons.filter(c => c.expiry && new Date(c.expiry) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' },
                    { label: 'Inactive', value: coupons.filter(c => !c.active).length, color: 'text-white/40', bg: 'bg-white/5 border-white/10' },
                ].map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                        className={`bg-surface border ${s.bg} rounded-2xl p-4`}>
                        <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">{s.label}</p>
                        <p className={`text-3xl font-black mt-1 ${s.color}`}>{s.value}</p>
                    </motion.div>
                ))}
            </div>

            {coupons.length === 0 ? (
                <div className="text-center py-20 bg-surface border border-white/5 rounded-3xl">
                    <Tag className="w-12 h-12 text-white/10 mx-auto mb-4" />
                    <p className="text-white/30">No coupons yet. Create your first promo!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {coupons.map((c, i) => (
                        <motion.div key={c._id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }}
                            className={`bg-surface border rounded-3xl p-5 transition-all ${c.active ? 'border-white/5 hover:border-primary/20' : 'border-white/[0.03] opacity-50'}`}>
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-primary/20 p-2.5 rounded-2xl border border-primary/30"><Tag className="w-5 h-5 text-primary" /></div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-black text-white text-lg tracking-wider">{c.code}</p>
                                            <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${catColors[c.category] || catColors.General}`}>{c.category}</span>
                                        </div>
                                        <p className="text-white/40 text-[11px] mt-0.5">{c.description}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleToggle(c._id, c.active)} className="text-white/20 hover:text-primary transition-colors">
                                        {c.active ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5" />}
                                    </button>
                                    <button onClick={() => handleDelete(c._id)} className="text-white/20 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                                <div className="flex items-center gap-1.5 text-white/40"><Percent className="w-3 h-3" /><span className="font-bold">{c.value}{c.type === 'percent' ? '%' : ''} off</span></div>
                                <div className="flex items-center gap-1.5 text-white/40"><Calendar className="w-3 h-3" /><span>Expires {c.expiry ? new Date(c.expiry).toLocaleDateString('en-IN') : '—'}</span></div>
                                <div className="text-right"><p className="font-black text-white">{c.uses || 0}<span className="text-white/30">/{c.maxUses}</span></p><p className="text-white/30">redeemed</p></div>
                            </div>
                            <div className="mt-3 h-1 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, ((c.uses || 0) / c.maxUses) * 100)}%` }} />
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminOffers;
