import React from 'react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { ArrowRight, FileOutput, Shield, Star, Zap, Calendar, Clock, Loader2 } from 'lucide-react'
import * as Accordion from '@radix-ui/react-accordion'
import { Background } from '../components/Background'
import { TOOL_CATEGORIES, getCategoryPath } from '../lib/toolsData'
import { SEO } from '../components/SEO'
import { supabase } from '../lib/supabase'

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export function Home() {
  const [latestBlogs, setLatestBlogs] = React.useState<any[]>([])
  const [faqs, setFaqs] = React.useState<FAQ[]>([])
  const [blogsLoading, setBlogsLoading] = React.useState(true)
  const [loadingFaqs, setLoadingFaqs] = React.useState(true)

  React.useEffect(() => {
    const fetchLatestBlogs = async () => {
      try {
        const { data, error } = await supabase
          .from('blogs')
          .select('*')
          .eq('is_published', true)
          .lte('published_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(3)

        if (error) throw error
        setLatestBlogs(data || [])
      } catch (err) {
        console.error('Error fetching latest blogs:', err)
      } finally {
        setBlogsLoading(false)
      }
    }

    const fetchGeneralFaqs = async () => {
      try {
        const { data, error } = await supabase
          .from('faqs')
          .select('id, question, answer')
          .contains('category_list', ['General'])
          .eq('is_published', true)
          .order('order_index', { ascending: true })
          .limit(6);

        if (error) throw error;
        setFaqs(data || []);
      } catch (err) {
        console.error('Error fetching FAQs:', err);
      } finally {
        setLoadingFaqs(false);
      }
    };

    fetchLatestBlogs()
    fetchGeneralFaqs()
  }, [])

  return (
    <div className="w-full flex-col relative">
      <SEO 
        title="Best Free Online PDF Tools"
        description="Experience the ultimate PDF toolkit with our secure, professional, and fast browser-based solution. Merge, split, compress, and edit PDFs for free without any login."
        canonical="/"
      />
      <Background />

      <section className="relative px-4 pt-4 pb-12 sm:pt-24 sm:pb-28 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative z-10"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center rounded-full bg-[var(--surface)]/80 px-4 py-2 text-[10px] sm:text-sm font-bold text-[var(--accent)] ring-1 ring-[var(--border)] mb-6 sm:mb-8"
          >
            <Star className="w-3 h-3 sm:w-4 sm:h-4 mr-2 fill-current" /> Premium PDF Toolkit - 100% Private & Secure
          </motion.div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-6 sm:mb-8 leading-[1.1] max-w-4xl mx-auto tracking-tight">
            Professional PDF Tools <br className="hidden md:block" />
            <span className="text-[var(--accent)]">Simplified for Everyone.</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-[var(--foreground)] opacity-75 max-w-2xl mx-auto mb-8 sm:mb-12 leading-relaxed font-medium">
            Merge, split, compress, convert, protect, and organize PDFs with browser-first workflows and no account wall.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
            <Link
              to="/tools"
              className="inline-flex w-full sm:w-auto h-14 sm:h-16 items-center justify-center rounded-2xl bg-[var(--accent)] px-10 text-lg sm:text-xl font-bold text-white hover:bg-[var(--accent-hover)] hover:scale-[1.02] transition-all shadow-lg shadow-red-600/20"
            >
              Get Started Free
            </Link>
            <a
              href="#services"
              className="group inline-flex w-full sm:w-auto h-14 sm:h-16 items-center justify-center rounded-2xl px-10 text-lg sm:text-xl font-bold hover:bg-[var(--surface-hover)] border border-[var(--border)] backdrop-blur-sm transition-colors"
            >
              Explore Services
              <ArrowRight className="ml-3 w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-2 transition-transform" />
            </a>
          </div>
        </motion.div>
      </section>

      <section id="services" className="py-16 sm:py-28 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {TOOL_CATEGORIES.map((category) => (
            <div key={category.title} className="mb-28 last:mb-0">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="mb-8 lg:mb-14 grid gap-4 lg:gap-6 lg:grid-cols-[minmax(0,420px)_minmax(360px,540px)] lg:items-center lg:justify-between"
              >
                <h2 className="section-title text-gradient mb-0">{category.title}</h2>
                <div className="lg:text-right lg:ml-auto">
                  <p className="text-base sm:text-lg opacity-65 leading-relaxed max-w-2xl lg:max-w-[540px]">
                    {category.homeDescription}
                  </p>
                  <Link
                    to={getCategoryPath(category)}
                    className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 text-sm font-bold text-white hover:bg-[var(--accent-hover)] transition-colors"
                  >
                    Explore More
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-7">
                {category.tools.slice(0, 8).map((tool, index) => (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.04 }}
                    key={tool.id}
                  >
                    <Link to={tool.path} className="block h-full group">
                      <div className="tool-card h-full flex flex-col items-start glass-panel hover:bg-[var(--surface-hover)] transition-colors">
                        <div className={`p-3 rounded-2xl mb-7 shadow-inner ${tool.color} group-hover:scale-105 transition-transform duration-500`}>
                          {tool.icon}
                        </div>
                        <h3 className="text-xl font-bold mb-3">{tool.title}</h3>
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
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 sm:py-28 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-panel rounded-3xl p-10 md:p-16 overflow-hidden relative">
            <div className="relative z-10 text-center mb-12">
              <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight">Why Professionals Trust PDF Spark</h2>
              <p className="opacity-70 max-w-2xl mx-auto text-base sm:text-lg">Document processing that feels polished, private, and fast.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
              {[
                {
                  title: 'Instant Processing',
                  description: 'Most tools run directly in your browser. No waiting, no slow upload queue.',
                  icon: <Zap className="w-10 h-10 text-[var(--premium-warm)]" />
                },
                {
                  title: 'Real Protection',
                  description: 'Password lock now creates an encrypted PDF that asks for a password in readers.',
                  icon: <Shield className="w-10 h-10 text-[var(--accent)]" />
                },
                {
                  title: 'Professional Output',
                  description: 'Clean workflows, focused controls, and output files ready for everyday work.',
                  icon: <FileOutput className="w-10 h-10 text-[var(--premium)]" />
                }
              ].map((feature, index) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  key={feature.title}
                  className="group"
                >
                  <div className="w-20 h-20 bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex items-center justify-center mb-7 shadow-xl group-hover:-rotate-3 transition-transform">
                    {feature.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                  <p className="opacity-65 text-lg leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-28 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="mb-8 lg:mb-14 grid gap-4 lg:gap-6 lg:grid-cols-[minmax(0,420px)_minmax(360px,540px)] lg:items-center lg:justify-between"
          >
            <h2 className="section-title text-gradient mb-0">Latest Articles</h2>
            <div className="lg:text-right lg:ml-auto">
              <p className="text-base sm:text-lg opacity-65 leading-relaxed max-w-2xl lg:max-w-xl">
                Read focused PDF tips, security notes, and workflow guides that help you finish document tasks with less friction.
              </p>
              <Link
                to="/blog"
                className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 text-sm font-bold text-white hover:bg-[var(--accent-hover)] transition-colors"
              >
                Explore More
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogsLoading ? (
              <div className="col-span-full flex justify-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
              </div>
            ) : latestBlogs.length === 0 ? (
              <div className="col-span-full text-center py-10 opacity-50 font-bold">
                No articles published yet.
              </div>
            ) : (
              latestBlogs.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                >
                  <Link to={`/blog/${post.slug}`} className="block h-full group">
                    <div className="glass-panel group rounded-3xl overflow-hidden flex flex-col h-full hover:bg-[var(--surface-hover)] transition-all duration-500 hover:-translate-y-2">
                      <div className="relative h-52 overflow-hidden bg-[linear-gradient(135deg,var(--surface),var(--accent-soft))] flex items-center justify-center">
                        {post.image_url ? (
                          <img 
                            src={post.image_url} 
                            alt={post.title} 
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 shadow-xl"
                          />
                        ) : (
                          <span className="text-4xl font-bold opacity-10 text-white">PDF</span>
                        )}
                        {post.category && (
                          <div className="absolute top-4 left-4 bg-[var(--accent)] text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg">
                            {post.category}
                          </div>
                        )}
                      </div>
                      
                      <div className="p-7 flex flex-col flex-1">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] opacity-50 mb-4 font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {new Date(post.created_at).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {post.read_time}</span>
                        </div>
                        
                        <h3 className="text-xl font-bold mb-3 line-clamp-2 leading-snug group-hover:text-[var(--accent)] transition-colors text-[var(--foreground)]">
                          {post.title}
                        </h3>
                        
                        <p className="opacity-60 text-sm leading-relaxed mb-6 line-clamp-3 text-[var(--foreground)]">
                          {post.description}
                        </p>
                        
                        <div className="mt-auto flex items-center text-[var(--accent)] font-bold text-xs uppercase tracking-widest group-hover:gap-3 transition-all">
                          Read More <ArrowRight className="ml-2 w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-28 bg-[var(--surface)]/30 backdrop-blur-sm border-y border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black mb-4 tracking-tight">Common Questions</h2>
            <p className="opacity-70 text-base sm:text-lg">Everything you need to know about PDF Spark.</p>
          </div>

          <Accordion.Root type="single" collapsible className="space-y-5">
            {loadingFaqs ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
              </div>
            ) : faqs.length > 0 ? (
              faqs.map((faq, index) => (
                <Accordion.Item key={faq.id} value={`item-${index}`} className="border border-[var(--border)] rounded-2xl overflow-hidden bg-[var(--surface)]/80 backdrop-blur-md">
                  <Accordion.Header>
                    <Accordion.Trigger className="w-full flex justify-between items-center p-7 text-left font-bold text-xl hover:bg-[var(--surface-hover)] transition-all data-[state=open]:text-[var(--accent)]">
                      {faq.question}
                    </Accordion.Trigger>
                  </Accordion.Header>
                  <Accordion.Content className="p-7 pt-0 text-lg opacity-70 leading-relaxed overflow-hidden data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown">
                    {faq.answer}
                  </Accordion.Content>
                </Accordion.Item>
              ))
            ) : (
              <p className="text-center italic opacity-40">No FAQs available at the moment.</p>
            )}
          </Accordion.Root>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="p-10 md:p-16 rounded-[2rem] bg-gradient-to-br from-zinc-950 via-zinc-900 to-neutral-950 text-white shadow-2xl relative overflow-hidden group border border-zinc-800/80"
          >
            {/* Ambient Red glow background layers */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(239,68,68,0.12),transparent_70%)] opacity-100"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(239,68,68,0.22),transparent_50%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            
            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 tracking-tight leading-tight">
                Ready to Spark Your PDFs?
              </h2>
              <p className="text-base sm:text-lg text-zinc-400 mb-8 max-w-xl mx-auto leading-relaxed">
                Upgrade your PDF workflow with a cleaner, faster, and browser-first secure toolkit.
              </p>
              <Link
                to="/tools"
                className="inline-flex h-14 sm:h-15 items-center justify-center rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 px-10 text-base sm:text-lg font-bold text-white shadow-lg shadow-red-900/10 hover:from-red-500 hover:to-rose-600 hover:scale-[1.02] hover:shadow-red-500/20 transition-all duration-300 border border-red-500/20"
              >
                Explore All Tools Now
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
