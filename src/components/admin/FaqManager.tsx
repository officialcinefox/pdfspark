import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Plus, Search, Edit2, Trash2, Save, X, 
  ChevronLeft, Loader2, CheckCircle2, Settings,
  HelpCircle, Sparkles, Filter, ChevronRight, Info, Eye, ArrowUp, ArrowDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  category_list: string[];
  is_published: boolean;
  order_index: number;
  created_at: string;
}

const getCategoryStyles = (category: string) => {
  const mapping: { [key: string]: string } = {
    'General': 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400 border dark:border-blue-500/30',
    'PDF Management': 'bg-red-500/10 text-red-650 border-red-500/20 dark:bg-red-500/20 dark:text-red-400 border dark:border-red-500/30',
    'Conversion Tools': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400 border dark:border-emerald-500/30',
    'Security Tools': 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400 border dark:border-amber-500/30',
    'Editing Tools': 'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-400 border dark:border-purple-500/30',
    'Guide': 'bg-pink-500/10 text-pink-600 border-pink-500/20 dark:bg-pink-500/20 dark:text-pink-400 border dark:border-pink-500/30',
    'About Us': 'bg-teal-500/10 text-teal-600 border-teal-500/20 dark:bg-teal-500/20 dark:text-teal-400 border dark:border-teal-500/30',
    'Contact Us': 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:bg-indigo-500/20 dark:text-indigo-400 border dark:border-indigo-500/30',
    'Productivity': 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20 dark:bg-cyan-500/20 dark:text-cyan-400 border dark:border-cyan-500/30',
    'Pricing': 'bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20 dark:bg-fuchsia-500/20 dark:text-fuchsia-400 border dark:border-fuchsia-500/30'
  };
  return mapping[category] || 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20 dark:bg-zinc-500/20 dark:text-zinc-400 border dark:border-zinc-800';
};

