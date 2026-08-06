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
  ChevronRight, Sparkles, Inbox, Users, ArrowUpRight, ArrowRight
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
    { id: 'overview', name: 'Overview', icon: <LayoutTemplate className="w-4 h-4" /> },
    { id: 'pages', name: 'Dynamic Pages', icon: <FileText className="w-4 h-4" /> },
    { id: 'blogs', name: 'Manage Blogs', icon: <FileText className="w-4 h-4" /> },
    { id: 'faqs', name: 'Manage FAQs', icon: <HelpCircle className="w-4 h-4" /> },
    { id: 'enquiries', name: 'User Enquiries', icon: <MessageSquare className="w-4 h-4" />, countKey: 'unread' },
    { id: 'admins', name: 'Manage Admins', icon: <Shield className="w-4 h-4" /> },
  ];

  const getBreadcrumbTitle = () => {
    const active = tabsConfig.find(t => t.id === activeTab);
    return active ? active.name : 'Dashboard';
  };

  const NavButtons = () => (
    <div className="space-y-1">
      {tabsConfig.map((tab) => {
        const isActive = activeTab === tab.id;
        const hasUnread = tab.countKey === 'unread' && unreadCount > 0;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 relative ${
              isActive 
                ? 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 font-bold border border-red-500/20 dark:border-red-500/30' 
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
            }`}
          >
            <div className="flex items-center gap-2">
              {tab.icon}
              <span>{tab.name}</span>
            </div>
            {hasUnread && (
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold ${
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
    <div className="admin-dashboard-root flex flex-col lg:flex-row h-screen w-full bg-zinc-50 dark:bg-[#0c0e10] text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans">
      
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
      } transition-transform duration-300 ease-in-out z-40 w-64 bg-white dark:bg-[#111416] border-r border-zinc-200/85 dark:border-zinc-850/80 flex flex-col h-full shrink-0 shadow-xl lg:shadow-none`}>
        
        {/* Brand Logo & Meta */}
        <div className="p-3 py-3.5 border-b border-zinc-100 dark:border-zinc-800/60 hidden lg:block">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-red-650 rounded-lg flex items-center justify-center text-white font-black italic shadow-lg shadow-red-655/30 text-xs">
                P
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight italic flex items-center gap-1">
                  PDFSpark
                </h2>
                <p className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase">Toolkit Control Center</p>
              </div>
            </div>
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-1.5 text-zinc-450 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 bg-zinc-100 dark:bg-zinc-800/40 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 rounded-lg transition-all"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Sidebar Nav Links */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3">
          <div>
            <span className="px-2 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block mb-2">Workspace</span>
            <NavButtons />
          </div>
          
          <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800/60">
            <span className="px-2 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block mb-2">External</span>
            <Link to="/" className="flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 rounded-xl transition-all duration-200">
              <Globe className="w-4 h-4 opacity-80" />
              View Website
              <ArrowUpRight className="w-3.5 h-3.5 ml-auto opacity-40 group-hover:opacity-100 transition-opacity" />
            </Link>
          </div>
        </div>

        {/* Sidebar Profile & SignOut */}
        <div className="p-3 border-t border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-[#0e1112]/40">
          <div className="flex items-center gap-2.5 p-0.5 mb-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-650 to-red-500 flex items-center justify-center text-white font-bold shadow-md shadow-red-500/10 text-xs">
              {user.email?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate leading-tight">Administrator</p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate font-semibold leading-none mt-0.5">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-red-650 dark:text-zinc-400 dark:hover:text-red-400 hover:bg-red-500/5 dark:hover:bg-red-500/10 rounded-xl transition-all group"
          >
            <LogOut className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Area Wrapper */}
      <div className="flex-1 flex flex-col h-full overflow-hidden z-10 relative">
        
        {/* Top bar header */}
        <div className="hidden lg:flex items-center justify-between px-4 py-3.5 bg-white dark:bg-[#111416] border-b border-zinc-200/80 dark:border-zinc-800/60 shrink-0">
          <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
            <span>Admin Panel</span>
            <ChevronRight size={12} className="opacity-60" />
            <span className="text-zinc-900 dark:text-zinc-100 font-bold">{getBreadcrumbTitle()}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Logged in as</span>
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700">{user.email}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Inner Dashboard Page Wrapper */}
        <div className="flex-1 overflow-y-auto p-2.5 md:p-3 bg-zinc-50/60 dark:bg-[#0c0e10]/80">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="max-w-[1400px] mx-auto space-y-5"
              >
                {/* Greeting banner */}
                <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#111416] p-3.5 md:p-5 text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-200 dark:border-zinc-800/65 transition-all duration-300">
                  <div className="absolute inset-0 pointer-events-none opacity-25 dark:opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:16px_16px] z-0" />
                  {/* Premium red glow corner accent */}
                  <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-red-500/5 dark:bg-red-500/10 blur-[100px] pointer-events-none z-0" />
                  <div className="relative z-10 space-y-2 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 dark:bg-red-500/15 border border-red-500/20 text-[#E50914] dark:text-red-400 text-xs font-bold w-fit">
                      <Sparkles size={13} className="animate-pulse" />
                      Toolkit Active & Protected
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight text-zinc-900 dark:text-zinc-50">Welcome back, Admin.</h1>
                    <p className="text-zinc-600 dark:text-zinc-400 font-semibold text-xs md:text-sm leading-relaxed">
                      This command center gives you direct access to blogs, static pages, legal documents, FAQs, and contact queries. Keep content fresh and SEO-friendly.
                    </p>
                  </div>
                </div>

                {/* SaaS Metrics Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 md:gap-4.5">
                  {[
                    { title: 'Articles', count: stats.blogs, icon: <FileText className="w-4.5 h-4.5" />, color: 'blue', desc: 'Published blog posts' },
                    { title: 'Dynamic Pages', count: stats.pages, icon: <Globe className="w-4.5 h-4.5" />, color: 'emerald', desc: 'Legal and info policies' },
                    { title: 'Help FAQs', count: stats.faqs, icon: <HelpCircle className="w-4.5 h-4.5" />, color: 'purple', desc: 'Active support questions' },
                    { title: 'Unread Queries', count: unreadCount, icon: <MessageSquare className="w-4.5 h-4.5" />, color: 'red', isAlert: unreadCount > 0, desc: 'Awaiting your response' }
                  ].map((card, i) => {
                    const borderColors = {
                      blue: 'border-l-blue-500/80 border-zinc-200 dark:border-zinc-800/80 hover:border-blue-500/40',
                      emerald: 'border-l-emerald-500/80 border-zinc-200 dark:border-zinc-800/80 hover:border-emerald-500/40',
                      purple: 'border-l-purple-500/80 border-zinc-200 dark:border-zinc-800/80 hover:border-purple-500/40',
                      red: 'border-l-red-500/80 border-zinc-200 dark:border-zinc-800/80 hover:border-red-500/40'
                    };
                    const bgGradients = {
                      blue: 'hover:bg-gradient-to-br hover:from-blue-500/5 hover:to-indigo-500/0',
                      emerald: 'hover:bg-gradient-to-br hover:from-emerald-500/5 hover:to-teal-500/0',
                      purple: 'hover:bg-gradient-to-br hover:from-purple-500/5 hover:to-fuchsia-500/0',
                      red: 'hover:bg-gradient-to-br hover:from-red-500/5 hover:to-rose-500/0'
                    };
                    const iconStyles = {
                      blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
                      emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                      purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
                      red: 'bg-red-500/10 text-red-600 dark:text-red-400'
                    };
                    
                    return (
                      <div 
                        key={i}
                        className={`bg-white dark:bg-[#121517] border-l-4 border ${borderColors[card.color as keyof typeof borderColors]} ${bgGradients[card.color as keyof typeof bgGradients]} p-4 md:p-5 rounded-2xl relative overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group flex flex-col justify-between`}
                      >
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{card.title}</span>
                          <div className={`p-2 rounded-xl ${iconStyles[card.color as keyof typeof iconStyles]}`}>
                            {card.icon}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className={`text-3xl font-black tracking-tight leading-none ${
                            card.isAlert ? 'text-red-500 animate-pulse' : 'text-zinc-900 dark:text-zinc-50'
                          }`}>{card.count}</span>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold mt-1">{card.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Dashboard Core Modules Grid */}
                <div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3.5 flex items-center gap-1.5">Quick Management Panels</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {[
                      { id: 'blogs', title: 'Blogs & CMS', desc: 'Write detailed articles, configure SEO values, edit content headings, upload illustrations, and manage publishing.', icon: <FileText className="w-4.5 h-4.5 text-red-500" />, badge: `${stats.blogs} posts` },
                      { id: 'enquiries', title: 'CRM Inbox & Queries', desc: 'Review contact inquiries, send direct professional email replies, toggle reading status, and handle feedback.', icon: <Inbox className="w-4.5 h-4.5 text-emerald-500" />, badge: `${unreadCount} new`, badgeColor: 'bg-red-500/10 text-red-500 border border-red-500/20' },
                      { id: 'faqs', title: 'Help & FAQs Hub', desc: 'Author detailed support guides, group by specific categories, toggle visibility, and update FAQs.', icon: <HelpCircle className="w-4.5 h-4.5 text-purple-500" />, badge: `${stats.faqs} live` },
                      { id: 'admins', title: 'Admin Controls', desc: 'Invite external editors, manage backend roles, inspect credential details, and keep control safe.', icon: <Users className="w-4.5 h-4.5 text-blue-500" />, badge: `${stats.admins} active` }
                    ].map((module) => (
                      <div 
                        key={module.id}
                        onClick={() => setActiveTab(module.id as Tab)}
                        className="bg-white dark:bg-[#121517] border border-zinc-200/80 dark:border-zinc-800/80 p-5 rounded-2xl hover:border-red-500/35 dark:hover:border-red-500/35 cursor-pointer group hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                      >
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="w-9 h-9 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/80 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                              {module.icon}
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border border-zinc-150 dark:border-zinc-800/80 ${
                              module.badgeColor || 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                            }`}>
                              {module.badge}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-base font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 group-hover:text-red-650 transition-colors">{module.title}</h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-semibold">{module.desc}</p>
                          </div>
                        </div>
                        <div className="w-full mt-5 py-2.5 flex items-center justify-center gap-1 bg-zinc-50 dark:bg-zinc-800/20 group-hover:bg-red-650 group-hover:text-white dark:group-hover:bg-red-650 text-zinc-500 dark:text-zinc-405 border border-zinc-100 dark:border-zinc-800/40 rounded-xl transition-all duration-300 font-extrabold uppercase tracking-widest text-[10px] text-center">
                          <span>Launch Controller</span>
                          <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
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
