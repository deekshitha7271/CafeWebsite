import { useState, useEffect } from 'react';
import { Star, MessageSquare, ThumbsUp, Flag, Search, Loader2, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

const catColors = {
    Food: 'bg-primary/10 text-primary border-primary/20',
    Service: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Ambience: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
};

const RatingStars = ({ rating }) => (
    <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(s => (
            <Star key={s} className={`w-3.5 h-3.5 ${s <= rating ? 'text-primary fill-primary' : 'text-white/10'}`} />
        ))}
    </div>
);

const AdminReviews = () => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');

    const fetchReviews = () => {
        axios.get(`${import.meta.env.VITE_API_URL}/admin/reviews`)
            .then(res => setReviews(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchReviews(); }, []);

    const markReplied = async (id) => {
        await axios.put(`${import.meta.env.VITE_API_URL}/admin/reviews/${id}`, { replied: true });
        fetchReviews();
    };

    const markFlagged = async (id) => {
        await axios.put(`${import.meta.env.VITE_API_URL}/admin/reviews/${id}`, { flagged: true });
        fetchReviews();
    };

    const avg = reviews.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : '–';
    const filtered = reviews.filter(r => {
        const matchSearch = r.customerName?.toLowerCase().includes(search.toLowerCase()) || r.comment?.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === 'all' || (filter === 'low' && r.rating <= 3) || (filter === 'high' && r.rating >= 4) || (filter === 'unreplied' && !r.replied);
        return matchSearch && matchFilter;
    });

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-serif font-black text-white">Reviews & Feedback</h2>
                <p className="text-text-muted text-sm mt-1">Customer feedback from your database</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Avg Rating', value: avg, suffix: '/ 5', color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
                    { label: 'Total Reviews', value: reviews.length, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
                    { label: 'Needs Reply', value: reviews.filter(r => !r.replied).length, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' },
                    { label: 'Complaints', value: reviews.filter(r => r.rating <= 2).length, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20' },
                ].map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                        className={`bg-surface border ${s.bg} rounded-2xl p-4`}>
                        <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">{s.label}</p>
                        <p className={`text-3xl font-black mt-1 ${s.color}`}>{s.value}{s.suffix && <span className="text-base font-bold opacity-50 ml-1">{s.suffix}</span>}</p>
                    </motion.div>
                ))}
            </div>

            <div className="bg-surface border border-white/5 rounded-3xl overflow-hidden">
                <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reviews..."
                            className="w-full bg-surface-dark border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:border-primary/40 placeholder:text-white/20" />
                    </div>
                    <div className="flex gap-2 bg-surface-dark p-1.5 rounded-xl border border-white/5">
                        {['all', 'high', 'low', 'unreplied'].map(f => (
                            <button key={f} onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-primary text-background' : 'text-white/40 hover:text-white'}`}>{f}</button>
                        ))}
                    </div>
                </div>

                <div className="divide-y divide-white/[0.03]">
                    {filtered.length === 0 && (
                        <div className="text-center py-16">
                            <Star className="w-10 h-10 text-white/10 mx-auto mb-3" />
                            <p className="text-white/20">No reviews yet. They'll appear here automatically when customers submit feedback.</p>
                        </div>
                    )}
                    {filtered.map((r, i) => (
                        <motion.div key={r._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }}
                            className={`p-5 hover:bg-white/[0.01] transition-colors ${r.flagged ? 'opacity-40' : ''}`}>
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-black text-[11px] flex-shrink-0">
                                    {(r.customerName || 'A')[0].toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                        <p className="font-bold text-white text-[14px]">{r.customerName}</p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <RatingStars rating={r.rating} />
                                            <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase ${catColors[r.category] || catColors.Food}`}>{r.category}</span>
                                            {r.replied && <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase">Replied</span>}
                                        </div>
                                        <span className="text-white/30 text-[10px] sm:ml-auto">{new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    </div>
                                    <p className="text-white/60 text-[13px] leading-relaxed">{r.comment}</p>
                                    <div className="flex items-center gap-3 mt-4">
                                        {!r.replied && (
                                            <button onClick={() => markReplied(r._id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black text-white/40 hover:text-primary hover:border-primary/30 transition-all">
                                                <MessageSquare className="w-3 h-3" /> Mark Replied
                                            </button>
                                        )}
                                        {!r.flagged && (
                                            <button onClick={() => markFlagged(r._id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black text-white/40 hover:text-red-400 hover:border-red-400/30 transition-all">
                                                <Flag className="w-3 h-3" /> Flag
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminReviews;
