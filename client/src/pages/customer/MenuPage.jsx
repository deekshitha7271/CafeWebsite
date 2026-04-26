import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../../context/CartContext';
import MenuItemCard from '../../components/customer/MenuItemCard';
import Navbar from '../../components/customer/Navbar';
import CartDrawer from '../../components/customer/CartDrawer';
import { Sparkles, Crown, Activity, Coffee, Moon, ArrowRight, Camera, MessageCircle, Mail, MapPin, Clock, Zap, Leaf, Smartphone, Check, Flame, Plus } from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';

const MenuPage = () => {
  const [searchParams] = useSearchParams();
  const tableNumber = searchParams.get('table');
  const { dispatch } = useCart();
  
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  // Parallax configuration
  const { scrollY } = useScroll();
  const backgroundY = useTransform(scrollY, [0, 1000], [0, 300]);
  const heroImageY = useTransform(scrollY, [0, 800], [0, -150]);
  const textY = useTransform(scrollY, [0, 500], [0, 100]);
  const textOpacity = useTransform(scrollY, [0, 300], [1, 0]);

  useEffect(() => {
    if (tableNumber) {
      dispatch({ type: 'SET_TABLE', payload: parseInt(tableNumber) });
    }

    const fetchMenu = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/menu`);
        setCategories(res.data.categories);
        setItems(res.data.items);
      } catch (error) {
        console.error('Failed to fetch menu:', error);
      } finally {
        // slight artificial delay just to show off the ultra-premium skeleton loaders
        setTimeout(() => setLoading(false), 800);
      }
    };

    fetchMenu();
  }, [tableNumber, dispatch]);

  const filteredItems = activeCategory === 'all' 
    ? items 
    : items.filter(item => item.categoryId === activeCategory);

  return (
    <div className="relative min-h-screen font-sans bg-background overflow-x-hidden">
      <Navbar />
      
      <div className="pt-24 mb-16 relative overflow-hidden flex flex-col-reverse md:flex-row items-center justify-between gap-12 w-full border-b border-white/5 bg-gradient-to-b from-surface to-background shadow-2xl px-6 lg:px-20 pb-16">
          
          {/* Animated Background blobs linked to scroll */}
          <motion.div style={{ y: backgroundY }} className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[140px] -translate-y-1/2 translate-x-1/3 mix-blend-screen"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3 mix-blend-screen"></div>
          </motion.div>
          
          <motion.div 
            style={{ y: textY, opacity: textOpacity }}
            className="relative z-10 flex-1 w-full max-w-2xl px-4 md:px-8"
          >
            <motion.div 
              initial={{ opacity: 0, y: 40 }} 
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center gap-2 mb-8">
                <Crown className="w-5 h-5 text-primary" />
                <span className="text-primary font-bold tracking-[0.2em] text-[10px] md:text-xs uppercase bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20 backdrop-blur-md shadow-lg">
                  Signature Collection
                </span>
              </div>
              <h1 className="text-6xl md:text-8xl lg:text-[7.5rem] font-bold font-serif leading-[0.95] mt-2 mb-8 tracking-[-0.02em]">
                <span className="text-gradient-gold block mb-2 hero-text-glow">Artisan</span>
                <span className="text-white block" style={{ textShadow: '0 20px 40px rgba(0,0,0,0.5)'}}>Perfection.</span>
              </h1>
              <p className="text-text-muted mt-6 text-sm md:text-xl max-w-md leading-relaxed border-l-[3px] border-primary/40 pl-6 tracking-wide font-light">
                Table <strong className="text-white font-bold">{tableNumber || '?'}</strong> • Indulge in our masterfully crafted culinary collection. Elevate your senses.
              </p>
              
              <div className="mt-12 flex gap-4">
                <motion.button 
                  whileHover={{ scale: 1.05, boxShadow: "0 20px 40px -10px rgba(245,158,11,0.6)" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => document.getElementById('discover').scrollIntoView({ behavior: 'smooth' })} 
                  className="bg-gradient-to-r from-primary to-primary-dark text-background px-10 py-5 rounded-full font-black uppercase tracking-[0.15em] text-xs transition-all relative overflow-hidden group border border-primary-light/30"
                >
                  <span className="relative z-10">Explore Menu</span>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
          
          {/* Floating Transparent Image Section with Scroll Parallax */}
          <div className="relative z-10 w-full md:w-1/2 flex justify-center items-center h-full">
            <motion.div
              style={{ y: heroImageY }}
              initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-lg aspect-square flex items-center justify-center transform-gpu"
            >
              {/* Spinning subtle light */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[15%] bg-gradient-to-tr from-primary/40 via-transparent to-transparent rounded-full blur-[80px] -z-10 mix-blend-screen"
              />

              <motion.img 
                src="https://res.cloudinary.com/dqxhjnhrt/image/upload/v1777180127/coffee-topped-with-whipped-cream-coffee-seeds_ttwybl.png" 
                alt="Signature Coffee" 
                animate={{ 
                  y: [0, -25, 0],
                  filter: [
                    'drop-shadow(0px 30px 40px rgba(245,158,11,0.15))',
                    'drop-shadow(0px 50px 60px rgba(245,158,11,0.3))',
                    'drop-shadow(0px 30px 40px rgba(245,158,11,0.15))'
                  ]
                }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="w-[95%] h-auto object-contain max-h-[600px] z-10 block"
              />
            </motion.div>
          </div>
        </div>
      
      {/* Container for the rest of the page */}
      <div className="pb-28 max-w-[1600px] mx-auto w-full">

        {/* MOOD-BASED TASTE EXPLORER SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 z-10 relative mt-16 px-8 lg:px-12">
            
            {/* MOOD CARD 1: THE SPARK */}
            <motion.div 
              whileHover={{ y: -10, scale: 1.01 }}
              onClick={() => {
                const cat = categories.find(c => c.mood === 'spark');
                if (cat) setActiveCategory(cat._id);
                document.getElementById('discover').scrollIntoView({ behavior: 'smooth' });
              }}
              className="group relative h-[320px] rounded-[40px] overflow-hidden cursor-pointer border border-white/10"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-primary/10 to-transparent z-10"></div>
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=2070')] bg-cover bg-center group-hover:scale-110 transition-transform duration-1000"></div>
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-500 z-10"></div>
              
              <div className="absolute inset-0 p-10 flex flex-col justify-end z-20">
                <div className="flex items-center gap-3 mb-4">
                   <div className="p-3 bg-primary/20 backdrop-blur-md rounded-2xl border border-primary/30">
                     <Coffee className="w-6 h-6 text-primary" />
                   </div>
                   <span className="text-primary text-xs font-black uppercase tracking-[0.3em] drop-shadow-lg">Morning Energy</span>
                </div>
                <h3 className="text-5xl font-serif font-black text-white mb-2 leading-tight">I need <br/> a Spark.</h3>
                <p className="text-white/60 text-sm font-medium flex items-center gap-2 group-hover:text-white transition-colors">
                  Explore Caffeinated & Breakfast Picks <ArrowRight className="w-4 h-4" />
                </p>
              </div>
            </motion.div>

            {/* MOOD CARD 2: THE INDULGENCE */}
            <motion.div 
               whileHover={{ y: -10, scale: 1.01 }}
               onClick={() => {
                 const cat = categories.find(c => c.mood === 'indulge');
                 if (cat) setActiveCategory(cat._id);
                 document.getElementById('discover').scrollIntoView({ behavior: 'smooth' });
               }}
               className="group relative h-[320px] rounded-[40px] overflow-hidden cursor-pointer border border-white/10"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-pink-500/10 to-transparent z-10"></div>
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=1964')] bg-cover bg-center group-hover:scale-110 transition-transform duration-1000"></div>
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-500 z-10"></div>
              
              <div className="absolute inset-0 p-10 flex flex-col justify-end z-20">
                <div className="flex items-center gap-3 mb-4">
                   <div className="p-3 bg-purple-500/20 backdrop-blur-md rounded-2xl border border-purple-500/30">
                     <Moon className="w-6 h-6 text-purple-400" />
                   </div>
                   <span className="text-purple-400 text-xs font-black uppercase tracking-[0.3em] drop-shadow-lg">Evening Vibes</span>
                </div>
                <h3 className="text-5xl font-serif font-black text-white mb-2 leading-tight">I want <br/> to Indulge.</h3>
                <p className="text-white/60 text-sm font-medium flex items-center gap-2 group-hover:text-white transition-colors">
                  Explore Sweets, Treats & Desserts <ArrowRight className="w-4 h-4" />
                </p>
              </div>
            </motion.div>
        </div>

        {/* TIER 1: TRENDING NOW (CINEMATIC SPOTLIGHT) */}
        {items.some(i => i.isPopular) && (
          <section className="mt-40 px-8 lg:px-20 relative overflow-hidden">
             {/* Background branding text */}
             <div className="absolute top-1/2 left-0 -translate-y-1/2 text-[15vw] font-serif font-black text-white/[0.03] select-none pointer-events-none whitespace-nowrap">
                TOP PICKS • TOP PICKS • TOP PICKS
             </div>
             
             <motion.div 
               initial={{ opacity: 0, x: -20 }} 
               whileInView={{ opacity: 1, x: 0 }} 
               viewport={{ once: true }}
               className="flex items-end justify-between mb-16 relative z-10"
             >
               <div>
                  <h3 className="font-serif text-5xl lg:text-7xl font-bold text-white mb-4">Trending <span className="text-primary italic">Favorites.</span></h3>
                  <div className="flex items-center gap-4">
                     <div className="h-[2px] w-12 bg-primary"></div>
                     <p className="text-primary text-[10px] uppercase font-black tracking-[0.4em]">Real-time Global Top Picks</p>
                  </div>
               </div>
               <div className="hidden md:flex items-center gap-3 text-primary/60 animate-pulse">
                  <Activity className="w-5 h-5" />
                  <span className="text-[10px] uppercase font-black tracking-widest">Live Updates</span>
               </div>
             </motion.div>

             <div className="flex overflow-x-auto hide-scrollbar gap-12 pb-20 -mx-4 px-4 snap-x snap-mandatory relative z-10">
               {items.filter(i => i.isPopular).map((item, idx) => (
                 <motion.div 
                   key={item._id} 
                   initial={{ opacity: 0, y: 30 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   viewport={{ once: true }}
                   transition={{ delay: idx * 0.1 }}
                   className="min-w-[320px] sm:min-w-[400px] snap-start"
                 >
                   <MenuItemCard item={item} />
                 </motion.div>
               ))}
             </div>
          </section>
        )}

        {/* TIER 2: DISCOVER (MAIN CATEGORIZED MENU) */}
        <section id="discover" className="mt-48 px-8 lg:px-20">
            <div className="flex flex-col md:flex-row items-center justify-between gap-10 mb-20">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }} 
                  whileInView={{ opacity: 1, x: 0 }} 
                  viewport={{ once: true }}
                >
                  <h3 className="font-serif text-5xl lg:text-7xl font-bold text-white mb-2 underline decoration-primary/20 decoration-8 underline-offset-[12px]">The Menu.</h3>
                </motion.div>
                
                {/* Category Navigation - Minimal & Glassy */}
                <div className="overflow-x-auto hide-scrollbar flex space-x-3 p-2 bg-surface-dark/40 backdrop-blur-2xl rounded-[30px] border border-white/5">
                    <button
                      onClick={() => setActiveCategory('all')}
                      className={`whitespace-nowrap px-8 py-3.5 rounded-[22px] text-[10px] uppercase tracking-[0.2em] font-black transition-all ${
                        activeCategory === 'all' 
                          ? 'bg-primary text-background shadow-[0_10px_30px_rgba(245,158,11,0.4)]' 
                          : 'text-text-muted hover:text-white'
                      }`}
                    >
                      Library
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat._id}
                        onClick={() => setActiveCategory(cat._id)}
                        className={`whitespace-nowrap px-8 py-3.5 rounded-[22px] text-[10px] uppercase tracking-[0.2em] font-black transition-all flex items-center gap-3 ${
                          activeCategory === cat._id 
                            ? 'bg-primary text-background shadow-[0_10px_30px_rgba(245,158,11,0.4)]' 
                            : 'text-text-muted hover:text-white'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                </div>
            </div>

           <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-10 min-h-[400px]">
              {loading ? (
                 Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="animate-pulse flex flex-col gap-6">
                       <div className="h-60 bg-surface rounded-[40px]"></div>
                       <div className="h-4 w-3/4 bg-surface rounded-full"></div>
                    </div>
                 ))
              ) : (
                filteredItems.map((item, i) => (
                  <motion.div 
                    key={item._id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <MenuItemCard item={item} />
                  </motion.div>
                ))
              )}
              {!loading && filteredItems.length === 0 && (
                <div className="col-span-full py-40 text-center">
                   <p className="text-text-muted text-xl font-serif">Curating this section for you...</p>
                </div>
              )}
           </div>
        </section>

        {/* TIER 3: THE COMBO SAVERS (VALUE SPOTLIGHT) */}
        {items.some(i => (i.tags || []).includes('combo')) && (
           <section className="mt-60 px-8 lg:px-20 py-48 border-y border-white/5 bg-gradient-to-tr from-primary/5 via-transparent to-transparent relative">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')] opacity-5 pointer-events-none"></div>
              <div className="text-center mb-32">
                 <h5 className="text-primary text-[10px] font-black uppercase tracking-[0.6em] mb-6">Expertly Curated</h5>
                 <h3 className="text-6xl lg:text-9xl font-serif text-white">Bundle & <span className="text-gradient-gold italic">Save.</span></h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 max-w-7xl mx-auto">
                 {items.filter(i => (i.tags || []).includes('combo')).map((item, i) => (
                    <motion.div 
                      key={item._id}
                      initial={{ opacity: 0, y: 40 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className="group relative overflow-hidden rounded-[60px] bg-surface-dark border border-white/5 p-2 flex flex-col md:flex-row h-auto md:h-[320px] transition-all hover:border-primary/30"
                    >
                       <div className="w-full md:w-[45%] h-[300px] md:h-full overflow-hidden rounded-[55px]">
                          <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2000ms] ease-out" />
                       </div>
                       <div className="flex-1 p-10 flex flex-col justify-center">
                          <div className="flex justify-between items-start mb-6">
                             <div>
                                <h4 className="text-3xl font-serif text-white mb-2">{item.name}</h4>
                                <div className="flex items-center gap-2">
                                   <Sparkles className="w-3 h-3 text-primary" />
                                   <span className="text-primary text-[9px] font-black uppercase tracking-widest">Handcrafted Bundle</span>
                                </div>
                             </div>
                             <div className="bg-primary/20 text-primary text-[10px] px-3 py-1 rounded-full border border-primary/30 font-black animate-pulse">VALUE</div>
                          </div>
                          
                          <div className="space-y-2 mb-10 opacity-70">
                             {(item.includedItems || []).map((inc, k) => (
                                <p key={k} className="text-[10px] text-white font-medium flex items-center gap-2 tracking-wide">
                                   <div className="w-1 h-1 rounded-full bg-primary" /> {inc}
                                </p>
                             ))}
                          </div>

                          <div className="flex items-center justify-between pt-6 border-t border-white/5">
                             <div className="flex flex-col">
                                <span className="text-4xl font-black text-white">₹{item.price}</span>
                                <span className="text-xs text-text-muted line-through opacity-40 italic">₹{item.originalPrice}</span>
                             </div>
                             <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => dispatch({ type: 'ADD_ITEM', payload: item })}
                                className="px-10 py-5 bg-gradient-to-r from-primary to-primary-dark text-background font-black rounded-[25px] uppercase tracking-widest text-[10px] shadow-2xl hover:shadow-primary/20 transition-all"
                             >
                                Get Combo
                             </motion.button>
                          </div>
                       </div>
                    </motion.div>
                 ))}
              </div>
           </section>
        )}

        {/* 1. EXPERIENCE GALLERY: CRAFTED MOMENTS (Redesigned for Excellence) */}
        <section className="mt-60 px-8 lg:px-20">
            <div className="flex flex-col md:flex-row items-end justify-between mb-24 gap-8">
               <div className="max-w-2xl">
                  <motion.div 
                    initial={{ width: 0 }} 
                    whileInView={{ width: '80px' }} 
                    viewport={{ once: true }}
                    className="h-1 bg-primary mb-8"
                  />
                  <motion.h3 
                    initial={{ opacity: 0, x: -30 }} 
                    whileInView={{ opacity: 1, x: 0 }} 
                    viewport={{ once: true }}
                    className="text-6xl lg:text-8xl font-serif font-black text-white leading-tight"
                  >
                    Crafted <br/> <span className="text-gradient-gold">Moments.</span>
                  </motion.h3>
               </div>
               <motion.p 
                 initial={{ opacity: 0 }} 
                 whileInView={{ opacity: 1 }} 
                 viewport={{ once: true }}
                 className="text-text-muted text-sm lg:text-base max-w-sm leading-relaxed font-light italic border-l border-white/10 pl-8"
               >
                 A cinematic glimpse into our daily ritual of perfection, ambience, and artisan soul.
               </motion.p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[800px]">
                {/* Large Featured Image */}
                <motion.div 
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="md:col-span-7 h-full rounded-[60px] overflow-hidden group relative border border-white/10 shadow-2xl"
                >
                  <img src="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=2078" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2000ms] ease-out" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
                  <div className="absolute bottom-12 left-12">
                     <span className="text-primary text-[10px] font-black uppercase tracking-[0.5em]">Ambience</span>
                     <h4 className="text-3xl font-serif text-white mt-2">The Golden Hour</h4>
                  </div>
                </motion.div>

                {/* Right Stack */}
                <div className="md:col-span-5 grid grid-rows-2 gap-6 h-full">
                    <motion.div 
                      initial={{ opacity: 0, x: 30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      className="rounded-[60px] overflow-hidden group relative border border-white/10"
                    >
                      <img src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=2070" className="w-full h-full object-cover group-hover:rotate-1 transition-transform duration-[1500ms]" />
                      <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    </motion.div>
                    
                    <div className="grid grid-cols-2 gap-6">
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.8 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          className="rounded-[40px] overflow-hidden border border-white/10 relative group"
                        >
                          <img src="https://images.unsplash.com/photo-1511920170033-f8396924c348?q=80&w=1887" className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-[3000ms]" />
                        </motion.div>
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.8 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.2 }}
                          className="rounded-[40px] overflow-hidden border border-white/10 flex items-center justify-center bg-surface-dark group relative"
                        >
                           <img src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=2047" className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity" />
                           <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform">
                                 <Plus className="w-6 h-6 text-white" />
                              </div>
                           </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>

        {/* 2. HOW IT'S MADE: CINEMATIC TIMELINE */}
        <section className="mt-60 px-8 lg:px-20 py-48 bg-gradient-to-b from-surface/40 to-background border-y border-white/5 relative overflow-hidden">
            {/* Connection Line */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[70%] h-px bg-white/5 hidden md:block">
               <motion.div 
                 initial={{ width: 0 }}
                 whileInView={{ width: '100%' }}
                 viewport={{ once: true }}
                 transition={{ duration: 2, ease: "easeInOut" }}
                 className="h-full bg-gradient-to-r from-transparent via-primary/50 to-transparent"
               />
            </div>

            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-24 md:gap-12 relative z-10">
               {[
                 { icon: Coffee, title: "Fresh Beans", tag: "Harvested", color: "text-primary", bg: "bg-primary/5" },
                 { icon: Flame, title: "Brewed Daily", tag: "Slow Roast", color: "text-orange-400", bg: "bg-orange-400/5" },
                 { icon: Check, title: "Served Warm", tag: "Artisan Care", color: "text-emerald-400", bg: "bg-emerald-400/5" }
               ].map((step, i) => (
                 <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.3 }}
                    className="flex flex-col items-center group"
                 >
                    <div className="relative mb-12">
                        {/* Outer Ring Animation */}
                        <motion.div 
                          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
                          transition={{ duration: 3, repeat: Infinity }}
                          className={`absolute inset-[-20px] rounded-full ${step.bg} blur-xl`}
                        />
                        <div className={`w-28 h-28 rounded-full ${step.bg} border-2 border-white/5 flex items-center justify-center backdrop-blur-xl group-hover:border-primary/40 transition-all duration-700 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]`}>
                           <step.icon className={`w-10 h-10 ${step.color} group-hover:scale-110 transition-transform`} />
                        </div>
                        {/* Number Badge */}
                        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-surface-dark border border-white/10 flex items-center justify-center text-[10px] font-black text-white shadow-xl">
                           0{i+1}
                        </div>
                    </div>
                    <span className="text-white/40 text-[9px] font-black uppercase tracking-[0.4em] mb-3">{step.tag}</span>
                    <h4 className="text-3xl font-serif font-black text-white group-hover:text-primary transition-colors duration-500">{step.title}</h4>
                 </motion.div>
               ))}
            </div>
        </section>

        {/* INNOVATIVE "ABOUT US" STORY SECTION (Image Left, Text Right) */}
        <section className="mt-72 px-8 lg:px-20 mb-72 flex flex-col lg:flex-row items-center gap-32">
            {/* Innovative Image Overlay Layout */}
            <div className="flex-1 relative w-full h-[600px]">
                {/* Background Blobs for depth */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 rounded-full blur-[100px] pointer-events-none"></div>
                
                {/* Main Large Image */}
                <motion.div 
                  initial={{ opacity: 0, x: -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2 }}
                  className="absolute inset-0 z-10 rounded-[60px] overflow-hidden border-2 border-white/5 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)]"
                >
                  <img src="https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=2074" className="w-full h-full object-cover" />
                </motion.div>

                {/* Floating "Innovative" Detail Image */}
                <motion.div 
                  initial={{ opacity: 0, y: 100 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5, duration: 1 }}
                  className="absolute -bottom-20 -right-10 z-20 w-80 h-96 rounded-[50px] overflow-hidden border-4 border-background shadow-2xl hidden md:block"
                >
                   <img src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=2070" className="w-full h-full object-cover" />
                </motion.div>
                
                {/* Signature Element */}
                <div className="absolute -top-12 -left-12 z-0 text-[12vw] font-serif font-black text-white/[0.03] rotate-[-10deg]">
                  STORY
                </div>
            </div>

            {/* Content (Right Side) */}
            <div className="flex-1 space-y-12">
               <motion.div
                 initial={{ opacity: 0, y: 30 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
               >
                  <h5 className="text-primary text-[10px] font-black uppercase tracking-[0.6em] mb-6 border-b border-primary/40 inline-block pb-3">Established 2024</h5>
                  <h3 className="text-6xl lg:text-8xl font-serif font-black text-white leading-tight">Beyond The <br/> <span className="text-gradient-gold">Daily Grind.</span></h3>
               </motion.div>

               <motion.div
                 initial={{ opacity: 0, y: 30 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ delay: 0.2 }}
                 className="space-y-8"
               >
                  <p className="text-text-muted text-xl font-light leading-relaxed italic border-l-2 border-primary/30 pl-10">
                    "We didn't just build a café. We cultivated a sanctuary where artisan mastery meets digital evolution."
                  </p>
                  <p className="text-text-muted/80 text-base leading-relaxed font-light pl-10">
                    Founded on the principle that coffee is more than a beverage—it's a ritual—Artisan Café brings together world-class baristas, sustainable growers, and state-of-the-art tech to serve perfection on every table.
                  </p>
               </motion.div>

               <motion.div 
                 initial={{ opacity: 0 }}
                 whileInView={{ opacity: 1 }}
                 viewport={{ once: true }}
                 transition={{ delay: 0.4 }}
                 className="pt-10 flex items-center gap-10"
               >
                  <div className="flex -space-x-4">
                     {[1,2,3].map(i => (
                        <div key={i} className="w-14 h-14 rounded-full border-4 border-background bg-surface overflow-hidden hover:scale-110 transition-transform cursor-pointer">
                           <img src={`https://i.pravatar.cc/150?img=${i+10}`} className="w-full h-full object-cover" />
                        </div>
                     ))}
                  </div>
                  <p className="text-xs text-text-muted/60 font-black uppercase tracking-widest">Joined by <br/> 500+ Local Regulars</p>
               </motion.div>
            </div>
        </section>

      </div>

      {/* 4. PREMIUM FOOTER REDESIGNED */}
      <footer className="bg-[#080402] border-t border-white/5 relative pt-40 pb-20 overflow-hidden">
          {/* Giant Logo Background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[40vw] font-serif font-black text-white/[0.02] pointer-events-none select-none">
             ARTISAN
          </div>
          
          <div className="max-w-[1600px] mx-auto px-8 lg:px-20 grid grid-cols-1 md:grid-cols-12 gap-20 relative z-10 mb-40">
              <div className="md:col-span-4 space-y-12">
                  <div className="flex items-center gap-6">
                       <div className="w-16 h-16 bg-primary rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.2)]">
                          <span className="text-background font-serif font-black text-3xl">A.</span>
                       </div>
                       <div>
                          <h2 className="text-4xl font-serif font-black text-white tracking-tight">Artisan</h2>
                          <p className="text-primary text-[10px] font-black uppercase tracking-[0.4em]">The Café Studio</p>
                       </div>
                  </div>
                  <p className="text-text-muted text-lg font-light leading-relaxed max-w-sm">
                      Reinventing the café culture through digital innovation and traditional mastery.
                  </p>
                  <div className="flex gap-8">
                      <motion.a whileHover={{ y: -5 }} className="text-white/40 hover:text-primary transition-colors"><Camera className="w-6 h-6" /></motion.a>
                      <motion.a whileHover={{ y: -5 }} className="text-white/40 hover:text-primary transition-colors"><MessageCircle className="w-6 h-6" /></motion.a>
                      <motion.a whileHover={{ y: -5 }} className="text-white/40 hover:text-primary transition-colors"><Mail className="w-6 h-6" /></motion.a>
                  </div>
              </div>

              <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-16">
                  {/* Grid Sections */}
                  <div className="space-y-10">
                      <h6 className="text-primary text-[10px] font-black uppercase tracking-[0.4em]">Connect</h6>
                      <div className="space-y-6 text-sm text-text-muted font-light">
                          <p className="hover:text-white transition-colors cursor-pointer capitalize">Instagram</p>
                          <p className="hover:text-white transition-colors cursor-pointer capitalize">Twitter / X</p>
                          <p className="hover:text-white transition-colors cursor-pointer capitalize">Discord</p>
                      </div>
                  </div>
                  
                  <div className="space-y-10">
                      <h6 className="text-primary text-[10px] font-black uppercase tracking-[0.4em]">Address</h6>
                      <div className="space-y-6 text-sm text-text-muted font-light leading-relaxed">
                          <p>123 Espresso Avenue <br/> Manhattan, NY 10001</p>
                          <p className="text-white font-bold underline decoration-primary/40 underline-offset-4">Get Directions</p>
                      </div>
                  </div>

                  <div className="space-y-10">
                      <h6 className="text-primary text-[10px] font-black uppercase tracking-[0.4em]">Open Daily</h6>
                      <div className="space-y-6 text-sm text-text-muted font-light">
                          <p className="flex justify-between"><span>Mon - Fri</span> <span className="text-white">08AM - 10PM</span></p>
                          <p className="flex justify-between"><span>Sat - Sun</span> <span className="text-white">09AM - 11PM</span></p>
                      </div>
                  </div>
              </div>
          </div>

          <div className="max-w-[1600px] mx-auto px-8 lg:px-20 pt-16 border-t border-white/5 flex flex-col md:flex-row justify-between gap-8 relative z-10 opacity-30 group hover:opacity-100 transition-opacity duration-1000">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white">© 2026 Artisan Café Studio</p>
              <div className="flex gap-12 text-[10px] font-black uppercase tracking-[0.4em] text-white">
                  <span>Privacy</span>
                  <span>Terms</span>
                  <span>Press Kit</span>
              </div>
          </div>
      </footer>

      <CartDrawer />
    </div>
  );
};

export default MenuPage;
