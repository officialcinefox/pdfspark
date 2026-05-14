import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  FileText, Search, Plus, Trash2, Edit3, 
  ChevronRight, ArrowLeft, Save, Loader2,
  Globe, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';

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
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('pages')
        .update({
          title: editingPage.title,
          slug: editingPage.slug,
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
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setEditingPage(null)}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Pages
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-6">
              <div>
                <label className="block text-sm font-bold text-zinc-400 mb-2">Page Title</label>
                <input 
                  type="text"
                  value={editingPage.title}
                  onChange={e => setEditingPage({...editingPage, title: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/30"
                  placeholder="Page Title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-zinc-400 mb-2">Content (HTML)</label>
                <textarea 
                  value={editingPage.content}
                  onChange={e => setEditingPage({...editingPage, content: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/30 font-mono text-sm h-[500px]"
                  placeholder="Page Content"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-red-500" />
                Page Settings
              </h3>
              
              <div>
                <label className="block text-sm font-bold text-zinc-400 mb-2">Slug</label>
                <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3">
                  <span className="text-zinc-600 text-sm italic">/</span>
                  <input 
                    type="text"
                    value={editingPage.slug}
                    onChange={e => setEditingPage({...editingPage, slug: e.target.value})}
                    className="bg-transparent border-none p-0 text-white focus:outline-none flex-1 text-sm"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500 italic">Last Updated</span>
                  <span className="text-zinc-300 font-medium">
                    {new Date(editingPage.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-6">
              <h4 className="text-sm font-bold text-red-500 mb-2 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Pro Tip
              </h4>
              <p className="text-xs text-zinc-500 leading-relaxed italic">
                Use HTML tags like &lt;h2&gt;, &lt;p&gt;, and &lt;ul&gt; to style your content. The frontend will render these automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Dynamic Pages</h1>
          <p className="text-zinc-400">Manage legal and informational pages of your toolkit</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
        <input 
          type="text" 
          placeholder="Search pages by title or slug..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-red-500/30"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-zinc-900/30 rounded-3xl border border-zinc-800 border-dashed">
            <FileText className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
            <p className="text-zinc-500 font-bold">No pages found matching your search.</p>
          </div>
        ) : (
          filteredPages.map((page) => (
            <div 
              key={page.id} 
              className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 hover:border-red-500/50 transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6 text-red-500" />
                </div>
                <button 
                  onClick={() => setEditingPage(page)}
                  className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <Edit3 className="w-5 h-5" />
                </button>
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{page.title}</h3>
              <p className="text-zinc-500 text-sm mb-6 italic">/{page.slug}</p>
              
              <div className="flex items-center justify-between pt-6 border-t border-zinc-800">
                <div className="text-[10px] uppercase tracking-widest font-black text-zinc-600">
                  Last updated {new Date(page.updated_at).toLocaleDateString()}
                </div>
                <button 
                  onClick={() => setEditingPage(page)}
                  className="text-red-500 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all"
                >
                  Edit Page <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
