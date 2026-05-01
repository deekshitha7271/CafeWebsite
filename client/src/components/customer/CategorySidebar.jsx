import React from 'react';
import { motion } from 'framer-motion';

const CategorySidebar = ({ categories, activeCategory, onCategoryClick }) => {
    return (
        <div className="sticky top-32 h-fit hidden lg:flex flex-col gap-2 w-64 pr-8 border-r border-white/5">
            <h5 className="text-primary text-[10px] font-black uppercase tracking-[0.4em] mb-6 px-4">Categories</h5>

            <button
                onClick={() => onCategoryClick('all')}
                className={`text-left px-5 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${activeCategory === 'all'
                    ? 'bg-primary text-background border-primary shadow-[0_15px_40px_rgba(245,158,11,0.3)]'
                    : 'text-text-muted hover:text-white hover:bg-white/5 border-transparent'
                    }`}
            >
                Full Menu
            </button>

            {categories.map((cat) => (
                <button
                    key={cat._id}
                    onClick={() => onCategoryClick(cat._id)}
                    className={`text-left px-5 py-4 rounded-[20px] text-[10px] font-bold tracking-wider transition-all flex items-center gap-4 border ${activeCategory === cat._id
                        ? 'bg-white/10 text-primary border-primary/20 backdrop-blur-xl shadow-xl'
                        : 'text-text-muted hover:text-white hover:bg-white/5 border-transparent'
                        }`}
                >
                    <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center overflow-hidden rounded-lg bg-background/40">
                        {cat.icon?.startsWith('http') ? (
                            <img src={cat.icon} alt={cat.name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-sm">{cat.icon || '✨'}</span>
                        )}
                    </div>
                    <span className="truncate uppercase font-black text-[9px] tracking-[0.15em]">{cat.name}</span>
                </button>
            ))}
        </div>
    );
};

export default CategorySidebar;
