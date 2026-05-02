import { useState, useEffect, useRef } from 'react';
import { Save, Store, Phone, Mail, Clock, AtSign, Globe, Percent, Bell, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

const SettingsSection = ({ title, icon: Icon, children }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-surface border border-white/5 rounded-3xl overflow-hidden hover:border-primary/10 transition-colors">
        <div className="px-6 py-5 border-b border-white/5 flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center">
                <Icon className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-white font-bold text-[16px]">{title}</h3>
        </div>
        <div className="p-6 space-y-5">{children}</div>
    </motion.div>
);

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
            setSaved(true); setTimeout(() => setSaved(false), 2500);
        } catch (err) { alert('Failed to save settings'); }
        finally { setSaving(false); }
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

    const Field = ({ label, field, type = 'text' }) => (
        <div>
            <label className="text-[10px] text-white/40 uppercase font-black tracking-widest block mb-2">{label}</label>
            <input type={type} value={settings?.[field] || ''} onChange={e => update(field, e.target.value)}
                className="w-full bg-surface-dark border border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary/40 text-white placeholder:text-white/20" />
        </div>
    );

    const Toggle = ({ label, field }) => (
        <div className="flex items-center justify-between py-1">
            <span className="text-white/60 text-sm font-medium">{label}</span>
            <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={!!settings?.[field]} onChange={e => update(field, e.target.checked)} className="sr-only peer" />
                <div className="w-10 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
            </label>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-serif font-black text-white">Settings</h2>
                    <p className="text-text-muted text-sm mt-1">Saved to your database</p>
                </div>
                <button onClick={handleSave} disabled={saving}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all w-fit ${saved ? 'bg-emerald-500 text-background' : 'bg-primary text-background hover:bg-primary-light'} disabled:opacity-60`}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Saving...' : saved ? 'Saved!' : 'Save All Settings'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SettingsSection title="Café Information" icon={Store}>
                    <Field label="Café Name" field="cafeName" />
                    <Field label="Tagline" field="tagline" />
                    <Field label="GST Number" field="gstNumber" />
                </SettingsSection>

                <SettingsSection title="Contact Details" icon={Phone}>
                    <Field label="Phone Number" field="phone" type="tel" />
                    <Field label="Email Address" field="email" type="email" />
                    <Field label="Address" field="address" />
                </SettingsSection>

                <SettingsSection title="Operating Hours" icon={Clock}>
                    <Field label="Weekday Hours" field="weekdayHours" />
                    <Field label="Weekend Hours" field="weekendHours" />
                </SettingsSection>

                <SettingsSection title="Social Media" icon={AtSign}>
                    <Field label="Instagram URL" field="instagram" />
                    <Field label="Website URL" field="website" />
                    <Field label="Google Maps Link" field="googleMaps" />
                </SettingsSection>

                <SettingsSection title="Tax & Billing" icon={Percent}>
                    <Field label="GST Rate (%)" field="gstRate" type="number" />
                    <Field label="Service Charge (%)" field="serviceCharge" type="number" />
                    <Field label="Invoice Prefix" field="invoicePrefix" />
                </SettingsSection>

                <SettingsSection title="Notifications" icon={Bell}>
                    <Toggle label="New Order Alerts" field="notifNewOrder" />
                    <Toggle label="Low Stock Alerts" field="notifLowStock" />
                    <Toggle label="Payment Received" field="notifPayment" />
                    <Toggle label="Staff Check-In" field="notifStaffCheckin" />
                    <Toggle label="Customer Review Posted" field="notifReview" />
                </SettingsSection>
            </div>
        </div>
    );
};

export default AdminSettings;
