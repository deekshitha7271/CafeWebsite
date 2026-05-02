import React from 'react';
import { motion } from 'framer-motion';

const CategorySidebar = ({ categories, activeCategory, onCategoryClick }) => {
    return (
        <div className="sticky top-[200px] h-[calc(100vh-220px)] hidden lg:flex flex-col w-64 pr-8 border-r border-white/5 pb-8">
            <h5 className="text-primary text-[10px] font-black uppercase tracking-[0.4em] mb-6 px-4 shrink-0">Categories</h5>

            <button
                onClick={() => onCategoryClick('all')}
                className={`text-left px-4 py-3 rounded-[16px] text-[9px] font-black uppercase tracking-[0.2em] transition-all border shrink-0 mb-1 ${activeCategory === 'all'
                    ? 'bg-primary text-background border-primary shadow-[0_15px_40px_rgba(245,158,11,0.3)]'
                    : 'text-text-muted hover:text-white hover:bg-white/5 border-transparent'
                    }`}
            >
                Full Menu
            </button>

            {/* Scrollable Categories List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1 relative pr-2">
                {categories.map((cat) => (
                    <button
                        key={cat._id}
                        onClick={() => onCategoryClick(cat._id)}
                        className={`text-left px-4 py-2.5 rounded-[16px] text-[9px] font-bold tracking-wider transition-all flex items-center gap-3 border shrink-0 ${activeCategory === cat._id
                            ? 'bg-white/10 text-primary border-primary/20 backdrop-blur-xl shadow-xl'
                            : 'text-text-muted hover:text-white hover:bg-white/5 border-transparent'
                            }`}
                    >
                        <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center overflow-hidden rounded-lg bg-background/40">
                            {cat.icon?.startsWith('http') ? (
                                <img src={cat.icon} alt={cat.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-[10px]">{cat.icon || '✨'}</span>
                            )}
                        </div>
                        <span className="truncate uppercase font-black text-[8px] tracking-[0.15em]">{cat.name}</span>
                    </button>
                ))}
            </div>

            {/* Fixed Bottom Action */}
            <div className="pt-3 mt-1 border-t border-white/5 shrink-0">
                <button
                    onClick={() => onCategoryClick('footer')}
                    className={`w-full text-left px-4 py-3 rounded-[16px] text-[9px] font-bold tracking-wider transition-all flex items-center gap-3 border ${activeCategory === 'footer'
                        ? 'bg-white/10 text-primary border-primary/20 backdrop-blur-xl shadow-xl'
                        : 'text-text-muted hover:text-white hover:bg-white/5 border-transparent'
                        }`}
                >
                    <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center overflow-hidden rounded-lg bg-background/40">
                        <span className="text-[10px]">📍</span>
                    </div>
                    <span className="truncate uppercase font-black text-[8px] tracking-[0.15em]">Restaurant Info</span>
                </button>
            </div>
        </div>
    );
};

export default CategorySidebar;
