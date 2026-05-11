import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Clock, Check, Play, Package, User, Hash, Timer, RotateCcw } from 'lucide-react';

// ─── Elapsed timer for orders in "preparing" state ───────────────────────────
const useElapsed = (startTime) => {
    const [elapsed, setElapsed] = useState('');
    useEffect(() => {
        if (!startTime) return;
        const tick = () => {
            const diff = Date.now() - new Date(startTime).getTime();
            const m = Math.floor(diff / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setElapsed(`${m}:${s.toString().padStart(2, '0')}`);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [startTime]);
    return elapsed;
};

// ─── Arrival countdown timer ──────────────────────────────────────────────────
const useArrivalTimer = (arrivalTime) => {
    const [state, setState] = useState({ label: null, urgency: 'normal' });

    useEffect(() => {
        if (!arrivalTime) return;
        const tick = () => {
            const diff = new Date(arrivalTime) - Date.now();
            const abs = Math.abs(diff);
            const m = Math.floor(abs / 60000);
            const s = Math.floor((abs % 60000) / 1000);
            const overdue = diff < 0;
            const label = `${overdue ? '-' : ''}${m}:${s.toString().padStart(2, '0')}`;
            const urgency = overdue ? 'overdue'
                : diff < 300000 ? 'urgent'    // < 5 min
                    : diff < 600000 ? 'warning'   // < 10 min
                        : 'normal';
            setState({ label, urgency });
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [arrivalTime]);

    return state;
};

// ─── Urgency theme maps ───────────────────────────────────────────────────────
const CARD_STYLES = {
    normal: 'border-white/10 bg-surface-dark/50',
    warning: 'border-yellow-500/40 bg-yellow-500/5 shadow-[0_0_20px_rgba(234,179,8,0.08)]',
    urgent: 'border-red-500/50 bg-red-500/5 shadow-[0_0_25px_rgba(239,68,68,0.12)]',
    overdue: 'border-red-600 bg-red-600/10 shadow-[0_0_30px_rgba(220,38,38,0.25)]',
};

const TIMER_BADGE = {
    normal: 'bg-white/5 text-white/40',
    warning: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    urgent: 'bg-red-500/20 text-red-400 border border-red-500/40',
    overdue: 'bg-red-600 text-white ring-2 ring-red-600/30',
};

const STATUS_LABELS = {
    placed: { text: 'NEW ORDER', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    preparing: { text: 'PREPARING', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    ready: { text: 'READY', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
};

// ─── KDSOrderCard ─────────────────────────────────────────────────────────────
const KDSOrderCard = ({ order, onStatusUpdate, onUndo }) => {
    const { label: timeLeft, urgency } = useArrivalTimer(order.arrivalTime);
    const elapsed = useElapsed(order.orderStatus === 'preparing' ? order.updatedAt || order.timestamp : null);

    const handleNext = useCallback(() => {
        if (order.orderStatus === 'placed') onStatusUpdate(order._id, 'preparing');
        if (order.orderStatus === 'preparing') onStatusUpdate(order._id, 'ready');
        if (order.orderStatus === 'ready') onStatusUpdate(order._id, 'completed');
    }, [order, onStatusUpdate]);

    const handleUndo = useCallback(() => onUndo(order._id), [order._id, onUndo]);

    const status = STATUS_LABELS[order.orderStatus] || STATUS_LABELS.placed;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92, y: -12 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className={`group relative rounded-3xl border-2 transition-colors duration-500 overflow-hidden ${CARD_STYLES[urgency]}`}
        >
            {/* Overdue pulse strip at top */}
            {urgency === 'overdue' && (
                <div className="h-1 bg-red-600 animate-pulse w-full" />
            )}

            <div className="p-5">
                {/* ── Row 1: Bill # / Table + Status badge + Timer ─────────────────── */}
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 bg-white/8 rounded-xl flex items-center justify-center shrink-0">
                            <Hash className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-white font-black text-base leading-tight truncate">
                                {order.table ? `Table ${order.table}` : (order.orderType === 'takeaway' ? 'Takeaway' : 'Online')}
                            </p>
                            <p className="text-white/30 text-[10px] uppercase tracking-widest font-bold truncate">
                                {order.billNumber || `#${order._id.slice(-5)}`}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[9px] font-black px-2.5 py-1 rounded-full border uppercase tracking-widest ${status.color}`}>
                            {status.text}
                        </span>
                    </div>
                </div>

                {/* ── Row 2: Customer + Arrival countdown ──────────────────────────── */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                    {order.customerName && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-xl">
                            <User className="w-3 h-3 text-primary" />
                            <span className="text-[10px] text-white/60 font-bold truncate max-w-[120px]">{order.customerName}</span>
                        </div>
                    )}

                    {timeLeft && (
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-300 ${TIMER_BADGE[urgency]}`}>
                            <Clock className="w-3 h-3" />
                            <span className="text-xs font-black tabular-nums">{timeLeft}</span>
                        </div>
                    )}

                    {/* Elapsed time badge for orders being prepared */}
                    {elapsed && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                            <Timer className="w-3 h-3 text-blue-400" />
                            <span className="text-[10px] text-blue-400 font-black tabular-nums">{elapsed}</span>
                        </div>
                    )}
                </div>

                {/* ── Row 3: Line items ────────────────────────────────────────────── */}
                <div className="bg-black/20 border border-white/5 rounded-2xl p-4 mb-4 max-h-44 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                    <div className="space-y-2.5">
                        {order.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-sm font-black text-primary bg-primary/10 px-2.5 py-0.5 rounded-lg border border-primary/20 shrink-0">
                                        {item.quantity}×
                                    </span>
                                    <span className="text-sm font-bold text-white truncate">{item.name}</span>
                                </div>
                                {item.note && (
                                    <span className="text-[9px] text-yellow-400/70 font-bold italic shrink-0 max-w-[80px] truncate" title={item.note}>
                                        {item.note}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="mt-2.5 pt-2.5 border-t border-white/5 flex justify-between text-[10px] text-white/25 font-bold">
                        <span>{order.items.reduce((s, i) => s + i.quantity, 0)} item{order.items.reduce((s, i) => s + i.quantity, 0) !== 1 ? 's' : ''}</span>
                        <span className="uppercase tracking-widest">{order.orderType}</span>
                    </div>
                </div>

                {/* ── Row 4: Primary action button ─────────────────────────────────── */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleNext}
                    className={`w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2.5 ${order.orderStatus === 'placed'
                            ? 'bg-white/8 hover:bg-white/12 text-white border border-white/10 hover:border-white/20'
                            : order.orderStatus === 'preparing'
                                ? 'bg-primary hover:bg-primary-light text-background shadow-lg shadow-primary/20'
                                : 'bg-emerald-500 hover:bg-emerald-400 text-background shadow-lg shadow-emerald-500/20'
                        }`}
                >
                    {order.orderStatus === 'placed' && <><Play className="w-4 h-4" /> Start Preparing</>}
                    {order.orderStatus === 'preparing' && <><Check className="w-4 h-4" /> Mark as Ready</>}
                    {order.orderStatus === 'ready' && <><Package className="w-4 h-4" /> Complete &amp; Close</>}
                </motion.button>
            </div>

            {/* ── Undo button — top-right, visible on group hover ───────────────── */}
            {order.orderStatus !== 'placed' && (
                <button
                    onClick={handleUndo}
                    title="Undo to previous status"
                    className="absolute top-3 right-3 w-7 h-7 rounded-full bg-surface border border-white/10 text-white/20 hover:text-white hover:border-primary/50 hover:bg-primary/10 transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center"
                >
                    <RotateCcw className="w-3 h-3" />
                </button>
            )}
        </motion.div>
    );
};

export default React.memo(KDSOrderCard);
