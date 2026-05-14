import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Loader2, Eye, EyeOff, Moon, Sun, Sparkles, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      toast.success('Logged in successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const [forgotEmail, setForgotEmail] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success('Password reset link sent to your email!');
      setShowForgotModal(false);
    } catch (error: any) {
      toast.error(error.message || 'Error sending reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 opacity-20">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-red-500/20 blur-[120px] rounded-full"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-red-600/10 blur-[120px] rounded-full"></div>
      </div>

      {/* Theme Toggle */}
      <div className="absolute top-8 right-8 z-20">
        <button
          onClick={() => setIsDark(!isDark)}
          className="h-12 w-12 flex items-center justify-center rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] hover:scale-110 transition-all shadow-xl backdrop-blur-xl"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex h-16 w-16 items-center justify-center bg-[var(--accent)] rounded-2xl text-white shadow-2xl shadow-red-500/30 mb-6 animate-bounce-slow">
            <Sparkles className="w-8 h-8 fill-current" />
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-[var(--foreground)] tracking-tight">
            Admin Portal
          </h2>
          <p className="mt-3 text-sm text-[var(--foreground)] opacity-50 font-bold uppercase tracking-[0.2em]">
            Secure Access to PDF Spark
          </p>
        </div>

        <div className="bg-[var(--surface)]/80 backdrop-blur-2xl p-8 md:p-10 rounded-[2.5rem] border border-[var(--border)] shadow-2xl animate-in zoom-in-95 duration-700">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-5">
              <div className="group">
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--foreground)] opacity-40 mb-2 ml-1">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    className="block w-full px-5 py-4 bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent sm:text-sm transition-all group-hover:border-[var(--foreground)]/20"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="group">
                <div className="flex justify-between items-center mb-2 ml-1">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--foreground)] opacity-40">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] hover:opacity-70 transition-opacity"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="block w-full px-5 py-4 bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent sm:text-sm transition-all group-hover:border-[var(--foreground)]/20 pr-14"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-[var(--foreground)] opacity-30 hover:opacity-100 transition-opacity"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-4.5 px-4 border border-transparent text-sm font-black uppercase tracking-widest rounded-2xl text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent)] disabled:opacity-50 transition-all shadow-xl shadow-red-600/20 active:scale-[0.98] mt-8"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  Sign in
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-10 text-center text-xs font-bold text-[var(--foreground)] opacity-30 uppercase tracking-widest">
          &copy; {new Date().getFullYear()} PDF Spark Admin System
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[var(--surface)] border border-[var(--border)] w-full max-w-sm rounded-[2.5rem] p-10 shadow-2xl relative">
            <h3 className="text-2xl font-black text-[var(--foreground)] text-center mb-3">Recover Access</h3>
            <p className="text-[var(--foreground)] opacity-50 text-center text-sm mb-8 font-medium italic">We'll send a password reset link.</p>
            
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <input 
                type="email"
                required
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl px-5 py-4 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 text-sm transition-all"
                placeholder="Enter your admin email"
              />
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="flex-1 py-4 bg-[var(--surface-hover)] text-[var(--foreground)] rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-red-600/10 disabled:opacity-50"
                >
                  {loading ? '...' : 'Send Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
