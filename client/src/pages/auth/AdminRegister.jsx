import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Crown, Lock, Mail, User, ShieldAlert, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const AdminRegister = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    adminSecret: '' // simple extra protection to prevent random people finding the URL and making themselves admin
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Optional basic check (you can change this string if you want to hardcode a secret)
    if (formData.adminSecret !== 'CAFE2026') {
      setError('Invalid registration secret key.');
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/auth/register`, {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: 'admin'
      });
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to register admin account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-surface border border-white/10 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl">
          <div className="p-8 border-b border-white/5 bg-white/[0.02]">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20 shadow-lg shadow-primary/5 mx-auto">
              <Crown className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-serif font-black text-white text-center">Root Access</h1>
            <p className="text-[10px] uppercase font-black tracking-[0.2em] text-primary/70 text-center mt-2">Initialize Administrator</p>
          </div>

          <div className="p-8">
            {success ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                  <ShieldAlert className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Admin Created</h3>
                <p className="text-white/50 text-sm">Redirecting to login portal...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                    {error}
                  </div>
                )}
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/50 ml-1">Admin Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input 
                      type="text" required
                      value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:border-primary outline-none transition-colors"
                      placeholder="System Admin"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/50 ml-1">Admin Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input 
                      type="email" required
                      value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:border-primary outline-none transition-colors"
                      placeholder="admin@cafe.com"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/50 ml-1">Master Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input 
                      type="password" required
                      value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:border-primary outline-none transition-colors"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Security Key</label>
                  <div className="relative">
                    <ShieldAlert className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/50" />
                    <input 
                      type="password" required
                      value={formData.adminSecret} onChange={e => setFormData({...formData, adminSecret: e.target.value})}
                      className="w-full bg-primary/5 border border-primary/20 rounded-xl py-3 pl-11 pr-4 text-sm text-primary focus:border-primary outline-none transition-colors"
                      placeholder="Required for setup"
                    />
                  </div>
                  <p className="text-[9px] text-white/30 text-center mt-2">Enter the setup key: CAFE2026</p>
                </div>

                <button 
                  type="submit" disabled={loading}
                  className="w-full py-3.5 bg-primary text-black rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all mt-4 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <>Initialize Admin <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminRegister;
