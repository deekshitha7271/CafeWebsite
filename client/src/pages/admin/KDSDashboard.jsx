import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';
import { Loader2, Activity, Bell, History, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import KDSOrderCard from '../../components/admin/KDSOrderCard';

const KDSDashboard = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const socket = useSocket();
    const notificationSound = useRef(null);

    const fetchOrders = useCallback(async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/orders`);
            // Only show PAID, non-completed orders in KDS
            setOrders(res.data.filter(o => o.paymentStatus === 'paid' && o.orderStatus !== 'completed'));
            setLastRefresh(new Date());
        } catch (error) {
            console.error('KDS fetch failed:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
        // Fallback polling every 30s in case socket misses an event
        const interval = setInterval(fetchOrders, 30000);

        notificationSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        notificationSound.current.preload = 'auto';

        if (socket) {
            socket.on('order:new', (newOrder) => {
                if (newOrder.paymentStatus !== 'paid') return;
                notificationSound.current?.play().catch(() => { });
                setOrders(prev => {
                    if (prev.some(o => o._id === newOrder._id)) return prev;
                    return [newOrder, ...prev];
                });
            });

            socket.on('order:update', (updatedOrder) => {
                setOrders(prev => {
                    // Remove from KDS if completed or payment reverted
                    if (updatedOrder.orderStatus === 'completed' || updatedOrder.paymentStatus !== 'paid') {
                        return prev.filter(o => o._id !== updatedOrder._id);
                    }
                    // Add if newly paid and not already present
                    const exists = prev.some(o => o._id === updatedOrder._id);
                    if (!exists && updatedOrder.paymentStatus === 'paid') {
                        return [updatedOrder, ...prev];
                    }
                    // Update in place
                    return prev.map(o => o._id === updatedOrder._id ? updatedOrder : o);
                });
            });
        }

        return () => {
            clearInterval(interval);
            if (socket) {
                socket.off('order:new');
                socket.off('order:update');
            }
        };
    }, [socket, fetchOrders]);

    const updateStatus = useCallback(async (orderId, newStatus) => {
        // Optimistic update
        setOrders(prev => {
            if (newStatus === 'completed') return prev.filter(o => o._id !== orderId);
            return prev.map(o => o._id === orderId ? { ...o, orderStatus: newStatus } : o);
        });
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/orders/${orderId}/status`, { orderStatus: newStatus });
        } catch (error) {
            console.error('Status update failed:', error);
            fetchOrders(); // rollback on failure
        }
    }, [fetchOrders]);

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
                // Orders with arrival time first, sorted by soonest arrival
                if (a.arrivalTime && b.arrivalTime) return new Date(a.arrivalTime) - new Date(b.arrivalTime);
                if (a.arrivalTime) return -1;
                if (b.arrivalTime) return 1;
                return new Date(a.timestamp) - new Date(b.timestamp); // FIFO fallback
            }),
        preparingOrders: orders
            .filter(o => o.orderStatus === 'preparing')
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)), // FIFO
        readyOrders: orders
            .filter(o => o.orderStatus === 'ready')
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)), // FIFO
    }), [orders]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] gap-6">
                <Loader2 className="w-16 h-16 animate-spin text-primary" />
                <p className="text-primary text-xs font-black uppercase tracking-[0.4em] animate-pulse">Initializing KDS Matrix</p>
            </div>
        );
    }

    const totalActive = orders.length;

    return (
        <div className="flex flex-col h-full pt-4" style={{ minHeight: 0 }}>

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
                                System Operational &bull; {totalActive} Active Order{totalActive !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchOrders}
                        title="Refresh now"
                        className="flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-white/40 hover:text-white hover:border-white/20 transition-all"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                    <button className="flex items-center gap-3 px-5 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-white/40 hover:text-white transition-all">
                        <History className="w-4 h-4" />
                        <span className="hidden sm:inline">History</span>
                    </button>
                    <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/20">
                        <Bell className="w-5 h-5" />
                    </div>
                </div>
            </header>

            {/* ── 3-Lane Kanban Board ────────────────────────────────────────────── */}
            {/* 
        CRITICAL: The outer grid must fill remaining height. Each lane is a flex-col
        with a scrollable inner div that has min-h-0 to allow shrinking within flex.
      */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 px-4 pb-6 min-h-0 overflow-hidden">

                {/* ── LANE: PRIORITY (placed) ──────────────────────────────────────── */}
                <Lane
                    color="red"
                    title="Priority Fleet"
                    count={priorityOrders.length}
                    emptyLabel="No Incoming Priority"
                    pulseDot={true}
                >
                    {priorityOrders.map(order => (
                        <KDSOrderCard
                            key={order._id}
                            order={order}
                            onStatusUpdate={updateStatus}
                            onUndo={undoAction}
                        />
                    ))}
                </Lane>

                {/* ── LANE: IN PROGRESS (preparing) ───────────────────────────────── */}
                <Lane
                    color="yellow"
                    title="In Progress"
                    count={preparingOrders.length}
                    emptyLabel="Kitchen Clear"
                    pulseDot={false}
                >
                    {preparingOrders.map(order => (
                        <KDSOrderCard
                            key={order._id}
                            order={order}
                            onStatusUpdate={updateStatus}
                            onUndo={undoAction}
                        />
                    ))}
                </Lane>

                {/* ── LANE: READY TO SERVE ────────────────────────────────────────── */}
                <Lane
                    color="emerald"
                    title="Ready To Serve"
                    count={readyOrders.length}
                    emptyLabel="Ready Tray Empty"
                    pulseDot={false}
                >
                    {readyOrders.map(order => (
                        <KDSOrderCard
                            key={order._id}
                            order={order}
                            onStatusUpdate={updateStatus}
                            onUndo={undoAction}
                        />
                    ))}
                </Lane>

            </div>
        </div>
    );
};

