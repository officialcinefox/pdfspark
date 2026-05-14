import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Mail, Search, Trash2, Loader2, 
  CheckCircle2, Clock, MailOpen, AlertCircle,
  Trash, Filter, Calendar, ChevronDown, Reply
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

type DateFilterType = 'all' | 'today' | 'yesterday' | 'last3' | 'last7' | 'last30' | 'custom';

export const EnquiryManager: React.FC = () => {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<{[key: string]: string}>({});
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [customStartDate, setCustomStartDate] = useState('');

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
      toast.success('Enquiry deleted', { id: toastId });
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
      case 'custom':
        if (!customStartDate) return true;
        return date >= new Date(customStartDate);
      default:
        return true;
    }
  };

  const filteredEnquiries = enquiries.filter(enq => {
    const matchesSearch = 
      enq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enq.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enq.subject?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch && isWithinDateRange(enq.created_at);
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">User Enquiries</h1>
          <p className="text-zinc-400">View and manage messages from your users</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group/filter">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <select 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-8 py-2.5 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-red-500/30 appearance-none cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last3">Last 3 Days</option>
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
              <option value="custom">Custom Date</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4 pointer-events-none" />
          </div>

          {dateFilter === 'custom' && (
            <div className="relative animate-in slide-in-from-right-4 duration-300">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
              <input 
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-red-500/30"
              />
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
        <input 
          type="text" 
          placeholder="Search by name, email or subject..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-red-500/30"
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          </div>
        ) : filteredEnquiries.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-zinc-800 border-dashed">
            <Mail className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
            <p className="text-zinc-500 font-bold">No enquiries found for this filter.</p>
          </div>
        ) : filteredEnquiries.map((enq) => (
          <div 
            key={enq.id} 
            onClick={() => enq.status === 'new' && updateStatus(enq.id, 'read')}
            className={`bg-zinc-900/50 backdrop-blur-sm border rounded-2xl p-6 transition-all cursor-pointer group/card ${enq.status === 'new' ? 'border-red-500/40 ring-1 ring-red-500/10 shadow-[0_0_30px_rgba(239,68,68,0.05)]' : 'border-zinc-800 opacity-90'}`}
          >
            <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
              <div className="flex gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${enq.status === 'new' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-zinc-800 text-zinc-400'}`}>
                  {enq.status === 'new' ? <Mail size={28} /> : <MailOpen size={28} />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{enq.subject || 'No Subject'}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-400">
                    <span className="font-bold text-zinc-200">{enq.name}</span>
                    <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                    <span>{enq.email}</span>
                    <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                    <span className="flex items-center gap-1.5"><Clock size={14} className="text-zinc-500" /> {new Date(enq.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setReplyingTo(replyingTo === enq.id ? null : enq.id);
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${replyingTo === enq.id ? 'bg-zinc-800 text-white' : 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white'}`}
                >
                  <Reply size={16} />
                  {replyingTo === enq.id ? 'Close' : 'Reply'}
                </button>

                <select 
                  value={enq.status}
                  onChange={(e) => {
                    e.stopPropagation();
                    updateStatus(enq.id, e.target.value);
                  }}
                  className="bg-zinc-800 border border-zinc-700 text-xs font-black uppercase tracking-wider text-white px-4 py-2.5 rounded-xl focus:outline-none cursor-pointer"
                >
                  <option value="new">New</option>
                  <option value="read">Read</option>
                  <option value="replied">Replied</option>
                </select>
                
                {deletingId === enq.id ? (
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={() => handleDelete(enq.id)}
                      className="px-4 py-2.5 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-600/20"
                    >
                      Confirm
                    </button>
                    <button 
                      onClick={() => setDeletingId(null)}
                      className="px-4 py-2.5 bg-zinc-800 text-zinc-300 text-xs font-bold rounded-xl"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingId(enq.id);
                    }}
                    className="p-2.5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </div>

            <div className="bg-zinc-950/80 p-6 rounded-2xl border border-zinc-800/50 text-zinc-300 leading-relaxed whitespace-pre-wrap text-base">
              {enq.message}
            </div>

            {replyingTo === enq.id && (
              <div className="mt-6 space-y-4 pt-6 border-t border-zinc-800 animate-in slide-in-from-top-4 duration-300" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    <h4 className="text-sm font-black uppercase tracking-widest text-zinc-500">Compose Reply</h4>
                  </div>
                  {enq.status === 'replied' && (
                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-green-500 bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
                      <CheckCircle2 size={12} /> Already Replied
                    </span>
                  )}
                </div>
                <textarea 
                  placeholder="Type your professional reply here..."
                  value={replyText[enq.id] || ''}
                  onChange={(e) => setReplyText({...replyText, [enq.id]: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-white text-base focus:outline-none focus:ring-2 focus:ring-red-500/30 min-h-[150px] transition-all"
                />
                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => setReplyingTo(null)}
                    className="px-6 py-3 bg-zinc-800 text-zinc-300 rounded-xl font-bold text-sm hover:bg-zinc-700 transition-all"
                  >
                    Discard
                  </button>
                  <a 
                    href={`mailto:${enq.email}?subject=Re: ${enq.subject || 'Inquiry from PDF Spark'}&body=${encodeURIComponent(replyText[enq.id] || '')}`}
                    onClick={() => {
                      updateStatus(enq.id, 'replied');
                      setReplyingTo(null);
                    }}
                    className="inline-flex items-center gap-2 px-8 py-3 bg-red-600 text-white rounded-xl font-black text-sm hover:bg-red-700 transition-all hover:scale-[1.03] shadow-xl shadow-red-600/20 active:scale-95"
                  >
                    <Reply size={18} />
                    Send Professional Reply
                  </a>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
