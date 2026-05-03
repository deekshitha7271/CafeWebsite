import { useState, useEffect } from 'react';
import { CreditCard, IndianRupee, Download, Search, CheckCircle, Clock, RefreshCw, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import InvoiceModal from '../../components/admin/InvoiceModal';

const methodColors = {
    UPI: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    Card: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Cash: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Online: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

const statusIcon = {
    paid: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />,
    pending: <Clock className="w-3.5 h-3.5 text-yellow-400" />,
    failed: <RefreshCw className="w-3.5 h-3.5 text-red-400" />,
};

const AdminPayments = () => {
    const [data, setData] = useState({ transactions: [], totalRevenue: 0, totalGST: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

    const handleViewInvoice = (transaction) => {
        setSelectedTransaction(transaction);
        setIsInvoiceOpen(true);
    };

    useEffect(() => {
        axios.get(`${import.meta.env.VITE_API_URL}/admin/payments`)
            .then(res => setData(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const filtered = data.transactions.filter(t =>
        t.orderId?.toLowerCase().includes(search.toLowerCase()) ||
        t.customer?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-serif font-black text-white">Payments & Billing</h2>
                <p className="text-text-muted text-sm mt-1">Transaction records from your database</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Revenue', value: `₹${Number(data.totalRevenue || 0).toLocaleString('en-IN')}`, color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
                    { label: 'GST Collected (5%)', value: `₹${Number(data.totalGST || 0).toFixed(0)}`, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
                    { label: 'Pending', value: data.transactions.filter(t => t.status === 'pending').length, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' },
                    { label: 'Total Transactions', value: data.transactions.length, color: 'text-white', bg: 'bg-white/5 border-white/10' },
                ].map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                        className={`bg-surface border ${s.bg} rounded-2xl p-4`}>
                        <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">{s.label}</p>
                        <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
                    </motion.div>
                ))}
            </div>

            <div className="bg-surface border border-white/5 rounded-3xl overflow-hidden">
                <div className="p-5 border-b border-white/5 flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search transactions..."
                            className="w-full bg-surface-dark border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:border-primary/40 placeholder:text-white/20" />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="border-b border-white/5">
                            {['Order', 'Customer', 'Amount', 'GST (5%)', 'Method', 'Status', 'Time', ''].map(h => (
                                <th key={h} className="text-left text-[10px] font-black text-white/30 uppercase tracking-widest px-5 py-4">{h}</th>
                            ))}
                        </tr></thead>
                        <tbody>
                            {filtered.length === 0 && <tr><td colSpan={8} className="text-center py-16 text-white/20">No transactions yet</td></tr>}
                            {filtered.map((t, i) => (
                                <motion.tr key={t._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                    <td className="px-5 py-4 font-black text-white text-[12px]">{t.orderId}</td>
                                    <td className="px-5 py-4 text-white/60 text-[12px]">{t.customer}</td>
                                    <td className="px-5 py-4 font-black text-white">₹{t.amount}</td>
                                    <td className="px-5 py-4 text-white/40 text-[11px]">₹{t.gst}</td>
                                    <td className="px-5 py-4">
                                        <span className={`px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${methodColors[t.method] || 'bg-white/5 text-white/40 border-white/10'}`}>{t.method}</span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-1.5">
                                            {statusIcon[t.status] || statusIcon.pending}
                                            <span className={`text-[11px] font-black capitalize ${t.status === 'paid' ? 'text-emerald-400' : t.status === 'pending' ? 'text-yellow-400' : 'text-red-400'}`}>{t.status}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-white/30 text-[10px]">{t.time}</td>
                                    <td className="px-5 py-4">
                                        <button 
                                            onClick={() => handleViewInvoice(t)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black text-white/40 hover:text-primary hover:border-primary/30 transition-all"
                                        >
                                            <Download className="w-3 h-3" /> Invoice
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <InvoiceModal 
                isOpen={isInvoiceOpen} 
                onClose={() => setIsInvoiceOpen(false)} 
                transaction={selectedTransaction} 
            />
        </div>
    );
};

export default AdminPayments;
