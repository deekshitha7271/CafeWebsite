import { useState, useEffect } from 'react';
import { Globe, Save, Eye, Type, AlignLeft, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

const AdminCMS = () => {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [savedSections, setSavedSections] = useState({});

    useEffect(() => {
        axios.get(`${import.meta.env.VITE_API_URL}/admin/settings`)
            .then(res => setSettings(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const update = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

    const saveSection = async (sectionId) => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/admin/settings`, settings);
            setSavedSections(prev => ({ ...prev, [sectionId]: true }));
            setTimeout(() => setSavedSections(prev => ({ ...prev, [sectionId]: false })), 2500);
        } catch (err) { alert('Failed to save'); }
    };

    if (loading || !settings) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

    const sections = [
        {
            id: 'hero', label: 'Hero Section', icon: Type,
            fields: [
                { key: 'heroHeadline', label: 'Headline', type: 'text' },
                { key: 'heroSubheadline', label: 'Sub-headline', type: 'text' },
                { key: 'heroCta', label: 'CTA Button Text', type: 'text' },
            ]
        },
        {
            id: 'about', label: 'About Section', icon: AlignLeft,
            fields: [
                { key: 'aboutTitle', label: 'Section Title', type: 'text' },
                { key: 'aboutDescription', label: 'Description', type: 'textarea' },
            ]
        },
        {
            id: 'offer', label: "Today's Offer Banner", icon: Type,
            fields: [
                { key: 'offerBannerText', label: 'Banner Text', type: 'text' },
                { key: 'offerBannerActive', label: 'Banner Active', type: 'select', options: [true, false], labels: ['Yes – Visible', 'No – Hidden'] },
            ]
        },
        {
            id: 'hours', label: 'Business Hours', icon: Type,
            fields: [
                { key: 'weekdayHours', label: 'Weekday Hours', type: 'text' },
                { key: 'weekendHours', label: 'Weekend Hours', type: 'text' },
            ]
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-serif font-black text-white">Website CMS</h2>
                <p className="text-text-muted text-sm mt-1">Content saved to database — updates your live website</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {sections.map((section, i) => {
                    const Icon = section.icon;
                    return (
                        <motion.div key={section.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                            className="bg-surface border border-white/5 rounded-3xl overflow-hidden hover:border-primary/20 transition-colors">
                            <div className="px-6 py-5 border-b border-white/5 flex items-center gap-3">
                                <div className="w-9 h-9 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center">
                                    <Icon className="w-4 h-4 text-primary" />
                                </div>
                                <h3 className="text-white font-bold text-[15px]">{section.label}</h3>
                            </div>
                            <div className="p-6 space-y-4">
                                {section.fields.map(field => (
                                    <div key={field.key}>
                                        <label className="text-[10px] text-white/40 uppercase font-black tracking-widest block mb-2">{field.label}</label>
                                        {field.type === 'textarea' ? (
                                            <textarea value={settings[field.key] || ''} onChange={e => update(field.key, e.target.value)} rows={4}
                                                className="w-full bg-surface-dark border border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary/40 text-white resize-none" />
                                        ) : field.type === 'select' ? (
                                            <select value={String(settings[field.key])} onChange={e => update(field.key, e.target.value === 'true')}
                                                className="w-full bg-surface-dark border border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary/40 text-white">
                                                {field.options.map((o, j) => <option key={j} value={String(o)} className="bg-surface-dark">{field.labels[j]}</option>)}
                                            </select>
                                        ) : (
                                            <input type="text" value={settings[field.key] || ''} onChange={e => update(field.key, e.target.value)}
                                                className="w-full bg-surface-dark border border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary/40 text-white" />
                                        )}
                                    </div>
                                ))}
                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => saveSection(section.id)}
                                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${savedSections[section.id] ? 'bg-emerald-500 text-background' : 'bg-primary text-background hover:bg-primary-light'}`}>
                                        <Save className="w-3.5 h-3.5" />
                                        {savedSections[section.id] ? 'Saved!' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default AdminCMS;
