import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Edit2, Loader2, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminMenu = () => {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
  const [isItemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  const [catForm, setCatForm] = useState({ name: '', icon: '' });
  const [itemForm, setItemForm] = useState({ 
    name: '', price: '', originalPrice: '', categoryId: '', image: '', description: '', isAvailable: true, isPopular: false, tags: [], includedItems: [] 
  });

  const fetchData = async () => {
    try {
      const [catRes, itemRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/categories`),
        axios.get(`${import.meta.env.VITE_API_URL}/menu-items`),
      ]);
      setCategories(catRes.data);
      setItems(itemRes.data);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/categories`, catForm);
      setCatForm({ name: '', icon: '' });
      setCategoryModalOpen(false);
      fetchData();
    } catch (error) { console.error('Error saving category:', error); }
  };

  const handleItemSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await axios.put(`${import.meta.env.VITE_API_URL}/menu-items/${editingItem._id}`, itemForm);
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/menu-items`, itemForm);
      }
      setEditingItem(null);
      setItemForm({ name: '', price: '', originalPrice: '', categoryId: '', image: '', description: '', isAvailable: true, isPopular: false, tags: [], includedItems: [] });
      setItemModalOpen(false);
      fetchData();
    } catch (error) { console.error('Error saving item:', error); }
  };

  const deleteItem = async (id) => {
    if(!window.confirm('Delete this item completely?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/menu-items/${id}`);
      fetchData();
    } catch(err) { console.error(err); }
  }

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;

  return (
    <div>
      <header className="mb-12 border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-serif font-bold text-white mb-2">Menu Catalog</h2>
          <p className="text-primary text-sm uppercase tracking-widest font-bold">Content Management</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setCategoryModalOpen(true)} className="bg-surface border border-white/10 hover:border-white/30 px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs transition-all hover:bg-surface-light text-white">
            + Category
          </button>
          <button onClick={() => { setEditingItem(null); setItemForm({ name: '', price: '', originalPrice: '', categoryId: categories[0]?._id || '', image: '', description: '', isAvailable: true, isPopular: false, tags: [], includedItems: [] }); setItemModalOpen(true); }} className="bg-primary hover:bg-primary-light text-background px-6 py-3 rounded-full font-black uppercase tracking-widest text-xs transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] transform hover:scale-105">
            + Menu Item
          </button>
        </div>
      </header>

      <div className="space-y-16">
        {categories.map(cat => (
          <div key={cat._id} className="bg-surface/20 p-8 rounded-3xl border border-white/5">
            <h3 className="text-3xl font-serif font-bold mb-8 flex items-center gap-4 text-white">
              <span className="bg-surface-dark p-3 rounded-2xl border border-white/5 shadow-inner w-16 h-16 flex items-center justify-center overflow-hidden">
                {cat.icon?.startsWith('http') ? (
                  <img src={cat.icon} alt={cat.name} className="w-full h-full object-cover" />
                ) : (
                  cat.icon
                )}
              </span> 
              {cat.name}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {items.filter(i => i.categoryId && (i.categoryId._id === cat._id || i.categoryId === cat._id)).map(item => (
                <div key={item._id} className={`glass-panel p-5 relative group ${!item.isAvailable ? 'opacity-50 grayscale' : ''}`}>
                  <div className="flex gap-5">
                    {item.image ? (
                        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 shadow-lg border border-white/10">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        </div>
                    ) : (
                        <div className="w-20 h-20 rounded-xl bg-surface-dark flex items-center justify-center flex-shrink-0 border border-white/5">
                            <ImageIcon className="w-6 h-6 text-text-muted opacity-50" />
                        </div>
                    )}
                    <div className="flex-1 min-w-0 py-1">
                      <h4 className="font-serif font-bold text-lg text-white truncate">{item.name}</h4>
                      <p className="text-primary font-bold text-base mt-0.5">
                        ₹{item.price.toFixed(2)} 
                        {item.originalPrice && <span className="text-xs text-text-muted line-through ml-2 opacity-50">₹{item.originalPrice.toFixed(2)}</span>}
                      </p>
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {item.isPopular && <span className="text-[9px] font-black tracking-widest uppercase bg-primary/20 border border-primary/30 text-primary px-2 py-1 rounded">Favorite</span>}
                        {item.tags?.includes('seasonal') && <span className="text-[9px] font-black tracking-widest uppercase bg-red-500/20 border border-red-500/30 text-red-400 px-2 py-1 rounded">Seasonal</span>}
                        {item.tags?.includes('combo') && <span className="text-[9px] font-black tracking-widest uppercase bg-blue-500/20 border border-blue-500/30 text-blue-400 px-2 py-1 rounded">Combo</span>}
                        {!item.isAvailable && <span className="text-[9px] font-black tracking-widest uppercase bg-gray-500/20 border border-gray-500/30 text-gray-400 px-2 py-1 rounded">Hidden</span>}
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                    <button onClick={() => {
                       setEditingItem(item); 
                       setItemForm({ ...item, categoryId: item.categoryId._id || item.categoryId }); 
                       setItemModalOpen(true);
                     }} className="p-2 bg-surface hover:bg-surface-light border border-white/10 text-white rounded-lg shadow-xl transition-colors"><Edit2 className="w-4 h-4"/></button>
                    <button onClick={() => deleteItem(item._id)} className="p-2 bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white rounded-lg shadow-xl transition-colors"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {categories.length === 0 && (
           <div className="text-center py-20 bg-surface/30 rounded-3xl border border-white/5">
                <p className="text-text-muted text-lg font-serif">No categories created yet. Start by adding one above!</p>
           </div>
        )}
      </div>

      {/* Modals with premium styling */}
      <AnimatePresence>
        {isItemModalOpen && (
          <div className="fixed inset-0 bg-background/90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale:0.95, opacity:0, y: 20}} 
              animate={{ scale:1, opacity:1, y: 0}} 
              exit={{ scale:0.95, opacity:0, y: 20}} 
              className="bg-surface-dark max-w-xl w-full rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-8 pb-4 border-b border-white/10">
                <h2 className="text-3xl font-serif font-bold text-white">{editingItem ? 'Edit Culinary Item' : 'New Culinary Item'}</h2>
              </div>
              
              <form onSubmit={handleItemSubmit} className="p-8 pt-6 space-y-5 overflow-y-auto custom-scrollbar">

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-widest text-primary mb-2">Item Name</label>
                    <input required value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} className="w-full bg-surface border border-white/10 rounded-xl p-3 text-white focus:border-primary outline-none transition-colors" placeholder="e.g. Truffle Pasta" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-widest text-primary mb-2">Price (₹)</label>
                    <input required type="number" step="0.01" value={itemForm.price} onChange={e => setItemForm({...itemForm, price: parseFloat(e.target.value)})} className="w-full bg-surface border border-white/10 rounded-xl p-3 text-white focus:border-primary outline-none transition-colors" placeholder="24.00" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-widest text-text-muted mb-2">Original Price (₹) (Optional)</label>
                    <input type="number" step="0.01" value={itemForm.originalPrice} onChange={e => setItemForm({...itemForm, originalPrice: parseFloat(e.target.value)})} className="w-full bg-surface border border-white/10 rounded-xl p-3 text-white focus:border-primary outline-none transition-colors" placeholder="29.00" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-primary mb-2">Category Assignment</label>
                  <select required value={itemForm.categoryId} onChange={e => setItemForm({...itemForm, categoryId: e.target.value})} className="w-full bg-surface border border-white/10 rounded-xl p-3 text-white focus:border-primary outline-none transition-colors appearance-none">
                    <option value="">Select Category...</option>
                    {categories.map(c => <option key={c._id} value={c._id}>{(c.icon?.startsWith('http') ? '📸' : c.icon)} {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-primary mb-2">High-Res Image (URL)</label>
                  <input value={itemForm.image} onChange={e => setItemForm({...itemForm, image: e.target.value})} className="w-full bg-surface border border-white/10 rounded-xl p-3 text-white focus:border-primary outline-none transition-colors" placeholder="https://images.unsplash..." />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-primary mb-2">Flavor Profile / Description</label>
                  <textarea value={itemForm.description} onChange={e => setItemForm({...itemForm, description: e.target.value})} className="w-full bg-surface border border-white/10 rounded-xl p-3 text-white focus:border-primary outline-none transition-colors resize-none" rows="3" placeholder="Describe the dish..."></textarea>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-primary mb-2">Tags (e.g. seasonal, combo)</label>
                  <input value={itemForm.tags?.join(', ')} onChange={e => setItemForm({...itemForm, tags: e.target.value.split(',').map(t => t.trim())})} className="w-full bg-surface border border-white/10 rounded-xl p-3 text-white focus:border-primary outline-none transition-colors" placeholder="seasonal, combo" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-primary mb-2">Combo Includes (Comma separated)</label>
                  <input value={itemForm.includedItems?.join(', ')} onChange={e => setItemForm({...itemForm, includedItems: e.target.value.split(',').map(t => t.trim())})} className="w-full bg-surface border border-white/10 rounded-xl p-3 text-white focus:border-primary outline-none transition-colors font-mono text-sm" placeholder="Latte, Sandwich, Fruit Bowl" />
                </div>
                
                <div className="flex gap-8 pt-2 bg-surface/50 p-4 rounded-xl border border-white/5">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={itemForm.isAvailable} onChange={e => setItemForm({...itemForm, isAvailable: e.target.checked})} className="w-5 h-5 accent-primary bg-surface border-white/10 rounded"/> 
                    <span className="font-bold text-sm text-white">Currently Available</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={itemForm.isPopular} onChange={e => setItemForm({...itemForm, isPopular: e.target.checked})} className="w-5 h-5 accent-primary bg-surface border-white/10 rounded"/> 
                    <span className="font-bold text-sm text-primary">Mark as Favorite</span>
                  </label>
                </div>

                <div className="flex justify-end gap-4 mt-8 pt-4 border-t border-white/10">
                  <button type="button" onClick={() => setItemModalOpen(false)} className="px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest bg-surface border border-white/10 hover:bg-surface-light text-text-muted transition-colors">Discard</button>
                  <button type="submit" className="px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest bg-primary text-background shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all">Save Dish</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 bg-background/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
             <motion.div 
               initial={{ scale:0.95, opacity:0, y:20}} 
               animate={{ scale:1, opacity:1, y:0}} 
               exit={{ scale:0.95, opacity:0, y:20}} 
               className="bg-surface-dark max-w-sm w-full rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh]"
             >
              <div className="p-8 pb-4 border-b border-white/10">
                <h2 className="text-3xl font-serif font-bold text-white uppercase tracking-tight">New Category</h2>
              </div>
              <form onSubmit={handleCategorySubmit} className="p-8 pt-6 space-y-5 overflow-y-auto">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-primary mb-2">Category Name</label>
                  <input required value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} className="w-full bg-surface border border-white/10 rounded-xl p-3 text-white focus:border-primary outline-none transition-colors" placeholder="e.g. Hot Drinks" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-primary mb-2">Category Symbol (URL or Emoji)</label>
                  <input value={catForm.icon} onChange={e => setCatForm({...catForm, icon: e.target.value})} className="w-full bg-surface border border-white/10 rounded-xl p-3 text-white focus:border-primary outline-none transition-colors text-sm" placeholder="https://... or ☕" />
                </div>
                <div className="flex justify-end gap-4 mt-8 pt-4 border-t border-white/10">
                  <button type="button" onClick={() => setCategoryModalOpen(false)} className="px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest bg-surface border border-white/10 hover:bg-surface-light text-text-muted transition-colors">Discard</button>
                  <button type="submit" className="px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest bg-primary text-background shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all">Save</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminMenu;
