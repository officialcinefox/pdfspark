import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { BlogManager } from '../components/admin/BlogManager';
import { FaqManager } from '../components/admin/FaqManager';
import { EnquiryManager } from '../components/admin/EnquiryManager';
import { PagesManager } from '../components/admin/PagesManager';
import { AdminManager } from '../components/admin/AdminManager';
import { FileText, LayoutTemplate, LogOut, Settings, Globe, HelpCircle, MessageSquare, ShieldAlert, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

type Tab = 'overview' | 'pages' | 'blogs' | 'faqs' | 'enquiries' | 'admins';

export const Dashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState<Tab>('overview');
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isAuthorized, setIsAuthorized] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    if (!user) {
      navigate('/login');
    } else {
      checkAdminStatus();
      fetchUnreadCount();
    }
  }, [user, navigate]);

  const checkAdminStatus = async () => {
    if (!user?.email) return;
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('email')
        .eq('email', user.email.toLowerCase())
        .single();
      
      if (error || !data) {
        setIsAuthorized(false);
        toast.error('Unauthorized access. Please contact the main administrator.');
        setTimeout(() => signOut().then(() => navigate('/login')), 3000);
      } else {
        setIsAuthorized(true);
      }
    } catch (err) {
      setIsAuthorized(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const { count, error } = await supabase
        .from('enquiries')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'new');
      
      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  // Refresh count when activeTab changes
  React.useEffect(() => {
    fetchUnreadCount();
  }, [activeTab]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Error logging out');
    }
  };

  if (!user || isAuthorized === null) return null;

  if (isAuthorized === false) {
    return (
      <div className="h-screen w-full bg-black flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mb-6 animate-pulse">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-3xl font-black text-white mb-4">Unauthorized Access</h1>
        <p className="text-zinc-400 max-w-md leading-relaxed">
          Your account does not have administrator privileges. You will be redirected to the login page shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-black overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-red-500" />
            Admin Panel
          </h2>
          <p className="text-xs text-zinc-400 mt-2 truncate">{user.email}</p>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="px-4 space-y-2">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg font-medium transition-colors ${activeTab === 'overview' ? 'bg-red-600/10 text-red-500' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
            >
              <LayoutTemplate className="w-4 h-4" />
              Overview
            </button>
            <button 
              onClick={() => setActiveTab('pages')}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg font-medium transition-colors ${activeTab === 'pages' ? 'bg-red-600/10 text-red-500' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
            >
              <FileText className="w-4 h-4" />
              Dynamic Pages
            </button>
            <button 
              onClick={() => setActiveTab('blogs')}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg font-medium transition-colors ${activeTab === 'blogs' ? 'bg-red-600/10 text-red-500' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
            >
              <FileText className="w-4 h-4" />
              Manage Blogs
            </button>
            <button 
              onClick={() => setActiveTab('faqs')}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg font-medium transition-colors ${activeTab === 'faqs' ? 'bg-red-600/10 text-red-500' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
            >
              <HelpCircle className="w-4 h-4" />
              Manage FAQs
            </button>
            <button 
              onClick={() => setActiveTab('enquiries')}
              className={`flex items-center justify-between w-full px-3 py-2 rounded-lg font-medium transition-colors ${activeTab === 'enquiries' ? 'bg-red-600/10 text-red-500' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4" />
                User Enquiries
              </div>
              {unreadCount > 0 && (
                <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full min-w-[1.25rem] text-center">
                  {unreadCount}
                </span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('admins')}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg font-medium transition-colors ${activeTab === 'admins' ? 'bg-red-600/10 text-red-500' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
            >
              <Shield className="w-4 h-4" />
              Manage Admins
            </button>
            
            <div className="pt-4 mt-4 border-t border-zinc-800">
              <Link to="/" className="flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg font-medium transition-colors">
                <Globe className="w-4 h-4" />
                View Website
              </Link>
            </div>
          </nav>
        </div>

        <div className="p-4 border-t border-zinc-800">
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full px-3 py-2 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-zinc-900/10 overflow-y-auto p-8">
        {activeTab === 'overview' && (
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-zinc-400 mb-8">Welcome back, Admin. Manage your website content from here.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div 
                onClick={() => setActiveTab('pages')}
                className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 p-8 rounded-2xl hover:border-red-500/50 transition-all group cursor-pointer"
              >
                <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Dynamic Pages</h3>
                <p className="text-zinc-400 mb-6">Manage your Privacy Policy, Terms, About Us, and other dynamic content directly from here.</p>
                <button className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors font-bold">
                  Manage Pages
                </button>
              </div>
              
              <div 
                onClick={() => setActiveTab('blogs')}
                className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 p-8 rounded-2xl hover:border-red-500/50 transition-all group cursor-pointer"
              >
                <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Blog Posts</h3>
                <p className="text-zinc-400 mb-6">Create, edit, and publish blog articles to improve your SEO and engage your users.</p>
                <button className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors font-bold">
                  Manage Blogs
                </button>
              </div>

              <div 
                onClick={() => setActiveTab('faqs')}
                className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 p-8 rounded-2xl hover:border-red-500/50 transition-all group cursor-pointer"
              >
                <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <HelpCircle className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Manage FAQs</h3>
                <p className="text-zinc-400 mb-6">Create and organize category-specific FAQs to help users find answers quickly.</p>
                <button className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors font-bold">
                  Manage FAQs
                </button>
              </div>

              <div 
                onClick={() => setActiveTab('enquiries')}
                className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 p-8 rounded-2xl hover:border-red-500/50 transition-all group cursor-pointer"
              >
                <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">User Enquiries</h3>
                <p className="text-zinc-400 mb-6">View and manage messages sent by users through the contact form.</p>
                <button className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors font-bold">
                  View Messages
                </button>
              </div>

              <div 
                onClick={() => setActiveTab('admins')}
                className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 p-8 rounded-2xl hover:border-red-500/50 transition-all group cursor-pointer"
              >
                <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Shield className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Admin Settings</h3>
                <p className="text-zinc-400 mb-6">Authorize new administrators and manage system access permissions.</p>
                <button className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors font-bold">
                  Manage Access
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'blogs' && <BlogManager />}
        {activeTab === 'faqs' && <FaqManager />}
        {activeTab === 'enquiries' && <EnquiryManager />}
        {activeTab === 'pages' && <PagesManager />}
        {activeTab === 'admins' && <AdminManager />}
      </div>
    </div>
  );
};
