import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { BlogManager } from '../components/admin/BlogManager';
import { FaqManager } from '../components/admin/FaqManager';
import { EnquiryManager } from '../components/admin/EnquiryManager';
import { PagesManager } from '../components/admin/PagesManager';
import { AdminManager } from '../components/admin/AdminManager';
import { FileText, LayoutTemplate, LogOut, Settings, Globe, HelpCircle, MessageSquare, Shield, Menu, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

type Tab = 'overview' | 'pages' | 'blogs' | 'faqs' | 'enquiries' | 'admins';

export const Dashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState<Tab>('overview');
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isAuthorized, setIsAuthorized] = React.useState<boolean | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

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
        toast.error('Unauthorized access.');
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

  React.useEffect(() => {
    fetchUnreadCount();
    setIsMobileMenuOpen(false);
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

  const NavButtons = () => (
    <>
      <button 
        onClick={() => setActiveTab('overview')}
        className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'overview' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
      >
        <LayoutTemplate className="w-5 h-5" />
        Overview
      </button>
      <button 
        onClick={() => setActiveTab('pages')}
        className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'pages' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
      >
        <FileText className="w-5 h-5" />
        Dynamic Pages
      </button>
      <button 
        onClick={() => setActiveTab('blogs')}
        className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'blogs' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
      >
        <FileText className="w-5 h-5" />
        Manage Blogs
      </button>
      <button 
        onClick={() => setActiveTab('faqs')}
        className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'faqs' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
      >
        <HelpCircle className="w-5 h-5" />
        Manage FAQs
      </button>
      <button 
        onClick={() => setActiveTab('enquiries')}
        className={`flex items-center justify-between w-full px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'enquiries' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
      >
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5" />
          User Enquiries
        </div>
        {unreadCount > 0 && (
          <span className={activeTab === 'enquiries' ? 'bg-white text-red-600 px-2 py-0.5 rounded-full text-[10px] font-black' : 'bg-red-600 text-white px-2 py-0.5 rounded-full text-[10px] font-black'}>
            {unreadCount}
          </span>
        )}
      </button>
      <button 
        onClick={() => setActiveTab('admins')}
        className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'admins' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
      >
        <Shield className="w-5 h-5" />
        Manage Admins
      </button>
    </>
  );

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full bg-black overflow-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden bg-zinc-950 border-b border-zinc-800 p-4 flex items-center justify-between">
        <h2 className="text-xl font-black text-white flex items-center gap-2 italic">
          <Settings className="w-5 h-5 text-red-600" />
          ADMIN
        </h2>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-zinc-400 hover:text-white"
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar (Desktop) */}
      <div className={`fixed inset-0 z-50 lg:relative lg:z-auto bg-zinc-950 border-r border-zinc-800 flex flex-col w-72 transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-8 border-b border-zinc-900 hidden lg:block">
          <h2 className="text-2xl font-black text-white flex items-center gap-3 italic">
            <Settings className="w-7 h-7 text-red-600" />
            SPARK ADMIN
          </h2>
          <p className="text-[10px] text-zinc-500 mt-4 font-black uppercase tracking-widest truncate">{user.email}</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-2">
          <NavButtons />
          <div className="pt-6 mt-6 border-t border-zinc-900">
            <Link to="/" className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl font-bold transition-all">
              <Globe className="w-5 h-5" />
              View Website
            </Link>
          </div>
        </div>

        <div className="p-6 border-t border-zinc-900">
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-4 py-4 text-zinc-500 hover:text-white hover:bg-red-600 rounded-2xl font-black uppercase tracking-widest text-xs transition-all group"
          >
            <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-[var(--background)] overflow-y-auto p-4 md:p-10">
        {activeTab === 'overview' && (
          <div className="max-w-5xl mx-auto py-6">
            <div className="mb-12">
              <h1 className="text-4xl md:text-6xl font-black text-[var(--foreground)] mb-4 tracking-tight">System Overview</h1>
              <p className="text-[var(--foreground)] opacity-50 text-lg font-medium">Command center for your PDF Spark environment.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {[
                { id: 'pages', title: 'Dynamic Pages', desc: 'Edit policy pages and static content.', icon: <FileText className="w-7 h-7" /> },
                { id: 'blogs', title: 'Blog Posts', desc: 'Author and publish new articles.', icon: <FileText className="w-7 h-7" /> },
                { id: 'faqs', title: 'User FAQs', desc: 'Manage help and support questions.', icon: <HelpCircle className="w-7 h-7" /> },
                { id: 'enquiries', title: 'Messages', desc: 'Review user contact requests.', icon: <MessageSquare className="w-7 h-7" /> },
              ].map((item) => (
                <div 
                  key={item.id}
                  onClick={() => setActiveTab(item.id as Tab)}
                  className="bg-[var(--surface)] border border-[var(--border)] p-8 rounded-[2rem] hover:border-[var(--accent)] transition-all group cursor-pointer shadow-sm hover:shadow-xl hover:shadow-[var(--accent)]/5"
                >
                  <div className="w-14 h-14 bg-[var(--accent)]/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <div className="text-[var(--accent)]">{item.icon}</div>
                  </div>
                  <h3 className="text-2xl font-black text-[var(--foreground)] mb-3">{item.title}</h3>
                  <p className="text-[var(--foreground)] opacity-50 mb-8 font-medium leading-relaxed">{item.desc}</p>
                  <div className="w-full py-4 bg-[var(--background)] border border-[var(--border)] group-hover:bg-[var(--accent)] group-hover:text-white rounded-2xl transition-all font-black uppercase tracking-widest text-[10px] text-center">
                    Launch Manager
                  </div>
                </div>
              ))}
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
