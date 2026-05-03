import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Plus, Search, Filter, MoreVertical, Edit2, Trash2,
  ChevronLeft, ChevronRight, Save, X, Check, AlertCircle,
  Download, Upload, CheckCircle2, Package, Tag, ArrowUpDown,
  Loader2
} from 'lucide-react';

const debounce = (func, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

const AdminMenu = () => {
  // State for data
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [dietaryTags, setDietaryTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products'); // 'products' or 'categories'

  // State for Product filters & pagination
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    dietary: '',
    sortBy: 'itemName',
    sortOrder: 'asc'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalPages: 1,
    totalItems: 0
  });

  // State for Category filters & pagination
  const [catFilters, setCatFilters] = useState({
    search: '',
    sortBy: 'name',
    sortOrder: 'asc'
  });
  const [catPagination, setCatPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalItems: 0
  });

  // State for selection and editing
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [editingCell, setEditingCell] = useState(null); // { id, field }
  const [editValue, setEditValue] = useState('');
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({
    itemName: '', itemOnlinePrice: '', itemOnlineDisplayName: '', itemId: '', categoryId: '', dietaryTag: '', image: '', rankOrder: 1, allowVariations: false
  });

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', icon: '☕' });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [catRes, itemRes, tagRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/categories`, {
          params: { ...catFilters, page: catPagination.page, limit: catPagination.limit }
        }),
        axios.get(`${import.meta.env.VITE_API_URL}/menu-items`, {
          params: { ...filters, page: pagination.page, limit: pagination.limit }
        }),
        axios.get(`${import.meta.env.VITE_API_URL}/menu-items/dietary-tags`)
      ]);

      // Category response is now an object with meta
      setCategories(catRes.data.categories || []);
      setCatPagination(prev => ({
        ...prev,
        totalPages: catRes.data.totalPages || 1,
        totalItems: catRes.data.totalCategories || 0
      }));

      setItems(itemRes.data.items || []);
      setDietaryTags(Array.isArray(tagRes.data) ? tagRes.data : []);
      setPagination(prev => ({
        ...prev,
        totalPages: itemRes.data.pagination?.totalPages || 1,
        totalItems: itemRes.data.pagination?.totalItems || 0
      }));
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit, catFilters, catPagination.page, catPagination.limit]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Debounced Search for Products
  const debouncedSearch = useCallback(
    debounce((value) => {
      setFilters(prev => ({ ...prev, search: value }));
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 500),
    []
  );

  // Debounced Search for Categories
  const debouncedCatSearch = useCallback(
    debounce((value) => {
      setCatFilters(prev => ({ ...prev, search: value }));
      setCatPagination(prev => ({ ...prev, page: 1 }));
    }, 500),
    []
  );

  const handleInlineUpdate = async (id, field, value) => {
    try {
      // Optimistic Update
      setItems(prev => prev.map(item => item._id === id ? { ...item, [field]: value } : item));
      setEditingCell(null);

      await axios.patch(`${import.meta.env.VITE_API_URL}/menu-items/${id}`, { [field]: value });
    } catch (error) {
      console.error('Update failed', error);
      fetchData(); // Rollback on error
    }
  };

  const handleBulkAction = async (operation, value) => {
    if (!window.confirm(`Are you sure you want to perform "${operation}" on ${selectedIds.size} items?`)) return;
    try {
      setLoading(true);
      await axios.patch(`${import.meta.env.VITE_API_URL}/menu-items/bulk-update`, {
        ids: Array.from(selectedIds),
        operation,
        value
      });
      setSelectedIds(new Set());
      fetchData();
    } catch (error) {
      console.error('Bulk action failed', error);
    } finally {
      setLoading(false);
    }
  };
  const handleSelectAll = (e) => {
    if (e.target.checked && Array.isArray(items)) {
      setSelectedIds(new Set(items.map(i => i._id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const deleteItem = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/menu-items/${id}`);
      fetchData();
    } catch (error) { console.error(error); }
  };

  const handleItemSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await axios.put(`${import.meta.env.VITE_API_URL}/menu-items/${editingItem._id}`, itemForm);
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/menu-items`, itemForm);
      }
      setItemModalOpen(false);
      setEditingItem(null);
      setItemForm({ itemName: '', itemOnlinePrice: '', itemOnlineDisplayName: '', itemId: '', categoryId: '', dietaryTag: '', image: '', rankOrder: 1, allowVariations: false });
      fetchData();
    } catch (error) { console.error('Error saving item:', error); }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await axios.put(`${import.meta.env.VITE_API_URL}/categories/${editingCategory._id}`, categoryForm);
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/categories`, categoryForm);
      }
      setCategoryModalOpen(false);
      setEditingCategory(null);
      setCategoryForm({ name: '', icon: '☕' });
      fetchData();
    } catch (error) { console.error('Error saving category:', error); }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category? All items in this category will become uncategorized.')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/categories/${id}`);
      fetchData();
    } catch (error) { console.error('Error deleting category:', error); }
  };

  return (
    <div className="max-w-[1400px] mx-auto min-h-screen p-6 bg-[#0a0a0b] text-white font-sans">
      {/* Category Modal */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60">
          <div className="bg-[#121214] border border-white/10 rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 pb-4 border-b border-white/10">
              <h2 className="text-3xl font-serif font-bold text-white">{editingCategory ? 'Edit Category' : 'New Category'}</h2>
            </div>
            <form onSubmit={handleCategorySubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] uppercase font-black text-primary mb-2">Category Name</label>
                <input required value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-primary" placeholder="e.g. Desserts" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-black text-primary mb-2">Icon (Emoji or URL)</label>
                <input required value={categoryForm.icon} onChange={e => setCategoryForm({ ...categoryForm, icon: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-primary" placeholder="☕" />
              </div>
               <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => { setCategoryModalOpen(false); setEditingCategory(null); setCategoryForm({ name: '', icon: '☕' }); }} className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase bg-white/5 hover:bg-white/10 transition-colors">Cancel</button>
                <button type="submit" className="px-8 py-2.5 rounded-xl text-[10px] font-black uppercase bg-primary text-black shadow-lg">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {itemModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60">
          <div className="bg-[#121214] border border-white/10 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 pb-4 border-b border-white/10">
              <h2 className="text-3xl font-serif font-bold text-white">{editingItem ? 'Edit Item' : 'New Menu Item'}</h2>
            </div>
            <form onSubmit={handleItemSubmit} className="p-8 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-black text-primary mb-2">Item Name</label>
                  <input required value={itemForm.itemName} onChange={e => setItemForm({ ...itemForm, itemName: e.target.value, itemOnlineDisplayName: itemForm.itemOnlineDisplayName || e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-primary" placeholder="Cappuccino" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black text-primary mb-2">Display Name</label>
                  <input required value={itemForm.itemOnlineDisplayName} onChange={e => setItemForm({ ...itemForm, itemOnlineDisplayName: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-primary" placeholder="Public Name" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-black text-primary mb-2">Item ID / SKU</label>
                  <input value={itemForm.itemId} onChange={e => setItemForm({ ...itemForm, itemId: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-primary font-mono" placeholder="0x3132..." />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black text-primary mb-2">Price (₹)</label>
                  <input required type="number" value={itemForm.itemOnlinePrice} onChange={e => setItemForm({ ...itemForm, itemOnlinePrice: parseFloat(e.target.value) })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-primary font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-black text-primary mb-2">Category</label>
                  <select required value={itemForm.categoryId} onChange={e => setItemForm({ ...itemForm, categoryId: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-primary">
                    <option value="">Select...</option>
                    {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black text-primary mb-2">Dietary Tag</label>
                  <select value={itemForm.dietaryTag} onChange={e => setItemForm({ ...itemForm, dietaryTag: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-primary font-black uppercase text-[10px]">
                    <option value="">None</option>
                    {dietaryTags.map(tag => <option key={tag} value={tag}>{tag.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-black text-primary mb-2">Image URL</label>
                <input value={itemForm.image} onChange={e => setItemForm({ ...itemForm, image: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-primary" placeholder="https://images.unsplash.com/..." />
              </div>

              <div className="grid grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block text-[10px] uppercase font-black text-primary mb-2">Rank / Order</label>
                  <input type="number" value={itemForm.rankOrder} onChange={e => setItemForm({ ...itemForm, rankOrder: parseInt(e.target.value) })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-primary" />
                </div>
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                  <input type="checkbox" id="variations" checked={itemForm.allowVariations} onChange={e => setItemForm({ ...itemForm, allowVariations: e.target.checked })} className="w-4 h-4 accent-primary" />
                  <label htmlFor="variations" className="text-[10px] uppercase font-black text-white/60 cursor-pointer">Allow Variations</label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button type="button" onClick={() => setItemModalOpen(false)} className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase bg-white/5 hover:bg-white/10 transition-colors">Cancel</button>
                <button type="submit" className="px-8 py-2.5 rounded-xl text-[10px] font-black uppercase bg-primary text-black shadow-[0_10px_20px_rgba(245,158,11,0.3)] hover:scale-105 active:scale-95 transition-all">Save Menu Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-2xl mb-8 w-fit">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'products' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white'}`}
        >
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Products
          </div>
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'categories' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white'}`}
        >
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Categories
          </div>
        </button>
      </div>

      {/* Product Management Section */}
      {activeTab === 'products' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
          {/* Top Bar (Actions) */}
          <header className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-serif font-black text-white">Inventory Command</h2>
                <p className="text-[#f59e0b] text-[10px] font-black tracking-[0.2em] uppercase mt-1">High-Density Management Console</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => fetchData()}
                  className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <ArrowUpDown className="w-4 h-4 text-[#f59e0b]" />
                </button>
                <button
                  className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-white/10 transition-all"
                  onClick={() => document.getElementById('bulkCsv').click()}
                >
                  <Upload className="w-4 h-4" /> Import CSV
                </button>
                <button
                  onClick={() => { setEditingItem(null); setItemForm({ itemName: '', itemOnlinePrice: '', itemOnlineDisplayName: '', itemId: '', categoryId: '', dietaryTag: '', image: '', rankOrder: 1, allowVariations: false }); setItemModalOpen(true); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-black rounded-xl font-black text-xs uppercase tracking-wider hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all"
                >
                  <Plus className="w-4 h-4" /> New Item
                </button>
              </div>
            </div>

            {/* Filters & Search */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/[0.03] p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-[#f59e0b] transition-colors" />
                <input
                  type="text"
                  placeholder="Search items, SKUs..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-12 pr-4 text-sm focus:border-[#f59e0b] outline-none transition-all placeholder:text-white/20"
                  onChange={(e) => debouncedSearch(e.target.value)}
                />
              </div>

              <select
                className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-[#f59e0b] outline-none"
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value, page: 1 }))}
              >
                <option value="">All Categories</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>

              <select className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-[#f59e0b] outline-none" value={filters.dietary} onChange={(e) => setFilters(prev => ({ ...prev, dietary: e.target.value, page: 1 }))}>
                <option value="">Any Dietary</option>
                {dietaryTags.map(tag => <option key={tag} value={tag}>{tag.toUpperCase()}</option>)}
              </select>

              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {['itemName', 'itemOnlinePrice', 'rankOrder'].map(field => (
                  <button
                    key={field}
                    onClick={() => setFilters(prev => ({
                      ...prev,
                      sortBy: field,
                      sortOrder: prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc'
                    }))}
                    className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-tighter border transition-all whitespace-nowrap ${filters.sortBy === field
                      ? 'bg-[#f59e0b]/20 border-[#f59e0b] text-[#f59e0b]'
                      : 'bg-white/5 border-white/5 text-white/40 hover:text-white'
                      }`}
                  >
                    {field.replace(/([A-Z])/g, ' $1')}
                    {filters.sortBy === field && (filters.sortOrder === 'asc' ? ' ↑' : ' ↓')}
                  </button>
                ))}
              </div>
            </div>
          </header>

          {/* Bulk Actions Floating Bar */}
          {selectedIds.size > 0 && (
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
              <div className="bg-[#121214] border border-[#f59e0b]/30 rounded-2xl p-3 flex items-center gap-4 shadow-[0_32px_64px_rgba(0,0,0,0.8)] backdrop-blur-xl">
                <div className="px-4 border-r border-white/10">
                  <span className="text-[#f59e0b] font-black text-xs uppercase tracking-widest">{selectedIds.size} Selected</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleBulkAction('updateStatus', true)} className="px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-[10px] font-black uppercase hover:bg-green-500 hover:text-white transition-all">Available</button>
                  <button onClick={() => handleBulkAction('updateStatus', false)} className="px-4 py-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-xl text-[10px] font-black uppercase hover:bg-orange-500 hover:text-white transition-all">Out of Stock</button>
                  <button onClick={() => handleBulkAction('delete')} className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all">Delete</button>
                  <button onClick={() => setSelectedIds(new Set())} className="px-3 py-2 text-white/50 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main Table Container */}
          <div className="bg-white/5 rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed">
                <thead className="sticky top-0 bg-[#0a0a0b]/80 backdrop-blur-lg z-10 border-b border-white/10">
                  <tr>
                    <th className="w-12 p-4">
                      <input
                        type="checkbox"
                        onChange={handleSelectAll}
                        checked={items.length > 0 && selectedIds.size === items.length}
                        className="w-4 h-4 accent-[#f59e0b] rounded cursor-pointer"
                      />
                    </th>
                    <th className="w-16 p-4 text-[10px] uppercase font-black text-white/30 tracking-[0.2em]">Img</th>
                    <th className="w-64 p-4 text-[10px] uppercase font-black text-white/30 tracking-[0.2em]">Item Name & SKU</th>
                    <th className="w-40 p-4 text-[10px] uppercase font-black text-white/30 tracking-[0.2em]">Category</th>
                    <th className="w-32 p-4 text-[10px] uppercase font-black text-white/30 tracking-[0.2em]">Price (₹)</th>
                    <th className="w-24 p-4 text-[10px] uppercase font-black text-white/30 tracking-[0.2em]">Rank</th>
                    <th className="w-32 p-4 text-[10px] uppercase font-black text-white/30 tracking-[0.2em]">Status</th>
                    <th className="w-32 p-4 text-[10px] uppercase font-black text-white/30 tracking-[0.2em]">Dietary</th>
                    <th className="w-24 p-4 text-[10px] uppercase font-black text-white/30 tracking-[0.2em] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {loading ? (
                    Array(pagination.limit).fill(0).map((_, i) => (
                      <tr key={i} className="animate-pulse border-b border-white/[0.03]">
                        <td colSpan="9" className="p-4">
                          <div className="h-8 bg-white/[0.03] rounded-lg w-full"></div>
                        </td>
                      </tr>
                    ))
                  ) : items.map((item) => (
                    <tr
                      key={item._id}
                      className={`group hover:bg-white/[0.02] transition-all duration-200 ${selectedIds.has(item._id) ? 'bg-[#f59e0b]/[0.03]' : ''}`}
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item._id)}
                          onChange={() => toggleSelect(item._id)}
                          className="w-4 h-4 accent-[#f59e0b] rounded cursor-pointer"
                        />
                      </td>
                      <td className="p-4">
                        {item.image ? (
                          <img src={item.image} alt={item.itemName} className="w-10 h-10 rounded-lg object-cover border border-white/10" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-white/5 border border-dashed border-white/10 flex items-center justify-center text-[10px] text-white/20">NO</div>
                        )}
                      </td>
                      <td className="p-4">
                        <div
                          className="cursor-pointer"
                          onClick={() => { setEditingCell({ id: item._id, field: 'itemName' }); setEditValue(item.itemName); }}
                        >
                          {editingCell?.id === item._id && editingCell?.field === 'itemName' ? (
                            <input
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleInlineUpdate(item._id, 'itemName', editValue)}
                              onKeyDown={(e) => e.key === 'Enter' && handleInlineUpdate(item._id, 'itemName', editValue)}
                              className="w-full bg-[#121214] border border-[#f59e0b] rounded-lg px-2 py-1 text-sm outline-none shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                            />
                          ) : (
                            <div>
                              <div className="font-bold text-sm text-white group-hover:text-[#f59e0b] transition-colors">{item.itemName}</div>
                              <div className="text-[10px] text-white/20 font-mono mt-1 tracking-tighter uppercase">{item.itemId || 'NO_SKU'}</div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <select
                          value={item.categoryId?._id || item.categoryId}
                          onChange={(e) => handleInlineUpdate(item._id, 'categoryId', e.target.value)}
                          className="bg-transparent text-xs text-white/40 hover:text-white outline-none cursor-pointer w-full transition-colors"
                        >
                          {categories.map(c => <option key={c._id} value={c._id} className="bg-[#121214]">{c.name}</option>)}
                        </select>
                      </td>
                      <td className="p-4">
                        <div onClick={() => { setEditingCell({ id: item._id, field: 'itemOnlinePrice' }); setEditValue(item.itemOnlinePrice); }}>
                          {editingCell?.id === item._id && editingCell?.field === 'itemOnlinePrice' ? (
                            <input
                              type="number" autoFocus value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleInlineUpdate(item._id, 'itemOnlinePrice', parseFloat(editValue))}
                              className="w-full bg-[#121214] border border-[#f59e0b] rounded-lg px-2 py-1 text-sm outline-none"
                            />
                          ) : (
                            <span className="font-mono text-sm font-bold text-white/80">₹{item.itemOnlinePrice?.toFixed(2)}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div onClick={() => { setEditingCell({ id: item._id, field: 'rankOrder' }); setEditValue(item.rankOrder); }}>
                          {editingCell?.id === item._id && editingCell?.field === 'rankOrder' ? (
                            <input
                              type="number" autoFocus value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleInlineUpdate(item._id, 'rankOrder', parseInt(editValue))}
                              className="w-full bg-[#121214] border border-[#f59e0b] rounded-lg px-2 py-1 text-sm outline-none"
                            />
                          ) : (
                            <span className="text-white/20 text-xs font-black">{item.rankOrder || 0}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleInlineUpdate(item._id, 'isAvailable', !item.isAvailable)}
                          className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${item.isAvailable
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20 opacity-40 shadow-none'
                            }`}
                        >
                          {item.isAvailable ? 'In Stock' : 'Out'}
                        </button>
                      </td>
                      <td className="p-4">
                        <select
                          value={item.dietaryTag}
                          onChange={(e) => handleInlineUpdate(item._id, 'dietaryTag', e.target.value)}
                          className="bg-transparent text-[9px] font-black uppercase text-white/30 outline-none w-full"
                        >
                          <option value="">None</option>
                          {dietaryTags.map(tag => <option key={tag} value={tag} className="bg-[#121214]">{tag.toUpperCase()}</option>)}
                        </select>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                          <button 
                            onClick={() => {
                              setEditingItem(item);
                              setItemForm({
                                itemName: item.itemName,
                                itemOnlinePrice: item.itemOnlinePrice,
                                itemOnlineDisplayName: item.itemOnlineDisplayName,
                                itemId: item.itemId,
                                categoryId: item.categoryId?._id || item.categoryId,
                                dietaryTag: item.dietaryTag,
                                image: item.image || '',
                                rankOrder: item.rankOrder,
                                allowVariations: item.allowVariations
                              });
                              setItemModalOpen(true);
                            }}
                            className="p-2 hover:bg-primary/10 text-white/10 hover:text-primary rounded-lg transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteItem(item._id)} className="p-2 hover:bg-red-500/10 text-white/10 hover:text-red-400 rounded-lg transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && items.length === 0 && (
                    <tr>
                      <td colSpan="9" className="p-20 text-center">
                        <div className="flex flex-col items-center gap-4 text-white/20">
                          <Package className="w-12 h-12" />
                          <p className="font-serif italic">No items found matching your filters</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {!loading && items.length > 0 && (
              <div className="p-6 bg-black/40 border-t border-white/[0.03] flex items-center justify-between">
                <p className="text-[10px] uppercase font-black tracking-widest text-white/20">
                  Record <span className="text-[#f59e0b]">{(pagination.page - 1) * pagination.limit + 1}</span> — <span className="text-[#f59e0b]">{Math.min(pagination.page * pagination.limit, pagination.totalItems)}</span> <span className="mx-2 opacity-50">/</span> Total <span className="text-white">{pagination.totalItems}</span>
                </p>
                <div className="flex items-center gap-3">
                  <button
                    disabled={pagination.page === 1}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    className="p-2 border border-white/10 rounded-xl disabled:opacity-10 hover:bg-white/5 transition-all"
                  >
                    <ChevronLeft className="w-5 h-5 text-[#f59e0b]" />
                  </button>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }).map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setPagination(prev => ({ ...prev, page: i + 1 }))}
                        className={`w-9 h-9 rounded-xl text-[10px] font-black transition-all ${pagination.page === i + 1
                          ? 'bg-[#f59e0b] text-black shadow-lg shadow-[#f59e0b]/20'
                          : 'hover:bg-white/5 text-white/40'
                          }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    className="p-2 border border-white/10 rounded-xl disabled:opacity-10 hover:bg-white/5 transition-all"
                  >
                    <ChevronRight className="w-5 h-5 text-[#f59e0b]" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
          {/* Top Bar (Actions) */}
          <header className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-serif font-black text-white">Category Command</h2>
                <p className="text-[#f59e0b] text-[10px] font-black tracking-[0.2em] uppercase mt-1">Menu Structure Management</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => fetchData()}
                  className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <ArrowUpDown className="w-4 h-4 text-[#f59e0b]" />
                </button>
                <button
                  onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', icon: '☕' }); setCategoryModalOpen(true); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-black rounded-xl font-black text-xs uppercase tracking-wider hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all"
                >
                  <Plus className="w-4 h-4" /> New Category
                </button>
              </div>
            </div>

            {/* Filters & Search for Categories */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/[0.03] p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-[#f59e0b] transition-colors" />
                <input
                  type="text"
                  placeholder="Search categories..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-12 pr-4 text-sm focus:border-[#f59e0b] outline-none transition-all placeholder:text-white/20"
                  onChange={(e) => debouncedCatSearch(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                {['name'].map(field => (
                  <button
                    key={field}
                    onClick={() => setCatFilters(prev => ({
                      ...prev,
                      sortBy: field,
                      sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc'
                    }))}
                    className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-tighter border transition-all whitespace-nowrap ${catFilters.sortBy === field
                      ? 'bg-[#f59e0b]/20 border-[#f59e0b] text-[#f59e0b]'
                      : 'bg-white/5 border-white/5 text-white/40 hover:text-white'
                      }`}
                  >
                    Name {catFilters.sortOrder === 'asc' ? ' ↑' : ' ↓'}
                  </button>
                ))}
              </div>
            </div>
          </header>

          {/* Main Table Container */}
          <div className="bg-white/5 rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed">
                <thead className="sticky top-0 bg-[#0a0a0b]/80 backdrop-blur-lg z-10 border-b border-white/10">
                  <tr>
                    <th className="w-24 p-6 text-[10px] uppercase font-black text-white/30 tracking-[0.2em]">Preview</th>
                    <th className="p-6 text-[10px] uppercase font-black text-white/30 tracking-[0.2em]">Category Name</th>
                    <th className="w-32 p-6 text-[10px] uppercase font-black text-white/30 tracking-[0.2em] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {loading ? (
                    Array(catPagination.limit).fill(0).map((_, i) => (
                      <tr key={i} className="animate-pulse border-b border-white/[0.03]">
                        <td colSpan="3" className="p-6">
                          <div className="h-8 bg-white/[0.03] rounded-lg w-full"></div>
                        </td>
                      </tr>
                    ))
                  ) : categories.map((cat) => (
                    <tr key={cat._id} className="group hover:bg-white/[0.02] transition-all duration-200">
                      <td className="p-6">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center overflow-hidden border border-white/5 group-hover:border-[#f59e0b]/30 transition-colors">
                          {cat.icon.startsWith('http') ? (
                            <img src={cat.icon} alt={cat.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl">{cat.icon}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="font-bold text-lg text-white group-hover:text-[#f59e0b] transition-colors">{cat.name}</div>
                        <div className="text-[10px] text-white/20 uppercase tracking-widest font-black mt-1">ID: {cat._id.slice(-6)}</div>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                          <button
                            onClick={() => {
                              setEditingCategory(cat);
                              setCategoryForm({ name: cat.name, icon: cat.icon });
                              setCategoryModalOpen(true);
                            }}
                            className="p-2.5 hover:bg-primary/10 text-white/10 hover:text-primary rounded-xl transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteCategory(cat._id)}
                            className="p-2.5 hover:bg-red-500/10 text-white/10 hover:text-red-400 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && categories.length === 0 && (
                    <tr>
                      <td colSpan="3" className="p-20 text-center">
                        <div className="flex flex-col items-center gap-4 text-white/20">
                          <Tag className="w-12 h-12" />
                          <p className="font-serif italic">No categories found</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Category Pagination Footer */}
            {!loading && categories.length > 0 && (
              <div className="p-6 bg-black/40 border-t border-white/[0.03] flex items-center justify-between">
                <p className="text-[10px] uppercase font-black tracking-widest text-white/20">
                  Record <span className="text-[#f59e0b]">{(catPagination.page - 1) * catPagination.limit + 1}</span> — <span className="text-[#f59e0b]">{Math.min(catPagination.page * catPagination.limit, catPagination.totalItems)}</span> <span className="mx-2 opacity-50">/</span> Total <span className="text-white">{catPagination.totalItems}</span>
                </p>
                <div className="flex items-center gap-3">
                  <button
                    disabled={catPagination.page === 1}
                    onClick={() => setCatPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    className="p-2 border border-white/10 rounded-xl disabled:opacity-10 hover:bg-white/5 transition-all"
                  >
                    <ChevronLeft className="w-5 h-5 text-[#f59e0b]" />
                  </button>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: Math.min(5, catPagination.totalPages) }).map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setCatPagination(prev => ({ ...prev, page: i + 1 }))}
                        className={`w-9 h-9 rounded-xl text-[10px] font-black transition-all ${catPagination.page === i + 1
                          ? 'bg-[#f59e0b] text-black shadow-lg shadow-[#f59e0b]/20'
                          : 'hover:bg-white/5 text-white/40'
                          }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    disabled={catPagination.page === catPagination.totalPages}
                    onClick={() => setCatPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    className="p-2 border border-white/10 rounded-xl disabled:opacity-10 hover:bg-white/5 transition-all"
                  >
                    <ChevronRight className="w-5 h-5 text-[#f59e0b]" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden CSV Input */}
      <input
        type="file" id="bulkCsv" hidden accept=".csv"
        onChange={async (e) => {
          const file = e.target.files[0];
          if (file) {
            const formData = new FormData();
            formData.append('file', file);
            try {
              setLoading(true);
              const res = await axios.post(`${import.meta.env.VITE_API_URL}/menu-items/bulk-upload`, formData);
              let errorSummary = `Import Complete!\nAdded: ${res.data.itemsAdded}\nUpdated: ${res.data.itemsUpdated}\nFailed: ${res.data.itemsFailed}`;
              if (res.data.itemsFailed > 0 && res.data.errors?.length > 0) {
                const sample = res.data.errors[0];
                errorSummary += `\n\nSample Error: ${sample.reason}\nRow Keys: ${sample.availableKeys?.join(', ')}`;
              }
              alert(errorSummary);
              fetchData();
            } catch (err) {
              console.error(err);
              alert('CSV format error. Please check your columns.');
            } finally {
              setLoading(false);
              e.target.value = '';
            }
          }
        }}
      />
    </div>
  );
};

export default AdminMenu;
