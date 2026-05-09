import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../../context/CartContext';
import { ArrowLeft, Plus, Minus, Star, Zap, Leaf } from 'lucide-react';
import { motion } from 'framer-motion';

const MenuItemDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { state, dispatch } = useCart();
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);



    useEffect(() => {
        const fetchItem = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/menu-items/${id}`);
                setItem(res.data);
            } catch (error) {
                console.error("Failed to fetch item:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchItem();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!item) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-4">
                <h2 className="text-4xl font-serif text-white mb-4">Item Not Found</h2>
                <button onClick={() => navigate('/')} className="text-primary hover:underline font-bold tracking-widest uppercase">Return to Menu</button>
            </div>
        );
    }

    const cartItem = state.items.find(i => i._id === item._id);
    const quantity = cartItem ? cartItem.quantity : 0;
    const hasModel = !!item.modelUrl;

    return (
        <div className="min-h-screen bg-background font-sans overflow-x-hidden pt-12 pb-24">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-xl border-b border-white/5">
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => navigate('/')}
                    className="w-12 h-12 rounded-full bg-surface-light border border-white/10 flex items-center justify-center text-white hover:text-primary transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </motion.button>
                <div className="text-primary text-[10px] uppercase tracking-[0.4em] font-black">
                    Cá Phê Bistro Experience
                </div>
            </nav>

            <div className="max-w-[1400px] mx-auto px-6 lg:px-12 mt-20 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 relative">

                {/* Left Side: Massive Premium 3D AR Viewer or Image Display */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, rotateY: 10 }}
                    animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    className="relative h-[50vh] lg:h-[75vh] w-full rounded-[40px] md:rounded-[60px] overflow-hidden bg-surface shadow-[0_30px_60px_rgba(0,0,0,0.5)] border border-white/5 group flex items-center justify-center p-8"
                >
                    {/* Ambient Glow */}
                    <div className="absolute inset-0 bg-primary/10 group-hover:bg-primary/20 transition-colors duration-1000 blur-2xl z-0 pointer-events-none"></div>

                    {hasModel ? (
                        <model-viewer
                            src={item.modelUrl}
                            ios-src={item.iosModelUrl || ""}
                            alt={`3D model of ${item.name}`}
                            ar
                            ar-modes="webxr scene-viewer quick-look"
                            camera-controls
                            auto-rotate
                            auto-rotate-delay="1000"
                            rotation-per-second="30deg"
                            shadow-intensity="1"
                            environment-image="neutral"
                            exposure="1"
                            className="w-full h-full relative z-10"
                            style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
                        >
                            <div slot="ar-button" className="absolute bottom-6 right-6 bg-primary text-background font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-full cursor-pointer hover:scale-105 transition-transform shadow-[0_10px_20px_rgba(245,158,11,0.4)]">
                                View in AR Space
                            </div>
                            <div slot="progress-bar" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
                            </div>
                        </model-viewer>
                    ) : item.image ? (
                        <motion.img
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover rounded-3xl relative z-10 shadow-2xl"
                        />
                    ) : (
                        <div className="relative z-10 flex flex-col items-center justify-center text-text-muted/50 gap-4">
                            <Leaf className="w-20 h-20 opacity-20" />
                            <span className="uppercase tracking-[0.3em] text-xs font-black">No Media Available</span>
                        </div>
                    )}
                </motion.div>

                {/* Right Side: Content Details */}
                <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="flex flex-col justify-center"
                >
                    {/* Tags */}
                    <div className="flex flex-wrap gap-3 mb-8">
                        {item.isPopular && (
                            <span className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-lg">
                                <Star className="w-3 h-3" /> Trending
                            </span>
                        )}
                        {item.tags?.includes('seasonal') && (
                            <span className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full">
                                <Leaf className="w-3 h-3" /> Seasonal
                            </span>
                        )}
                    </div>

                    <h1 className="text-5xl md:text-7xl font-serif font-black text-white leading-[1.1] mb-6 drop-shadow-md">
                        {item.name}
                    </h1>

                    <div className="flex flex-wrap items-center gap-6 pb-8 border-b border-white/5 mb-8">
                        <div className="text-4xl text-primary font-black drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                            ₹{item.price.toFixed(2)}
                        </div>
                        {item.originalPrice > item.price && (
                            <div className="text-xl text-text-muted line-through font-medium opacity-50">
                                ₹{item.originalPrice.toFixed(2)}
                            </div>
                        )}
                        {item.categoryName && (
                            <div className="ml-auto inline-flex items-center gap-2 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] bg-surface-dark px-4 py-2 rounded-full border border-white/5 shadow-inner">
                                <Zap className="w-3 h-3 text-primary" /> {item.categoryName}
                            </div>
                        )}
                    </div>

                    <p className="text-text-muted text-lg md:text-xl font-light leading-relaxed mb-12">
                        {item.description || "Indulge in mastery. Every ingredient is carefully sourced and prepared to elevate your senses and give you a majestic experience."}
                    </p>

                    {/* Action Area / Cart */}
                    <div className="mt-auto">
                        {!state.isOrderingActive ? (
                            <div className="w-full bg-red-500/10 border border-red-500/30 text-red-500 text-center text-sm font-black uppercase tracking-[0.2em] py-6 rounded-[30px]">
                                Currently Closed for Online Ordering
                            </div>
                        ) : quantity > 0 ? (
                            <div className="flex items-center justify-between p-3 bg-surface-dark border border-primary/30 rounded-[40px] shadow-[0_20px_40px_rgba(245,158,11,0.15)]">
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => dispatch({ type: 'DECREMENT_ITEM', payload: item._id })}
                                    className="w-16 h-16 rounded-full bg-background flex items-center justify-center text-primary border border-white/5 hover:bg-primary hover:text-background transition-colors"
                                >
                                    <Minus className="w-6 h-6 font-bold" />
                                </motion.button>

                                <div className="flex flex-col items-center">
                                    <span className="text-3xl font-black text-white">{quantity}</span>
                                    <span className="text-[9px] uppercase tracking-widest text-primary/70 font-black tracking-[0.4em]">In Cart</span>
                                </div>

                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => dispatch({ type: 'ADD_ITEM', payload: item })}
                                    className="w-16 h-16 rounded-full bg-background flex items-center justify-center text-primary border border-white/5 hover:bg-primary hover:text-background transition-colors"
                                >
                                    <Plus className="w-6 h-6 font-bold" />
                                </motion.button>
                            </div>
                        ) : (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => dispatch({ type: 'ADD_ITEM', payload: item })}
                                className="w-full relative overflow-hidden group rounded-[30px]"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-primary-dark via-primary to-primary-light blur-lg opacity-70 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative bg-gradient-to-r from-primary-dark to-primary text-background p-6 flex flex-col items-center justify-center border border-white/20 shadow-2xl">
                                    <span className="font-black text-lg md:text-xl uppercase tracking-[0.2em] drop-shadow-md">Adorn Your Order</span>
                                </div>
                            </motion.button>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default MenuItemDetailsPage;
