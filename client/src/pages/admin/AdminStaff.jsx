import { useState, useEffect } from 'react';
import { UserCog, Clock, CheckCircle, XCircle, Plus, Search, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

const roleColors = {
    Worker: 'bg-orange-400/10 text-orange-400 border-orange-400/20',
    Manager: 'bg-primary/10 text-primary border-primary/20',
};

const rolePerms = {
    Worker: ['View Orders', 'Update Order Status', 'Take Orders'],
    Manager: ['All Permissions', 'Manage Staff', 'Analytics'],
};

const EMPTY_FORM = { name: '', email: '', password: '', role: 'Worker', phone: '', shift: '9AM - 6PM', salary: '', status: 'present' };

const AdminStaff = () => {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);

    const fetchStaff = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/admin/staff`);
            setStaff(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStaff(); }, []);

    const handleSave = async () => {
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/admin/staff`, form);
            setShowAdd(false); setForm(EMPTY_FORM); fetchStaff();
        } catch (err) {
            alert(err.response?.data?.error || err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this staff member?')) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/admin/staff/${id}`);
            fetchStaff();
        } catch (err) { alert(err.message); }
    };

    const filtered = staff.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.role.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-serif font-black text-white">Staff Management</h2>
                    <p className="text-text-muted text-sm mt-1">{staff.filter(s => s.status === 'present').length} of {staff.length} staff members present today</p>
                </div>
                <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 px-5 py-3 bg-primary text-background rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-primary-light transition-all w-fit">
                    <Plus className="w-4 h-4" /> Add Staff
                </button>
            </div>

            {/* Add Form */}
            {showAdd && (
                <div className="bg-surface border border-primary/30 rounded-3xl p-6">
                    <h3 className="text-white font-serif font-bold text-xl mb-4">New Staff Member</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        {[
                            { key: 'name', label: 'Full Name', type: 'text' },
                            { key: 'email', label: 'Email', type: 'email' },
                            { key: 'password', label: 'Initial Password', type: 'password' },
                            { key: 'phone', label: 'Phone', type: 'text' },
                            { key: 'shift', label: 'Shift (e.g. 9AM - 6PM)', type: 'text' },
                            { key: 'salary', label: 'Salary (₹)', type: 'number' },
                        ].map(f => (
                            <div key={f.key}>
                                <label className="text-[10px] text-white/40 uppercase font-black tracking-widest block mb-1">{f.label}</label>
                                <input type={f.type} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                                    className="w-full bg-surface-dark border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-primary/40 text-white" />
                            </div>
                        ))}
                        <div>
                            <label className="text-[10px] text-white/40 uppercase font-black tracking-widest block mb-1">Role</label>
                            <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                                className="w-full bg-surface-dark border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-primary/40 text-white">
                                <option value="Worker" className="bg-surface-dark">Worker</option>
                                <option value="Manager" className="bg-surface-dark">Manager</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-white/40 uppercase font-black tracking-widest block mb-1">Status</label>
                            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                                className="w-full bg-surface-dark border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-primary/40 text-white">
                                <option value="present" className="bg-surface-dark">Present</option>
                                <option value="absent" className="bg-surface-dark">Absent</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleSave} className="px-6 py-2.5 bg-primary text-background rounded-xl text-[11px] font-black uppercase tracking-widest">Add Staff</button>
                        <button onClick={() => setShowAdd(false)} className="px-6 py-2.5 border border-white/10 text-white/40 rounded-xl text-[11px] font-black uppercase tracking-widest">Cancel</button>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Staff', value: staff.length, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
                    { label: 'Present Today', value: staff.filter(s => s.status === 'present').length, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
                    { label: 'Absent', value: staff.filter(s => s.status === 'absent').length, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20' },
                    { label: 'Monthly Payroll', value: `₹${(staff.reduce((a, s) => a + (Number(s.salary) || 0), 0) / 1000).toFixed(0)}k`, color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
                ].map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                        className={`bg-surface border ${s.bg} rounded-2xl p-4`}>
                        <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">{s.label}</p>
                        <p className={`text-3xl font-black mt-1 ${s.color}`}>{s.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* Staff Grid */}
            <div className="bg-surface border border-white/5 rounded-3xl overflow-hidden">
                <div className="p-5 border-b border-white/5 flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff..."
                            className="w-full bg-surface-dark border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:border-primary/40 placeholder:text-white/20" />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/5">
                                {['Staff Member', 'Role', 'Shift', 'Salary', 'Permissions', 'Status', 'Actions'].map(h => (
                                    <th key={h} className="text-left text-[10px] font-black text-white/30 uppercase tracking-widest px-5 py-4">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr><td colSpan={7} className="text-center py-16 text-white/20">No staff members found.</td></tr>
                            )}
                            {filtered.map((s, i) => (
                                <motion.tr key={s._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-black text-xs flex-shrink-0">
                                                {s.avatar}
                                            </div>
                                            <div>
                                                <p className="font-bold text-white text-[13px]">{s.name}</p>
                                                <p className="text-[10px] text-white/30">{s.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${roleColors[s.role] || roleColors['Worker']}`}>{s.role}</span>
                                    </td>
                                    <td className="px-5 py-4 text-white/60 text-[11px]">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-3 h-3" /> {s.shift}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 font-black text-white">₹{(s.salary || 0).toLocaleString()}</td>
                                    <td className="px-5 py-4">
                                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                                            {(rolePerms[s.role] || rolePerms['Worker']).slice(0, 2).map(p => (
                                                <span key={p} className="text-[9px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-white/40 font-bold">{p}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        {s.status === 'present'
                                            ? <div className="flex items-center gap-1.5 text-emerald-400"><CheckCircle className="w-3.5 h-3.5" /> <span className="text-[11px] font-black">Present</span></div>
                                            : <div className="flex items-center gap-1.5 text-red-400"><XCircle className="w-3.5 h-3.5" /> <span className="text-[11px] font-black">Absent</span></div>
                                        }
                                    </td>
                                    <td className="px-5 py-4">
                                        <button onClick={() => handleDelete(s._id)} className="text-white/20 hover:text-red-400 text-[11px] font-black transition-colors">Delete</button>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminStaff;
