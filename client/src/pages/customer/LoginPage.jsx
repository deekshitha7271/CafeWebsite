import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2, Lock, ArrowRight } from 'lucide-react';

const LoginPage = () => {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }

    try {
      const loggedInUser = await login(email, password);
      
      const from = location.state?.from?.pathname || '/admin';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-20">
      <div className="glass-panel rounded-3xl p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-primary/20 border border-primary/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl font-serif font-black text-white mb-2">Staff Portal</h1>
        <p className="text-text-muted mb-8 text-sm">
          Authorized personnel only. Please sign in to access the dashboard.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            id="admin-email"
            type="email"
            placeholder="Staff Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-primary transition-all placeholder:text-white/30"
          />
          <input
            id="admin-password"
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-primary transition-all placeholder:text-white/30"
          />

          {error && <p className="text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-3 text-left">{error}</p>}

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-background py-4 rounded-2xl font-black uppercase tracking-[0.15em] hover:bg-primary-light transition-all flex items-center justify-center gap-3 mt-4"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>Sign In <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        <div className="mt-8 text-xs text-white/20">
          <p>© {new Date().getFullYear()} Ca Phe Bistro. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
