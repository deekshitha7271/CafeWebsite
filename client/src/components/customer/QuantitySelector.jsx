import React, { useState, useEffect } from 'react';
import { Plus, Minus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../../context/CartContext';

const QuantitySelector = ({ item, variant = 'grid' }) => {
    const { state, dispatch } = useCart();
    const cartItem = state.items.find(i => i._id === item._id);
    const quantity = cartItem ? cartItem.quantity : 0;
    const [loadingType, setLoadingType] = useState(null); // 'add', 'decrement', or null

    // Simulate/Handle async state feedback if needed
    const handleUpdate = async (type) => {
        setLoadingType(type);

        // Correct dispatch with proper payload types
        if (type === 'add') {
            dispatch({ type: 'ADD_ITEM', payload: item });
        } else {
            dispatch({ type: 'DECREMENT_ITEM', payload: item._id || item });
        }

        // Simulate API sync delay for the micro-spinner requirement (>300ms)
        setTimeout(() => setLoadingType(null), 400);
    };

    const isGrid = variant === 'grid';

    if (quantity === 0) {
        return (
            <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                disabled={loadingType === 'add'}
                onClick={(e) => {
                    e.stopPropagation();
                    handleUpdate('add');
                }}
                className={`flex items-center justify-center rounded-full bg-primary text-background shadow-lg shadow-primary/20 transition-all ${isGrid ? 'w-10 h-10' : 'w-8 h-8'
                    }`}
            >
                {loadingType === 'add' ? (
                    <Loader2 className="w-4 h-4 animate-spin" strokeWidth={3} />
                ) : (
                    <Plus className={isGrid ? "w-5 h-5" : "w-4 h-4"} strokeWidth={3} />
                )}
            </motion.button>
        );
    }

    return (
        <div className={`flex items-center gap-3 bg-surface-dark/80 backdrop-blur-md border border-primary/30 rounded-full px-1.5 py-1.5 shadow-xl transition-all ${isGrid ? 'scale-110' : 'scale-100'
            }`} onClick={e => e.stopPropagation()}>
            <motion.button
                whileTap={{ scale: 0.8 }}
                disabled={loadingType !== null}
                onClick={() => handleUpdate('decrement')}
                className="w-7 h-7 rounded-full bg-background/50 hover:bg-primary hover:text-background flex items-center justify-center text-primary transition-colors disabled:opacity-50"
            >
                {loadingType === 'decrement' ? (
                    <Loader2 className="w-3 h-3 animate-spin" strokeWidth={3} />
                ) : (
                    <Minus className="w-4 h-4 font-bold" />
                )}
            </motion.button>

            <div className="relative w-4 h-7 flex items-center justify-center">
                <AnimatePresence mode="wait">
                    <motion.span
                        key={quantity}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -10, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-[13px] font-black text-white absolute"
                    >
                        {quantity}
                    </motion.span>
                </AnimatePresence>
            </div>

            <motion.button
                whileTap={{ scale: 0.8 }}
                disabled={loadingType !== null}
                onClick={() => handleUpdate('add')}
                className="w-7 h-7 rounded-full bg-background/50 hover:bg-primary hover:text-background flex items-center justify-center text-primary transition-colors disabled:opacity-50"
            >
                {loadingType === 'add' ? (
                    <Loader2 className="w-3 h-3 animate-spin" strokeWidth={3} />
                ) : (
                    <Plus className="w-4 h-4 font-bold" />
                )}
            </motion.button>
        </div>
    );
};

export default QuantitySelector;
