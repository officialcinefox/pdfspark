import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Mail, Search, Trash2, Loader2, 
  CheckCircle2, Clock, MailOpen, AlertCircle,
  Filter, Calendar, ChevronDown, Reply, Send, Sparkles, Inbox, User, Bookmark
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Enquiry {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

type DateFilterType = 'all' | 'today' | 'yesterday' | 'last3' | 'last7' | 'last30';

const getInitialsAvatar = (name: string) => {
  const parts = (name || '').split(' ');
  const initials = parts.map(p => p.charAt(0)).join('').substring(0, 2).toUpperCase() || 'U';
  
  // Deterministic background color
  const colors = [
    'from-red-550 to-orange-500 text-white',
    'from-blue-550 to-indigo-500 text-white',
    'from-emerald-550 to-teal-500 text-white',
    'from-purple-550 to-fuchsia-500 text-white',
    'from-pink-550 to-rose-500 text-white'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return { initials, gradient: colors[index] };
};

export const EnquiryManager: React.FC = () => {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<{[key: string]: string}>({});
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'read' | 'replied'>('all');

  // Quick reply templates
  const replyTemplates = [
    { name: 'Thank You Note', text: 'Hi,\n\nThank you for reaching out to PDF Spark! We have received your inquiry regarding "[SUBJECT]" and our team is currently looking into it. We will get back to you shortly.\n\nBest regards,\nPDF Spark Team' },
    { name: 'Issue Solved', text: 'Hi,\n\nI am happy to inform you that the issue you reported regarding "[SUBJECT]" has been successfully resolved. Please refresh the page and try again.\n\nLet us know if you need any further assistance!\n\nBest regards,\nPDF Spark Team' },
    { name: 'Feature Request', text: 'Hi,\n\nThank you for the wonderful suggestion regarding "[SUBJECT]"! We have shared your feedback with our product development team. We are always working on improving PDF Spark.\n\nBest regards,\nPDF Spark Team' }
  ];

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const fetchEnquiries = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('enquiries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEnquiries(data || []);
    } catch (error: any) {
      toast.error('Error fetching enquiries: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const toastId = toast.loading('Deleting enquiry...');
    try {
      const { error } = await supabase.from('enquiries').delete().eq('id', id);
      if (error) throw error;
      toast.success('Inquiry removed successfully', { id: toastId });
      setDeletingId(null);
      fetchEnquiries();
    } catch (error: any) {
      toast.error('Delete failed: ' + error.message, { id: toastId });
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('enquiries')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      fetchEnquiries();
    } catch (error: any) {
      toast.error('Error updating status');
    }
  };

  const isWithinDateRange = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    switch (dateFilter) {
      case 'today':
        return date >= today;
      case 'yesterday':
        return date >= yesterday && date < today;
      case 'last3':
        const threeDaysAgo = new Date(today);
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        return date >= threeDaysAgo;
      case 'last7':
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return date >= sevenDaysAgo;
      case 'last30':
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return date >= thirtyDaysAgo;
      default:
        return true;
    }
  };

  const filteredEnquiries = enquiries.filter(enq => {
    const matchesSearch = 
      enq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enq.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enq.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enq.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesTab = true;
    if (activeTab !== 'all') {
      matchesTab = enq.status === activeTab;
    }

    return matchesSearch && matchesTab && isWithinDateRange(enq.created_at);
  });

  const getStatusCounts = () => {
    let all = enquiries.length;
    let newCount = enquiries.filter(e => e.status === 'new').length;
    let readCount = enquiries.filter(e => e.status === 'read').length;
    let repliedCount = enquiries.filter(e => e.status === 'replied').length;
    return { all, newCount, readCount, repliedCount };
  };

  const counts = getStatusCounts();

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      
      {/* CRM Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-tight">Customer CRM Inbox</h1>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">Review contact inquiries, send professional responses, and manage status logs.</p>
        </div>
      </div>

      {/* Inbox Category Switchers */}
      <div className="flex flex-wrap gap-1.5">
        {[
          { id: 'all', name: 'All Inquiries', count: counts.all },
          { id: 'new', name: 'New/Unread', count: counts.newCount, isAlert: counts.newCount > 0 },
          { id: 'read', name: 'Read', count: counts.readCount },
          { id: 'replied', name: 'Replied', count: counts.repliedCount }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all flex items-center gap-1.5 ${
                isActive 
                  ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900' 
                  : 'bg-white dark:bg-[#121517] border-zinc-200 dark:border-zinc-800 text-zinc-450 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50'
              }`}
            >
              <span>{tab.name}</span>
              <span className={`px-1.5 py-0.25 rounded-full text-[8px] font-black ${
                isActive 
                  ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-800' 
                  : tab.isAlert
                  ? 'bg-red-500/10 text-red-500 animate-pulse'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Message Filter Tools */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-3.5 h-3.5" />
          <input 
            type="text" 
            placeholder="Search sender, email, keyword, subject..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-[#121517] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-50 focus:outline-none"
          />
        </div>
        
        <div className="relative group/filter w-full sm:w-auto shrink-0">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-3 h-3" />
          <select 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
            className="w-full sm:w-auto bg-white dark:bg-[#121517] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl pl-8 pr-7 py-1.5 text-xs font-bold text-zinc-550 dark:text-zinc-400 focus:outline-none appearance-none cursor-pointer"
          >
            <option value="all">All Dates</option>
            <option value="today">Received Today</option>
            <option value="yesterday">Received Yesterday</option>
            <option value="last3">Last 3 Days</option>
            <option value="last7">Last 7 Days</option>
            <option value="last30">Last 30 Days</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 w-3 h-3 pointer-events-none" />
        </div>
      </div>

      {/* Inbox List View */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-red-500" />
          </div>
        ) : filteredEnquiries.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[#121517] rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center space-y-3 shadow-sm">
            <Inbox className="w-10 h-10 text-zinc-300 dark:text-zinc-700" />
            <div>
              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Inbox Completely Clean</p>
              <p className="text-[10px] text-zinc-450 dark:text-zinc-500 mt-0.5">No enquiries match the current filters.</p>
            </div>
          </div>
        ) : filteredEnquiries.map((enq) => {
          const isNew = enq.status === 'new';
          const { initials, gradient } = getInitialsAvatar(enq.name);

          return (
            <div 
              key={enq.id} 
              onClick={() => isNew && updateStatus(enq.id, 'read')}
              className={`bg-white dark:bg-[#121517] border rounded-2xl p-3.5 py-3 transition-all duration-300 hover:shadow-lg hover:shadow-zinc-300/5 dark:hover:shadow-black/20 cursor-pointer group ${
                isNew 
                  ? 'border-red-500/30 ring-1 ring-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.03)] dark:bg-[#151212]/10' 
                  : 'border-zinc-200/80 dark:border-zinc-800/80'
              }`}
            >
              {/* Message Header */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div className="flex gap-3">
                  {/* Glowing dynamic Initials Avatar */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-black bg-gradient-to-tr shadow-md ${gradient}`}>
                    {initials}
                  </div>
                  
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-50">{enq.subject || 'No Subject'}</h3>
                      {isNew && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" title="Unread Message" />
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-zinc-450 dark:text-zinc-400 font-semibold">
                      <span className="text-zinc-900 dark:text-zinc-100 font-bold flex items-center gap-1"><User size={10} className="opacity-60" /> {enq.name}</span>
                      <span className="w-0.5 h-0.5 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                      <span className="font-mono text-[10px] opacity-75">{enq.email}</span>
                      <span className="w-0.5 h-0.5 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                      <span className="flex items-center gap-1 text-[10px] font-medium"><Clock size={10} className="opacity-60" /> {new Date(enq.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* CRM Controls */}
                <div className="flex items-center gap-2 self-end md:self-auto" onClick={e => e.stopPropagation()}>
                  <button 
                    onClick={() => setReplyingTo(replyingTo === enq.id ? null : enq.id)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      replyingTo === enq.id 
                        ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100' 
                        : 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white'
                    }`}
                  >
                    <Reply size={11} />
                    {replyingTo === enq.id ? 'Close' : 'Quick Reply'}
                  </button>

                  <select 
                    value={enq.status}
                    onChange={(e) => updateStatus(enq.id, e.target.value)}
                    className="bg-zinc-50 dark:bg-[#0c0e10] border border-zinc-200/70 dark:border-zinc-800/60 text-[9px] font-black uppercase tracking-wider text-zinc-550 dark:text-zinc-300 px-2 py-1 rounded-lg focus:outline-none cursor-pointer"
                  >
                    <option value="new">New</option>
                    <option value="read">Mark Read</option>
                    <option value="replied">Mark Replied</option>
                  </select>

                  {deletingId === enq.id ? (
                    <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-200">
                      <button 
                        onClick={() => handleDelete(enq.id)}
                        className="px-2 py-1 bg-red-650 text-white text-[9px] font-bold rounded-md hover:bg-red-700 shadow-md shadow-red-650/10"
                      >
                        Confirm
                      </button>
                      <button 
                        onClick={() => setDeletingId(null)}
                        className="px-2 py-1 bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300 text-[9px] font-bold rounded-md"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setDeletingId(enq.id)}
                      className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all"
                      title="Delete Inquiry"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Message Description */}
              <div className="mt-2.5 bg-zinc-50 dark:bg-[#0c0e10] p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 text-zinc-800 dark:text-zinc-250 leading-relaxed whitespace-pre-wrap text-xs font-medium">
                {enq.message}
              </div>

              {/* Active Compose Reply Area */}
              {replyingTo === enq.id && (
                <div 
                  className="mt-3.5 pt-3.5 border-t border-zinc-150 dark:border-zinc-855 space-y-3 animate-in slide-in-from-top-4 duration-300"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={12} className="text-red-500 animate-pulse" />
                      <h4 className="text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Draft Response Email</h4>
                    </div>
                    {/* Auto-template selectors */}
                    <div className="flex flex-wrap gap-1">
                      {replyTemplates.map((tmp, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            const formatted = tmp.text
                              .replace('[SUBJECT]', enq.subject || 'your inquiry')
                              .replace('[NAME]', enq.name);
                            setReplyText({ ...replyText, [enq.id]: formatted });
                          }}
                          className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 text-[9px] font-bold text-zinc-600 dark:text-zinc-300 border border-zinc-200/40 dark:border-zinc-700/40 rounded-md transition-all"
                        >
                          {tmp.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea 
                    placeholder="Type your reply or select a quick template above..."
                    value={replyText[enq.id] || ''}
                    onChange={(e) => setReplyText({...replyText, [enq.id]: e.target.value})}
                    className="w-full bg-zinc-550/5 dark:bg-[#0c0e10] border border-zinc-250/70 dark:border-zinc-800/60 rounded-xl px-3 py-2 text-zinc-900 dark:text-zinc-50 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/30 min-h-[120px] leading-relaxed transition-all"
                  />

                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => setReplyingTo(null)}
                      className="px-3 py-1.5 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/40 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/65 text-zinc-600 dark:text-zinc-300 rounded-lg font-bold text-xs transition-all"
                    >
                      Discard
                    </button>
                    <a 
                      href={`mailto:${enq.email}?subject=Re: ${enq.subject || 'Inquiry from PDF Spark'}&body=${encodeURIComponent(replyText[enq.id] || '')}`}
                      onClick={() => {
                        updateStatus(enq.id, 'replied');
                        setReplyingTo(null);
                      }}
                      className="inline-flex items-center gap-1 px-4 py-1.5 bg-red-650 text-white rounded-lg font-bold text-xs hover:bg-red-750 transition-all shadow-md shadow-red-500/10"
                    >
                      <Send size={10} />
                      Send Response via Mail
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
