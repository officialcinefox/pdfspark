import React from 'react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { ArrowRight, Calendar, Clock, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Background } from '../components/Background'
import { SEO } from '../components/SEO'
import { Loader2 } from 'lucide-react'
import { cn } from '../lib/utils'

const categories = [
  'All',
  'PDF Management',
  'Conversion Tools',
  'Security Tools',
  'Editing Tools'
]

export function Blog() {
  const [blogs, setBlogs] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [activeCategory, setActiveCategory] = React.useState('All')

  React.useEffect(() => {
    const fetchBlogs = async () => {
      try {
        setLoading(true)
        let query = supabase
          .from('blogs')
          .select('*')
          .eq('is_published', true)
          .lte('published_at', new Date().toISOString())
          .order('created_at', { ascending: false });

        if (activeCategory !== 'All') {
          query = query.contains('category_list', [activeCategory]);
        }

        const { data, error } = await query

        if (error) throw error
        setBlogs(data || [])
      } catch (err) {
        console.error('Error fetching blogs:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchBlogs()
  }, [activeCategory])

  return (
    <div className="w-full flex-col relative pb-24">
      <SEO 
        title="PDF Insights & Productivity Blog"
        description="Discover original PDF tutorials, document security tips, conversion guides, and productivity workflows from PDF Spark."
        canonical="/blog"
      />
      <Background />
      
      <section className="relative px-4 pt-24 pb-16 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative z-10"
        >
          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
            Latest from our <span className="text-[var(--accent)]">Blog</span>
          </h1>
          <p className="text-xl opacity-65 max-w-2xl mx-auto mb-12">
            Insights, tutorials, and news about PDF management and digital productivity.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-bold transition-all border",
                  activeCategory === cat
                    ? "bg-[var(--accent)] border-[var(--accent)] text-white shadow-lg shadow-red-500/20"
                    : "bg-[var(--surface)] border-[var(--border)] text-zinc-400 hover:text-[var(--foreground)] hover:border-[var(--foreground)]/20"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-[var(--accent)]" />
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-20 opacity-50 font-bold">
            No blog posts available yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogs.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="glass-panel group rounded-3xl overflow-hidden flex flex-col h-full hover:bg-[var(--surface-hover)] transition-all duration-500 hover:-translate-y-2"
              >
                <div className="relative h-56 overflow-hidden bg-[linear-gradient(135deg,var(--surface),var(--accent-soft))] flex items-center justify-center">
                  {post.image_url ? (
                    <img 
                      src={post.image_url} 
                      alt={post.title} 
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 shadow-xl"
                    />
                  ) : (
                    <span className="text-4xl font-bold opacity-10">PDF</span>
                  )}
                  <div className="absolute top-4 left-4 bg-[var(--accent)] text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg">
                    {post.category}
                  </div>
                </div>
                
                <div className="p-8 flex flex-col flex-1">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs opacity-50 mb-4 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {new Date(post.created_at).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1.5"><User className="w-3 h-3" /> Admin</span>
                    <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {post.read_time}</span>
                  </div>
                  
                  <h3 className="text-2xl font-bold mb-4 line-clamp-2 leading-tight group-hover:text-[var(--accent)] transition-colors text-[var(--foreground)]">
                    {post.title}
                  </h3>
                  
                  <p className="opacity-60 text-base leading-relaxed mb-8 line-clamp-3 text-[var(--foreground)]">
                    {post.description}
                  </p>
                  
                  <Link 
                    to={`/blog/${post.slug}`}
                    className="mt-auto inline-flex items-center gap-2 text-[var(--accent)] font-bold text-sm uppercase tracking-widest hover:gap-4 transition-all"
                  >
                    Read Article <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
