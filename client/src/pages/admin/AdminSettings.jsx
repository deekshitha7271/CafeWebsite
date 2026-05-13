import { useState, useEffect } from 'react';
import { Save, Store, Phone, Globe, Percent, Clock, AlignLeft, Tag, Camera, X, Plus, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

// ─── Static sub-components MUST live outside AdminSettings ───────────────────
// Defining them inside causes React to treat them as new component types on every
// render, which unmounts/remounts the input and drops focus after each keystroke.

const SettingsSection = ({ title, icon: Icon, children }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface border border-white/5 rounded-3xl overflow-hidden hover:border-primary/10 transition-colors"
    >
        <div className="px-6 py-5 border-b border-white/5 flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center">
                <Icon className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-white font-bold text-[16px]">{title}</h3>
        </div>
        <div className="p-6 space-y-5">{children}</div>
    </motion.div>
);

// Field: receives settings + update as props — never recreated as a new type
const Field = ({ label, field, type = 'text', settings, update }) => (
    <div>
        <label className="text-[10px] text-white/40 uppercase font-black tracking-widest block mb-2">{label}</label>
        <input
            type={type}
            value={settings?.[field] || ''}
            onChange={e => update(field, e.target.value)}
            className="w-full bg-surface-dark border border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary/40 text-white placeholder:text-white/20"
        />
    </div>
);

const ImageField = ({ label, field, settings, update }) => {
    const [uploading, setUploading] = useState(false);
    return (
        <div className="space-y-4">
            <label className="text-[10px] text-white/40 uppercase font-black tracking-widest block">{label}</label>
            <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-surface-dark border border-white/10 rounded-2xl overflow-hidden shadow-inner flex-shrink-0">
                    {settings?.[field] ? (
                        <img src={settings[field]} className="w-full h-full object-cover" alt={label} />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/10 italic text-[10px]">No Image</div>
                    )}
                </div>
                <div className="flex-1">
                    <label className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white cursor-pointer hover:bg-white/10 transition-all">
                        {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                        {uploading ? 'Uploading...' : 'Change Image'}
                        <input
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={async (e) => {
                                const file = e.target.files[0];
                                if (!file) return;
                                setUploading(true);
                                const formData = new FormData();
                                formData.append('image', file);
                                try {
                                    const res = await axios.post(`${import.meta.env.VITE_API_URL}/admin/upload`, formData, {
                                        headers: { 'Content-Type': 'multipart/form-data' }
                                    });
                                    update(field, res.data.url);
                                } catch (err) {
                                    alert('Upload failed');
                                } finally {
                                    setUploading(false);
                                }
                            }}
                        />
                    </label>
                    <p className="text-[10px] text-white/20 mt-2 font-medium">Recommended: High quality PNG/WebP (Transparent preferred for Hero)</p>
                </div>
            </div>
        </div>
    );
};

// Toggle: same pattern — outside the parent component
const Toggle = ({ label, field, settings, update }) => (
    <div className="flex items-center justify-between py-1">
        <span className="text-white/60 text-sm font-medium">{label}</span>
        <label className="relative inline-flex items-center cursor-pointer">
            <input
                type="checkbox"
                checked={!!settings?.[field]}
                onChange={e => update(field, e.target.checked)}
                className="sr-only peer"
            />
            <div className="w-10 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
        </label>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminSettings = () => {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        axios.get(`${import.meta.env.VITE_API_URL}/admin/settings`)
            .then(res => setSettings(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const update = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/admin/settings`, settings);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (err) {
            const msg = err.response?.data?.error || err.message;
            alert('Failed to save settings: ' + msg);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex justify-center p-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
    );

    // Shared props passed down so Field/Toggle stay stable component references
    const fp = { settings, update };

    return (
        <div className="space-y-6">
            <div className="sticky top-0 z-[100] -mx-4 md:-mx-8 px-4 md:px-8 py-4 bg-background/80 backdrop-blur-xl border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
                <div>
                    <h2 className="text-3xl font-serif font-black text-white">Settings</h2>
                    <p className="text-text-muted text-[10px] uppercase font-bold tracking-widest mt-1">Direct Database Management</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`flex items-center gap-2 px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all w-fit shadow-2xl ${saved ? 'bg-emerald-500 text-background' : 'bg-primary text-background hover:bg-primary-light'} disabled:opacity-60`}
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Saving Changes...' : saved ? 'Success! Settings Saved' : 'Save All Settings'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SettingsSection title="Portal Identity" icon={Store}>
                    <Field label="Café Name" field="cafeName" {...fp} />
                    <Field label="Tagline" field="tagline" {...fp} />
                    <Field label="Address" field="address" {...fp} />
                </SettingsSection>

                <SettingsSection title="Portal Hero Section" icon={Globe}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <Field label="Hero Headline" field="heroHeadline" {...fp} />
                            <Field label="Hero Subheadline" field="heroSubheadline" {...fp} />
                            <Field label="Hero CTA Button" field="heroCta" {...fp} />
                        </div>
                        <ImageField label="Main Hero Image (Floating)" field="heroImage" {...fp} />
                    </div>
                </SettingsSection>

                <SettingsSection title="Contact & Socio" icon={Phone}>
                    <Field label="Phone Number" field="phone" type="tel" {...fp} />
                    <Field label="Instagram URL" field="instagram" {...fp} />
                    <Field label="Google Maps Link" field="googleMaps" {...fp} />
                </SettingsSection>

                <SettingsSection title="About Sanctuary" icon={AlignLeft}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <Field label="About Title" field="aboutTitle" {...fp} />
                            <div>
                                <label className="text-[10px] text-white/40 uppercase font-black tracking-widest block mb-2">About Description</label>
                                <textarea
                                    value={settings?.aboutDescription || ''}
                                    onChange={e => update('aboutDescription', e.target.value)}
                                    className="w-full bg-surface-dark border border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary/40 text-white resize-none"
                                    rows={4}
                                />
                            </div>
                        </div>
                        <ImageField label="Story Image (Featured)" field="aboutImage" {...fp} />
                    </div>
                </SettingsSection>

                <SettingsSection title="Operating Hours" icon={Clock}>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Opening Time (Logic)" field="openingTime" type="time" {...fp} />
                        <Field label="Closing Time (Logic)" field="closingTime" type="time" {...fp} />
                    </div>
                    <Field label="Display Hours (Text)" field="weekdayHours" {...fp} />
                </SettingsSection>

                <SettingsSection title="Pricing & Billing" icon={Percent}>
                    <Field label="Service Charge (%)" field="serviceCharge" type="number" {...fp} />
                    <Field label="GST Rate (%)" field="gstRate" type="number" {...fp} />
                </SettingsSection>

                <SettingsSection title="Today's Offer Banner" icon={Tag}>
                    <Field label="Banner Text" field="offerBannerText" {...fp} />
                    <Toggle label="Show Banner on Website" field="offerBannerActive" {...fp} />
                </SettingsSection>

                {/* Gallery Management — spans full width */}
                <div className="lg:col-span-2">
                    <SettingsSection title="Portal Gallery (Crafted Moments)" icon={Camera}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {(settings?.gallery || []).map((img, i) => (
                                <div key={i} className="bg-surface-dark border border-white/5 rounded-2xl p-4 space-y-3 relative group">
                                    <div className="aspect-[4/5] bg-white/5 rounded-xl overflow-hidden border border-white/10 relative">
                                        {img.url ? (
                                            <img src={img.url} className="w-full h-full object-cover" alt={`Gallery ${i}`} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-white/10 italic text-[10px]">No Image</div>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <label className="bg-primary text-background p-2.5 rounded-full cursor-pointer hover:scale-110 transition-transform shadow-lg">
                                                <Camera className="w-4 h-4" />
                                                <input
                                                    type="file"
                                                    className="sr-only"
                                                    accept="image/*"
                                                    onChange={async (e) => {
                                                        const file = e.target.files[0];
                                                        if (!file) return;
                                                        const formData = new FormData();
                                                        formData.append('image', file);
                                                        try {
                                                            const res = await axios.post(`${import.meta.env.VITE_API_URL}/admin/upload`, formData, {
                                                                headers: { 'Content-Type': 'multipart/form-data' }
                                                            });
                                                            const newGallery = [...settings.gallery];
                                                            newGallery[i].url = res.data.url;
                                                            update('gallery', newGallery);
                                                        } catch (err) {
                                                            alert('Upload failed: ' + (err.response?.data?.error || err.message));
                                                        }
                                                    }}
                                                />
                                            </label>
                                            <button
                                                onClick={() => {
                                                    const newGallery = settings.gallery.filter((_, idx) => idx !== i);
                                                    update('gallery', newGallery);
                                                }}
                                                className="bg-red-500 text-white p-2.5 rounded-full hover:scale-110 transition-transform shadow-lg"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            placeholder="Label (e.g. Ambience)"
                                            value={img.category || ''}
                                            onChange={e => {
                                                const newGallery = [...settings.gallery];
                                                newGallery[i].category = e.target.value;
                                                update('gallery', newGallery);
                                            }}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-[10px] outline-none text-white focus:border-primary/40"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Caption"
                                            value={img.caption || ''}
                                            onChange={e => {
                                                const newGallery = [...settings.gallery];
                                                newGallery[i].caption = e.target.value;
                                                update('gallery', newGallery);
                                            }}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-[10px] outline-none text-white focus:border-primary/40 font-medium"
                                        />
                                    </div>
                                </div>
                            ))}
                            <button
                                onClick={() => {
                                    const newGallery = [...(settings?.gallery || []), { url: '', caption: '', category: 'Ambience' }];
                                    update('gallery', newGallery);
                                }}
                                className="border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center p-8 hover:border-primary/30 hover:bg-primary/5 transition-all min-h-[220px]"
                            >
                                <Plus className="w-8 h-8 text-white/20 mb-2" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Add New Moment</span>
                            </button>
                        </div>
                    </SettingsSection>
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;
