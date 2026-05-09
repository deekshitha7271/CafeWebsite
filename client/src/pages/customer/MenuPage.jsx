import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../../context/CartContext';
import MenuItemCard from '../../components/customer/MenuItemCard';
import MenuListItem from '../../components/customer/MenuListItem';
import Navbar from '../../components/customer/Navbar';
import CartDrawer from '../../components/customer/CartDrawer';
import CartToast from '../../components/customer/CartToast';
import {
  Sparkles, Crown, Activity, Coffee, Moon, ArrowRight, Camera,
  MessageCircle, Mail, MapPin, Clock, Zap, Leaf, Smartphone,
  Check, Flame, Plus, ChevronLeft, ChevronRight, Search,
  Grid, List, Filter as FilterIcon, Menu as MenuIcon, X, Phone, Navigation
} from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence, useMotionValueEvent } from 'framer-motion';

// ── Sub-component for Category Sections to handle Hooks safely ────────────
const MenuCategorySection = ({ section, viewMode }) => {
  // NORMALIZE NAME TO STRIP ACCENTS (e.g. Cá Phê -> Ca Phe)
  const normalizedName = section.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // BROAD DETECTION DNA
  const isSpecial = normalizedName.includes('special') ||
    normalizedName.includes('vietnam') ||
    normalizedName.includes('bistro') ||
    normalizedName.includes('chef') ||
    normalizedName.includes('ca phe');

  const carouselRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 20);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 20);
    }
  };

  const scroll = (dir) => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: dir * (window.innerWidth > 768 ? 600 : 300), behavior: 'smooth' });
      setTimeout(checkScroll, 500);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  return (
    <div id={`category-${section._id}`} className="scroll-mt-48 relative group/section">
      <div className="flex items-end justify-between gap-6 mb-12 group flex-wrap">
        <div className="flex flex-col min-w-[200px]">
          <span className="text-primary text-[10px] font-black uppercase tracking-[0.6em] mb-2 opacity-50">
            {isSpecial ? "Chef's Recommendations" : "Discover Our Menu"}
          </span>
          <h4 className="font-serif text-3xl md:text-5xl lg:text-7xl font-bold text-white tracking-tight leading-tight">
            {section.name}
          </h4>
        </div>
      </div>

      <div className="relative">
        {/* Modern Floating Navigation for Carousels */}
        {isSpecial && (
          <>
            <button
              onClick={() => scroll(-1)}
              disabled={!canScrollLeft}
              className={`absolute left-2 lg:-left-6 top-[40%] -translate-y-1/2 z-50 w-12 h-12 md:w-20 md:h-20 rounded-full bg-surface-dark border-2 border-white/20 flex items-center justify-center text-white transition-all shadow-[0_15px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl ${canScrollLeft ? 'opacity-100 scale-100 hover:bg-primary hover:text-background active:scale-95' : 'opacity-10 scale-90 pointer-events-none'
                }`}
            >
              <ChevronLeft className="w-8 h-8 md:w-12 md:h-12" />
            </button>

            <button
              onClick={() => scroll(1)}
              disabled={!canScrollRight}
              className={`absolute right-2 lg:-right-6 top-[40%] -translate-y-1/2 z-50 w-12 h-12 md:w-20 md:h-20 rounded-full bg-surface-dark border-2 border-white/20 flex items-center justify-center text-white transition-all shadow-[0_15px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl ${canScrollRight ? 'opacity-100 scale-100 hover:bg-primary hover:text-background active:scale-95' : 'opacity-10 scale-90 pointer-events-none'
                }`}
            >
              <ChevronRight className="w-8 h-8 md:w-12 md:h-12" />
            </button>
          </>
        )}

        <div
          ref={isSpecial ? carouselRef : null}
          onScroll={isSpecial ? checkScroll : undefined}
          className={viewMode === 'grid'
            ? isSpecial
              ? "flex gap-4 lg:gap-8 overflow-x-auto hide-scrollbar pb-8 snap-x snap-mandatory px-4"
              : "grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-8"
            : "flex flex-col gap-4 overflow-x-hidden"
          }
        >
          {section.items.map((item, i) => (
            <motion.div
              key={item._id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i % 5 * 0.05 }}
              className={isSpecial ? "shrink-0 w-[200px] md:w-[280px] snap-start" : ""}
            >
              {viewMode === 'grid'
                ? <MenuItemCard item={item} variant={isSpecial ? 'compact' : 'standard'} />
                : <MenuListItem item={item} />
              }
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

const MenuPage = () => {
  const { dispatch } = useCart();

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);

  // New State for High-Velocity UI
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [dietaryFilter, setDietaryFilter] = useState('all'); // 'all', 'veg', 'non-veg'
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const catStripRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [isHeaderSticky, setIsHeaderSticky] = useState(false);
  const menuHeaderRef = useRef(null);

  const scrollCatStrip = (dir) => {
    if (catStripRef.current) {
      catStripRef.current.scrollBy({ left: dir * 250, behavior: 'smooth' });
    }
  };

  const handleCatStripScroll = () => {
    const el = catStripRef.current;
    if (!el) return;
    setShowLeftArrow(el.scrollLeft > 10);
    setShowRightArrow(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  // Toast State for Premium Feedback
  const [showToast, setShowToast] = useState(false);
  const [toastItem, setToastItem] = useState(null);
  const { state: cartState, cartCount } = useCart();
  const prevCount = React.useRef(cartCount);

  // Watch for cart additions to trigger toast
  useEffect(() => {
    if (cartCount > prevCount.current) {
      const lastItem = cartState.items[cartState.items.length - 1];
      if (lastItem) {
        setToastItem(lastItem);
        setShowToast(true);
      }
    }
    prevCount.current = cartCount;
  }, [cartCount, cartState.items]);

  // Parallax configuration (existing...)
  const { scrollY } = useScroll();

  // Track scroll for sticky category header
  useMotionValueEvent(scrollY, "change", (latest) => {
    if (menuHeaderRef.current) {
      // Logic: Stick when the discover section reaches the top (minus navbar height)
      const discoverEl = document.getElementById('discover');
      if (discoverEl) {
        const discoverTop = discoverEl.offsetTop;
        setIsHeaderSticky(latest > discoverTop - 90);
      }
    }
  });

  const backgroundY = useTransform(scrollY, [0, 1000], [0, 300]);
  const heroImageY = useTransform(scrollY, [0, 800], [0, -150]);
  const textY = useTransform(scrollY, [0, 500], [0, 100]);
  const textOpacity = useTransform(scrollY, [0, 300], [1, 0]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [menuRes, settingsRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/menu`),
          axios.get(`${import.meta.env.VITE_API_URL}/settings`)
        ]);
        setCategories(menuRes.data.categories);
        setItems(menuRes.data.items);
        setSettings(settingsRes.data);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dispatch]);

  // Refined filtering for 200+ items - Hard filtering for high-density focus
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDietary = dietaryFilter === 'all' || item.dietaryTag === dietaryFilter;
      return matchesSearch && matchesDietary;
    });
  }, [items, searchQuery, dietaryFilter]);

  // Group items by category for sectioned rendering
  const itemsByCategory = useMemo(() => {
    return categories.reduce((acc, cat) => {
      const catItems = filteredItems.filter(item => String(item.categoryId?._id || item.categoryId) === String(cat._id));
      if (catItems.length > 0) acc.push({ ...cat, items: catItems });
      return acc;
    }, []);
  }, [categories, filteredItems]);

  const specialCategory = useMemo(() => categories.find(c => c.name.toLowerCase().includes('ca phe bistro special')), [categories]);
  const specialItems = useMemo(() => specialCategory ? items.filter(i => String(i.categoryId?._id || i.categoryId) === String(specialCategory._id)) : [], [specialCategory, items]);

  // Active Category State logic - REVERTED TO FILTERING
  const handleCategoryChange = (catId) => {
    setActiveCategory(catId);

    // Snap scroll to the top of the menu grid
    const discoverSection = document.getElementById('discover');
    if (discoverSection) {
      window.scrollTo({
        top: discoverSection.offsetTop - 100,
        behavior: 'smooth'
      });
    }
  };

  // REVERTED TO FILTERING: Show only the selected category or all
  const displayedCategories = useMemo(() => {
    if (activeCategory === 'all') return itemsByCategory;
    return itemsByCategory.filter(cat => String(cat._id) === String(activeCategory));
  }, [itemsByCategory, activeCategory]);

  return (
    <div className="relative min-h-screen font-sans bg-background">
      <Navbar />

      <CartToast
        item={toastItem}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
        onViewCart={() => {
          setShowToast(false);
          dispatch({ type: 'SET_CART_OPEN', payload: true });
        }}
      />

      <div className="pt-24 mb-4 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 w-full border-b border-white/5 bg-gradient-to-b from-surface to-background shadow-2xl px-6 lg:px-20 pb-8 min-h-[70vh]">

        {/* Animated Background blobs linked to scroll */}
        <motion.div style={{ y: backgroundY }} className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[140px] -translate-y-1/2 translate-x-1/3 mix-blend-screen animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3 mix-blend-screen"></div>

          {/* Floating Luxury Elements */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0.2, 0.5, 0.2],
                y: [0, -120, 0],
                rotate: [0, 360],
                x: [0, (i % 2 === 0 ? 80 : -80), 0]
              }}
              transition={{
                duration: 12 + i * 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute text-primary/40 pointer-events-none drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]"
              style={{
                top: `${15 + i * 15}%`,
                left: `${5 + i * 18}%`,
              }}
            >
              <Coffee
                className={i % 3 === 0 ? "w-6 h-6" : i % 3 === 1 ? "w-8 h-8" : "w-10 h-10"}
                strokeWidth={1.5}
              />
            </motion.div>
          ))}
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
                {(settings?.cafeName || 'Cá Phê Bistro').replace('Ca Phe', 'Cá Phê')} • {settings?.tagline || 'Signature'}
              </span>
            </div>
            <h1 className="text-6xl md:text-8xl lg:text-[7.5rem] font-bold font-serif leading-[0.95] mt-2 mb-8 tracking-[-0.02em]">
              <motion.span
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, delay: 0.2 }}
                className="text-gradient-gold block mb-2 hero-text-glow"
              >
                {settings?.heroHeadline ? (settings.heroHeadline.replace('Ca Phe', 'Cá Phê').split(' ').length >= 3 ? settings.heroHeadline.replace('Ca Phe', 'Cá Phê').split(' ').slice(0, 2).join(' ') : settings.heroHeadline.replace('Ca Phe', 'Cá Phê').split(' ')[0]) : 'Cá Phê'}
              </motion.span>
              <motion.span
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, delay: 0.4 }}
                className="text-white block"
                style={{ textShadow: '0 20px 40px rgba(0,0,0,0.5)' }}
              >
                {settings?.heroHeadline ? (settings.heroHeadline.replace('Ca Phe', 'Cá Phê').split(' ').length >= 3 ? settings.heroHeadline.replace('Ca Phe', 'Cá Phê').split(' ').slice(2).join(' ') : settings.heroHeadline.replace('Ca Phe', 'Cá Phê').split(' ').slice(1).join(' ')) : 'Bistro.'}
              </motion.span>
            </h1>
            <p className="text-text-muted/70 mt-6 text-xs md:text-sm max-w-lg leading-relaxed border-l-[2px] border-primary/20 pl-4 tracking-wide font-light">
              At Cá Phê Bistro, every cup tells a story.<br className="mb-2" />
              From bold Vietnamese phin coffee to refreshing cold brews and handcrafted classics, we serve rich flavors in a calm, welcoming space.
            </p>

            <div className="mt-10 flex flex-col gap-8">
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 20px 40px -10px rgba(245,158,11,0.6)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => document.getElementById('discover').scrollIntoView({ behavior: 'smooth' })}
                className="bg-gradient-to-r from-primary to-primary-dark text-background px-12 py-5 rounded-full font-black uppercase tracking-[0.2em] text-sm transition-all relative overflow-hidden group border border-primary-light/30 w-fit"
              >
                <span className="relative z-10 flex items-center gap-3">
                  {settings?.heroCta || 'Start Your Order'} <ArrowRight className="w-4 h-4" />
                </span>
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
              initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
              animate={{
                scale: 1,
                opacity: 1,
                rotate: 0,
                y: [0, -25, 0],
                filter: [
                  'drop-shadow(0px 30px 40px rgba(245,158,11,0.15))',
                  'drop-shadow(0px 50px 60px rgba(245,158,11,0.3))',
                  'drop-shadow(0px 30px 40px rgba(245,158,11,0.15))'
                ]
              }}
              whileHover={{
                scale: 1.05,
                rotate: 2,
                filter: 'drop-shadow(0px 60px 80px rgba(245,158,11,0.4))'
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
                initial: { duration: 1.5, ease: "easeOut" }
              }}
              className="w-[95%] h-auto object-contain max-h-[600px] z-10 block drop-shadow-2xl"
            />
          </motion.div>
        </div>
      </div>


      {/* Container for the rest of the page */}
      <div className="pb-28 max-w-[1600px] mx-auto w-full">

        {/* RESTAURANT INFO HEADER — Zomato-style profile card */}
        <div className="px-6 lg:px-20 mt-8 mb-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="bg-surface/60 border border-white/5 rounded-[24px] px-6 lg:px-10 py-5 backdrop-blur-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-2xl"
          >
            {/* Left — Address + timings */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="w-14 h-14 bg-primary/15 border border-primary/20 rounded-2xl flex items-center justify-center shrink-0">
                <span className="text-background font-serif font-black text-xl text-primary">{settings?.cafeName?.[0] || 'C'}.</span>
              </div>
              <div>
                <h2 className="text-xl font-serif font-black text-white mb-1">
                  {settings?.cafeName?.replace('Ca Phe', 'Cá Phê').split(' ')[0] || 'Cá Phê'}{' '}
                  <span className="text-primary italic">{settings?.cafeName?.replace('Ca Phe', 'Cá Phê').split(' ').slice(1).join(' ') || 'Bistro'}</span>
                </h2>
                <p className="text-text-muted text-xs flex items-center gap-1.5 font-light">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  {settings?.address || 'Financial District, Nanakramguda, Makthakousarali, Telangana 500032'}
                </p>
              </div>
            </div>

            {/* Middle — Info Chips */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold text-white bg-white/5 px-4 py-2 rounded-full border border-white/8">
                <Clock className="w-3 h-3 text-primary" /> {settings?.weekdayHours || '08:30 AM – 11:00 PM'}
                <span className="ml-1 text-green-400 font-black">(Open)</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold text-white bg-white/5 px-4 py-2 rounded-full border border-white/8">
                <Phone className="w-3 h-3 text-primary" /> {settings?.phone || '+91 123 456 7890'}
              </div>
            </div>

            {/* Right — Action Buttons */}
            <div className="flex items-center gap-3">
              <a
                href={settings?.googleMaps || "https://maps.app.goo.gl/4iQhPwpcW323YQFt9"}
                target="_blank" rel="noreferrer"
                className="bg-primary text-background px-6 py-2.5 rounded-full font-black uppercase tracking-[0.15em] text-[9px] hover:bg-primary-light transition-all flex items-center gap-2 shadow-[0_8px_24px_rgba(245,158,11,0.3)] whitespace-nowrap"
              >
                <Navigation className="w-3.5 h-3.5" /> Directions
              </a>
              <a href={settings?.instagram || "https://www.instagram.com/caphe_bistro?igsh=M3p2cWw1eGEzcGs5"} target="_blank" rel="noreferrer"
                className="w-9 h-9 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white/50 hover:text-primary hover:bg-white/10 transition-all">
                <Camera className="w-4 h-4" />
              </a>
              <a href={`https://wa.me/${settings?.phone?.replace(/\D/g, '') || '911234567890'}?text=Hi%20${settings?.cafeName?.replace('Ca Phe', 'Cá Phê') || 'Cá Phê Bistro'}`} target="_blank" rel="noreferrer"
                className="w-9 h-9 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white/50 hover:text-primary hover:bg-white/10 transition-all">
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        </div>

        {/* TIER 1: CA PHE BISTRO SPECIAL */}
        {specialItems.length > 0 && (
          <section className="mt-20 px-8 lg:px-20 relative overflow-hidden">
            {/* Background branding text */}
            <div className="absolute top-1/2 left-0 -translate-y-1/2 text-[15vw] font-serif font-black text-white/[0.03] select-none pointer-events-none whitespace-nowrap">
              SPECIALS • SPECIALS • SPECIALS
            </div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex items-end justify-between mb-16 relative z-10"
            >
              <div>
                <h3 className="font-serif text-5xl lg:text-7xl font-bold text-white mb-4">Cá Phê Bistro <span className="text-primary italic">Special.</span></h3>
                <div className="flex items-center gap-4">
                  <div className="h-[2px] w-12 bg-primary"></div>
                  <p className="text-primary text-[10px] uppercase font-black tracking-[0.4em]">Chef's Recommendations</p>
                </div>
              </div>
            </motion.div>

            <div className="flex overflow-x-auto hide-scrollbar gap-12 pb-20 -mx-4 px-4 snap-x snap-mandatory relative z-10">
              {specialItems.map((item, idx) => (
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

        {/* TIER 2: DISCOVER (HIGH-VELOCITY SECTIONED MENU) */}
        <section id="discover" className="mt-16 relative">

          {/* ── FIXED STICKY SHELL: Search bar + Category Strip (always on top) ── */}
          {/* ── HIGH-PERFORMANCE NAVIGATION SHELL ── */}
          <div ref={menuHeaderRef} className="h-[140px] md:h-[160px] relative">
            <div className={`${isHeaderSticky
              ? 'fixed top-[72px] md:top-[88px] left-0 right-0 z-[48] bg-background/95 backdrop-blur-3xl shadow-2xl border-b border-white/5 animate-in slide-in-from-top-4 duration-300'
              : 'relative'
              }`}>
              {/* Row 1: Search + View Toggle */}
              <div className="px-6 lg:px-20 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full md:w-96 group">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary opacity-40 group-focus-within:opacity-100 transition-opacity" />
                  <input
                    type="text"
                    placeholder="Find a delicacy..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-surface-dark border border-white/10 rounded-2xl py-3.5 pl-14 pr-6 text-sm outline-none focus:border-primary/50 transition-all placeholder:text-white/20 shadow-inner"
                  />
                </div>

                <div className="flex items-center gap-2 bg-surface-dark p-1.5 rounded-2xl border border-white/5 mx-auto md:mx-0">
                  <button
                    onClick={() => setDietaryFilter('all')}
                    className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${dietaryFilter === 'all' ? 'bg-primary text-background shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white'}`}
                  >
                    Full Menu
                  </button>
                  <button
                    onClick={() => setDietaryFilter('veg')}
                    className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${dietaryFilter === 'veg' ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'text-white/40 hover:text-white'}`}
                  >
                    <Leaf className="w-3 h-3" /> Veg Only
                  </button>
                  <div className="w-px h-4 bg-white/10 mx-2" />
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white/10 text-primary' : 'text-white/30 hover:text-white'}`}
                      title="Gallery View"
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white/10 text-primary' : 'text-white/30 hover:text-white'}`}
                      title="List View"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 2: Horizontal Category Strip */}
              <div className="relative px-6 lg:px-20 pb-3">
                {showLeftArrow && (
                  <button
                    onClick={() => scrollCatStrip(-1)}
                    className="absolute left-2 lg:left-16 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-surface border border-white/10 flex items-center justify-center text-white/70 hover:text-primary hover:border-primary/40 transition-all shadow-xl backdrop-blur-sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                {showRightArrow && (
                  <button
                    onClick={() => scrollCatStrip(1)}
                    className="absolute right-2 lg:right-16 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-surface border border-white/10 flex items-center justify-center text-white/70 hover:text-primary hover:border-primary/40 transition-all shadow-xl backdrop-blur-sm"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}

                <div
                  ref={catStripRef}
                  onScroll={handleCatStripScroll}
                  className="overflow-x-auto hide-scrollbar flex items-center gap-2"
                >
                  <button
                    onClick={() => handleCategoryChange('all')}
                    className={`shrink-0 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap ${activeCategory === 'all'
                      ? 'bg-primary text-background border-primary shadow-[0_6px_20px_rgba(245,158,11,0.4)]'
                      : 'bg-white/5 text-white/60 border-white/10 hover:text-white hover:bg-white/10'
                      }`}
                  >All</button>
                  {itemsByCategory.map(cat => (
                    <button
                      key={cat._id}
                      onClick={() => handleCategoryChange(cat._id)}
                      className={`shrink-0 flex items-center gap-1.5 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap ${activeCategory === cat._id
                        ? 'bg-primary text-background border-primary shadow-[0_6px_20px_rgba(245,158,11,0.4)]'
                        : 'bg-white/5 text-white/60 border-white/10 hover:text-white hover:bg-white/10'
                        }`}
                    >
                      {cat.icon && !cat.icon.startsWith('http') && <span className="text-xs">{cat.icon}</span>}
                      {cat.name.replace('Ca Phe', 'Cá Phê')}
                    </button>
                  ))}
                  <button
                    onClick={() => handleCategoryChange('footer')}
                    className="shrink-0 flex items-center gap-1.5 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap bg-white/5 text-white/60 border-white/10 hover:text-primary hover:bg-white/10"
                  >
                    <MapPin className="w-3 h-3" /> Restaurant Info
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area — full width, sectioned by category */}
          <div className="px-6 lg:px-20 w-full space-y-28 min-h-[60vh] mt-12">
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="animate-pulse flex flex-col gap-4">
                    <div className="h-56 bg-surface rounded-[32px]"></div>
                    <div className="h-4 w-3/4 bg-surface rounded-full"></div>
                  </div>
                ))}
              </div>
            ) : displayedCategories.length > 0 ? (
              displayedCategories.map((section) => (
                <MenuCategorySection
                  key={section._id}
                  section={section}
                  viewMode={viewMode}
                />
              ))
            ) : (
              <div className="py-40 text-center space-y-6">
                <div className="w-20 h-20 bg-surface-dark border border-white/5 rounded-full flex items-center justify-center mx-auto mb-8">
                  <Search className="w-8 h-8 text-white/10" />
                </div>
                <h5 className="text-2xl font-serif text-white opacity-40 italic">No delicacies found in this selection.</h5>
                <button onClick={() => { setSearchQuery(''); setDietaryFilter('all'); setActiveCategory('all'); }} className="text-primary text-[10px] uppercase font-black tracking-widest hover:underline transition-all">Clear All Filters</button>
              </div>
            )}
          </div>
        </section>


        {/* GOOGLE MAPS LOCATION INTEGRATION */}
        <section className="mt-40 px-8 lg:px-20 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col lg:flex-row items-center gap-16 bg-surface/30 backdrop-blur-xl border border-white/5 rounded-[60px] p-8 md:p-12 overflow-hidden relative group hover:border-primary/20 transition-all duration-700"
          >
            {/* Background Map glow */}
            <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 -z-10 group-hover:bg-primary/20 transition-colors duration-1000 pointer-events-none"></div>

            <div className="flex-1 space-y-8 z-10 w-full">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <h5 className="text-primary text-[10px] font-black uppercase tracking-[0.6em]">Location</h5>
              </div>
              <h3 className="text-5xl md:text-7xl font-serif font-black text-white leading-tight">
                Visit our <br /> <span className="text-gradient-gold">Sanctuary.</span>
              </h3>
              <p className="text-text-muted text-base leading-relaxed font-light italic border-l-2 border-primary/30 pl-6 max-w-md">
                Experience our curated blends and artisan perfection in person. We're nestled in the heart of the city, ready to welcome you.
              </p>

              <div className="flex flex-wrap gap-4 mt-8">
                <div className="flex items-center gap-4 text-text-muted text-sm bg-background/50 px-6 py-4 rounded-3xl border border-white/5 inline-flex w-fit shadow-lg">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="font-medium tracking-wide">Cá Phê Bistro</span>
                </div>
                <div className="flex items-center gap-4 text-text-muted text-sm bg-background/50 px-6 py-4 rounded-3xl border border-white/5 inline-flex w-fit shadow-lg">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="font-medium tracking-wide">08AM - 11PM</span>
                </div>
              </div>
            </div>

            <div className="flex-1 w-full h-[400px] md:h-[500px] rounded-[40px] overflow-hidden border-2 border-white/10 relative z-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] filter grayscale-[30%] contrast-[1.1] hover:grayscale-0 transition-all duration-700">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3806.920918790092!2d78.35062347493545!3d17.415582383476448!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcb95004459c9ad%3A0x1a74866a4a83a29b!2sCa%20Phe%20Bistro!5e0!3m2!1sen!2sin!4v1777441518200!5m2!1sen!2sin"
                width="100%"
                height="100%"
                style={{ border: "0" }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full object-cover"
              ></iframe>
            </div>
          </motion.div>
        </section>

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
                Crafted <br /> <span className="text-gradient-gold">Moments.</span>
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
            {/* Large Featured Image — image 1 (the cafe) */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="md:col-span-7 h-full rounded-[60px] overflow-hidden group relative border border-white/10 shadow-2xl"
            >
              <img src="https://res.cloudinary.com/dqxhjnhrt/image/upload/v1777901349/images_1_1.jpg_sit3hj.jpg" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2000ms] ease-out" />
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
                <img src="/ca phe bistro website images/image 2.avif" className="w-full h-full object-cover group-hover:rotate-1 transition-transform duration-[1500ms]" />
                <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              </motion.div>

              <div className="grid grid-cols-2 gap-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className="rounded-[40px] overflow-hidden border border-white/10 relative group"
                >
                  <img src="/ca phe bistro website images/image 3.webp" className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-[3000ms]" />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="rounded-[40px] overflow-hidden border border-white/10 relative group"
                >
                  <img src="/ca phe bistro website images/image 4.jpeg" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2000ms]" />
                </motion.div>
              </div>
            </div>
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
              <h3 className="text-6xl lg:text-8xl font-serif font-black text-white leading-tight">
                {settings?.aboutTitle || 'Beyond The Daily Grind.'}
              </h3>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="space-y-8"
            >
              <p className="text-text-muted text-xl font-light leading-relaxed italic border-l-2 border-primary/30 pl-10">
                {settings?.aboutDescription?.slice(0, 100) || "We didn't just build a café. We cultivated a sanctuary where artisan mastery meets digital evolution."}
              </p>
              <p className="text-text-muted/80 text-base leading-relaxed font-light pl-10">
                At Cá Phê Bistro, every cup tells a story.<br className="mb-2" />
                From bold Vietnamese phin coffee to refreshing cold brews and handcrafted classics, we serve rich flavors in a calm, welcoming space.
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
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-14 h-14 rounded-full border-4 border-background bg-surface overflow-hidden hover:scale-110 transition-transform cursor-pointer">
                    <img src={`https://i.pravatar.cc/150?img=${i + 10}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <p className="text-xs text-text-muted/60 font-black uppercase tracking-widest">Joined by <br /> 500+ Local Regulars</p>
            </motion.div>
          </div>
        </section>

      </div >

      {/* 4. PREMIUM FOOTER REDESIGNED */}
      < footer id="footer" className="bg-[#080402] border-t border-white/5 relative pt-40 pb-20 overflow-hidden" >
        {/* Giant Logo Background */}
        < div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[40vw] font-serif font-black text-white/[0.02] pointer-events-none select-none uppercase" >
          CA PHE
        </div >

        <div className="max-w-[1600px] mx-auto px-8 lg:px-20 grid grid-cols-1 md:grid-cols-12 gap-20 relative z-10 mb-40">
          <div className="md:col-span-4 space-y-12">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-primary rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.2)]">
                <span className="text-background font-serif font-black text-3xl">C.</span>
              </div>
              <div>
                <h2 className="text-4xl font-serif font-black text-white tracking-tight">Ca Phe</h2>
                <p className="text-primary text-[10px] font-black uppercase tracking-[0.4em]">Bistro</p>
              </div>
            </div>
            <p className="text-text-muted text-lg font-light leading-relaxed max-w-sm">
              Your neighborhood sanctuary for artisan coffee and curated culinary moments.
            </p>
            <div className="flex gap-8">
              <motion.a
                href="https://www.instagram.com/caphe_bistro?igsh=M3p2cWw1eGEzcGs5"
                target="_blank"
                rel="noreferrer"
                whileHover={{ y: -5 }}
                className="text-white/40 hover:text-primary transition-colors"
              >
                <Camera className="w-6 h-6" />
              </motion.a>
              <motion.a
                href="https://wa.me/917981144753?text=Hi%20C%C3%A1%20Ph%C3%AA%20Bistro"
                target="_blank"
                rel="noreferrer"
                whileHover={{ y: -5 }}
                className="text-white/40 hover:text-primary transition-colors"
              >
                <MessageCircle className="w-6 h-6" />
              </motion.a>
              <motion.a
                href="mailto:contact@caphebistro.com"
                target="_blank"
                rel="noreferrer"
                whileHover={{ y: -5 }}
                className="text-white/40 hover:text-primary transition-colors"
              >
                <Mail className="w-6 h-6" />
              </motion.a>
            </div>
          </div>

          <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-16">
            {/* Grid Sections */}
            <div className="space-y-10">
              <h6 className="text-primary text-[10px] font-black uppercase tracking-[0.4em]">Connect</h6>
              <div className="space-y-6 text-sm text-text-muted font-light">
                <a href="https://www.instagram.com/caphe_bistro?igsh=M3p2cWw1eGEzcGs5" target="_blank" rel="noreferrer" className="hover:text-white transition-colors block capitalize">Instagram</a>
                <a href="https://wa.me/911234567890?text=Hi%20Ca%20Phe%20Bistro" target="_blank" rel="noreferrer" className="hover:text-white transition-colors block capitalize">WhatsApp</a>
                <a href="https://maps.app.goo.gl/4iQhPwpcW323YQFt9" target="_blank" rel="noreferrer" className="hover:text-white transition-colors block capitalize">Google Maps</a>
              </div>
            </div>

            <div className="space-y-10">
              <h6 className="text-primary text-[10px] font-black uppercase tracking-[0.4em]">Address</h6>
              <div className="space-y-6 text-sm text-text-muted font-light leading-relaxed">
                <p>Financial District, Nanakramguda, <br /> Makthakousarali, Telangana 500032</p>
                <a
                  href="https://maps.app.goo.gl/4iQhPwpcW323YQFt9"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white font-bold underline decoration-primary/40 underline-offset-4 hover:text-primary transition-colors"
                >
                  Get Directions
                </a>
              </div>
            </div>

            <div className="space-y-10">
              <h6 className="text-primary text-[10px] font-black uppercase tracking-[0.4em]">Open Daily</h6>
              <div className="space-y-6 text-sm text-text-muted font-light">
                <p className="flex justify-between"><span>Open Daily</span> <span className="text-white">08:30 AM - 11 PM</span></p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto px-8 lg:px-20 pt-16 border-t border-white/5 flex flex-col md:flex-row justify-between gap-8 relative z-10 opacity-30 group hover:opacity-100 transition-opacity duration-1000">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white">© 2026 Cá Phê Bistro</p>
          <div className="flex gap-12 text-[10px] font-black uppercase tracking-[0.4em] text-white">
            <span>Privacy</span>
            <span>Terms</span>
            <span>Press Kit</span>
          </div>
        </div>
      </footer >

      <CartDrawer />

      {/* Mobile Menu FAB (Swiggy/Zomato style) */}
      <div className="lg:hidden fixed bottom-8 left-1/2 -translate-x-1/2 z-[45]">
        <button
          onClick={() => setIsMenuModalOpen(true)}
          className="bg-surface border border-white/10 text-white px-8 py-3.5 rounded-full font-black text-[11px] uppercase tracking-[0.2em] flex items-center gap-3 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition-all active:scale-95"
        >
          <MenuIcon className="w-4 h-4 text-primary" />
          MENU
        </button>
      </div>

      {/* Mobile Category Bottom Sheet */}
      <AnimatePresence>
        {isMenuModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[50] lg:hidden"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-surface border-t border-white/10 rounded-t-[40px] z-[55] lg:hidden flex flex-col shadow-[0_-20px_50px_rgba(0,0,0,0.5)] max-h-[85dvh]"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-3xl font-bold text-white mb-1">Categories</h3>
                  <p className="text-primary text-[10px] font-black uppercase tracking-[0.2em]">Jump to section</p>
                </div>
                <button onClick={() => setIsMenuModalOpen(false)} className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto p-4 space-y-2 pb-12 hide-scrollbar">
                <button
                  onClick={() => { handleCategoryChange('all'); setIsMenuModalOpen(false); }}
                  className={`w-full flex items-center justify-between p-5 rounded-3xl transition-all ${activeCategory === 'all' ? 'bg-primary/10 border border-primary/20' : 'bg-transparent hover:bg-white/5 border border-transparent'}`}
                >
                  <span className={`font-bold text-sm tracking-wide ${activeCategory === 'all' ? 'text-primary' : 'text-white/80'}`}>Explore All</span>
                  <span className="text-[10px] font-black opacity-40 text-white bg-white/5 px-3 py-1.5 rounded-full">{filteredItems.length} ITEMS</span>
                </button>
                {categories.map(cat => {
                  const count = filteredItems.filter(i => String(i.categoryId?._id || i.categoryId) === String(cat._id)).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={cat._id}
                      onClick={() => { handleCategoryChange(cat._id); setIsMenuModalOpen(false); }}
                      className={`w-full flex items-center justify-between p-5 rounded-3xl transition-all ${activeCategory === cat._id ? 'bg-primary/10 border border-primary/20' : 'bg-transparent hover:bg-white/5 border border-transparent'}`}
                    >
                      <span className={`font-bold text-sm tracking-wide flex items-center gap-4 ${activeCategory === cat._id ? 'text-primary' : 'text-white/80'}`}>
                        <span className="text-xl bg-white/5 w-10 h-10 flex items-center justify-center rounded-xl">{cat.icon?.startsWith('http') ? '✨' : cat.icon}</span>
                        {cat.name}
                      </span>
                      <span className="text-[10px] font-black opacity-40 text-white bg-white/5 px-3 py-1.5 rounded-full">{count} ITEMS</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div >
  );
};

export default MenuPage;
