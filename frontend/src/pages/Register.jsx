import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { HiUser, HiMail, HiLockClosed, HiPhone } from 'react-icons/hi';

const Register = () => {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return toast.error('Please fill required fields.');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters.');
    setLoading(true);
    try {
      await register(form);
      toast.success('Registration successful! Welcome.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed.');
    } finally { setLoading(false); }
  };

  const fields = [
    { name: 'name', label: 'Full Name', type: 'text', icon: <HiUser />, placeholder: 'Enter full name', required: true },
    { name: 'email', label: 'Email', type: 'email', icon: <HiMail />, placeholder: 'Enter email', required: true },
    { name: 'phone', label: 'Phone (optional)', type: 'tel', icon: <HiPhone />, placeholder: '+91-XXXXXXXXXX' },
    { name: 'password', label: 'Password', type: 'password', icon: <HiLockClosed />, placeholder: 'Min 6 characters', required: true },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 islamic-pattern">
      <div className="absolute top-20 right-20 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl" />
      <div className="w-full max-w-md relative animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-emerald-400 flex items-center justify-center text-4xl shadow-2xl shadow-primary-500/30">🕌</div>
          <h1 className="text-3xl font-bold text-surface-100 mb-2">Join the Jamat</h1>
          <p className="text-surface-400">Create your account to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-8 space-y-4">
          {fields.map(f => (
            <div key={f.name}>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">{f.label}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500">{f.icon}</span>
                <input type={f.type} placeholder={f.placeholder} value={form[f.name]}
                  onChange={e => setForm({...form, [f.name]: e.target.value})}
                  className="input-field pl-10" required={f.required} />
              </div>
            </div>
          ))}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Create Account'}
          </button>

          <p className="text-center text-sm text-surface-400">
            Already have an account? <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">Sign In</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
