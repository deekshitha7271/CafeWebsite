import { motion } from 'framer-motion';
import { Bell, AlertTriangle, CheckCircle, CreditCard, Package, User, X, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';

const AdminNotifications = () => {
    const [notifs, setNotifs] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifs = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/admin/notifications`);
            setNotifs(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifs();
    }, []);

    const unread = notifs.filter(n => !n.read).length;

    const markAllRead = async () => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/admin/notifications/read-all`);
            setNotifs(prev => prev.map(n => ({ ...n, read: true })));
        } catch (err) {
            console.error(err);
        }
    };

    const dismiss = async (id) => {
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/admin/notifications/${id}`);
            setNotifs(prev => prev.filter(n => n._id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    const getTypeProps = (type) => {
        switch(type) {
            case 'order': return { icon: Bell, color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' };
            case 'payment': return { icon: CreditCard, color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' };
            case 'alert': return { icon: AlertTriangle, color: 'text-red-400 bg-red-400/10 border-red-400/20' };
            case 'complete': return { icon: CheckCircle, color: 'text-primary bg-primary/10 border-primary/20' };
            case 'staff': return { icon: User, color: 'text-violet-400 bg-violet-400/10 border-violet-400/20' };
            default: return { icon: Bell, color: 'text-white/40 bg-white/10 border-white/20' };
        }
    };

    const getRelativeTime = (dateStr) => {
        const diff = Math.floor((new Date() - new Date(dateStr)) / 60000);
        if (diff < 1) return 'Just now';
        if (diff < 60) return `${diff} min ago`;
        if (diff < 1440) return `${Math.floor(diff / 60)} hrs ago`;
        return `${Math.floor(diff / 1440)} days ago`;
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-serif font-black text-white">Notifications</h2>
                    <p className="text-text-muted text-sm mt-1">{unread} unread notifications</p>
                </div>
                {unread > 0 && (
                    <button onClick={markAllRead} className="px-5 py-3 bg-white/5 border border-white/10 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-all w-fit">
                        Mark All Read
                    </button>
                )}
            </div>

            <div className="space-y-3">
                {notifs.map((n, i) => {
                    const { icon: Icon, color } = getTypeProps(n.type);
                    return (
                        <motion.div key={n._id}
                            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: i * 0.05 }}
                            className={`flex items-start gap-4 p-5 rounded-2xl border transition-all ${n.read ? 'bg-surface border-white/5 opacity-60' : 'bg-surface border-white/10 hover:border-primary/20'}`}
                        >
                            <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center flex-shrink-0 ${color}`}>
                                <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className={`font-bold text-[14px] ${n.read ? 'text-white/60' : 'text-white'}`}>{n.title}</p>
                                            {!n.read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                                        </div>
                                        <p className="text-white/40 text-[12px] mt-1">{n.body}</p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="text-[10px] text-white/20 font-bold">{getRelativeTime(n.createdAt)}</span>
                                        <button onClick={() => dismiss(n._id)} className="text-white/10 hover:text-white/40 transition-colors">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}

                {notifs.length === 0 && (
                    <div className="text-center py-24 bg-surface border border-white/5 rounded-3xl">
                        <Bell className="w-12 h-12 text-white/10 mx-auto mb-4" />
                        <p className="text-white/30 font-serif text-lg">All caught up!</p>
                        <p className="text-white/20 text-sm mt-2">New notifications will appear here</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminNotifications;
