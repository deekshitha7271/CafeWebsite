import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';
import { Loader2, Activity, Bell, History, RefreshCw, X, CheckCircle, Package, Clock, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import KDSOrderCard from '../../components/admin/KDSOrderCard';

const KDSDashboard = () => {
    const [orders, setOrders] = useState([]);
    const [allOrders, setAllOrders] = useState([]); // Store all for history
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showNotifs, setShowNotifs] = useState(false);

    const socket = useSocket();
    const notificationSound = useRef(null);

    const fetchOrders = useCallback(async (isManual = false) => {
        if (isManual) setIsRefreshing(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/orders`);
            setAllOrders(res.data);
            // Only show PAID, non-completed orders in KDS Matrix
            setOrders(res.data.filter(o => o.paymentStatus === 'paid' && o.orderStatus !== 'completed'));
        } catch (error) {
            console.error('KDS fetch failed:', error);
        } finally {
            setLoading(false);
            if (isManual) setTimeout(() => setIsRefreshing(false), 600);
        }
    }, []);

    const fetchNotifs = useCallback(async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/admin/notifications`);
            setNotifications(res.data.slice(0, 10)); // Top 10 for the quick bell
        } catch (err) {
            console.error(err);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
        fetchNotifs();

        // Fallback polling every 30s in case socket misses an event
        const interval = setInterval(fetchOrders, 30000);

        // Professional Notification Sound
        notificationSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        notificationSound.current.preload = 'auto';

        if (socket) {
            socket.on('order:new', (newOrder) => {
                if (newOrder.paymentStatus !== 'paid') return;

                // Play Sound
                notificationSound.current?.play().catch(() => {
                    console.warn('Audio playback blocked by browser. User must click anywhere first.');
                });

                setOrders(prev => {
                    if (prev.some(o => o._id === newOrder._id)) return prev;
                    return [newOrder, ...prev];
                });
                fetchNotifs(); // Refresh bell
            });

            socket.on('order:update', (updatedOrder) => {
                setOrders(prev => {
                    if (updatedOrder.orderStatus === 'completed' || updatedOrder.paymentStatus !== 'paid') {
                        return prev.filter(o => o._id !== updatedOrder._id);
                    }
                    const exists = prev.some(o => o._id === updatedOrder._id);
                    if (!exists && updatedOrder.paymentStatus === 'paid') {
                        return [updatedOrder, ...prev];
                    }
                    return prev.map(o => o._id === updatedOrder._id ? updatedOrder : o);
                });
                fetchNotifs();
            });
        }

        return () => {
            clearInterval(interval);
            if (socket) {
                socket.off('order:new');
                socket.off('order:update');
            }
        };
    }, [socket, fetchOrders, fetchNotifs]);

    const updateStatus = useCallback(async (orderId, newStatus) => {
        setOrders(prev => {
            if (newStatus === 'completed') return prev.filter(o => o._id !== orderId);
            return prev.map(o => o._id === orderId ? { ...o, orderStatus: newStatus } : o);
        });
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/orders/${orderId}/status`, { orderStatus: newStatus });
            if (newStatus === 'completed') {
                fetchNotifs(); // Fetch 'Order Completed' notification
            }
        } catch (error) {
            console.error('Status update failed:', error);
            fetchOrders();
        }
    }, [fetchOrders, fetchNotifs]);

    const undoAction = useCallback((orderId) => {
        const order = orders.find(o => o._id === orderId);
        if (!order) return;
        if (order.orderStatus === 'preparing') updateStatus(orderId, 'placed');
        else if (order.orderStatus === 'ready') updateStatus(orderId, 'preparing');
    }, [orders, updateStatus]);

    const { priorityOrders, preparingOrders, readyOrders } = useMemo(() => ({
        priorityOrders: orders
            .filter(o => o.orderStatus === 'placed')
            .sort((a, b) => {
                if (a.arrivalTime && b.arrivalTime) return new Date(a.arrivalTime) - new Date(b.arrivalTime);
                if (a.arrivalTime) return -1;
                if (b.arrivalTime) return 1;
                return new Date(a.timestamp) - new Date(b.timestamp);
            }),
        preparingOrders: orders
            .filter(o => o.orderStatus === 'preparing')
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
        readyOrders: orders
            .filter(o => o.orderStatus === 'ready')
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
    }), [orders]);

    const historyOrders = useMemo(() => {
        return allOrders.filter(o => o.orderStatus === 'completed').slice(0, 50);
    }, [allOrders]);

    const unreadNotifs = notifications.filter(n => !n.read).length;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] gap-6">
                <Loader2 className="w-16 h-16 animate-spin text-primary" />
                <p className="text-primary text-xs font-black uppercase tracking-[0.4em] animate-pulse">Initializing KDS Matrix</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full pt-4 relative" style={{ minHeight: 0 }}>

            {/* ── ALERTS & MODALS ────────────────────────────────────────────── */}
            <AnimatePresence>
                {showHistory && (
                    <HistoryDrawer orders={historyOrders} onClose={() => setShowHistory(false)} />
                )}
                {showNotifs && (
                    <NotifPopover
                        notifs={notifications}
                        onClose={() => setShowNotifs(false)}
                        onRefresh={fetchNotifs}
                    />
                )}
            </AnimatePresence>

            {/* ── Header ─────────────────────────────────────────────────────────── */}
            <header className="flex items-center justify-between mb-6 px-4 shrink-0">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-primary/20 rounded-2xl border border-primary/30 flex items-center justify-center shadow-lg shadow-primary/10">
                        <Activity className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-4xl md:text-5xl font-serif font-black text-white tracking-tight">
                            KDS <span className="opacity-40 font-light">Matrix.</span>
                        </h2>
                        <div className="flex items-center gap-3 mt-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/10 w-fit">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                                System Operational &bull; {orders.length} Active Orders
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => fetchOrders(true)}
                        className={`flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all ${isRefreshing ? 'text-primary' : 'text-white/40 hover:text-white'}`}
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>

                    <button
                        onClick={() => setShowHistory(true)}
                        className="flex items-center gap-3 px-5 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black tracking-widest uppercase text-white/40 hover:text-white transition-all"
                    >
                        <History className="w-4 h-4" />
                        <span className="hidden sm:inline">History</span>
                    </button>

                    <button
                        onClick={() => setShowNotifs(!showNotifs)}
                        className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all bg-white/5 border ${unreadNotifs > 0 ? 'border-primary/40 text-primary shadow-lg shadow-primary/10' : 'border-white/10 text-white/20 hover:text-white'}`}
                    >
                        <Bell className={`w-5 h-5 ${unreadNotifs > 0 ? 'animate-bounce' : ''}`} />
                        {unreadNotifs > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-background rounded-full text-[9px] font-black flex items-center justify-center border-2 border-surface-dark">
                                {unreadNotifs}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            {/* ── Kanban View ────────────────────────────────────────────────────── */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 px-4 pb-6 min-h-0 overflow-hidden">
                <Lane color="red" title="Priority Fleet" count={priorityOrders.length} emptyLabel="No Incoming Priority" pulseDot={true}>
                    {priorityOrders.map(order => <KDSOrderCard key={order._id} order={order} onStatusUpdate={updateStatus} onUndo={undoAction} />)}
                </Lane>

                <Lane color="yellow" title="In Progress" count={preparingOrders.length} emptyLabel="Kitchen Clear" pulseDot={false}>
                    {preparingOrders.map(order => <KDSOrderCard key={order._id} order={order} onStatusUpdate={updateStatus} onUndo={undoAction} />)}
                </Lane>

                <Lane color="emerald" title="Ready To Serve" count={readyOrders.length} emptyLabel="Ready Tray Empty" pulseDot={false}>
                    {readyOrders.map(order => <KDSOrderCard key={order._id} order={order} onStatusUpdate={updateStatus} onUndo={undoAction} />)}
                </Lane>
            </div>
        </div>
    );
};

// ── Components for Sub-Views ──────────────────────────────────────────────────

const HistoryDrawer = ({ orders, onClose }) => (
    <>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md" />
        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed top-0 right-0 h-full w-full max-w-lg bg-[#121214] z-[101] p-8 border-l border-white/10 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-3xl font-serif font-black text-white">Order History</h3>
                <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center"><X className="w-5 h-5 text-white/40" /></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {orders.map(order => (
                    <div key={order._id} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between group hover:border-primary/20 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                <CheckCircle className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-xs font-black text-white uppercase tracking-widest">{order.customerName}</p>
                                <p className="text-[10px] text-white/20 font-mono mt-1">#{order._id.toString().slice(-6).toUpperCase()}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-black text-white">₹{order.total?.toFixed(0)}</p>
                            <p className="text-[9px] text-white/20 uppercase mt-1">{new Date(order.timestamp).toLocaleTimeString()}</p>
                        </div>
                    </div>
                ))}
                {orders.length === 0 && <p className="text-center py-20 text-white/10 uppercase font-black text-xs">No History Found</p>}
            </div>
        </motion.div>
    </>
);

