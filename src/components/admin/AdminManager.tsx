import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { 
  Shield, UserPlus, Trash2, Loader2, 
  Key, Mail, AlertTriangle, ShieldCheck,
  User, CheckCircle2, Lock, Eye, EyeOff
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
}

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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Admin Management</h1>
        <p className="text-zinc-400">Control who has access to the PDF Spark Dashboard</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add New Admin */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 sticky top-8">
            <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mb-6">
              <UserPlus className="w-6 h-6 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Add New Admin</h2>
            <p className="text-sm text-zinc-500 mb-8">Type the email address of the person you want to grant admin access to.</p>
            
            <form onSubmit={handleAddAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input 
                    type="email"
                    required
                    value={newAdminEmail}
                    onChange={e => setNewAdminEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/30"
                    placeholder="name@gmail.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input 
                    type={showPass ? "text" : "password"}
                    required
                    value={newAdminPassword}
                    onChange={e => setNewAdminPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-12 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/30"
                    placeholder="Min. 6 characters"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input 
                    type={showPass ? "text" : "password"}
                    required
                    value={confirmNewAdminPassword}
                    onChange={e => setConfirmNewAdminPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/30"
                    placeholder="Repeat password"
                  />
                </div>
              </div>

              <button 
                disabled={isAdding || !newAdminEmail || !newAdminPassword}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
              >
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Authorize Admin
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-zinc-800">
              <div className="flex items-start gap-3 p-4 bg-red-500/5 rounded-xl border border-red-500/10">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-zinc-500 leading-relaxed italic">
                  Granting admin access allows the user to edit tools, blogs, FAQs, and manage enquiries. Be careful who you authorize.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Admin List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-500" />
                Authorized Admin Accounts
              </h3>
              <span className="text-xs font-bold text-zinc-500 bg-zinc-800 px-3 py-1 rounded-full">
                {admins.length} Total
              </span>
            </div>
            
            <div className="divide-y divide-zinc-800">
              {loading ? (
                <div className="p-12 flex justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                </div>
              ) : admins.length === 0 ? (
                <div className="p-12 text-center text-zinc-500 italic">No admins authorized yet.</div>
              ) : admins.map((admin) => (
                <div key={admin.id} className="p-6 flex items-center justify-between group hover:bg-zinc-800/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 group-hover:bg-red-500/10 group-hover:text-red-500 transition-all">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{admin.email}</span>
                        {user?.email === admin.email && (
                          <span className="text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        Authorized on {new Date(admin.created_at).toLocaleDateString()}
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
                      className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-2xl font-bold text-white text-center mb-2">Remove Admin?</h3>
            <p className="text-zinc-400 text-center mb-8">
              To delete <span className="text-white font-bold">{deletingAdmin.email}</span>, please verify their credentials below for security.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Confirm Admin Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input 
                    type="email"
                    value={confirmEmail}
                    onChange={e => setConfirmEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/30 text-sm"
                    placeholder="Enter email to confirm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Admin Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input 
                    type={showPass ? "text" : "password"}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-12 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/30 text-sm"
                    placeholder="Enter password"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button 
                  type="button"
                  onClick={async () => {
                    if (!deletingAdmin) return;
                    const toastId = toast.loading('Sending reset link...');
                    try {
                      const { error } = await supabase.auth.resetPasswordForEmail(deletingAdmin.email, {
                        redirectTo: `${window.location.origin}/reset-password`,
                      });
                      if (error) throw error;
                      toast.success('Reset link sent to ' + deletingAdmin.email, { id: toastId });
                    } catch (err: any) {
                      toast.error(err.message, { id: toastId });
                    }
                  }}
                  className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-400"
                >
                  Forgot Password?
                </button>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setDeletingAdmin(null)}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteAdmin}
                  disabled={isDeleting || !confirmEmail || !confirmPassword}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
