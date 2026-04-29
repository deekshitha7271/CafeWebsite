import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

const RegisterPage = () => {
  const { register, loading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      await register(name, email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-20">
      <div className="glass-panel rounded-3xl p-10 max-w-md w-full text-center">
        <h1 className="text-4xl font-serif font-black text-white mb-4">Create Account</h1>
        <p className="text-text-muted mb-8">Register your own cafe session to keep orders separate.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-primary transition-all"
          />
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-primary transition-all"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-primary transition-all"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-background py-4 rounded-2xl font-black uppercase tracking-[0.15em] hover:bg-primary-light transition-all"
          >
            {loading ? <Loader2 className="w-5 h-5 mx-auto animate-spin" /> : 'Register'}
          </button>
        </form>

        <p className="text-text-muted text-sm mt-8">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-bold hover:text-primary-light">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
