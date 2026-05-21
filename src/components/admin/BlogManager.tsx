import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import ImageExtension from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Plus, Search, Edit2, Trash2, Save, X, Upload, Link as LinkIcon,
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  Heading1, Heading2, Heading3, Quote, Image as ImageIcon,
  ChevronLeft, Loader2, CheckCircle2, Settings, Calendar as CalendarIcon,
  Copy, Check, Pilcrow, Eye, Globe, ChevronRight, Sparkles, Filter, Bookmark, AlertCircle,
  Users
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Blog {
  id: string;
  title: string;
  slug: string;
  content: string;
  image_url: string;
  category: string;
  category_list: string[];
  description: string;
  read_time: string;
  is_published: boolean;
  published_at: string;
  created_at: string;
}

const getAuthorForBlog = (blogId: string) => {
  const AUTHORS_POOL = [
    { name: 'Mohit Sharma', role: 'Lead Engineer', seed: 'mohit' },
    { name: 'Jane Smith', role: 'Performance Engineer', seed: 'jane' },
    { name: 'Phillip Palmer', role: 'Product Lead', seed: 'phillip' },
    { name: 'Michael Brown', role: 'Growth Lead', seed: 'michael' },
    { name: 'Dylan Field', role: 'Design Systems Architect', seed: 'dylan' },
    { name: 'Nina Rich', role: 'Data Scientist', seed: 'nina' },
  ];
  if (!blogId) return AUTHORS_POOL[0];
  let hash = 0;
  for (let i = 0; i < blogId.length; i++) {
    hash = blogId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AUTHORS_POOL.length;
  return AUTHORS_POOL[index];
};

const getCategoryPillStyles = (category: string) => {
  const normalized = (category || '').toLowerCase();
  if (normalized.includes('pdf')) {
    return 'bg-blue-50 text-blue-750 border border-blue-200/50 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30';
  } else if (normalized.includes('conversion') || normalized.includes('convert')) {
    return 'bg-amber-50 text-amber-700 border border-amber-200/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30';
  } else if (normalized.includes('security') || normalized.includes('lock')) {
    return 'bg-rose-50 text-rose-700 border border-rose-200/50 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30';
  } else if (normalized.includes('edit')) {
    return 'bg-emerald-50 text-emerald-700 border border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
  } else if (normalized.includes('guide') || normalized.includes('tip')) {
    return 'bg-purple-50 text-purple-700 border border-purple-200/50 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30';
  }
  return 'bg-zinc-100 text-zinc-700 border border-zinc-250/50 dark:bg-zinc-800/40 dark:text-zinc-400 dark:border-zinc-750/30';
};

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap gap-1 p-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#121517] sticky top-0 z-10 items-center">
      <button
        onClick={() => editor.chain().focus().setParagraph().run()}
        className={`p-2 rounded-lg transition-all ${editor.isActive('paragraph') ? 'text-white bg-red-650 shadow-md shadow-red-650/15' : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}
        title="Paragraph"
      >
        <Pilcrow size={16} />
      </button>
      <div className="w-px h-5 bg-zinc-250 dark:bg-zinc-850 mx-1" />
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-2 rounded-lg transition-all ${editor.isActive('bold') ? 'text-white bg-red-650 shadow-md shadow-red-650/15' : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}
        title="Bold"
      >
        <Bold size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-2 rounded-lg transition-all ${editor.isActive('italic') ? 'text-white bg-red-650 shadow-md shadow-red-650/15' : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}
        title="Italic"
      >
        <Italic size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`p-2 rounded-lg transition-all ${editor.isActive('underline') ? 'text-white bg-red-650 shadow-md shadow-red-650/15' : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}
        title="Underline"
      >
        <UnderlineIcon size={16} />
      </button>
      <div className="w-px h-5 bg-zinc-250 dark:bg-zinc-850 mx-1" />
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`p-2 rounded-lg transition-all ${editor.isActive('heading', { level: 1 }) ? 'text-white bg-red-650 shadow-md shadow-red-650/15' : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}
        title="Heading 1"
      >
        <Heading1 size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-2 rounded-lg transition-all ${editor.isActive('heading', { level: 2 }) ? 'text-white bg-red-650 shadow-md shadow-red-650/15' : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}
        title="Heading 2"
      >
        <Heading2 size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`p-2 rounded-lg transition-all ${editor.isActive('heading', { level: 3 }) ? 'text-white bg-red-650 shadow-md shadow-red-650/15' : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}
        title="Heading 3"
      >
        <Heading3 size={16} />
      </button>
      <div className="w-px h-5 bg-zinc-250 dark:bg-zinc-850 mx-1" />
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-2 rounded-lg transition-all ${editor.isActive('bulletList') ? 'text-white bg-red-650 shadow-md shadow-red-650/15' : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}
        title="Bullet List"
      >
        <List size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-2 rounded-lg transition-all ${editor.isActive('orderedList') ? 'text-white bg-red-650 shadow-md shadow-red-650/15' : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}
        title="Ordered List"
      >
        <ListOrdered size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`p-2 rounded-lg transition-all ${editor.isActive('blockquote') ? 'text-white bg-red-650 shadow-md shadow-red-650/15' : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}
        title="Blockquote"
      >
        <Quote size={16} />
      </button>
      <div className="w-px h-5 bg-zinc-250 dark:bg-zinc-850 mx-1" />
      <button
        onClick={() => {
          const previousUrl = editor.getAttributes('link').href;
          const url = window.prompt('Enter URL', previousUrl);
          if (url === null) return;
          if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
          }
          editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
        }}
        className={`p-2 rounded-lg transition-all ${editor.isActive('link') ? 'text-red-500 bg-red-500/10' : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}
        title="Add/Edit Link"
      >
        <LinkIcon size={16} />
      </button>
      <div className="w-px h-5 bg-zinc-250 dark:bg-zinc-850 mx-1" />
      <button
        onClick={() => {
          const url = window.prompt('Enter Image URL');
          if (url) {
            editor.chain().focus().setImage({ src: url }).run();
          }
        }}
        className="p-2 rounded-lg hover:bg-zinc-250 dark:hover:bg-zinc-800 transition-colors text-zinc-500"
        title="Add Image by URL"
      >
        <ImageIcon size={16} />
      </button>
      <label className="p-2 rounded-lg hover:bg-zinc-250 dark:hover:bg-zinc-800 transition-colors text-zinc-500 cursor-pointer" title="Upload Image to Content">
        <Upload size={16} />
        <input
          type="file"
          className="hidden"
          accept="image/*"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            const toastId = toast.loading('Uploading image...');
            try {
              const fileExt = file.name.split('.').pop();
              const fileName = `${Math.random()}.${fileExt}`;
              const filePath = `blog-content/${fileName}`;

              const { error: uploadError } = await supabase.storage
                .from('blog-images')
                .upload(filePath, file);

              if (uploadError) throw uploadError;

              const { data: { publicUrl } } = supabase.storage
                .from('blog-images')
                .getPublicUrl(filePath);

              editor.chain().focus().setImage({ src: publicUrl }).run();
              toast.success('Image inserted!', { id: toastId });
            } catch (error: any) {
              toast.error('Upload failed: ' + error.message, { id: toastId });
            }
          }}
        />
      </label>
    </div>
  );
};

