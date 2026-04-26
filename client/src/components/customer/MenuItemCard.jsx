import React from 'react';
import { useCart } from '../../context/CartContext';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';

const MenuItemCard = ({ item }) => {
  const { dispatch } = useCart();

  return (
    <motion.div 
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col relative group h-full cursor-pointer bg-surface-dark/10 rounded-3xl p-2 transition-colors hover:bg-surface-dark/40"
    >
      {item.isPopular && (
        <span className="absolute top-4 left-4 bg-primary text-background text-[9px] font-black tracking-widest px-3 py-1.5 rounded-full z-20 shadow-[0_5px_15px_rgba(245,158,11,0.5)]">
          FAVORITE
        </span>
      )}

      {item.tags?.includes('seasonal') && (
        <span className="absolute top-4 right-4 bg-red-500 text-white text-[9px] font-black tracking-widest px-3 py-1.5 rounded-full z-20 shadow-[0_5px_15px_rgba(239,68,68,0.5)]">
          SEASONAL
        </span>
      )}

      {item.tags?.includes('combo') && (
        <span className="absolute top-14 left-4 bg-blue-500 text-white text-[9px] font-black tracking-widest px-3 py-1.5 rounded-full z-20 shadow-[0_5px_15px_rgba(59,130,246,0.5)]">
          COMBO SAVER
        </span>
      )}

      {item.originalPrice > item.price && (
        <div className="absolute top-4 right-4 bg-emerald-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full z-20 shadow-lg animate-bounce [animation-duration:3s]">
          SAVE ₹{(item.originalPrice - item.price).toFixed(2)}
        </div>
      )}
      
      {/* High-quality image block with smooth rounded corners */}
      <div className="h-40 w-full overflow-hidden rounded-[24px] relative shadow-lg bg-surface border border-white/5 group-hover:border-primary/40 transition-colors duration-500">
        
        {/* Ambient backlight glow behind image */}
        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/20 transition-colors duration-700 blur-2xl z-0 rounded-full scale-150"></div>

        {item.image ? (
          <img 
            src={item.image} 
            alt={item.name} 
            className="w-full h-full object-cover relative z-10 group-hover:scale-110 transition-transform duration-700 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-muted text-xs bg-surface-dark relative z-10">
            <span className="opacity-50 font-bold uppercase tracking-widest text-[10px]">No Image</span>
          </div>
        )}
        <div className="absolute inset-0 z-20 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-500" />
      </div>
      
      {/* Content strictly formatted like the mockup */}
      <div className="pt-4 flex flex-col flex-1 px-2">
        <h3 className="font-serif font-bold text-lg text-white line-clamp-1 group-hover:text-primary transition-colors duration-300 drop-shadow-md">
          {item.name}
        </h3>
        
        {/* Subtle divider with gradient */}
        <div className="flex items-center gap-3 mt-2">
          <div className="h-px bg-gradient-to-r from-primary/50 to-transparent flex-1" />
          <span className="text-[9px] text-primary/80 uppercase font-bold tracking-[0.2em]">{item.categoryName || 'ITEM'}</span>
        </div>

        <p className="text-text-muted text-xs mt-3 leading-relaxed line-clamp-2 min-h-[36px] font-light">
          {item.description || 'A delicious choice for any occasion.'}
        </p>

        {/* Combo Included Items List */}
        {item.tags?.includes('combo') && item.includedItems?.length > 0 && (
          <div className="mt-4 p-3 bg-surface rounded-2xl border border-white/5 space-y-1.5">
            <p className="text-[8px] font-black uppercase text-primary tracking-widest mb-1 opacity-70">INCLUDES:</p>
            {item.includedItems.map((sub, i) => (
              <div key={i} className="flex items-center gap-2">
                 <div className="w-1 h-1 rounded-full bg-emerald-400"></div>
                 <span className="text-[10px] text-white/90 font-medium truncate">{sub}</span>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-auto pt-6 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-sans font-black text-xl text-primary drop-shadow-sm tracking-tight">
                ₹{item.price.toFixed(2)}
            </span>
            {item.originalPrice > item.price && (
                <span className="text-[10px] text-text-muted line-through opacity-40 font-bold">
                    ₹{item.originalPrice.toFixed(2)}
                </span>
            )}
          </div>
          <motion.button 
            whileHover={{ scale: 1.15, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: 'ADD_ITEM', payload: item });
            }}
            className="bg-surface-light group-hover:bg-gradient-to-tr from-primary-dark to-primary text-white p-2.5 rounded-full transition-all duration-300 border border-white/10 group-hover:border-primary-light/50 group-hover:shadow-[0_0_20px_rgba(245,158,11,0.6)]"
          >
            <Plus className="w-5 h-5 text-text-muted group-hover:text-white transition-colors" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default MenuItemCard;
