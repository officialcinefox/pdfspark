import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import ImageExtension from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import { 
  Plus, Search, Edit2, Trash2, Save, X, Upload, Link as LinkIcon, 
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, 
  Heading1, Heading2, Heading3, Quote, Image as ImageIcon,
  ChevronLeft, Loader2, CheckCircle2, Settings, Calendar as CalendarIcon,
  Copy, Check
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

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-zinc-800 bg-zinc-900 sticky top-0 z-10">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-2 rounded hover:bg-zinc-800 transition-colors ${editor.isActive('bold') ? 'text-red-500 bg-red-500/10' : 'text-zinc-400'}`}
        title="Bold"
      >
        <Bold size={18} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-2 rounded hover:bg-zinc-800 transition-colors ${editor.isActive('italic') ? 'text-red-500 bg-red-500/10' : 'text-zinc-400'}`}
        title="Italic"
      >
        <Italic size={18} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`p-2 rounded hover:bg-zinc-800 transition-colors ${editor.isActive('underline') ? 'text-red-500 bg-red-500/10' : 'text-zinc-400'}`}
        title="Underline"
      >
        <UnderlineIcon size={18} />
      </button>
      <div className="w-px h-6 bg-zinc-800 self-center mx-1" />
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`p-2 rounded hover:bg-zinc-800 transition-colors ${editor.isActive('heading', { level: 1 }) ? 'text-red-500 bg-red-500/10' : 'text-zinc-400'}`}
        title="Heading 1"
      >
        <Heading1 size={18} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-2 rounded hover:bg-zinc-800 transition-colors ${editor.isActive('heading', { level: 2 }) ? 'text-red-500 bg-red-500/10' : 'text-zinc-400'}`}
        title="Heading 2"
      >
        <Heading2 size={18} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`p-2 rounded hover:bg-zinc-800 transition-colors ${editor.isActive('heading', { level: 3 }) ? 'text-red-500 bg-red-500/10' : 'text-zinc-400'}`}
        title="Heading 3"
      >
        <Heading3 size={18} />
      </button>
      <div className="w-px h-6 bg-zinc-800 self-center mx-1" />
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-2 rounded hover:bg-zinc-800 transition-colors ${editor.isActive('bulletList') ? 'text-red-500 bg-red-500/10' : 'text-zinc-400'}`}
        title="Bullet List"
      >
        <List size={18} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-2 rounded hover:bg-zinc-800 transition-colors ${editor.isActive('orderedList') ? 'text-red-500 bg-red-500/10' : 'text-zinc-400'}`}
        title="Ordered List"
      >
        <ListOrdered size={18} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`p-2 rounded hover:bg-zinc-800 transition-colors ${editor.isActive('blockquote') ? 'text-red-500 bg-red-500/10' : 'text-zinc-400'}`}
        title="Blockquote"
      >
        <Quote size={18} />
      </button>
      <div className="w-px h-6 bg-zinc-800 self-center mx-1" />
      <div className="flex items-center gap-1">
        <button
          onClick={() => {
            const url = window.prompt('Enter Image URL');
            if (url) {
              editor.chain().focus().setImage({ src: url }).run();
            }
          }}
          className="p-2 rounded hover:bg-zinc-800 transition-colors text-zinc-400"
          title="Add Image by URL"
        >
          <LinkIcon size={18} />
        </button>
        <label className="p-2 rounded hover:bg-zinc-800 transition-colors text-zinc-400 cursor-pointer" title="Upload Image to Content">
          <ImageIcon size={18} />
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
                toast.success('Image uploaded and inserted', { id: toastId });
              } catch (error: any) {
                toast.error('Upload failed: ' + error.message, { id: toastId });
              }
            }} 
          />
        </label>
      </div>
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
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[400px] p-6 text-white leading-relaxed',
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
    setCurrentBlog({
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
    setStatus('draft');
    editor?.commands.setContent('');
    setIsEditing(true);
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copied to clipboard');
  };

  const handleEdit = (blog: Blog) => {
    const isPublished = blog.is_published;
    const isFuture = new Date(blog.published_at) > new Date();
    
    let currentStatus: 'draft' | 'published' | 'scheduled' = 'draft';
    if (isPublished) {
      currentStatus = isFuture ? 'scheduled' : 'published';
    }

    setCurrentBlog({
      ...blog,
      published_at: blog.published_at ? new Date(blog.published_at).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      category_list: blog.category_list || [blog.category].filter(Boolean)
    });
    setStatus(currentStatus);
    editor?.commands.setContent(blog.content || '');
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    console.log('Finalizing delete for ID:', id);
    
    if (!id) {
      toast.error('Error: Blog ID is missing');
      return;
    }

    const toastId = toast.loading('Deleting blog article...');
    try {
      const { error } = await supabase.from('blogs').delete().eq('id', id);
      
      if (error) {
        console.error('Supabase delete error:', error);
        throw error;
      }
      
      toast.success('Blog deleted successfully', { id: toastId });
      setDeletingId(null);
      fetchBlogs();
    } catch (error: any) {
      console.error('Catch error:', error);
      toast.error('Delete failed: ' + (error.message || 'Unknown error'), { id: toastId });
    }
  };

  const handleSave = async () => {
    if (!currentBlog?.title || !currentBlog?.slug) {
      toast.error('Title and Slug are required');
      return;
    }

    try {
      const isPublished = status !== 'draft';
      const finalPublishedAt = status === 'published' ? new Date().toISOString() : currentBlog.published_at;

      const { id, created_at, ...blogData } = {
        ...currentBlog,
        is_published: isPublished,
        published_at: finalPublishedAt,
        content: editor?.getHTML() || '',
        updated_at: new Date().toISOString(),
      } as any;

      let error;
      if (id) {
        ({ error } = await supabase.from('blogs').update(blogData).eq('id', id));
      } else {
        ({ error } = await supabase.from('blogs').insert([blogData]));
      }

      if (error) throw error;

      toast.success('Blog saved successfully');
      setIsEditing(false);
      setCurrentBlog(null);
      fetchBlogs();
    } catch (error: any) {
      toast.error('Error saving blog: ' + error.message);
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
      toast.success('Image uploaded successfully');
    } catch (error: any) {
      toast.error('Error uploading image: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const filteredBlogs = blogs.filter(blog => 
    blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    blog.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isEditing) {
    return (
      <div className="max-w-5xl mx-auto pb-20">
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => { setIsEditing(false); setCurrentBlog(null); }}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={20} /> Back to Blogs
          </button>
          <div className="flex gap-4">
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all"
            >
              <Save size={18} /> Save Blog
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Editor Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <label className="block text-sm font-bold text-zinc-400 mb-2">Blog Title</label>
              <input 
                type="text" 
                value={currentBlog?.title}
                onChange={(e) => setCurrentBlog({ ...currentBlog, title: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
                placeholder="Enter a catchy title..."
              />
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
              <label className="block text-sm font-bold text-zinc-400 p-6 pb-2">Content</label>
              <MenuBar editor={editor} />
              <style>{`
                .tiptap.prose {
                  color: #ffffff !important;
                  max-width: none;
                }
                .tiptap.prose p, 
                .tiptap.prose h1, 
                .tiptap.prose h2, 
                .tiptap.prose h3, 
                .tiptap.prose li,
                .tiptap.prose strong {
                  color: #ffffff !important;
                }
                .tiptap.prose p {
                  opacity: 0.9;
                }
                .tiptap:focus {
                  outline: none;
                }
              `}</style>
              <EditorContent editor={editor} />
            </div>
          </div>

          {/* Sidebar Settings Section */}
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <Settings size={18} className="text-red-500" />
                Settings
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">URL Slug</label>
                  <input 
                    type="text" 
                    value={currentBlog?.slug}
                    onChange={(e) => setCurrentBlog({ ...currentBlog, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                    placeholder="how-to-merge-pdf"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-3">Categories (Select Multiple)</label>
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto p-2 bg-zinc-800/50 rounded-xl border border-zinc-700">
                    {categories.map((cat) => (
                      <label key={cat} className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-700/50 rounded-lg cursor-pointer transition-colors">
                        <input 
                          type="checkbox"
                          checked={currentBlog?.category_list?.includes(cat)}
                          onChange={(e) => {
                            const currentList = currentBlog?.category_list || [];
                            const newList = e.target.checked 
                              ? [...currentList, cat]
                              : currentList.filter(c => c !== cat);
                            setCurrentBlog({ ...currentBlog, category_list: newList, category: newList[0] || '' });
                          }}
                          className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-red-600 focus:ring-red-500"
                        />
                        <span className="text-sm text-zinc-300">{cat}</span>
                      </label>
                    ))}
                  </div>
                </div>


                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-3">Status</label>
                  <select 
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none mb-4"
                  >
                    <option value="draft">Hidden / Draft</option>
                    <option value="published">Live / Published</option>
                    <option value="scheduled">Scheduled</option>
                  </select>

                  {status === 'scheduled' && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300 bg-zinc-900/50 p-3 rounded-xl border border-zinc-700/50 mt-2">
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2 ml-1">Select Live Date & Time</label>
                      <div className="relative">
                        <CalendarIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500" />
                        <input 
                          type="datetime-local" 
                          value={currentBlog?.published_at}
                          onChange={(e) => setCurrentBlog({ ...currentBlog, published_at: e.target.value })}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                        />
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-2 ml-1 italic">* Post will automatically go live at this time.</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Read Time</label>
                  <input 
                    type="text" 
                    value={currentBlog?.read_time}
                    onChange={(e) => setCurrentBlog({ ...currentBlog, read_time: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                    placeholder="5 min"
                  />
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <ImageIcon size={18} className="text-red-500" />
                Featured Image
              </h3>
              
              <div className="space-y-4">
                {currentBlog?.image_url ? (
                  <div className="relative group rounded-xl overflow-hidden border border-zinc-800 bg-black">
                    <img src={currentBlog.image_url} alt="Featured" className="w-full h-40 object-contain" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button 
                        onClick={() => copyToClipboard(currentBlog.image_url!)}
                        className="p-2 bg-zinc-900 rounded-lg text-white hover:bg-zinc-800"
                        title="Copy URL"
                      >
                        <Copy size={16} />
                      </button>
                      <button 
                        onClick={() => setCurrentBlog({ ...currentBlog, image_url: '' })}
                        className="p-2 bg-red-600 rounded-lg text-white hover:bg-red-700"
                        title="Remove"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-zinc-800 rounded-xl hover:border-red-500/50 transition-colors cursor-pointer group">
                      {uploadingImage ? (
                        <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
                      ) : (
                        <>
                          <Upload size={24} className="text-zinc-500 group-hover:text-red-500 mb-2" />
                          <span className="text-xs font-bold text-zinc-500 uppercase">Upload Image</span>
                        </>
                      )}
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                    </label>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <LinkIcon size={14} className="text-zinc-500" />
                      </div>
                      <input 
                        type="text"
                        placeholder="Paste Image URL..."
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                        onBlur={(e) => {
                          if (e.target.value) setCurrentBlog({ ...currentBlog, image_url: e.target.value });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setCurrentBlog({ ...currentBlog, image_url: (e.target as HTMLInputElement).value });
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Short Description</label>
              <textarea 
                value={currentBlog?.description}
                onChange={(e) => setCurrentBlog({ ...currentBlog, description: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none min-h-[100px]"
                placeholder="Brief summary of the blog post..."
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Manage Blogs</h1>
          <p className="text-zinc-400">Total {blogs.length} articles published</p>
        </div>
        <button 
          onClick={handleCreateNew}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-500/20"
        >
          <Plus size={20} /> Create New Post
        </button>
      </div>

      {/* Search and Filters */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
        <input 
          type="text" 
          placeholder="Search articles by title or slug..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-red-500/30"
        />
      </div>

      {/* Blog List Table */}
      <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-950/50">
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Article</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Category</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                  Loading articles...
                </td>
              </tr>
            ) : filteredBlogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 font-medium">
                  No blog posts found. Create your first one!
                </td>
              </tr>
            ) : filteredBlogs.map((blog) => (
              <tr key={blog.id} className="hover:bg-zinc-800/30 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-zinc-800 rounded-lg overflow-hidden shrink-0 border border-zinc-700 flex items-center justify-center">
                      {blog.image_url ? (
                        <img src={blog.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="text-zinc-600 w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate">{blog.title}</div>
                      <div className="text-xs text-zinc-500 truncate">/{blog.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {blog.is_published ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                      <CheckCircle2 size={10} /> Published
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-widest">
                      Draft
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {(blog.category_list || [blog.category]).filter(Boolean).slice(0, 2).map((cat, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 border border-zinc-700 whitespace-nowrap">
                        {cat}
                      </span>
                    ))}
                    {(blog.category_list || [blog.category]).filter(Boolean).length > 2 && (
                      <span className="text-[10px] text-zinc-500">+{blog.category_list.length - 2} more</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-zinc-500 font-medium">
                    {new Date(blog.created_at).toLocaleDateString()}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {deletingId === blog.id ? (
                      <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                        <span className="text-[10px] font-bold text-red-500 uppercase mr-2">Delete?</span>
                        <button 
                          onClick={() => handleDelete(blog.id)}
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
                          onClick={() => handleEdit(blog)}
                          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                          title="Edit Post"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => setDeletingId(blog.id)}
                          className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete Post"
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
