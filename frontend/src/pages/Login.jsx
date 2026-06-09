import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { HiMail, HiLockClosed, HiEye, HiEyeOff } from 'react-icons/hi';

const Login = () => {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Please fill all fields.');
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Assalamu Alaikum! Welcome back.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 islamic-pattern">
      {/* Decorative elements */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-emerald-400 flex items-center justify-center text-4xl shadow-2xl shadow-primary-500/30">
            🕌
          </div>
          <h1 className="text-3xl font-bold text-surface-100 mb-2">Assalamu Alaikum</h1>
          <p className="text-surface-400">Sign in to Jamat Management System</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass-card p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Email</label>
            <div className="relative">
              <HiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" size={18} />
              <input type="email" placeholder="Enter your email" value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                className="input-field pl-10" autoFocus />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Password</label>
            <div className="relative">
              <HiLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" size={18} />
              <input type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
                className="input-field pl-10 pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300">
                {showPassword ? <HiEyeOff size={18} /> : <HiEye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3">
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Sign In'}
          </button>

          <p className="text-center text-sm text-surface-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium">Register</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
