import React from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Calendar, Clock, Loader2, HelpCircle } from 'lucide-react'
import { motion } from 'motion/react'
import { Background } from '../components/Background'
import { getCategoryBySlug } from '../lib/toolsData'
import { SEO } from '../components/SEO'
import { supabase } from '../lib/supabase'
import * as Accordion from '@radix-ui/react-accordion'

export function CategoryTools() {
  const { categorySlug } = useParams()
  const category = categorySlug ? getCategoryBySlug(categorySlug) : undefined
  
  const [blogs, setBlogs] = React.useState<any[]>([])
  const [blogsLoading, setBlogsLoading] = React.useState(true)
  const [faqs, setFaqs] = React.useState<any[]>([])
  const [loadingFaqs, setLoadingFaqs] = React.useState(true)

  React.useEffect(() => {
    const fetchRelatedData = async () => {
      if (!category) return
      
      try {
        setBlogsLoading(true)
        const { data: blogData } = await supabase
          .from('blogs')
          .select('*')
          .eq('is_published', true)
          .lte('published_at', new Date().toISOString())
          .contains('category_list', [category.title])
          .order('created_at', { ascending: false })
          .limit(3)

        setBlogs(blogData || [])

        const { data: faqData } = await supabase
          .from('faqs')
          .select('*')
          .eq('is_published', true)
          .contains('category_list', [category.title])
          .order('order_index', { ascending: true })

        setFaqs(faqData || [])
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setBlogsLoading(false)
        setLoadingFaqs(false)
      }
    }

    fetchRelatedData()
  }, [category])

  if (!category) {
    return (
      <div className="relative min-h-screen">
        <SEO title="Tools Section Not Found" description="This PDF tools section is not available." />
        <Background />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <h1 className="text-4xl md:text-5xl font-black mb-5">Section not found</h1>
          <p className="opacity-65 text-lg mb-8">This PDF tools section is not available.</p>
          <Link
            to="/tools"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-[var(--accent)] px-6 font-bold text-white hover:bg-[var(--accent-hover)] transition-colors"
          >
            Back to All Tools
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      <SEO
        title={category.title}
        description={category.description}
        canonical={`/tools/${category.slug}`}
      />
      <Background />

      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        <Link to="/tools" className="inline-flex items-center gap-2 text-sm font-bold opacity-65 hover:opacity-100 transition-opacity mb-10">
          <ArrowLeft className="h-4 w-4" />
          Back to all tools
        </Link>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_460px] lg:items-end">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-flex rounded-full bg-[var(--accent-soft)] px-4 py-2 text-sm font-bold text-[var(--accent)] ring-1 ring-[var(--border)]">
              {category.tools.length} services
            </span>
            <h1 className="mt-6 text-3xl md:text-5xl font-black leading-[1.1] text-[var(--accent)] tracking-tight">
              {category.title}
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="text-base md:text-lg opacity-75 leading-relaxed lg:text-right"
          >
            {category.homeDescription}
          </motion.p>
        </div>
      </section>

      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-7">
          {category.tools.map((tool, index) => (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.03 }}
            >
              <Link to={tool.path} className="block h-full group">
                <div className="tool-card h-full flex flex-col items-start glass-panel hover:bg-[var(--surface-hover)] transition-colors">
                  <div className={`p-3 rounded-2xl mb-7 shadow-inner ${tool.color} group-hover:scale-105 transition-transform duration-500`}>
                    {tool.icon}
                  </div>
                  <h2 className="text-xl font-bold mb-3">{tool.title}</h2>
                  <p className="opacity-65 text-sm leading-relaxed mb-8 flex-1">
                    {tool.description}
                  </p>
                  <div className="mt-auto flex items-center text-[var(--accent)] font-bold text-xs uppercase tracking-wider group-hover:translate-x-2 transition-transform duration-500">
                    Launch Tool <ArrowRight className="ml-2 w-4 h-4" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Related Blogs Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="border-t border-[var(--border)] pt-20">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
            <div>
              <h2 className="text-2xl md:text-3xl font-black mb-3 tracking-tight">Related Guides & Articles</h2>
              <p className="opacity-70 text-base md:text-lg">Learn more about {category.title.toLowerCase()} and productivity.</p>
            </div>
            <Link to="/blog" className="text-[var(--accent)] font-bold hover:underline mb-2">View all articles →</Link>
          </div>

          {blogsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
            </div>
          ) : blogs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {blogs.map((post) => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="group">
                  <div className="glass-panel rounded-2xl overflow-hidden h-full flex flex-col hover:bg-[var(--surface-hover)] transition-all duration-500">
                    <div className="relative h-40 bg-[linear-gradient(135deg,var(--surface),var(--accent-soft))] overflow-hidden">
                      {post.image_url && (
                        <img src={post.image_url} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      )}
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                      <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest opacity-40 mb-3">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(post.created_at).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {post.read_time}</span>
                      </div>
                      <h3 className="text-lg font-bold mb-3 line-clamp-2 group-hover:text-[var(--accent)] transition-colors text-[var(--foreground)]">{post.title}</h3>
                      <p className="text-sm opacity-60 line-clamp-2 mb-6 text-[var(--foreground)]">{post.description}</p>
                      <div className="mt-auto text-[var(--accent)] font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                        Read Guide <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 opacity-40 italic">
              No related articles found for this section.
            </div>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-[var(--surface)]/30 backdrop-blur-sm border-t border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex p-3 bg-red-500/10 rounded-2xl text-red-500 mb-6">
              <HelpCircle size={32} />
            </div>
            <h2 className="text-3xl md:text-4xl font-black mb-4 tracking-tight">Frequently Asked Questions</h2>
            <p className="opacity-70 text-base sm:text-lg">Got questions about {category?.title}? We've got answers.</p>
          </div>

          <Accordion.Root type="single" collapsible className="space-y-4">
            {loadingFaqs ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
              </div>
            ) : faqs.length > 0 ? (
              faqs.map((faq, index) => (
                <Accordion.Item key={faq.id} value={`item-${index}`} className="glass-panel rounded-2xl overflow-hidden hover:bg-[var(--surface-hover)] transition-all">
                  <Accordion.Header>
                    <Accordion.Trigger className="w-full flex justify-between items-center p-6 text-left font-bold text-lg hover:text-[var(--accent)] transition-colors">
                      {faq.question}
                    </Accordion.Trigger>
                  </Accordion.Header>
                  <Accordion.Content className="px-6 pb-6 text-lg opacity-70 leading-relaxed overflow-hidden data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown">
                    {faq.answer}
                  </Accordion.Content>
                </Accordion.Item>
              ))
            ) : (
              <div className="text-center py-12 glass-panel rounded-2xl border-dashed border-2 opacity-40">
                <p className="italic">No specific FAQs for this category yet.</p>
              </div>
            )}
          </Accordion.Root>
        </div>
      </section>
    </div>
  )
}