// ── Lane sub-component — extracted to avoid re-creating inside render ─────────
const LANE_STYLES = {
    red: { bg: 'bg-red-500/5', border: 'border-red-500/15', title: 'text-red-400', badge: 'bg-red-500 text-white', dot: 'bg-red-500' },
    yellow: { bg: 'bg-yellow-500/5', border: 'border-yellow-500/15', title: 'text-yellow-400', badge: 'bg-yellow-500 text-background', dot: 'bg-yellow-500' },
    emerald: { bg: 'bg-emerald-500/5', border: 'border-emerald-500/15', title: 'text-emerald-400', badge: 'bg-emerald-500 text-background', dot: 'bg-emerald-500' },
};

const Lane = ({ color, title, count, emptyLabel, pulseDot, children }) => {
    const s = LANE_STYLES[color];
    const childArray = Array.isArray(children) ? children : [children];
    const hasOrders = childArray.filter(Boolean).length > 0;

    return (
        <div className={`flex flex-col min-h-0 rounded-[32px] border ${s.bg} ${s.border} overflow-hidden`}>
            {/* Lane header */}
            <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-white/5">
                <h3 className={`text-xs font-black uppercase tracking-[0.35em] flex items-center gap-2.5 ${s.title}`}>
                    <span className={`w-2 h-2 rounded-full ${s.dot} ${pulseDot ? 'animate-ping' : 'opacity-80'}`} />
                    {title}
                </h3>
                <span className={`${s.badge} text-[10px] font-black px-2.5 py-1 rounded-full min-w-[28px] text-center`}>
                    {count}
                </span>
            </div>

            {/* Scrollable card area — min-h-0 is critical for flex shrinking */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                <AnimatePresence mode="popLayout" initial={false}>
                    {hasOrders
                        ? children
                        : (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-24 opacity-20"
                            >
                                <div className="w-14 h-14 border-2 border-dashed border-white/40 rounded-full mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-center">{emptyLabel}</p>
                            </motion.div>
                        )
                    }
                </AnimatePresence>
            </div>
        </div>
    );
};

export default KDSDashboard;
