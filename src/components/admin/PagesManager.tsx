import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  FileText, Search, Edit3, ChevronRight, ArrowLeft, Save, Loader2,
  Globe, Eye, Sparkles, AlertCircle, Info, Calendar, Layout, ArrowUpRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

interface Page {
  id: string;
  title: string;
  slug: string;
  content: string;
  updated_at: string;
}

export const PagesManager: React.FC = () => {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .order('title', { ascending: true });

      if (error) throw error;
      setPages(data || []);
    } catch (error: any) {
      toast.error('Error fetching pages: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingPage) return;
    if (!editingPage.title.trim() || !editingPage.slug.trim()) {
      toast.error('Page Title and Slug are required');
      return;
    }
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('pages')
        .update({
          title: editingPage.title.trim(),
          slug: editingPage.slug.trim().toLowerCase().replace(/\s+/g, '-'),
          content: editingPage.content,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingPage.id);

      if (error) throw error;
      
      toast.success('Page updated successfully');
      setEditingPage(null);
      fetchPages();
    } catch (error: any) {
      toast.error('Save failed: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredPages = pages.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (editingPage) {
    return (
      <div className="max-w-6xl mx-auto pb-20 animate-in fade-in duration-300">
        
        {/* Sub-Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-5 mb-8">
          <div>
            <button 
              onClick={() => setEditingPage(null)}
              className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors font-bold text-xs uppercase tracking-widest mb-1 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Pages
            </button>
            <h1 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight leading-none flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-red-500 animate-pulse" />
              Edit Legal & Dynamic Page
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setEditingPage(null)}
              className="px-5 py-2.5 bg-white hover:bg-zinc-100 dark:bg-zinc-800/40 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-700/65 text-zinc-600 dark:text-zinc-300 rounded-xl font-bold text-xs transition-all"
            >
              Discard
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-red-650 hover:bg-red-750 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-red-500/10 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={14} />}
              Save Page Layout
            </button>
          </div>
        </div>

        {/* 2/3 and 1/3 Split Column Editor Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Area: HTML/Code Workspace */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-[#121517] border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm space-y-5">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Document Layout</span>
              
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-350 mb-2">Page Title</label>
                <input 
                  type="text" 
                  value={editingPage.title}
                  onChange={e => setEditingPage({...editingPage, title: e.target.value})}
                  className="w-full bg-zinc-50 dark:bg-[#0c0e10] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-red-500/30 text-sm font-bold placeholder-zinc-400"
                  placeholder="e.g. Terms of Service"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-350">Document Body (HTML/Markdown syntax)</label>
                  <span className="text-[9px] font-mono text-zinc-400">Lines: {editingPage.content.split('\n').length}</span>
                </div>
                <textarea 
                  value={editingPage.content}
                  onChange={e => setEditingPage({...editingPage, content: e.target.value})}
                  className="w-full bg-zinc-50 dark:bg-[#0c0e10] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 text-zinc-900 dark:text-zinc-50 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-red-500/30 min-h-[460px] leading-relaxed placeholder-zinc-400"
                  placeholder="<h1>Terms of Service</h1><p>Welcome to PDF Spark...</p>"
                />
              </div>
            </div>

            {/* Simulated Frontend Preview */}
            <div className="bg-zinc-50 dark:bg-[#121517]/30 border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 space-y-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Structured Sandbox Render Preview</span>
              <div className="bg-white dark:bg-[#121517] border border-zinc-150 dark:border-zinc-800/80 rounded-2xl p-6 max-h-[300px] overflow-y-auto shadow-xs prose prose-sm dark:prose-invert">
                {editingPage.content ? (
                  <div dangerouslySetInnerHTML={{ __html: editingPage.content }} />
                ) : (
                  <p className="text-zinc-450 dark:text-zinc-500 text-xs italic">Write some HTML inside the code workspace above to preview page content layout...</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Area: Settings & Helpers */}
          <div className="space-y-6">
            
            {/* Page Slug configurations panel */}
            <div className="bg-white dark:bg-[#121517] border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm space-y-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-550 flex items-center gap-1.5 pb-3 border-b border-zinc-100 dark:border-zinc-850">
                <Globe size={14} className="text-red-500" />
                Slug Settings
              </h3>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-350 mb-2">Live Slug URL</label>
                  <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-[#0c0e10] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5">
                    <span className="text-zinc-400 dark:text-zinc-500 text-xs select-none">pdfspark.com/</span>
                    <input 
                      type="text"
                      value={editingPage.slug}
                      onChange={e => setEditingPage({...editingPage, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                      className="bg-transparent border-none p-0 text-zinc-950 dark:text-white font-mono text-xs focus:outline-none flex-1 font-bold"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-850 flex items-center justify-between text-xs">
                  <span className="text-zinc-450 dark:text-zinc-500 font-medium">Last Modified</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-mono font-bold flex items-center gap-1">
                    <Calendar size={12} className="opacity-60" />
                    {new Date(editingPage.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Visual HTML Sandbox Tip Box */}
            <div className="bg-red-500/5 border border-red-500/10 dark:border-red-500/20 rounded-3xl p-5 space-y-2">
              <h4 className="text-xs font-black text-red-550 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                <Eye size={14} />
                Pro HTML Tip
              </h4>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-semibold">
                Use clean structural tags like <code className="bg-zinc-200/50 dark:bg-zinc-800/80 px-1 py-0.5 rounded text-red-550 dark:text-red-400 font-mono">&lt;h2&gt;</code>, <code className="bg-zinc-200/50 dark:bg-zinc-800/80 px-1 py-0.5 rounded text-red-550 dark:text-red-400 font-mono">&lt;p&gt;</code>, and <code className="bg-zinc-200/50 dark:bg-zinc-800/80 px-1 py-0.5 rounded text-red-550 dark:text-red-400 font-mono">&lt;ul&gt;</code> inside the editor. The frontend style engine maps these tags automatically to gorgeous off-white canvas variables.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Pages Head */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight leading-tight">Policy Page Hub</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Audit, edit, and keep legal policies, user agreements, cookie terms, and contact logs up to date.</p>
        </div>
      </div>

      {/* Glowing Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
        <input 
          type="text" 
          placeholder="Search pages by title description or active slugs..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white dark:bg-[#121517] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl pl-10 pr-4 py-3.5 text-xs text-zinc-900 dark:text-zinc-50 focus:outline-none"
        />
      </div>

      {/* Pages Premium grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-white dark:bg-[#121517] rounded-3xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center space-y-4 shadow-sm">
            <Layout className="w-12 h-12 text-zinc-300 dark:text-zinc-700" />
            <div>
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">No Pages Found</p>
              <p className="text-xs text-zinc-450 dark:text-zinc-500 mt-1">No policy pages matched your search.</p>
            </div>
          </div>
        ) : (
          filteredPages.map((page) => (
            <div 
              key={page.id} 
              className="bg-white dark:bg-[#121517] border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm hover:border-red-500/50 hover:shadow-xl hover:shadow-zinc-300/5 dark:hover:shadow-black/25 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-5">
                  <div className="w-12 h-12 bg-red-500/10 dark:bg-red-550/15 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                    <FileText className="w-6 h-6 text-red-500 dark:text-red-400" />
                  </div>
                  <button 
                    onClick={() => setEditingPage(page)}
                    className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-all"
                    title="Edit Document"
                  >
                    <Edit3 className="w-4.5 h-4.5" />
                  </button>
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-snug group-hover:text-red-500 transition-colors line-clamp-1">{page.title}</h3>
                <span className="text-[10px] font-mono text-zinc-400 tracking-tight block mt-1">/page/{page.slug}</span>
              </div>
              
              <div className="flex items-center justify-between pt-5 mt-6 border-t border-zinc-100 dark:border-zinc-850">
                <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest">
                  Updated {new Date(page.updated_at).toLocaleDateString()}
                </span>
                <button 
                  onClick={() => setEditingPage(page)}
                  className="text-red-650 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-bold text-xs flex items-center gap-1 transition-all"
                >
                  Edit Canvas <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