const NotifPopover = ({ notifs, onClose, onRefresh }) => (
    <>
        <div className="fixed inset-0 z-[90]" onClick={onClose} />
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            className="absolute top-20 right-4 w-80 bg-[#121214] border border-white/10 rounded-[28px] shadow-2xl z-[100] p-6 overflow-hidden"
        >
            <div className="flex items-center justify-between mb-6">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Intelligence Hub</h4>
                <button onClick={async () => { await axios.put(`${import.meta.env.VITE_API_URL}/admin/notifications/read-all`); onRefresh(); }} className="text-[9px] font-bold text-white/40 hover:text-white transition-colors">Mark all read</button>
            </div>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {notifs.map(n => (
                    <div key={n._id} className={`p-3 rounded-2xl border ${n.read ? 'bg-transparent border-white/5 opacity-40' : 'bg-white/5 border-white/10'} transition-all`}>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Activity className="w-4 h-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-black text-white leading-tight">{n.title}</p>
                                <p className="text-[10px] text-white/40 line-clamp-1 mt-0.5">{n.body}</p>
                            </div>
                        </div>
                    </div>
                ))}
                {notifs.length === 0 && <p className="text-center py-10 text-[10px] font-black uppercase text-white/10">All Clean</p>}
            </div>
            <a href="/admin/notifications" className="mt-6 w-full py-3 bg-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white flex items-center justify-center gap-2 border border-white/5 transition-all">
                View All Center <ExternalLink className="w-3 h-3" />
            </a>
        </motion.div>
    </>
);

