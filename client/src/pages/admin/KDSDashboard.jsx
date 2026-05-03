import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';
import { Loader2, Activity, Bell, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import KDSOrderCard from '../../components/admin/KDSOrderCard';

const KDSDashboard = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const socket = useSocket();
    const notificationSound = useRef(null);

    const fetchOrders = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/orders`);
            // Only keep non-completed orders for KDS
            if (Array.isArray(res.data)) {
                setOrders(res.data.filter(o => o.orderStatus !== 'completed'));
            } else {
                setOrders([]);
            }
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();

        // Init notification sound
        notificationSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

        if (socket) {
            socket.on('order:new', (newOrder) => {
                notificationSound.current.play().catch(e => console.log('Sound blocked by browser'));
                setOrders(prev => {
                    if (prev.some(o => o._id === newOrder._id)) return prev;
                    return [newOrder, ...prev];
                });
            });

            socket.on('order:update', (updatedOrder) => {
                setOrders(prev => {
                    if (updatedOrder.orderStatus === 'completed') {
                        return prev.filter(o => o._id !== updatedOrder._id);
                    }
                    return prev.map(o => o._id === updatedOrder._id ? updatedOrder : o);
                });
            });
        }

        return () => {
            if (socket) {
                socket.off('order:new');
                socket.off('order:update');
            }
        };
    }, [socket]);

    const updateStatus = async (orderId, newStatus) => {
        try {
            // Optimistic Update
            setOrders(prev => {
                if (newStatus === 'completed') return prev.filter(o => o._id !== orderId);
                return prev.map(o => o._id === orderId ? { ...o, orderStatus: newStatus } : o);
            });

            await axios.put(`${import.meta.env.VITE_API_URL}/orders/${orderId}/status`, { orderStatus: newStatus });
        } catch (error) {
            console.error('Failed to update status:', error);
            fetchOrders();
        }
    };

    const undoAction = async (orderId) => {
        // Basic undo: move back to previous status
        const order = orders.find(o => o._id === orderId);
        if (!order) return;

        let prevStatus;
        if (order.orderStatus === 'preparing') prevStatus = 'placed';
        if (order.orderStatus === 'ready') prevStatus = 'preparing';

        if (prevStatus) updateStatus(orderId, prevStatus);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] gap-6">
                <Loader2 className="w-16 h-16 animate-spin text-primary" />
                <p className="text-primary text-xs font-black uppercase tracking-[0.4em] animate-pulse">Initializing KDS Matrix</p>
            </div>
        );
    }

    // Lane Filtering
    const safeOrders = Array.isArray(orders) ? orders : [];
    const priorityOrders = safeOrders
        .filter(o => o.orderStatus === 'placed')
        .sort((a, b) => new Date(a.arrivalTime) - new Date(b.arrivalTime))
        .slice(0, 20);

    const preparingOrders = safeOrders
        .filter(o => o.orderStatus === 'preparing')
        .slice(0, 20);

    const readyOrders = safeOrders
        .filter(o => o.orderStatus === 'ready')
        .slice(0, 20);

    return (
        <div className="h-full flex flex-col pt-4">
            {/* KDS Header */}
            <header className="flex items-center justify-between mb-10 px-4">
                <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-primary/20 rounded-2xl border border-primary/30 flex items-center justify-center shadow-lg shadow-primary/10">
                        <Activity className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-5xl font-serif font-black text-white tracking-tight">KDS <span className="opacity-40 font-light">Matrix.</span></h2>
                        <div className="flex items-center gap-3 mt-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/10 w-fit">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">System Operational • High Velocity Active</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-white/40 hover:text-white transition-all">
                        <History className="w-4 h-4" /> RECENT HISTORY
                    </button>
                    <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/20">
                        <Bell className="w-5 h-5" />
                    </div>
                </div>
            </header>

            {/* 3-Lane Grid */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 px-4 pb-10 min-h-0">

                {/* LANE 🔴: PRIORITY */}
                <div className="flex flex-col gap-6 bg-red-500/5 rounded-[40px] border border-red-500/10 p-6">
                    <div className="flex items-center justify-between px-4">
                        <h3 className="text-red-500 text-xs font-black uppercase tracking-[0.4em] flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                            Priority Fleet
                        </h3>
                        <span className="bg-red-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full">{priorityOrders.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
                        <AnimatePresence mode="popLayout">
                            {priorityOrders.map(order => (
                                <KDSOrderCard
                                    key={order._id}
                                    order={order}
                                    onStatusUpdate={updateStatus}
                                    onUndo={undoAction}
                                />
                            ))}
                            {priorityOrders.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                                    <div className="w-16 h-16 border-2 border-dashed border-white/40 rounded-full mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">No Incoming Priority</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* LANE 🟡: PREPARING */}
                <div className="flex flex-col gap-6 bg-yellow-500/5 rounded-[40px] border border-yellow-500/10 p-6">
                    <div className="flex items-center justify-between px-4">
                        <h3 className="text-yellow-500 text-xs font-black uppercase tracking-[0.4em] flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                            In Progress
                        </h3>
                        <span className="bg-yellow-500 text-background text-[10px] font-black px-2.5 py-1 rounded-full">{preparingOrders.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
                        <AnimatePresence mode="popLayout">
                            {preparingOrders.map(order => (
                                <KDSOrderCard
                                    key={order._id}
                                    order={order}
                                    onStatusUpdate={updateStatus}
                                    onUndo={undoAction}
                                />
                            ))}
                            {preparingOrders.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                                    <div className="w-16 h-16 border-2 border-dashed border-white/40 rounded-full mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Kitchen Clear</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* LANE 🟢: READY */}
                <div className="flex flex-col gap-6 bg-emerald-500/5 rounded-[40px] border border-emerald-500/10 p-6">
                    <div className="flex items-center justify-between px-4">
                        <h3 className="text-emerald-500 text-xs font-black uppercase tracking-[0.4em] flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Ready To Serve
                        </h3>
                        <span className="bg-emerald-500 text-background text-[10px] font-black px-2.5 py-1 rounded-full">{readyOrders.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
                        <AnimatePresence mode="popLayout">
                            {readyOrders.map(order => (
                                <KDSOrderCard
                                    key={order._id}
                                    order={order}
                                    onStatusUpdate={updateStatus}
                                    onUndo={undoAction}
                                />
                            ))}
                            {readyOrders.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                                    <div className="w-16 h-16 border-2 border-dashed border-white/40 rounded-full mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Ready Tray Empty</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default KDSDashboard;
