import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Plus, Search, Edit2, Trash2, Save, X, 
  ChevronLeft, Loader2, CheckCircle2, Settings,
  HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

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

export const FaqManager: React.FC = () => {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentFaq, setCurrentFaq] = useState<Partial<FAQ> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('General');

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
    setCurrentFaq({
      question: '',
      answer: '',
      category: activeTab,
      category_list: [activeTab],
      is_published: true,
      order_index: faqs.filter(f => f.category_list?.includes(activeTab)).length
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
    if (!currentFaq?.question || !currentFaq?.answer) {
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

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'All' || faq.category_list?.includes(activeTab);
    return matchesSearch && matchesTab;
  });

  if (isEditing) {
    return (
      <div className="max-w-4xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => { setIsEditing(false); setCurrentFaq(null); }}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={20} /> Back to FAQs
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-500/20"
          >
            <Save size={18} /> Save FAQ
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
              <label className="block text-sm font-bold text-zinc-400 mb-2">Question</label>
              <input 
                type="text" 
                value={currentFaq?.question}
                onChange={(e) => setCurrentFaq({ ...currentFaq, question: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 text-lg font-medium"
                placeholder="What is your question?"
              />
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
              <label className="block text-sm font-bold text-zinc-400 mb-2">Answer</label>
              <textarea 
                value={currentFaq?.answer}
                onChange={(e) => setCurrentFaq({ ...currentFaq, answer: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 min-h-[250px] leading-relaxed"
                placeholder="Provide a detailed answer..."
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <Settings size={18} className="text-red-500" />
                FAQ Settings
              </h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-3">Categories</label>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-2 bg-zinc-800/50 rounded-xl border border-zinc-700">
                    {categories.map((cat) => (
                      <label key={cat} className="flex items-center gap-2 px-2 py-2 hover:bg-zinc-700/50 rounded-lg cursor-pointer transition-colors">
                        <input 
                          type="checkbox"
                          checked={currentFaq?.category_list?.includes(cat)}
                          onChange={(e) => {
                            const currentList = currentFaq?.category_list || [];
                            const newList = e.target.checked 
                              ? [...currentList, cat]
                              : currentList.filter(c => c !== cat);
                            setCurrentFaq({ ...currentFaq, category_list: newList, category: newList[0] || categories[0] });
                          }}
                          className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-red-600 focus:ring-red-500"
                        />
                        <span className="text-sm text-zinc-300">{cat}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Order Index</label>
                  <input 
                    type="number" 
                    value={currentFaq?.order_index}
                    onChange={(e) => setCurrentFaq({ ...currentFaq, order_index: parseInt(e.target.value) })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">Lower numbers appear first</p>
                </div>

                <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl border border-zinc-700">
                  <label className="text-sm font-bold text-zinc-300">Visibility</label>
                  <button
                    onClick={() => setCurrentFaq({ ...currentFaq, is_published: !currentFaq?.is_published })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${currentFaq?.is_published ? 'bg-red-600' : 'bg-zinc-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${currentFaq?.is_published ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
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
          <h1 className="text-4xl font-bold text-white mb-2">Manage FAQs</h1>
          <p className="text-zinc-400">Organize questions by page or category</p>
        </div>
        <button 
          onClick={handleCreateNew}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-500/20"
        >
          <Plus size={20} /> Add New FAQ
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-zinc-950 border border-zinc-800 rounded-2xl overflow-x-auto no-scrollbar">
        {['All', ...categories].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-none px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === tab 
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' 
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
            }`}
          >
            {tab === 'General' ? 'Home Page' : tab}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
        <input 
          type="text" 
          placeholder={`Search ${activeTab === 'All' ? '' : activeTab} questions...`} 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-red-500/30"
        />
      </div>

      <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-950/50">
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider w-12">#</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Question</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Categories</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                  Loading FAQs...
                </td>
              </tr>
            ) : filteredFaqs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 font-medium">
                  No FAQs found. Create your first one!
                </td>
              </tr>
            ) : filteredFaqs.map((faq) => (
              <tr key={faq.id} className="hover:bg-zinc-800/30 transition-colors group">
                <td className="px-6 py-4 text-zinc-500 font-mono text-sm">
                  {faq.order_index}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
                      <HelpCircle size={18} />
                    </div>
                    <div className="font-bold text-white max-w-md truncate">{faq.question}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {(faq.category_list || [faq.category]).filter(Boolean).map((cat, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 border border-zinc-700 whitespace-nowrap">
                        {cat}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {faq.is_published ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                      <CheckCircle2 size={10} /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-500/10 text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                      Hidden
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {deletingId === faq.id ? (
                      <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                        <button 
                          onClick={() => handleDelete(faq.id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-lg transition-colors"
                        >
                          Confirm
                        </button>
                        <button 
                          onClick={() => setDeletingId(null)}
                          className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[10px] font-bold rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={() => handleEdit(faq)}
                          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                          title="Edit FAQ"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => setDeletingId(faq.id)}
                          className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete FAQ"
                        >
                          <Trash2 size={18} />
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
