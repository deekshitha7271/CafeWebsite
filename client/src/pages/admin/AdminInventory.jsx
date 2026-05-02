import { useState, useEffect } from 'react';
import { AlertTriangle, Package, TrendingDown, RefreshCw, Plus, Search, Loader2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

const statusConfig = {
    good: { label: 'In Stock', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20', bar: 'bg-emerald-500' },
    warning: { label: 'Low Stock', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', bar: 'bg-yellow-500' },
    critical: { label: 'Critical', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', bar: 'bg-red-500' },
};

const EMPTY_FORM = { name: '', category: 'Coffee', unit: 'kg', stock: '', minStock: 5, maxStock: 100, costPerUnit: '' };

const AdminInventory = () => {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);

    const fetchInventory = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/admin/inventory`);
            setInventory(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchInventory(); }, []);

    const handleRestock = async (id) => {
        const qty = parseFloat(prompt('Enter restock quantity:') || 0);
        if (!qty) return;
        await axios.put(`${import.meta.env.VITE_API_URL}/admin/inventory/${id}/restock`, { quantity: qty });
        fetchInventory();
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this item?')) return;
        await axios.delete(`${import.meta.env.VITE_API_URL}/admin/inventory/${id}`);
        fetchInventory();
    };

    const handleAdd = async () => {
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/admin/inventory`, form);
            setShowAdd(false); setForm(EMPTY_FORM); fetchInventory();
        } catch (err) { alert(err.message); }
    };

    const critical = inventory.filter(i => i.status === 'critical');
    const filtered = inventory.filter(i => {
        const matchSearch = i.name?.toLowerCase().includes(search.toLowerCase()) || i.category?.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === 'all' || i.status === filter;
        return matchSearch && matchFilter;
    });

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-serif font-black text-white">Inventory</h2>
                    <p className="text-text-muted text-sm mt-1">{inventory.length} items tracked • Live sync</p>
                </div>
                <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 px-5 py-3 bg-primary text-background rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-primary-light transition-all w-fit">
                    <Plus className="w-4 h-4" /> Add Item
                </button>
            </div>

            {/* Add Form */}
            {showAdd && (
                <div className="bg-surface border border-primary/30 rounded-3xl p-6">
                    <h3 className="text-white font-serif font-bold text-xl mb-4">New Inventory Item</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        {[
                            { key: 'name', label: 'Item Name', type: 'text' },
                            { key: 'category', label: 'Category', type: 'text' },
                            { key: 'unit', label: 'Unit', type: 'text' },
                            { key: 'stock', label: 'Current Stock', type: 'number' },
                            { key: 'minStock', label: 'Min Stock', type: 'number' },
                            { key: 'costPerUnit', label: 'Cost/Unit (₹)', type: 'number' },
                        ].map(f => (
                            <div key={f.key}>
                                <label className="text-[10px] text-white/40 uppercase font-black tracking-widest block mb-1">{f.label}</label>
                                <input type={f.type} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                                    className="w-full bg-surface-dark border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-primary/40 text-white" />
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleAdd} className="px-6 py-2.5 bg-primary text-background rounded-xl text-[11px] font-black uppercase tracking-widest">Add Item</button>
                        <button onClick={() => setShowAdd(false)} className="px-6 py-2.5 border border-white/10 text-white/40 rounded-xl text-[11px] font-black uppercase tracking-widest">Cancel</button>
                    </div>
                </div>
            )}

            {critical.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center gap-4">
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <div>
                        <p className="text-red-400 font-black text-sm">Critical Stock Alert</p>
                        <p className="text-red-400/70 text-[11px] mt-0.5">{critical.map(c => c.name).join(', ')} — restock immediately</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Items', value: inventory.length, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20', icon: Package },
                    { label: 'In Stock', value: inventory.filter(i => i.status === 'good').length, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20', icon: Package },
                    { label: 'Low Stock', value: inventory.filter(i => i.status === 'warning').length, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', icon: TrendingDown },
                    { label: 'Critical', value: critical.length, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', icon: AlertTriangle },
                ].map((s, i) => {
                    const Icon = s.icon;
                    return (
                        <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                            className={`bg-surface border ${s.bg} rounded-2xl p-4 flex items-center gap-4`}>
                            <div className={`w-10 h-10 rounded-xl ${s.bg} border flex items-center justify-center`}><Icon className={`w-5 h-5 ${s.color}`} /></div>
                            <div><p className="text-[10px] text-white/40 uppercase font-black tracking-widest">{s.label}</p>
                                <p className="text-2xl font-black text-white">{s.value}</p></div>
                        </motion.div>
                    );
                })}
            </div>

            <div className="bg-surface border border-white/5 rounded-3xl overflow-hidden">
                <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..."
                            className="w-full bg-surface-dark border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:border-primary/40 placeholder:text-white/20" />
                    </div>
                    <div className="flex gap-2 bg-surface-dark p-1.5 rounded-xl border border-white/5">
                        {['all', 'critical', 'warning', 'good'].map(f => (
                            <button key={f} onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-primary text-background' : 'text-white/40 hover:text-white'}`}>{f}</button>
                        ))}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="border-b border-white/5">
                            {['Item', 'Category', 'Stock Level', 'Remaining', 'Unit Cost', 'Last Restocked', 'Status', 'Actions'].map(h => (
                                <th key={h} className="text-left text-[10px] font-black text-white/30 uppercase tracking-widest px-5 py-4">{h}</th>
                            ))}
                        </tr></thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr><td colSpan={8} className="text-center py-16 text-white/20">No items found. Add your first inventory item.</td></tr>
                            )}
                            {filtered.map((item, i) => {
                                const pct = Math.min(100, (item.stock / (item.maxStock || 100)) * 100);
                                const s = statusConfig[item.status] || statusConfig.good;
                                return (
                                    <motion.tr key={item._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                                        className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                        <td className="px-5 py-4 font-bold text-white text-[13px]">{item.name}</td>
                                        <td className="px-5 py-4 text-white/40 text-[11px]">{item.category}</td>
                                        <td className="px-5 py-4 w-40">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                    <div className={`h-full ${s.bar} rounded-full`} style={{ width: `${pct}%` }} />
                                                </div>
                                                <span className="text-[10px] text-white/40 font-bold w-8 text-right">{Math.round(pct)}%</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 font-black text-white">{item.stock} <span className="text-white/30 font-normal">{item.unit}</span></td>
                                        <td className="px-5 py-4 text-white/60 text-[12px]">₹{item.costPerUnit}</td>
                                        <td className="px-5 py-4 text-white/40 text-[11px]">{item.lastRestocked}</td>
                                        <td className="px-5 py-4"><span className={`px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${s.bg} ${s.color}`}>{s.label}</span></td>
                                        <td className="px-5 py-4">
                                            <div className="flex gap-2">
                                                <button onClick={() => handleRestock(item._id)} className="flex items-center gap-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black text-white/50 hover:text-primary hover:border-primary/30 transition-all">
                                                    <RefreshCw className="w-3 h-3" /> Restock
                                                </button>
                                                <button onClick={() => handleDelete(item._id)} className="p-1.5 text-white/20 hover:text-red-400 transition-colors">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminInventory;
