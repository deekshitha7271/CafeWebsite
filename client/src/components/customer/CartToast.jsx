import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowRight, CheckCircle2 } from 'lucide-react';

const CartToast = ({ item, isVisible, onClose, onViewCart }) => {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(onClose, 4000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, item, onClose]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="fixed bottom-28 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-[100] md:w-full md:max-w-md"
                >
                    <div className="bg-surface-dark/90 backdrop-blur-2xl border border-white/10 rounded-2xl md:rounded-3xl p-3 md:p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-between gap-3 md:gap-4 overflow-hidden relative">
                        {/* Shimmer effect */}
                        <motion.div
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 pointer-events-none"
                        />

                        <div className="flex items-center gap-3 md:gap-4 relative z-10 min-w-0">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                                {item?.image ? (
                                    <img src={item.image} alt="" className="w-full h-full object-cover rounded-xl md:rounded-2xl" />
                                ) : (
                                    <ShoppingBag className="w-5 h-5 md:w-6 md:h-6" />
                                )}
                            </div>
                            <div className="min-w-0">
                                <h5 className="text-white font-bold text-xs md:text-sm flex items-center gap-2">
                                    <span className="truncate">Added</span> <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                </h5>
                                <p className="text-text-muted text-[9px] md:text-[10px] uppercase tracking-widest font-black opacity-60 truncate">
                                    {item?.name || 'Item'}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={onViewCart}
                            className="bg-primary text-background px-4 md:px-5 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 relative z-10 shrink-0"
                        >
                            View Cart <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CartToast;
