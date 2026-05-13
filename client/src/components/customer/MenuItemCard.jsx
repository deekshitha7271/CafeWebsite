import React from 'react';
import { useCart } from '../../context/CartContext';
import { Plus, Minus, Coffee, Star, X } from 'lucide-react';
import { motion } from 'framer-motion';
import QuantitySelector from './QuantitySelector';
import { formatImageUrl, getFallbackImage } from '../../lib/utils';

const MenuItemCard = ({ item, variant = 'standard' }) => {
  const { state, dispatch } = useCart();

  const cartItem = state.items.find(i => i._id === item._id);
  const quantity = cartItem ? cartItem.quantity : 0;

  const isCompact = variant === 'compact';

  return (
    <motion.div
      style={{ perspective: 1200 }}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`flex flex-col relative group h-full bg-surface-dark/40 rounded-3xl overflow-hidden transition-all hover:shadow-[0_20px_50px_rgba(0,0,0,0.4)] ${isCompact ? 'rounded-2xl' : ''}`}
    >
      {item.isPopular && !isCompact && (
        <span className="absolute top-4 left-4 bg-primary text-background text-[9px] font-black tracking-widest px-3 py-1.5 rounded-full z-30 shadow-lg">
          FAVORITE
        </span>
      )}

      {item.originalPrice > item.price && (
        <div className={`absolute top-4 right-4 bg-emerald-500 text-white font-black rounded-full z-30 shadow-lg ${isCompact ? 'text-[8px] px-2 py-1' : 'text-[10px] px-3 py-1.5'}`}>
          SAVE ₹{(item.originalPrice - item.price).toFixed(0)}
        </div>
      )}

      {/* Premium Fixed Container */}
      <div className={`w-full overflow-hidden relative border-b border-white/5 ${isCompact ? 'aspect-video' : 'aspect-square'}`}>
        {/* Ambient backlight glow */}
        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/20 transition-colors duration-700 z-10"></div>

        {item.image ? (
          <img
            src={formatImageUrl(item.image, 800)}
            srcSet={`
              ${formatImageUrl(item.image, 400)} 400w,
              ${formatImageUrl(item.image, 800)} 800w
            `}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            alt={`Delicious ${item.name}`}
            width={400}
            height={400}
            className={`w-full h-full object-cover relative z-0 group-hover:scale-110 transition-transform duration-1000 ease-out ${!item.isAvailable ? 'grayscale opacity-40' : ''}`}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = getFallbackImage('coffee');
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-surface to-surface-dark relative z-0">
            <Coffee className="w-10 h-10 text-primary opacity-20" aria-hidden="true" />
          </div>
        )}

        {/* Subtle Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20" />
      </div>

      {/* Content Section with Professional Spacing */}
      <div className={`${isCompact ? 'p-3.5' : 'p-3.5 sm:p-4'} flex flex-col flex-1`}>
        <div className="flex items-start justify-between gap-2">
          <h3 className={`font-serif font-bold text-white group-hover:text-primary transition-colors duration-300 leading-tight ${isCompact ? 'text-sm' : 'text-lg'}`}>
            {item.name}
          </h3>
          {item.dietaryTag === 'veg' && (
            <div className="w-3 h-3 border border-green-500 flex items-center justify-center p-0.5 mt-1 shrink-0">
              <div className="w-full h-full bg-green-500 rounded-full" />
            </div>
          )}
        </div>

        {!isCompact && (
          <p className="text-text-muted/60 text-[10px] sm:text-xs mt-2 leading-relaxed line-clamp-2 min-h-[32px] font-light">
            {item.description || 'Crafted with passion by Cá Phê Bistro.'}
          </p>
        )}

        <div className={`mt-auto flex items-center justify-between gap-2 ${isCompact ? 'pt-3' : 'pt-4'}`}>
          <div className="flex flex-col shrink-0">
            <span className={`font-sans font-black text-primary tracking-tight whitespace-nowrap ${isCompact ? 'text-lg' : 'text-base sm:text-xl'} ${!item.isAvailable ? 'opacity-40' : ''}`}>
              ₹{item.price.toFixed(0)}
            </span>
          </div>

          {state.isOrderingActive ? (
            item.isAvailable ? (
              <QuantitySelector item={item} variant={isCompact ? 'compact' : 'grid'} />
            ) : (
              <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-[8px] font-black uppercase px-2 py-1.5 rounded-lg tracking-widest whitespace-nowrap flex items-center gap-1 shadow-lg shadow-red-500/10">
                <X className="w-2.5 h-2.5" /> Out of Stock
              </div>
            )
          ) : (
            <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-[8px] font-black uppercase px-2 py-1 rounded-full tracking-widest whitespace-nowrap">
              Closed
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MenuItemCard;