export const FaqManager: React.FC = () => {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentFaq, setCurrentFaq] = useState<Partial<FAQ> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('All');

  const categories = [
    'General',
    'PDF Management',
    'Conversion Tools',
    'Security Tools',
    'Editing Tools',
    'Guide',
    'About Us',
    'Contact Us',
    'Productivity',
    'Pricing'
  ];

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) throw error;
      setFaqs(data || []);
    } catch (error: any) {
      toast.error('Error fetching FAQs: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    const activeCat = activeTab === 'All' ? 'General' : activeTab;
    setCurrentFaq({
      question: '',
      answer: '',
      category: activeCat,
      category_list: [activeCat],
      is_published: true,
      order_index: faqs.filter(f => f.category_list?.includes(activeCat)).length + 1
    });
    setIsEditing(true);
  };

  const handleEdit = (faq: FAQ) => {
    setCurrentFaq({
      ...faq,
      category_list: faq.category_list || [faq.category].filter(Boolean)
    });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    const toastId = toast.loading('Deleting FAQ...');
    try {
      const { error } = await supabase.from('faqs').delete().eq('id', id);
      if (error) throw error;
      toast.success('FAQ deleted successfully', { id: toastId });
      setDeletingId(null);
      fetchFaqs();
    } catch (error: any) {
      toast.error('Delete failed: ' + error.message, { id: toastId });
    }
  };

  const handleSave = async () => {
    if (!currentFaq?.question?.trim() || !currentFaq?.answer?.trim()) {
      toast.error('Question and Answer are required');
      return;
    }

    try {
      const { id, created_at, ...faqData } = {
        ...currentFaq,
        updated_at: new Date().toISOString(),
      } as any;

      let error;
      if (id) {
        ({ error } = await supabase.from('faqs').update(faqData).eq('id', id));
      } else {
        ({ error } = await supabase.from('faqs').insert([faqData]));
      }

      if (error) throw error;

      toast.success('FAQ saved successfully');
      setIsEditing(false);
      setCurrentFaq(null);
      fetchFaqs();
    } catch (error: any) {
      toast.error('Error saving FAQ: ' + error.message);
    }
  };

  const changeOrder = async (faq: FAQ, direction: 'up' | 'down') => {
    const targetIndex = faqs.indexOf(faq);
    if (direction === 'up' && targetIndex === 0) return;
    if (direction === 'down' && targetIndex === faqs.length - 1) return;

    const swapFaq = faqs[direction === 'up' ? targetIndex - 1 : targetIndex + 1];
    const originalOrder = faq.order_index;
    const newOrder = swapFaq.order_index === originalOrder 
      ? (direction === 'up' ? originalOrder - 1 : originalOrder + 1)
      : swapFaq.order_index;

    try {
      const toastId = toast.loading('Reordering indices...');
      const { error: err1 } = await supabase
        .from('faqs')
        .update({ order_index: newOrder })
        .eq('id', faq.id);
      
      const { error: err2 } = await supabase
        .from('faqs')
        .update({ order_index: originalOrder })
        .eq('id', swapFaq.id);

      if (err1 || err2) throw new Error('Database reorder failed');
      toast.success('Display rank updated', { id: toastId });
      fetchFaqs();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'All' || faq.category_list?.includes(activeTab);
    return matchesSearch && matchesTab;
  });

  const getCategoryCount = (cat: string) => {
    if (cat === 'All') return faqs.length;
    return faqs.filter(f => f.category_list?.includes(cat)).length;
  };

  if (isEditing) {
    return (
      <div className="max-w-6xl mx-auto pb-20 animate-in fade-in duration-300">
        
        {/* Editor Sub-Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-5 mb-8">
          <div>
            <button 
              onClick={() => { setIsEditing(false); setCurrentFaq(null); }}
              className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors font-bold text-xs uppercase tracking-widest mb-1 group"
            >
              <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" /> Back to Directory
            </button>
            <h1 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-zinc-55 tracking-tight leading-none flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-red-500 animate-pulse" />
              {currentFaq?.id ? 'Edit Help FAQ' : 'Compose Support FAQ'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setIsEditing(false); setCurrentFaq(null); }}
              className="px-3 py-1.5 bg-white hover:bg-zinc-100 dark:bg-zinc-800/40 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-700/65 text-zinc-600 dark:text-zinc-300 rounded-lg font-bold text-xs transition-all"
            >
              Discard
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-red-650 hover:bg-red-700 text-white rounded-lg font-bold text-xs transition-all shadow-md shadow-red-500/10"
            >
              <Save size={12} /> Save FAQ Post
            </button>
          </div>
        </div>

        {/* 2/3 and 1/3 Split Column Visual CMS Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Area: Rich Fields Editor */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-[#121517] border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm space-y-5">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">FAQ Content</span>
              
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-350 mb-1.5">Question Title</label>
                <input 
                  type="text" 
                  value={currentFaq?.question}
                  onChange={(e) => setCurrentFaq({ ...currentFaq, question: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-[#0c0e10] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-55 focus:outline-none focus:ring-2 focus:ring-red-500/30 text-xs font-bold placeholder-zinc-400"
                  placeholder="How do I merge multiple PDF files?"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-350 mb-1.5">Detailed Answer</label>
                <textarea 
                  value={currentFaq?.answer}
                  onChange={(e) => setCurrentFaq({ ...currentFaq, answer: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-[#0c0e10] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-55 focus:outline-none focus:ring-2 focus:ring-red-500/30 min-h-[160px] text-xs leading-relaxed placeholder-zinc-400 font-medium"
                  placeholder="To merge PDF files, simply upload your files to the 'Merge PDF' tool. You can reorder the pages visually, and then click 'Merge PDF' to download your combined document instantly."
                />
              </div>
            </div>

            {/* Quick Preview Card */}
            <div className="bg-zinc-50 dark:bg-[#121517]/30 border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 space-y-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Website accordion live preview</span>
              <div className="bg-white dark:bg-[#121517] border border-zinc-150 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs">
                <div className="flex items-start justify-between gap-4">
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">{currentFaq?.question || 'Empty Question Title...'}</h4>
                  <div className="w-5 h-5 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center font-extrabold text-xs shrink-0">+</div>
                </div>
                {currentFaq?.answer && (
                  <p className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                    {currentFaq.answer}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Area: Status & Config panels */}
          <div className="space-y-6">
            
            {/* Action Settings Panel */}
            <div className="bg-white dark:bg-[#121517] border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm space-y-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-555 flex items-center gap-1.5 pb-3 border-b border-zinc-100 dark:border-zinc-850">
                <Settings size={14} className="text-red-500" />
                Index Configurations
              </h3>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-350 mb-1.5">Category Directory Mapping</label>
                  <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto p-1.5 bg-zinc-50 dark:bg-[#0c0e10] rounded-lg border border-zinc-200/60 dark:border-zinc-800/80">
                    {categories.map((cat) => (
                      <label key={cat} className="flex items-center gap-2 px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded cursor-pointer transition-all">
                        <input 
                          type="checkbox"
                          checked={currentFaq?.category_list?.includes(cat)}
                          onChange={(e) => {
                            const currentList = currentFaq?.category_list || [];
                            const newList = e.target.checked 
                              ? [...currentList, cat]
                              : currentList.filter(c => c !== cat);
                            setCurrentFaq({ 
                              ...currentFaq, 
                              category_list: newList, 
                              category: newList[0] || categories[0] 
                            });
                          }}
                          className="w-3.5 h-3.5 rounded bg-white dark:bg-[#0c0e10] border-zinc-300 dark:border-zinc-700 text-red-650 focus:ring-red-500"
                        />
                        <span className="text-[11px] text-zinc-650 dark:text-zinc-300 font-bold">{cat === 'General' ? 'General (Home)' : cat}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-350 mb-1">Display Rank (Order)</label>
                  <input 
                    type="number" 
                    value={currentFaq?.order_index}
                    onChange={(e) => setCurrentFaq({ ...currentFaq, order_index: parseInt(e.target.value) || 0 })}
                    className="w-full bg-zinc-50 dark:bg-[#0c0e10] border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                  />
                  <p className="text-[9px] text-zinc-400 font-medium mt-0.5">Lighter priorities display higher on accordion lists.</p>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-[#0c0e10] rounded-lg border border-zinc-200/60 dark:border-zinc-800/80">
                  <div>
                    <label className="text-xs font-bold text-zinc-750 dark:text-zinc-300">Live Visibility</label>
                    <p className="text-[9px] text-zinc-400 mt-0.5">Toggle display on website</p>
                  </div>
                  <button
                    onClick={() => setCurrentFaq({ ...currentFaq, is_published: !currentFaq?.is_published })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all focus:outline-none shrink-0 ${
                      currentFaq?.is_published 
                        ? 'bg-red-600 shadow-md shadow-red-500/10' 
                        : 'bg-zinc-200 dark:bg-zinc-800'
                    }`}
                  >
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${currentFaq?.is_published ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Publishing Guidelines tip card */}
            <div className="bg-red-500/5 border border-red-500/10 dark:border-red-500/20 rounded-3xl p-5 space-y-2">
              <h4 className="text-xs font-black text-red-555 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                <Info size={14} />
                Indexing Guidelines
              </h4>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-semibold">
                Link support queries to multiple page directories (e.g. general, pricing, and pdf tools) by mapping multiple filters in the list. This expands visibility globally.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      
      {/* FAQ Head */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight leading-tight">Help FAQ Directory</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Configure user guides, tool support cards, pricing clarifications, and help center topics.</p>
        </div>
        <button 
          onClick={handleCreateNew}
          className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-red-650 hover:bg-red-700 text-white rounded-lg font-bold text-xs transition-all shadow-md shadow-red-500/10"
        >
          <Plus size={14} /> Add FAQ Guide
        </button>
      </div>

      {/* Modern Filter Category Tabs with Dynamic BADGE counts */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-[#111416]/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl overflow-x-auto no-scrollbar scroll-smooth">
        {['All', ...categories].map((tab) => {
          const isActive = activeTab === tab;
          const count = getCategoryCount(tab);
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 flex-none px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all ${
                isActive 
                  ? 'bg-white dark:bg-[#121517] text-red-650 dark:text-red-400 shadow-sm border border-zinc-200/50 dark:border-zinc-800' 
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-white/40 dark:hover:bg-zinc-800/20'
              }`}
            >
              <span>{tab === 'General' ? 'Home / General' : tab}</span>
              <span className={`px-1 py-0.2 rounded text-[8px] font-black ${
                isActive 
                  ? 'bg-red-500/10 text-red-655 dark:bg-red-500/20 dark:text-red-400' 
                  : 'bg-zinc-200/60 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-500'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Glowing Search Bar matching Blogs */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-3.5 h-3.5" />
        <input 
          type="text" 
          placeholder={`Search key query points or articles in ${activeTab === 'All' ? 'all' : activeTab}...`} 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white dark:bg-[#121517] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl pl-8.5 pr-3.5 py-2 text-xs text-zinc-900 dark:text-zinc-50 focus:outline-none"
        />
      </div>

      {/* Directory Table Grid container */}
      <div className="overflow-x-auto rounded-xl border border-zinc-150 dark:border-zinc-850 bg-white dark:bg-[#121517]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50/70 dark:bg-[#101315]/40 border-b border-zinc-150 dark:border-zinc-855">
              <th className="px-3.5 py-2 text-[9px] font-black text-zinc-450 dark:text-zinc-500 uppercase tracking-widest w-12">Rank</th>
              <th className="px-3.5 py-2 text-[9px] font-black text-zinc-450 dark:text-zinc-500 uppercase tracking-widest">Question Summary</th>
              <th className="px-3.5 py-2 text-[9px] font-black text-zinc-450 dark:text-zinc-500 uppercase tracking-widest">Linked Directories</th>
              <th className="px-3.5 py-2 text-[9px] font-black text-zinc-450 dark:text-zinc-500 uppercase tracking-widest w-24">Status</th>
              <th className="px-3.5 py-2 text-[9px] font-black text-zinc-450 dark:text-zinc-500 uppercase tracking-widest text-right w-28">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-150 dark:divide-zinc-855 text-xs">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3.5 py-8 text-center text-zinc-550 dark:text-zinc-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-1.5 text-red-500" />
                  Accessing FAQ databases...
                </td>
              </tr>
            ) : filteredFaqs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3.5 py-12 text-center text-zinc-450 dark:text-zinc-500 font-semibold italic">
                  No support guides compiled inside this category.
                </td>
              </tr>
            ) : filteredFaqs.map((faq, idx) => (
              <tr key={faq.id} className="hover:bg-zinc-50/50 dark:hover:bg-[#101315]/20 transition-colors group">
                <td className="px-3.5 py-2 w-12">
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-[11px] font-bold text-zinc-500 dark:text-zinc-400">{faq.order_index}</span>
                    <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => changeOrder(faq, 'up')}
                        disabled={idx === 0}
                        className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 disabled:opacity-20"
                        title="Move Up"
                      >
                        <ArrowUp size={8} />
                      </button>
                      <button 
                        onClick={() => changeOrder(faq, 'down')}
                        disabled={idx === filteredFaqs.length - 1}
                        className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 disabled:opacity-20"
                        title="Move Down"
                      >
                        <ArrowDown size={8} />
                      </button>
                    </div>
                  </div>
                </td>
                <td className="px-3.5 py-2 max-w-sm">
                  <div className="flex items-start gap-2">
                    <div className="p-1.5 bg-red-500/10 dark:bg-red-550/15 rounded-lg text-red-500 dark:text-red-400 shrink-0">
                      <HelpCircle size={13} />
                    </div>
                    <div className="space-y-0.5">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-1">{faq.question}</div>
                      <p className="text-[10px] text-zinc-450 dark:text-zinc-500 line-clamp-1">{faq.answer}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3.5 py-2">
                  <div className="flex flex-wrap gap-0.5">
                    {(faq.category_list || [faq.category]).filter(Boolean).map((cat, i) => (
                      <span key={i} className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider ${getCategoryStyles(cat)}`}>
                        {cat === 'General' ? 'Home' : cat}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3.5 py-2 w-24">
                  {faq.is_published ? (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-450 text-[9px] font-extrabold uppercase tracking-wide">
                      <CheckCircle2 size={10} /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-550 dark:bg-zinc-800 dark:text-zinc-400 text-[9px] font-extrabold uppercase tracking-wide">
                      <Eye size={10} className="opacity-80" /> Private
                    </span>
                  )}
                </td>
                <td className="px-3.5 py-2 text-right w-28">
                  <div className="flex items-center justify-end gap-0.5" onClick={e => e.stopPropagation()}>
                    {deletingId === faq.id ? (
                      <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-200">
                        <button 
                          onClick={() => handleDelete(faq.id)}
                          className="px-2 py-1 bg-red-650 text-white text-[9px] font-bold rounded hover:bg-red-750 shadow-md shadow-red-650/10"
                        >
                          Delete
                        </button>
                        <button 
                          onClick={() => setDeletingId(null)}
                          className="px-2 py-1 bg-zinc-150 text-zinc-650 dark:bg-zinc-800 dark:text-zinc-300 text-[9px] font-bold rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={() => handleEdit(faq)}
                          className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/40 rounded-lg transition-all"
                          title="Edit Support Guide"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button 
                          onClick={() => setDeletingId(faq.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all"
                          title="Delete FAQ"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

