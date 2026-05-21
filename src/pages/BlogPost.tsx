import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft, Calendar, User, Clock, Share2, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Background } from '../components/Background'
import { SEO } from '../components/SEO'

export function BlogPost() {
  const { slug } = useParams()
  const [post, setPost] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchPost = async () => {
      try {
        const { data, error } = await supabase
          .from('blogs')
          .select('*')
          .eq('slug', slug)
          .eq('is_published', true)
          .single()

        if (error) throw error
        setPost(data)
      } catch (err) {
        console.error('Error fetching post:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPost()
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--accent)]" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <SEO title="Post Not Found" description="The blog post you are looking for does not exist." />
        <h1 className="text-4xl font-bold mb-4">Post Not Found</h1>
        <p className="text-zinc-400 mb-8">The article you're looking for might have been moved or deleted.</p>
        <Link to="/blog" className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold">Return to Blog</Link>
      </div>
    )
  }

  const sharePost = async () => {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: post.title, text: post.description, url }).catch(() => undefined)
      return
    }
    await navigator.clipboard?.writeText(url).catch(() => undefined)
  }

  return (
    <div className="w-full relative pb-24">
      <SEO 
        title={post.title}
        description={post.description}
        canonical={`/blog/${post.slug}`}
        ogType="article"
        image={post.image_url}
      />
      <Background />
      
      <article className="relative z-10 max-w-4xl mx-auto px-4 pt-16 sm:px-6 lg:px-8">
        <Link 
          to="/blog" 
          className="inline-flex items-center gap-2 text-sm font-bold opacity-60 hover:opacity-100 hover:text-[var(--accent)] transition-all mb-10"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Blog
        </Link>

        <header className="mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-4 text-xs font-black uppercase tracking-widest text-[var(--accent)] mb-6">
              {post.category && (
                <span className="bg-[var(--accent-soft)] px-3 py-1 rounded-lg">{post.category}</span>
              )}
              <span className="flex items-center gap-1.5 opacity-60"><Clock className="w-3.5 h-3.5" /> {post.read_time}</span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-black mb-6 leading-tight tracking-tight">
              {post.title}
            </h1>
            
            <div className="flex items-center justify-between py-6 border-y border-[var(--border)]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[var(--surface-hover)] flex items-center justify-center border border-[var(--border)]">
                  <User className="w-6 h-6 opacity-40" />
                </div>
                <div>
                  <p className="text-sm font-bold">PDF Spark Editorial</p>
                  <p className="text-xs opacity-50 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" /> {new Date(post.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={sharePost}
                className="h-10 w-10 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center hover:bg-[var(--surface-hover)] transition-colors"
                aria-label="Share article"
              >
                <Share2 className="w-4 h-4 opacity-60" />
              </button>
            </div>
          </motion.div>
        </header>

        {post.image_url && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="rounded-3xl overflow-hidden mb-12 shadow-2xl border border-[var(--border)] bg-[var(--surface)]"
          >
            <div className="aspect-video flex items-center justify-center overflow-hidden bg-zinc-900">
              <img src={post.image_url} alt="" className="w-full h-full object-cover" />
            </div>
          </motion.div>
        )}

        <div className="max-w-none leading-relaxed">
          {post.description && (
            <p className="text-xl font-medium mb-12 leading-relaxed opacity-85">
              {post.description}
            </p>
          )}

          <div 
            className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-zinc-300 prose-a:text-red-500 prose-strong:text-white prose-img:rounded-2xl prose-img:border prose-img:border-[var(--border)] prose-li:text-zinc-300"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>
      </article>
    </div>
  )
}