export const BlogManager: React.FC = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBlog, setCurrentBlog] = useState<Partial<Blog> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [status, setStatus] = useState<'draft' | 'published' | 'scheduled'>('draft');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Status filter tab
  const [activeStatusTab, setActiveStatusTab] = useState<'all' | 'published' | 'draft' | 'scheduled'>('all');
  // Category filter dropdown
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Interactive editing states
  const [editorMode, setEditorMode] = useState<'visual' | 'code'>('visual');
  const [focusKeyword, setFocusKeyword] = useState('');
  const [seoMetaTitle, setSeoMetaTitle] = useState('');
  const [seoMetaDescription, setSeoMetaDescription] = useState('');

  // Author details mock database (allows visual updates but defaults determination)
  const [authorName, setAuthorName] = useState('Mohit Sharma');
  const [authorRole, setAuthorRole] = useState('Lead Engineer');
  const [authorAvatarSeed, setAuthorAvatarSeed] = useState('mohit');

  const categories = [
    'PDF Management',
    'Conversion Tools',
    'Security Tools',
    'Editing Tools',
    'Productivity',
    'Guides',
    'Tips & Tricks'
  ];

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      ImageExtension,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-red-650 hover:underline cursor-pointer font-semibold',
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Placeholder.configure({
        placeholder: 'Write your professional articles here...',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[450px] p-8 leading-relaxed text-zinc-800 dark:text-zinc-200 outline-none',
      },
    },
  });

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBlogs(data || []);
    } catch (error: any) {
      toast.error('Error fetching blogs: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    const newId = crypto.randomUUID();
    const detAuthor = getAuthorForBlog(newId);
    setAuthorName(detAuthor.name);
    setAuthorRole(detAuthor.role);
    setAuthorAvatarSeed(detAuthor.seed);

    setCurrentBlog({
      id: newId,
      title: '',
      slug: '',
      content: '',
      image_url: '',
      category: categories[0],
      category_list: [],
      description: '',
      read_time: '5 min',
      is_published: false,
      published_at: new Date().toISOString().slice(0, 16)
    });
    setFocusKeyword('');
    setSeoMetaTitle('');
    setSeoMetaDescription('');
    setStatus('draft');
    editor?.commands.setContent('');
    setIsEditing(true);
    setEditorMode('visual');
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Image link copied!');
  };

  const handleEdit = (blog: Blog) => {
    const isPublished = blog.is_published;
    const isFuture = new Date(blog.published_at) > new Date();

    let currentStatus: 'draft' | 'published' | 'scheduled' = 'draft';
    if (isPublished) {
      currentStatus = isFuture ? 'scheduled' : 'published';
    }

    const detAuthor = getAuthorForBlog(blog.id);
    setAuthorName(detAuthor.name);
    setAuthorRole(detAuthor.role);
    setAuthorAvatarSeed(detAuthor.seed);

    setCurrentBlog({
      ...blog,
      published_at: blog.published_at ? new Date(blog.published_at).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      category_list: blog.category_list || [blog.category].filter(Boolean)
    });
    setStatus(currentStatus);
    setFocusKeyword((blog as any).seo_keyword || blog.title?.split(' ')[0] || '');
    setSeoMetaTitle(blog.title || '');
    setSeoMetaDescription(blog.description || '');
    editor?.commands.setContent(blog.content || '');
    setIsEditing(true);
    setEditorMode('visual');
  };

  const handleDelete = async (id: string) => {
    const toastId = toast.loading('Deleting article...');
    try {
      const { error } = await supabase.from('blogs').delete().eq('id', id);
      if (error) throw error;
      toast.success('Blog deleted successfully', { id: toastId });
      setDeletingId(null);
      fetchBlogs();
    } catch (error: any) {
      toast.error('Delete failed: ' + error.message, { id: toastId });
    }
  };

  const handleSave = async (isAutoSave = false) => {
    if (!currentBlog?.title || !currentBlog?.slug) {
      if (!isAutoSave) toast.error('Title and URL Slug are required');
      return;
    }

    try {
      const saveStatus = isAutoSave ? 'draft' : status;
      const isPublished = saveStatus !== 'draft';

      let finalPublishedAt: string;
      if (saveStatus === 'published') {
        finalPublishedAt = new Date().toISOString();
      } else if (saveStatus === 'scheduled') {
        finalPublishedAt = currentBlog.published_at || new Date().toISOString();
      } else {
        finalPublishedAt = currentBlog.published_at || new Date().toISOString();
      }

      const finalCategoryList = currentBlog.category_list || [];
      const finalCategory = finalCategoryList[0] || 'Uncategorized';

      const { id, created_at, ...blogData } = {
        ...currentBlog,
        category_list: finalCategoryList,
        category: finalCategory,
        is_published: isPublished,
        published_at: finalPublishedAt,
        content: editorMode === 'visual' ? (editor?.getHTML() || '') : currentBlog.content,
        updated_at: new Date().toISOString(),
        seo_keyword: focusKeyword, // fallback session
      } as any;

      let error;
      if (id) {
        ({ error } = await supabase.from('blogs').update(blogData).eq('id', id));
      } else {
        ({ error } = await supabase.from('blogs').insert([blogData]));
      }

      if (error) throw error;

      if (!isAutoSave) {
        toast.success(
          saveStatus === 'draft' ? '📝 Saved as Draft' :
          saveStatus === 'scheduled' ? '⏰ Scheduled Successfully!' :
          '🚀 Article Published Live!'
        );
        setIsEditing(false);
        setCurrentBlog(null);
      } else {
        toast.success('Draft auto-saved', { icon: '💾' });
      }
      fetchBlogs();
    } catch (error: any) {
      toast.error('Error saving: ' + error.message);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `blog-posts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('blog-images')
        .getPublicUrl(filePath);

      setCurrentBlog({ ...currentBlog, image_url: publicUrl });
      toast.success('Featured image uploaded!');
    } catch (error: any) {
      toast.error('Upload failed: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // SEO RankMath Checklist Calculator
  const getSeoChecklist = () => {
    const title = currentBlog?.title || '';
    const slug = currentBlog?.slug || '';
    const excerpt = seoMetaDescription || '';
    const content = editor?.getHTML() || '';
    const keyword = focusKeyword.trim().toLowerCase();

    if (!keyword) {
      return { score: null, checklist: [] };
    }

    const checks = [
      { id: 'title', text: 'Keyword present in title', success: title.toLowerCase().includes(keyword), weight: 30 },
      { id: 'slug', text: 'Keyword used in URL Slug', success: slug.toLowerCase().includes(keyword.replace(/\s+/g, '-')), weight: 20 },
      { id: 'desc', text: 'Keyword in short SEO description', success: excerpt.toLowerCase().includes(keyword), weight: 20 },
      { id: 'title_length', text: 'Title length is ideal (30-60 chars)', success: title.length >= 30 && title.length <= 60, weight: 15 },
      { id: 'content_length', text: 'Article content has minimum 150 words', success: content.split(/\s+/).filter(Boolean).length >= 150, weight: 15 },
    ];

    const score = checks.reduce((acc, check) => acc + (check.success ? check.weight : 0), 0);
    return { score, checklist: checks };
  };

  const { score: seoScore, checklist: seoChecklist } = getSeoChecklist();

  // Directory filter logic
  const filteredBlogs = blogs.filter(blog => {
    const matchesSearch = 
      blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blog.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blog.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const isFuture = new Date(blog.published_at) > new Date();
    let matchesStatus = true;
    if (activeStatusTab === 'published') {
      matchesStatus = blog.is_published && !isFuture;
    } else if (activeStatusTab === 'draft') {
      matchesStatus = !blog.is_published;
    } else if (activeStatusTab === 'scheduled') {
      matchesStatus = blog.is_published && isFuture;
    }

    let matchesCategory = true;
    if (categoryFilter !== 'all') {
      matchesCategory = (blog.category_list || [blog.category]).includes(categoryFilter);
    }

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusCounts = () => {
    let all = blogs.length;
    let published = 0;
    let draft = 0;
    let scheduled = 0;

    blogs.forEach(b => {
      const isFuture = new Date(b.published_at) > new Date();
      if (b.is_published) {
        if (isFuture) scheduled++;
        else published++;
      } else {
        draft++;
      }
    });

    return { all, published, draft, scheduled };
  };

  const counts = getStatusCounts();

  const handleBack = async () => {
    if (currentBlog?.title && !currentBlog.id) {
      toast('Auto-saving draft post...', { icon: '📝' });
      await handleSave(true);
    }
    setIsEditing(false);
    setCurrentBlog(null);
  };

  if (isEditing) {
    return (
      <div className="max-w-[1400px] mx-auto pb-20 space-y-6 animate-in fade-in duration-300">
        
        {/* Editor Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50 hover:bg-zinc-150 dark:hover:bg-zinc-800/80 rounded-xl transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                <span>CMS Workspace</span>
                <ChevronRight size={12} />
                <span>{currentBlog?.title ? 'Edit Article' : 'New Article'}</span>
              </div>
              <h1 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-zinc-55 truncate max-w-md">
                {currentBlog?.title || 'Untitled Post'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {seoScore !== null && (
              <span className={`px-4 py-2.5 rounded-xl font-bold text-xs border flex items-center gap-2 ${
                seoScore >= 80 
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                  : seoScore >= 50
                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                  : 'bg-red-500/10 text-red-500 border-red-500/20'
              }`}>
                <Sparkles size={14} className="animate-spin-slow" />
                SEO Score: <span className="font-extrabold">{seoScore}/100</span>
              </span>
            )}
            {seoScore === null && (
              <span className="px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700/50 text-zinc-400 text-xs font-semibold">
                SEO Score: N/A (Keyword Empty)
              </span>
            )}
            <button
              onClick={() => handleSave()}
              className="flex items-center gap-2 px-6 py-2.5 bg-red-650 hover:bg-red-700 text-white text-sm rounded-xl font-bold transition-all shadow-lg shadow-red-600/15"
            >
              <Save size={16} /> Save Changes
            </button>
          </div>
        </div>

        {/* 2-Column Split-Layout Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main workspace (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Excerpt Details */}
            <div className="bg-white dark:bg-[#121517] border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 space-y-5">
              <h3 className="font-black uppercase tracking-wider text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-2"><Bookmark size={14} className="text-red-500" /> Post Details</h3>
              <div>
                <label className="block text-xs font-extrabold text-zinc-450 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Post Title</label>
                <input
                  type="text"
                  value={currentBlog?.title}
                  onChange={(e) => setCurrentBlog({ ...currentBlog, title: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-[#0c0e10] border border-zinc-250/70 dark:border-zinc-800/60 rounded-xl px-4 py-3 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-red-500/30 text-lg font-bold"
                  placeholder="e.g., How to decide what to build first..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-zinc-450 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">URL Slug (Auto-generated)</label>
                  <input
                    type="text"
                    value={currentBlog?.slug}
                    onChange={(e) => setCurrentBlog({ ...currentBlog, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    className="w-full bg-zinc-50 dark:bg-[#0c0e10] border border-zinc-250/70 dark:border-zinc-800/60 rounded-xl px-3 py-2.5 text-xs font-mono text-zinc-900 dark:text-zinc-50 focus:outline-none"
                    placeholder="how-to-decide-what-to-build-first"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-zinc-450 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Estimated Read Time</label>
                  <input
                    type="text"
                    value={currentBlog?.read_time}
                    onChange={(e) => setCurrentBlog({ ...currentBlog, read_time: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-[#0c0e10] border border-zinc-250/70 dark:border-zinc-800/60 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none"
                    placeholder="5 min read"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-zinc-450 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Short Excerpt / Summary</label>
                <textarea
                  value={seoMetaDescription}
                  onChange={(e) => {
                    setSeoMetaDescription(e.target.value);
                    setCurrentBlog({ ...currentBlog, description: e.target.value });
                  }}
                  className="w-full bg-zinc-50 dark:bg-[#0c0e10] border border-zinc-250/70 dark:border-zinc-800/60 rounded-xl px-3.5 py-3 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none min-h-[90px] leading-relaxed"
                  placeholder="Write a concise paragraph detailing the contents of this post..."
                />
              </div>
            </div>

            {/* TipTap Custom Visual/Code Editor */}
            <div className="bg-white dark:bg-[#121517] border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 bg-zinc-50/50 dark:bg-[#101315]/40 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Article Content</span>
                <div className="flex items-center gap-1 bg-zinc-200/60 dark:bg-zinc-800/50 p-1 rounded-xl">
                  <button
                    onClick={() => setEditorMode('visual')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      editorMode === 'visual'
                        ? 'bg-white dark:bg-[#121517] text-zinc-950 dark:text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-650'
                    }`}
                  >
                    Visual
                  </button>
                  <button
                    onClick={() => {
                      setEditorMode('code');
                      if (currentBlog) {
                        setCurrentBlog({ ...currentBlog, content: editor?.getHTML() || '' });
                      }
                    }}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      editorMode === 'code'
                        ? 'bg-white dark:bg-[#121517] text-zinc-950 dark:text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-650'
                    }`}
                  >
                    Code HTML
                  </button>
                </div>
              </div>

              {editorMode === 'visual' ? (
                <>
                  <MenuBar editor={editor} />
                  <style>{`
                    .tiptap.prose {
                      color: var(--foreground) !important;
                      max-width: none;
                    }
                    .tiptap.prose p, 
                    .tiptap.prose h1, 
                    .tiptap.prose h2, 
                    .tiptap.prose h3, 
                    .tiptap.prose li,
                    .tiptap.prose strong {
                      color: inherit !important;
                    }
                    .tiptap p.is-editor-empty:first-child::before {
                      content: attr(data-placeholder);
                      float: left;
                      color: var(--foreground);
                      opacity: 0.3;
                      pointer-events: none;
                      height: 0;
                    }
                  `}</style>
                  <div className="bg-white dark:bg-[#121517] dark:text-zinc-150">
                    <EditorContent editor={editor} />
                  </div>
                </>
              ) : (
                <textarea
                  value={currentBlog?.content || ''}
                  onChange={(e) => setCurrentBlog({ ...currentBlog, content: e.target.value })}
                  className="w-full bg-[#0d0e11] text-emerald-400 font-mono text-sm p-8 h-[500px] border-none focus:outline-none outline-none resize-none leading-relaxed"
                  placeholder="<h1>Post Title</h1><p>Content paragraphs...</p>"
                />
              )}
            </div>

            {/* RankMath SEO Optimizer Dashboard */}
            <div className="bg-white dark:bg-[#121517] border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <div>
                  <h3 className="font-extrabold text-base tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-red-500" /> RankMath SEO Optimizer
                  </h3>
                  <p className="text-xs text-zinc-400">Configure focus keywords and preview live search simulations</p>
                </div>
              </div>

              {/* Dynamic Google Result Simulator */}
              <div className="space-y-3">
                <span className="block text-xs font-extrabold uppercase tracking-wider text-zinc-450 dark:text-zinc-400">Live Google SERP Simulator</span>
                <div className="bg-zinc-50 dark:bg-[#0c0e10] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 font-sans space-y-1.5 shadow-sm max-w-2xl">
                  <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] uppercase font-black tracking-widest text-zinc-500 scale-90">Ad</span>
                    <span className="truncate">apargo.com &gt; blog &gt; <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{currentBlog?.slug || 'new-post'}</span></span>
                  </div>
                  <a href="#" className="block text-lg md:text-xl font-medium text-blue-850 hover:underline dark:text-blue-400 leading-tight">
                    {currentBlog?.title || 'Please enter post title...'}
                  </a>
                  <p className="text-xs text-zinc-650 dark:text-zinc-400 leading-relaxed line-clamp-2">
                    {seoMetaDescription || 'Write an excerpt in the summary field above to see your live search description snippet simulator load dynamically.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-zinc-150 dark:border-zinc-850">
                <div>
                  <label className="block text-xs font-extrabold text-zinc-450 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Focus Keyword</label>
                  <input
                    type="text"
                    value={focusKeyword}
                    onChange={(e) => setFocusKeyword(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-[#0c0e10] border border-zinc-250/70 dark:border-zinc-800/60 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 focus:outline-none"
                    placeholder="e.g. decision, checklist, split pdf"
                  />
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-550 mt-1.5">SEO score parses keyword presence dynamically.</p>
                </div>

                <div className="space-y-2">
                  <span className="block text-xs font-extrabold uppercase tracking-wider text-zinc-450 dark:text-zinc-400">SEO Real-time Audits</span>
                  {focusKeyword.trim() ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto p-3 bg-zinc-50 dark:bg-[#0c0e10] border border-zinc-200 dark:border-zinc-800/80 rounded-xl">
                      {seoChecklist.map((check) => (
                        <div key={check.id} className="flex items-center gap-2 text-xs">
                          {check.success ? (
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                          ) : (
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
                          )}
                          <span className={check.success ? 'text-zinc-700 dark:text-zinc-300 font-medium' : 'text-zinc-400 italic line-through'}>
                            {check.text} ({check.weight}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-4 bg-zinc-50 dark:bg-[#0c0e10] border border-zinc-200 dark:border-zinc-800/80 rounded-xl text-zinc-400 text-xs italic">
                      <AlertCircle size={14} className="text-zinc-450" /> Focus keyword required for live audits
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Area (1/3 width) */}
          <div className="space-y-6">
            
            {/* Publish Settings */}
            <div className="bg-white dark:bg-[#121517] border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 space-y-4">
              <h3 className="font-extrabold text-sm border-b border-zinc-100 dark:border-zinc-800/60 pb-3 flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
                <Settings size={16} className="text-red-500" /> Publish Settings
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1.5">Post Visibility Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-zinc-50 dark:bg-[#0c0e10] border border-zinc-250/70 dark:border-zinc-800/60 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none cursor-pointer"
                  >
                    <option value="draft">Hidden / Draft</option>
                    <option value="published">Live / Published</option>
                    <option value="scheduled">Scheduled Live</option>
                  </select>
                </div>

                {status === 'scheduled' && (
                  <div className="p-3 bg-zinc-50 dark:bg-[#0d0f11] rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2 animate-in fade-in slide-in-from-top-3 duration-300">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-450 dark:text-zinc-500">Scheduled Date & Time</label>
                    <div className="relative">
                      <CalendarIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500" />
                      <input
                        type="datetime-local"
                        value={currentBlog?.published_at}
                        onChange={(e) => setCurrentBlog({ ...currentBlog, published_at: e.target.value })}
                        className="w-full bg-white dark:bg-[#121517] border border-zinc-200 dark:border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-900 dark:text-zinc-50 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-between gap-3">
                  <button
                    onClick={handleBack}
                    className="flex-1 py-3 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/40 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/65 rounded-xl font-bold text-xs text-center transition-all text-zinc-700 dark:text-zinc-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSave()}
                    className="flex-1 py-3 bg-red-650 hover:bg-red-700 text-white rounded-xl font-bold text-xs text-center transition-all shadow-md shadow-red-500/10"
                  >
                    Update Post
                  </button>
                </div>
              </div>
            </div>

            {/* Categories & Tags */}
            <div className="bg-white dark:bg-[#121517] border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 space-y-4">
              <h3 className="font-extrabold text-sm border-b border-zinc-100 dark:border-zinc-800/60 pb-3 flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
                <Bookmark size={16} className="text-red-500" /> Categories & Tags
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1.5">Primary Category</label>
                  <select
                    value={currentBlog?.category}
                    onChange={(e) => {
                      const newList = [e.target.value, ...(currentBlog?.category_list || []).filter(c => c !== e.target.value)];
                      setCurrentBlog({ ...currentBlog, category: e.target.value, category_list: newList });
                    }}
                    className="w-full bg-zinc-50 dark:bg-[#0c0e10] border border-zinc-250/70 dark:border-zinc-800/60 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none cursor-pointer"
                  >
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">Article Tags</label>
                  <div className="p-3 bg-zinc-50 dark:bg-[#0c0e10] border border-zinc-250/70 dark:border-zinc-800/60 rounded-xl min-h-[90px] space-y-3">
                    <input
                      type="text"
                      placeholder="Type tag and press Enter..."
                      className="bg-transparent border-none p-0 text-xs text-zinc-900 dark:text-zinc-50 focus:outline-none w-full focus:ring-0"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (val) {
                            const cur = currentBlog?.category_list || [];
                            if (!cur.includes(val)) {
                              setCurrentBlog({ ...currentBlog, category_list: [...cur, val] });
                            }
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {(currentBlog?.category_list || []).map((tag, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-200/70 dark:bg-zinc-800 border border-zinc-300/40 dark:border-zinc-700/50 text-[10px] font-bold text-zinc-700 dark:text-zinc-350">
                          {tag}
                          <button
                            onClick={() => {
                              const cur = currentBlog?.category_list || [];
                              setCurrentBlog({ ...currentBlog, category_list: cur.filter(t => t !== tag) });
                            }}
                            className="text-zinc-400 hover:text-red-500 transition-colors"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Featured Image */}
            <div className="bg-white dark:bg-[#121517] border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 space-y-4">
              <h3 className="font-extrabold text-sm border-b border-zinc-100 dark:border-zinc-800/60 pb-3 flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
                <ImageIcon size={16} className="text-red-500" /> Featured Image
              </h3>

              <div className="space-y-4">
                {currentBlog?.image_url ? (
                  <div className="relative group rounded-2xl overflow-hidden border border-zinc-250/70 dark:border-zinc-800/65 bg-zinc-50 dark:bg-zinc-900 max-h-48 flex items-center justify-center">
                    <img src={currentBlog.image_url} alt="Featured" className="w-full h-40 object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => copyToClipboard(currentBlog.image_url!)}
                        className="p-2 bg-zinc-900 rounded-lg text-white hover:bg-zinc-800"
                        title="Copy URL"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={() => setCurrentBlog({ ...currentBlog, image_url: '' })}
                        className="p-2 bg-red-650 rounded-lg text-white hover:bg-red-700"
                        title="Remove"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-red-550/40 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-all cursor-pointer group">
                      {uploadingImage ? (
                        <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
                      ) : (
                        <>
                          <Upload size={20} className="text-zinc-400 group-hover:text-red-500 mb-2 transition-colors" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-450">Upload Thumbnail</span>
                        </>
                      )}
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                    </label>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <LinkIcon size={12} className="text-zinc-450" />
                      </div>
                      <input
                        type="text"
                        placeholder="Paste image link directly..."
                        className="w-full bg-zinc-50 dark:bg-[#0c0e10] border border-zinc-250/70 dark:border-zinc-800/60 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
                        onBlur={(e) => {
                          if (e.target.value) setCurrentBlog({ ...currentBlog, image_url: e.target.value });
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Author Details Preview */}
            <div className="bg-white dark:bg-[#121517] border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 space-y-4">
              <h3 className="font-extrabold text-sm border-b border-zinc-100 dark:border-zinc-800/60 pb-3 flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
                <Users size={16} className="text-red-500" /> Author Details
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1">Author Name</label>
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-[#0c0e10] border border-zinc-250/70 dark:border-zinc-800/60 rounded-lg px-2.5 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1">Author Role</label>
                    <input
                      type="text"
                      value={authorRole}
                      onChange={(e) => setAuthorRole(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-[#0c0e10] border border-zinc-250/70 dark:border-zinc-800/60 rounded-lg px-2.5 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Author Preview Card */}
                <div className="bg-zinc-50 dark:bg-[#0c0e10] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 flex items-center gap-3">
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${authorAvatarSeed}`}
                    alt={authorName}
                    className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white"
                  />
                  <div>
                    <h5 className="text-xs font-bold text-zinc-900 dark:text-zinc-50">{authorName}</h5>
                    <p className="text-[10px] text-zinc-450 dark:text-zinc-400 font-semibold">{authorRole}</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* CMS Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight leading-tight">AIS Blogs & Content</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Write dynamic articles, configure meta tags, and audit SEO ranks.</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-red-650 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-red-600/20"
        >
          <Plus size={16} /> Create New Post
        </button>
      </div>

      {/* Primary Pill Tab Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', name: 'All', count: counts.all },
          { id: 'published', name: 'Published', count: counts.published },
          { id: 'draft', name: 'Drafts', count: counts.draft },
          { id: 'scheduled', name: 'Scheduled', count: counts.scheduled }
        ].map((tab) => {
          const isActive = activeStatusTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveStatusTab(tab.id as any)}
              className={`px-5 py-2.5 rounded-full text-xs font-bold border transition-all flex items-center gap-2 ${
                isActive 
                  ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900' 
                  : 'bg-white dark:bg-[#121517] border-zinc-200 dark:border-zinc-800 text-zinc-450 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50'
              }`}
            >
              <span>{tab.name}</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                isActive 
                  ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-800' 
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table & Filtering Shell Container */}
      <div className="bg-white dark:bg-[#121517] border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-5 space-y-4 shadow-sm relative overflow-hidden">
        
        {/* Secondary Inner Filter Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-850 dark:text-zinc-200">
            <span>Article Directory</span>
            <span className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
            <span className="text-zinc-400 text-[10px] font-medium">{filteredBlogs.length} articles matching</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Table Search Input */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search title, keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-[#0c0e10] border border-zinc-200/70 dark:border-zinc-800/60 rounded-xl pl-9.5 pr-4 py-2.5 text-xs text-zinc-900 dark:text-zinc-50 focus:outline-none"
              />
            </div>

            {/* Category selection */}
            <div className="relative group/filter w-full sm:w-auto">
              <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 w-3.5 h-3.5" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full sm:w-auto bg-zinc-50 dark:bg-[#0c0e10] border border-zinc-200/70 dark:border-zinc-800/60 rounded-xl pl-9.5 pr-8 py-2.5 text-xs font-bold text-zinc-550 dark:text-zinc-400 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Directory Table View */}
        <div className="overflow-x-auto rounded-2xl border border-zinc-150 dark:border-zinc-850">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/70 dark:bg-[#101315]/40 border-b border-zinc-150 dark:border-zinc-850">
                <th className="px-6 py-4.5 w-10">
                  <input type="checkbox" className="w-4 h-4 rounded bg-white dark:bg-[#0c0e10] border-zinc-300 dark:border-zinc-700 text-red-650 focus:ring-red-500" />
                </th>
                <th className="px-6 py-4.5 text-[10px] font-black text-zinc-450 dark:text-zinc-500 uppercase tracking-widest">Title</th>
                <th className="px-6 py-4.5 text-[10px] font-black text-zinc-450 dark:text-zinc-500 uppercase tracking-widest">Author</th>
                <th className="px-6 py-4.5 text-[10px] font-black text-zinc-450 dark:text-zinc-500 uppercase tracking-widest">Category</th>
                <th className="px-6 py-4.5 text-[10px] font-black text-zinc-450 dark:text-zinc-500 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4.5 text-[10px] font-black text-zinc-450 dark:text-zinc-500 uppercase tracking-widest">SEO Rating</th>
                <th className="px-6 py-4.5 text-[10px] font-black text-zinc-450 dark:text-zinc-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-150 dark:divide-zinc-850 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-550 dark:text-zinc-400">
                    <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-red-500" />
                    Searching article databases...
                  </td>
                </tr>
              ) : filteredBlogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-zinc-450 dark:text-zinc-500 font-semibold italic">
                    No articles found matching directory criteria.
                  </td>
                </tr>
              ) : filteredBlogs.map((blog) => {
                const author = getAuthorForBlog(blog.id);
                const isFuture = new Date(blog.published_at) > new Date();
                
                // Live preview SEO score calculations
                const titleKeyword = (blog.title || '').toLowerCase().includes((blog.title || '').split(' ')[0]?.toLowerCase() || 'pdf');
                const calculatedScore = titleKeyword ? 78 : 45;

                return (
                  <tr key={blog.id} className="hover:bg-zinc-50/50 dark:hover:bg-[#101315]/20 transition-colors group">
                    <td className="px-6 py-4 w-10">
                      <input type="checkbox" className="w-4 h-4 rounded bg-white dark:bg-[#0c0e10] border-zinc-300 dark:border-zinc-700 text-red-650 focus:ring-red-500" />
                    </td>
                    <td className="px-6 py-4 max-w-sm">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-red-500 transition-colors line-clamp-2 leading-snug">{blog.title}</span>
                        <span className="text-[10px] font-mono text-zinc-400 tracking-tight select-all truncate">/{blog.slug}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${author.seed}`}
                          alt={author.name}
                          className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-zinc-850 dark:text-zinc-200 leading-tight">{author.name}</span>
                          <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold">{author.role}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1.5 rounded-full text-[10px] font-bold ${getCategoryPillStyles(blog.category)}`}>
                        {blog.category || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-zinc-600 dark:text-zinc-450 font-bold">{new Date(blog.published_at || blog.created_at).toLocaleDateString()}</span>
                        {blog.is_published ? (
                          isFuture ? (
                            <span className="text-[9px] font-black uppercase tracking-wider text-blue-500">SCHEDULED</span>
                          ) : (
                            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-500">PUBLISHED</span>
                          )
                        ) : (
                          <span className="text-[9px] font-black uppercase tracking-wider text-amber-500">DRAFT</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2.5 py-1 rounded-md text-[9px] font-black ${
                          calculatedScore >= 75
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                            : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400'
                        }`}>
                          {calculatedScore}/100
                        </span>
                        <div className="flex items-center gap-1 opacity-40 hover:opacity-100 text-zinc-450 text-[10px] font-semibold transition-opacity">
                          <Eye size={12} /> 0
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {deletingId === blog.id ? (
                          <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-200">
                            <span className="text-[10px] font-black text-red-500 uppercase tracking-wider">Confirm Delete?</span>
                            <button
                              onClick={() => handleDelete(blog.id)}
                              className="px-2.5 py-1 bg-red-600 hover:bg-red-750 text-white text-[10px] font-bold rounded-lg transition-colors"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="px-2.5 py-1 bg-zinc-150 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-300 text-[10px] font-bold rounded-lg transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(blog)}
                              className="p-2 text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-xl transition-all"
                              title="Edit Article"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => setDeletingId(blog.id)}
                              className="p-2 text-zinc-400 hover:text-red-550 hover:bg-red-500/5 rounded-xl transition-all"
                              title="Delete Article"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
