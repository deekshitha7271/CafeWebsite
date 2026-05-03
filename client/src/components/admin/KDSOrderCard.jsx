import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Check, Play, Package, User, Hash, Sparkles } from 'lucide-react';

const KDSOrderCard = ({ order, onStatusUpdate, onUndo }) => {
    const [timeLeft, setTimeLeft] = useState(null);
    const [urgency, setUrgency] = useState('normal'); // 'normal', 'warning', 'urgent', 'overdue'

    useEffect(() => {
        const calculateTime = () => {
            if (!order.arrivalTime) return;

            const now = new Date();
            const arrival = new Date(order.arrivalTime);
            const diff = arrival - now;

            const minutes = Math.floor(Math.abs(diff) / 60000);
            const seconds = Math.floor((Math.abs(diff) % 60000) / 1000);
            const isOverdue = diff < 0;

            setTimeLeft(`${isOverdue ? '-' : ''}${minutes}:${seconds.toString().padStart(2, '0')}`);

            // Urgency Logic
            if (isOverdue) setUrgency('overdue');
            else if (diff < 300000) setUrgency('urgent'); // < 5 min
            else if (diff < 600000) setUrgency('warning'); // 5-10 min
            else setUrgency('normal');
        };

        const timer = setInterval(calculateTime, 1000);
        calculateTime();
        return () => clearInterval(timer);
    }, [order.arrivalTime]);

    const urgencyStyles = {
        normal: 'border-white/10 bg-surface-dark/40 shadow-none',
        warning: 'border-yellow-500/50 bg-yellow-500/5 shadow-[0_0_20px_rgba(234,179,8,0.1)]',
        urgent: 'border-red-500/50 bg-red-500/5 shadow-[0_0_25px_rgba(239,68,68,0.15)]',
        overdue: 'border-red-600 bg-red-600/10 shadow-[0_0_30px_rgba(220,38,38,0.3)] animate-pulse-fast'
    };

    const timerBadgeStyles = {
        normal: 'bg-white/5 text-white/40',
        warning: 'bg-yellow-500 text-background font-black scale-110',
        urgent: 'bg-red-500 text-white font-black scale-125',
        overdue: 'bg-red-600 text-white font-black scale-150 ring-4 ring-red-600/20'
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className={`relative p-6 rounded-[32px] border-2 transition-all duration-500 h-fit ${urgencyStyles[urgency]}`}
        >
            {/* Header: Order ID & Timer */}
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-white/10 p-2.5 rounded-2xl">
                        <Hash className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-serif font-black text-white leading-none">
                            {order.table ? `T-${order.table}` : 'WEB'}
                        </h3>
                        <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] mt-1.5 font-bold">
                            #{order._id.slice(-4)} • {order.orderType}
                        </p>
                    </div>
                </div>

                {timeLeft && (
                    <div className="flex flex-col items-end gap-2">
                        <div className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-300 ${timerBadgeStyles[urgency]}`}>
                            <Clock className={`w-3.5 h-3.5 ${urgency === 'normal' ? '' : 'animate-spin-slow'}`} />
                            <span className="text-sm font-black tracking-tighter tabular-nums">{timeLeft}</span>
                        </div>
                        {order.relatedOrderId && (
                            <span className="text-[9px] font-black text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-2">
                                <Sparkles className="w-3 h-3" /> Linked Order
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Customer Info */}
            {order.customerName && (
                <div className="flex items-center gap-2 mb-6 px-4 py-2 bg-white/5 rounded-2xl w-fit">
                    <User className="w-3 h-3 text-primary" />
                    <span className="text-[10px] text-white/60 font-black uppercase tracking-widest">{order.customerName}</span>
                </div>
            )}

            {/* Line Items */}
            <div className="space-y-4 mb-8 bg-black/20 p-5 rounded-3xl border border-white/5 shadow-inner">
                {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center group">
                        <div className="flex items-center gap-4">
                            <span className="text-xl font-black text-primary bg-primary/10 px-3 py-1 rounded-xl border border-primary/20">{item.quantity}×</span>
                            <span className="text-lg font-bold text-white group-hover:text-primary transition-colors">{item.name}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3 mt-auto">
                {order.orderStatus === 'placed' && (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onStatusUpdate(order._id, 'preparing')}
                        className="col-span-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3"
                    >
                        <Play className="w-4 h-4 text-primary" />
                        Start Preparing
                    </motion.button>
                )}

                {order.orderStatus === 'preparing' && (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onStatusUpdate(order._id, 'ready')}
                        className="col-span-2 bg-primary hover:bg-primary-light text-background py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-3"
                    >
                        <Check className="w-4 h-4" />
                        Mark as Ready
                    </motion.button>
                )}

                {order.orderStatus === 'ready' && (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onStatusUpdate(order._id, 'completed')}
                        className="col-span-2 bg-emerald-500 hover:bg-emerald-400 text-background py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3"
                    >
                        <Package className="w-4 h-4" />
                        Complete Order
                    </motion.button>
                )}
            </div>

            {/* Undo Hint (If applicable) */}
            <button
                onClick={() => onUndo(order._id)}
                className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-surface-light border border-white/10 text-[10px] text-white/20 hover:text-white hover:border-primary transition-all opacity-0 group-hover:opacity-100"
                title="Undo Action"
            >
                ↺
            </button>
        </motion.div>
    );
};

export default KDSOrderCard;