const LANE_STYLES = {
    red: { bg: 'bg-red-500/5', border: 'border-red-500/15', title: 'text-red-400', badge: 'bg-red-500 text-white', dot: 'bg-red-500' },
    yellow: { bg: 'bg-yellow-500/5', border: 'border-yellow-500/15', title: 'text-yellow-400', badge: 'bg-yellow-500 text-background', dot: 'bg-yellow-500' },
    emerald: { bg: 'bg-emerald-500/5', border: 'border-emerald-500/15', title: 'text-emerald-400', badge: 'bg-emerald-500 text-background', dot: 'bg-emerald-500' },
};

const Lane = ({ color, title, count, emptyLabel, pulseDot, children }) => {
    const s = LANE_STYLES[color];
    const childArray = children ? (Array.isArray(children) ? children : [children]) : [];
    const hasOrders = childArray.filter(Boolean).length > 0;

    return (
        <div className={`flex flex-col min-h-0 rounded-[32px] border ${s.bg} ${s.border} overflow-hidden`}>
            <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-white/5">
                <h3 className={`text-xs font-black uppercase tracking-[0.35em] flex items-center gap-2.5 ${s.title}`}>
                    <span className={`w-2 h-2 rounded-full ${s.dot} ${pulseDot ? 'animate-ping' : 'opacity-80'}`} />
                    {title}
                </h3>
                <span className={`${s.badge} text-[10px] font-black px-2.5 py-1 rounded-full min-w-[28px] text-center`}>
                    {count}
                </span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                <AnimatePresence mode="popLayout" initial={false}>
                    {hasOrders ? children : (
                        <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-24 opacity-20">
                            <div className="w-14 h-14 border-2 border-dashed border-white/40 rounded-full mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-center">{emptyLabel}</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default KDSDashboard;
