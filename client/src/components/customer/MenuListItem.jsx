import React from 'react';
import { Plus, Leaf, Flame, Sparkles, Coffee } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCart } from '../../context/CartContext';
import QuantitySelector from './QuantitySelector';
import { formatImageUrl, getFallbackImage } from '../../lib/utils';

const MenuListItem = ({ item }) => {
    const { state, dispatch } = useCart();

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4 p-4 bg-surface-dark/40 backdrop-blur-md rounded-2xl border border-white/5 hover:border-primary/30 transition-all group"
        >
            <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-white/10 bg-surface">
                {item.image ? (
                    <img
                        src={formatImageUrl(item.image, 400)}
                        alt={item.name}
                        width={64}
                        height={64}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = getFallbackImage('coffee');
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface to-surface-dark relative">
                        <Coffee className="w-6 h-6 text-primary opacity-20 group-hover:opacity-40 transition-all duration-500" />
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-white font-serif font-bold text-lg truncate">{item.name}</h4>
                    {item.dietaryTag === 'veg' && <Leaf className="w-3 h-3 text-green-400" />}
                    {item.isPopular && <Flame className="w-3 h-3 text-orange-400" />}
                </div>
                <p className="text-text-muted text-[10px] line-clamp-1 opacity-60 leading-relaxed">
                    {item.description || 'Crafted with passion by Cá Phê Bistro.'}
                </p>
            </div>

            <div className="text-right flex flex-col items-end justify-center min-w-[100px] pr-2">
                <span className="text-white font-black text-sm mb-2 block">₹{item.price}</span>
                {state.isOrderingActive ? (
                    <QuantitySelector item={item} variant="list" />
                ) : (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-[8px] font-black uppercase px-2 py-1 rounded-full tracking-widest whitespace-nowrap mt-1">
                        Closed
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default MenuListItem;
