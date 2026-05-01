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
                    initial={{ opacity: 0, y: 100, x: '-50%' }}
                    animate={{ opacity: 1, y: 0, x: '-50%' }}
                    exit={{ opacity: 0, y: 100, x: '-50%' }}
                    className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md"
                >
                    <div className="bg-surface-dark/80 backdrop-blur-2xl border border-primary/30 rounded-3xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-between gap-4 overflow-hidden relative">
                        {/* Shimmer effect */}
                        <motion.div
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12"
                        />

                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
                                {item?.image ? (
                                    <img src={item.image} alt="" className="w-full h-full object-cover rounded-2xl" />
                                ) : (
                                    <ShoppingBag className="w-6 h-6" />
                                )}
                            </div>
                            <div>
                                <h5 className="text-white font-bold text-sm flex items-center gap-2">
                                    Added to Cart <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                </h5>
                                <p className="text-text-muted text-[10px] uppercase tracking-widest font-black opacity-60">
                                    {item?.name || 'Item'}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={onViewCart}
                            className="bg-primary text-background px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 relative z-10"
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
