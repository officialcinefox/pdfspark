import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { 
  Shield, UserPlus, Trash2, Loader2, 
  Key, Mail, AlertTriangle, ShieldCheck,
  User, CheckCircle2, Lock, Eye, EyeOff, Sparkles, Calendar, Info
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
}

const getAdminRole = (email: string, currentUserEmail?: string) => {
  if (email.toLowerCase() === currentUserEmail?.toLowerCase()) {
    return { name: 'Owner / Primary Admin', style: 'bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/20 dark:text-red-400' };
  }
  // Deterministic mapping for visual styling only
  const roles = [
    { name: 'SaaS Platform Editor', style: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400' },
    { name: 'CMS & Blog Contributor', style: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400' },
    { name: 'Security Administrator', style: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400' }
  ];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % roles.length;
  return roles[index];
};

export const AdminManager: React.FC = () => {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmNewAdminPassword, setConfirmNewAdminPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  // Delete modal state
  const [deletingAdmin, setDeletingAdmin] = useState<AdminUser | null>(null);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setAdmins(data || []);
    } catch (error: any) {
      toast.error('Error fetching admins: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail || !newAdminPassword) return;

    if (newAdminPassword !== confirmNewAdminPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newAdminPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsAdding(true);
    const toastId = toast.loading('Creating admin account...');
    try {
      // Create a temporary client WITHOUT session persistence to avoid logging out the current admin
      const tempSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        }
      );
      
      const { error: authError } = await tempSupabase.auth.signUp({
        email: newAdminEmail.toLowerCase().trim(),
        password: newAdminPassword,
      });

      if (authError) throw authError;

      // Step 2: Add to admin_users table
      const { error } = await supabase
        .from('admin_users')
        .insert([{ email: newAdminEmail.toLowerCase().trim() }]);

      if (error) throw error;
      
      toast.success('Admin account created and authorized!', { id: toastId });
      setNewAdminEmail('');
      setNewAdminPassword('');
      setConfirmNewAdminPassword('');
      fetchAdmins();
    } catch (error: any) {
      toast.error('Failed: ' + (error.code === '23505' ? 'Email already exists' : error.message), { id: toastId });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!deletingAdmin) return;
    
    if (confirmEmail.toLowerCase().trim() !== deletingAdmin.email.toLowerCase()) {
      toast.error('Confirmation email does not match');
      return;
    }

    setIsDeleting(true);
    try {
      // Step 1: Verify the admin's credentials as requested by the user
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: confirmEmail,
        password: confirmPassword,
      });

      if (authError) {
        throw new Error('Authentication failed: Could not verify admin credentials. ' + authError.message);
      }

      // Step 2: Delete from admin_users table
      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', deletingAdmin.id);

      if (error) throw error;

      toast.success('Admin removed successfully');
      setDeletingAdmin(null);
      setConfirmEmail('');
      setConfirmPassword('');
      fetchAdmins();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Admin Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight leading-tight">Admin authorizations</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Configure dashboard access permissions, invite team members, and manage credential safety.</p>
        </div>
      </div>

      {/* 2 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Authorize New Admin Account */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-[#121517] border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/10 dark:bg-red-550/15 rounded-2xl flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">Invite Admin</h2>
                <p className="text-[10px] text-zinc-450 dark:text-zinc-500">Authorize database access</p>
              </div>
            </div>
            
            <form onSubmit={handleAddAdmin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-550 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input 
                    type="email"
                    required
                    value={newAdminEmail}
                    onChange={e => setNewAdminEmail(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-[#0c0e10] border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9.5 pr-4 py-2.5 text-xs text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-red-500/30 font-medium"
                    placeholder="teammember@gmail.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-550 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input 
                    type={showPass ? "text" : "password"}
                    required
                    value={newAdminPassword}
                    onChange={e => setNewAdminPassword(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-[#0c0e10] border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9.5 pr-10 py-2.5 text-xs text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-red-500/30 font-medium"
                    placeholder="Min. 6 characters"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-550 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input 
                    type={showPass ? "text" : "password"}
                    required
                    value={confirmNewAdminPassword}
                    onChange={e => setConfirmNewAdminPassword(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-[#0c0e10] border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9.5 pr-4 py-2.5 text-xs text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-red-500/30 font-medium"
                    placeholder="Repeat password exactly"
                  />
                </div>
              </div>

              <button 
                disabled={isAdding || !newAdminEmail || !newAdminPassword}
                className="w-full py-3 bg-red-650 hover:bg-red-750 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 mt-2 shadow-md shadow-red-500/10"
              >
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Authorize Admin
              </button>
            </form>

            <div className="pt-5 border-t border-zinc-100 dark:border-zinc-850">
              <div className="flex items-start gap-2.5 p-4 bg-red-500/5 dark:bg-red-550/5 border border-red-500/10 rounded-2xl">
                <AlertTriangle className="w-4.5 h-4.5 text-red-550 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-semibold">
                  Authorized accounts obtain full root configuration permissions over blogs, enquiries, user guides, and billing. Share carefully.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Admin Accounts List Directory */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[#121517] border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-zinc-150 dark:border-zinc-850 flex justify-between items-center bg-zinc-50/50 dark:bg-[#101315]/20">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-500" />
                Authorized Workspace Admins
              </h3>
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-[#0c0e10] border border-zinc-200/70 dark:border-zinc-800/80 px-2.5 py-1 rounded-full">
                {admins.length} active editors
              </span>
            </div>
            
            <div className="divide-y divide-zinc-150 dark:divide-zinc-850">
              {loading ? (
                <div className="p-16 flex justify-center">
                  <Loader2 className="w-7 h-7 animate-spin text-red-500" />
                </div>
              ) : admins.length === 0 ? (
                <div className="p-16 text-center text-zinc-450 dark:text-zinc-500 font-semibold italic">No editors currently authorized inside the workspace.</div>
              ) : admins.map((admin) => {
                const role = getAdminRole(admin.email, user?.email);
                return (
                  <div key={admin.id} className="p-6 flex items-center justify-between group hover:bg-zinc-50/50 dark:hover:bg-[#101315]/10 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 bg-zinc-50 dark:bg-[#0c0e10] border border-zinc-150 dark:border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-450 dark:text-zinc-500 group-hover:bg-red-500/10 group-hover:text-red-500 transition-all">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-zinc-900 dark:text-zinc-50">{admin.email}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${role.style}`}>
                            {role.name}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-450 dark:text-zinc-500 font-semibold mt-1 flex items-center gap-1.5">
                          <Calendar size={11} className="opacity-70" />
                          Credential verified on {new Date(admin.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {user?.email !== admin.email && (
                      <button 
                        onClick={() => {
                          setDeletingAdmin(admin);
                          setConfirmEmail('');
                          setConfirmPassword('');
                        }}
                        className="p-2 text-zinc-400 hover:text-red-550 hover:bg-red-500/5 dark:hover:bg-red-500/10 rounded-xl transition-all"
                        title="Revoke Admin Access"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal with heavy backdrop-blur and security checks */}
      <AnimatePresence>
        {deletingAdmin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white dark:bg-[#121517] border border-zinc-200 dark:border-zinc-800 w-full max-w-md rounded-3xl p-8 shadow-2xl space-y-6"
            >
              <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7 text-red-500 animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">Revoke Authorization?</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-semibold">
                  You are about to revoke workspace access for <span className="text-red-500 font-extrabold">{deletingAdmin.email}</span>. To protect dashboard safety, verify their credentials below.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-550 mb-1.5">Verify Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input 
                      type="email"
                      value={confirmEmail}
                      onChange={e => setConfirmEmail(e.target.value)}
                      className="w-full bg-zinc-550/5 dark:bg-[#0c0e10] border border-zinc-200 dark:border-zinc-850 rounded-xl pl-9.5 pr-4 py-2.5 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-red-500/30 text-xs font-semibold"
                      placeholder="teammember@gmail.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-550 mb-1.5">Verify Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input 
                      type={showPass ? "text" : "password"}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full bg-zinc-550/5 dark:bg-[#0c0e10] border border-zinc-200 dark:border-zinc-850 rounded-xl pl-9.5 pr-10 py-2.5 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-red-500/30 text-xs font-semibold"
                      placeholder="Enter verification password"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button 
                    type="button"
                    onClick={async () => {
                      if (!deletingAdmin) return;
                      const toastId = toast.loading('Sending secure reset link...');
                      try {
                        const { error } = await supabase.auth.resetPasswordForEmail(deletingAdmin.email, {
                          redirectTo: `${window.location.origin}/reset-password`,
                        });
                        if (error) throw error;
                        toast.success('Access reset link sent successfully to ' + deletingAdmin.email, { id: toastId });
                      } catch (err: any) {
                        toast.error(err.message, { id: toastId });
                      }
                    }}
                    className="text-[9px] font-black uppercase tracking-widest text-red-500 hover:text-red-650"
                  >
                    Request Password Reset Link
                  </button>
                </div>

                <div className="flex gap-3 pt-3">
                  <button 
                    onClick={() => setDeletingAdmin(null)}
                    className="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold text-xs uppercase tracking-widest transition-all border border-zinc-200 dark:border-zinc-750"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDeleteAdmin}
                    disabled={isDeleting || !confirmEmail || !confirmPassword}
                    className="flex-1 py-3 bg-red-650 hover:bg-red-750 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-red-500/10"
                  >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Confirm Revoke
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
