import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { BlogManager } from '../components/admin/BlogManager';
import { FaqManager } from '../components/admin/FaqManager';
import { EnquiryManager } from '../components/admin/EnquiryManager';
import { PagesManager } from '../components/admin/PagesManager';
import { AdminManager } from '../components/admin/AdminManager';
import { 
  FileText, LayoutTemplate, LogOut, Settings, Globe, 
  HelpCircle, MessageSquare, Shield, Menu, X, Sun, Moon,
  ChevronRight, Sparkles, Inbox, Users, ArrowUpRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

type Tab = 'overview' | 'pages' | 'blogs' | 'faqs' | 'enquiries' | 'admins';

export const Dashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState<Tab>('overview');
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isAuthorized, setIsAuthorized] = React.useState<boolean | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isDark, setIsDark] = React.useState(document.documentElement.classList.contains('dark'));
  const [stats, setStats] = React.useState({ blogs: 0, faqs: 0, admins: 0, pages: 0 });

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  React.useEffect(() => {
    if (!user) {
      navigate('/login');
    } else {
      checkAdminStatus();
      fetchUnreadCount();
      fetchStats();
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

  const fetchStats = async () => {
    try {
      const [blogsRes, faqsRes, adminsRes, pagesRes] = await Promise.all([
        supabase.from('blogs').select('*', { count: 'exact', head: true }),
        supabase.from('faqs').select('*', { count: 'exact', head: true }),
        supabase.from('admin_users').select('*', { count: 'exact', head: true }),
        supabase.from('pages').select('*', { count: 'exact', head: true }),
      ]);
      setStats({
        blogs: blogsRes.count || 0,
        faqs: faqsRes.count || 0,
        admins: adminsRes.count || 0,
        pages: pagesRes.count || 0,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  React.useEffect(() => {
    fetchUnreadCount();
    fetchStats();
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

  const tabsConfig = [
    { id: 'overview', name: 'Overview', icon: <LayoutTemplate className="w-5 h-5" /> },
    { id: 'pages', name: 'Dynamic Pages', icon: <FileText className="w-5 h-5" /> },
    { id: 'blogs', name: 'Manage Blogs', icon: <FileText className="w-5 h-5" /> },
    { id: 'faqs', name: 'Manage FAQs', icon: <HelpCircle className="w-5 h-5" /> },
    { id: 'enquiries', name: 'User Enquiries', icon: <MessageSquare className="w-5 h-5" />, countKey: 'unread' },
    { id: 'admins', name: 'Manage Admins', icon: <Shield className="w-5 h-5" /> },
  ];

  const getBreadcrumbTitle = () => {
    const active = tabsConfig.find(t => t.id === activeTab);
    return active ? active.name : 'Dashboard';
  };

  const NavButtons = () => (
    <div className="space-y-1.5">
      {tabsConfig.map((tab) => {
        const isActive = activeTab === tab.id;
        const hasUnread = tab.countKey === 'unread' && unreadCount > 0;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 relative ${
              isActive 
                ? 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 font-bold border border-red-500/20 dark:border-red-500/30' 
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              {tab.icon}
              <span>{tab.name}</span>
            </div>
            {hasUnread && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                isActive 
                  ? 'bg-red-600 text-white' 
                  : 'bg-red-500 text-white animate-pulse'
              }`}>
                {unreadCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full bg-zinc-50 dark:bg-[#0c0e10] text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans">
      
      {/* Background Subtle Grid Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-[0.03] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] z-0" />

      {/* Mobile Top Header */}
      <div className="lg:hidden bg-white dark:bg-[#121517] border-b border-zinc-200/80 dark:border-zinc-800/80 p-4 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white font-black italic shadow-md shadow-red-600/20">
            P
          </div>
          <span className="font-extrabold text-lg tracking-tight italic">PDFSpark <span className="text-red-600 not-italic font-medium text-xs border border-red-500/30 px-1.5 py-0.5 rounded-md ml-1 bg-red-500/5">Admin</span></span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <div className={`fixed inset-y-0 left-0 lg:relative lg:translate-x-0 transform ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out z-40 w-72 bg-white dark:bg-[#111416] border-r border-zinc-200/85 dark:border-zinc-850/80 flex flex-col h-full shrink-0 shadow-xl lg:shadow-none`}>
        
        {/* Brand Logo & Meta */}
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/60 hidden lg:block">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center text-white font-black italic shadow-lg shadow-red-600/30">
                P
              </div>
              <div>
                <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight italic flex items-center gap-1">
                  PDFSpark
                </h2>
                <p className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase">Toolkit Control Center</p>
              </div>
            </div>
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 text-zinc-450 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 bg-zinc-100 dark:bg-zinc-800/40 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 rounded-xl transition-all"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Sidebar Nav Links */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          <div>
            <span className="px-3 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block mb-3">Workspace</span>
            <NavButtons />
          </div>
          
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
            <span className="px-3 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block mb-3">External</span>
            <Link to="/" className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-150 dark:hover:bg-zinc-800/60 rounded-xl transition-all duration-200">
              <Globe className="w-5 h-5 opacity-80" />
              View Website
              <ArrowUpRight className="w-4 h-4 ml-auto opacity-40 group-hover:opacity-100 transition-opacity" />
            </Link>
          </div>
        </div>

        {/* Sidebar Profile & SignOut */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-[#0e1112]/40">
          <div className="flex items-center gap-3 p-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-red-450 flex items-center justify-center text-white font-bold shadow-md shadow-red-500/10">
              {user.email?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">Administrator</p>
              <p className="text-[10px] text-zinc-455 dark:text-zinc-400 truncate font-medium">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-red-650 dark:text-zinc-550 dark:hover:text-red-400 hover:bg-red-500/5 dark:hover:bg-red-500/10 rounded-xl transition-all group"
          >
            <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Area Wrapper */}
      <div className="flex-1 flex flex-col h-full overflow-hidden z-10 relative">
        
        {/* Top bar header */}
        <div className="hidden lg:flex items-center justify-between px-8 py-5 bg-white dark:bg-[#111416] border-b border-zinc-200/80 dark:border-zinc-800/60 shrink-0">
          <div className="flex items-center gap-2.5 text-zinc-450 dark:text-zinc-500 text-sm font-semibold">
            <span>Admin Panel</span>
            <ChevronRight size={14} className="opacity-60" />
            <span className="text-zinc-900 dark:text-zinc-100 font-bold">{getBreadcrumbTitle()}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-6 w-px bg-zinc-250 dark:bg-zinc-800" />
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Logged in as</span>
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-200/50 dark:border-zinc-700/50">{user.email}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Inner Dashboard Page Wrapper */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-zinc-50/60 dark:bg-[#0c0e10]/80">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="max-w-6xl mx-auto space-y-8"
              >
                {/* Greeting banner */}
                <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-zinc-900 to-zinc-950 p-8 md:p-12 text-white shadow-2xl shadow-zinc-950/20 border border-zinc-800">
                  <div className="absolute inset-0 pointer-events-none opacity-30 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:16px_16px] z-0" />
                  <div className="relative z-10 space-y-4 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
                      <Sparkles size={14} className="animate-pulse" />
                      Toolkit Active & Protected
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none">Welcome back, Admin.</h1>
                    <p className="text-zinc-400 font-medium text-sm md:text-base leading-relaxed">
                      This command center gives you direct access to blogs, static pages, legal documents, FAQs, and contact queries. Keep content fresh and SEO-friendly.
                    </p>
                  </div>
                </div>

                {/* SaaS Metrics Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                  {[
                    { title: 'Articles', count: stats.blogs, color: 'from-blue-600 to-indigo-650', desc: 'Published blog posts' },
                    { title: 'Dynamic Pages', count: stats.pages, color: 'from-teal-600 to-emerald-650', desc: 'Legal and info policies' },
                    { title: 'Help FAQs', count: stats.faqs, color: 'from-purple-600 to-fuchsia-650', desc: 'Active support questions' },
                    { title: 'Unread Queries', count: unreadCount, color: 'from-rose-600 to-red-650', isAlert: unreadCount > 0, desc: 'Awaiting your response' }
                  ].map((card, i) => (
                    <div 
                      key={i}
                      className="bg-white dark:bg-[#121517] border border-zinc-200/80 dark:border-zinc-800/80 p-6 rounded-3xl relative overflow-hidden transition-all duration-350 hover:shadow-xl hover:shadow-zinc-300/10 dark:hover:shadow-black/20 group"
                    >
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-red-600 to-rose-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex flex-col justify-between h-full gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{card.title}</span>
                        <div className="flex items-baseline gap-2">
                          <span className={`text-4xl font-extrabold tracking-tight ${
                            card.isAlert ? 'text-red-500 animate-pulse' : 'text-zinc-900 dark:text-zinc-50'
                          }`}>{card.count}</span>
                        </div>
                        <p className="text-[10px] text-zinc-450 dark:text-zinc-400 font-medium">{card.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Dashboard Core Modules Grid */}
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight mb-5">Quick Management Panels</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { id: 'blogs', title: 'Blogs & CMS', desc: 'Write detailed articles, audit RankMath SEO metrics, edit headings, insert screenshots, and control tags.', icon: <FileText className="w-6 h-6 text-red-500" />, badge: `${stats.blogs} posts` },
                      { id: 'enquiries', title: 'CRM Inbox & Queries', desc: 'Process customer questions, send direct professional email replies, change statuses, and track active feedback.', icon: <Inbox className="w-6 h-6 text-emerald-500" />, badge: `${unreadCount} new`, badgeColor: 'bg-red-500/10 text-red-500' },
                      { id: 'faqs', title: 'Help & FAQs Hub', desc: 'Author detailed support guides, change page category index rules, toggle visibility, and keep customers informed.', icon: <HelpCircle className="w-6 h-6 text-purple-500" />, badge: `${stats.faqs} live` },
                      { id: 'admins', title: 'Admin Controls', desc: 'Invite external editors, manage team accounts, verify permissions, and reset credential profiles.', icon: <Users className="w-6 h-6 text-blue-500" />, badge: `${stats.admins} active` }
                    ].map((module) => (
                      <div 
                        key={module.id}
                        onClick={() => setActiveTab(module.id as Tab)}
                        className="bg-white dark:bg-[#121517] border border-zinc-200/80 dark:border-zinc-800/80 p-8 rounded-[2rem] hover:border-zinc-350 dark:hover:border-zinc-700/60 cursor-pointer group hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                      >
                        <div className="space-y-5">
                          <div className="flex items-center justify-between">
                            <div className="w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-850 flex items-center justify-center group-hover:scale-105 transition-transform">
                              {module.icon}
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border border-zinc-150 dark:border-zinc-800/80 ${
                              module.badgeColor || 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                            }`}>
                              {module.badge}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 group-hover:text-red-500 transition-colors">{module.title}</h3>
                            <p className="text-xs text-zinc-450 dark:text-zinc-400 leading-relaxed font-medium">{module.desc}</p>
                          </div>
                        </div>
                        <div className="w-full mt-6 py-3.5 bg-zinc-50 dark:bg-zinc-800/20 group-hover:bg-red-500/10 group-hover:text-red-500 dark:group-hover:bg-red-500/20 text-zinc-500 dark:text-zinc-400 border border-zinc-100 dark:border-zinc-800/40 rounded-2xl transition-all font-black uppercase tracking-widest text-[9px] text-center">
                          Launch Controller
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'blogs' && <BlogManager />}
            {activeTab === 'faqs' && <FaqManager />}
            {activeTab === 'enquiries' && <EnquiryManager />}
            {activeTab === 'pages' && <PagesManager />}
            {activeTab === 'admins' && <AdminManager />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
