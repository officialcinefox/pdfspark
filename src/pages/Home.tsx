import React from 'react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { ArrowRight, FileOutput, Shield, Star, Zap, Calendar, Clock, Loader2, ShieldCheck, FileText, RefreshCw, ChevronRight } from 'lucide-react'
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

      <section className="relative px-4 pt-10 pb-20 sm:pt-16 sm:pb-24 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center text-left">
          
          {/* Left Column: Text & Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="lg:col-span-7 flex flex-col items-start relative z-10"
          >
            {/* Elegant Pill Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2.5 rounded-full bg-[var(--surface)]/90 backdrop-blur-md px-3.5 py-1.5 text-xs sm:text-sm font-bold text-[var(--foreground)] border border-[var(--border)] mb-8 hover:scale-[1.01] transition-transform cursor-pointer shadow-sm"
            >
              <span className="flex items-center justify-center bg-[var(--accent)] text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">v1.2.0</span>
              <span className="flex items-center text-sm font-bold tracking-tight opacity-90">
                New Security Updates Active <ChevronRight className="w-3.5 h-3.5 ml-1 text-[var(--accent)]" />
              </span>
            </motion.div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6 leading-[1.1] tracking-tight text-[var(--foreground)] max-w-2xl">
              Professional PDF Tools <br />
              <span className="text-[var(--accent)]">Simplified for Everyone.</span>
            </h1>

            {/* Description */}
            <p className="text-base sm:text-lg md:text-xl text-[var(--foreground)] opacity-75 mb-10 leading-relaxed font-medium max-w-xl">
              Merge, split, compress, convert, protect, and organize PDFs with browser-first workflows and 100% secure privacy. No account wall, no logs.
            </p>

            {/* Call to Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mb-10">
              <Link
                to="/tools"
                className="inline-flex w-full sm:w-auto h-14 items-center justify-center rounded-2xl bg-[var(--accent)] px-8 text-base sm:text-lg font-bold text-white hover:bg-[var(--accent-hover)] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-red-600/20 cursor-pointer border-none"
              >
                Get Started Free
              </Link>
              <a
                href="#services"
                className="group inline-flex w-full sm:w-auto h-14 items-center justify-center rounded-2xl px-8 text-base sm:text-lg font-bold hover:bg-[var(--surface-hover)] border border-[var(--border)] bg-[var(--surface)]/45 backdrop-blur-sm transition-colors cursor-pointer"
              >
                Explore Services
                <ArrowRight className="ml-2.5 w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
              </a>
            </div>

            {/* Social Proof */}
            <div className="flex flex-wrap items-center gap-4.5 pt-4 border-t border-[var(--border)] w-full">
              <div className="flex -space-x-3.5">
                {[
                  'https://api.dicebear.com/7.x/avataaars/svg?seed=mohit',
                  'https://api.dicebear.com/7.x/avataaars/svg?seed=jane',
                  'https://api.dicebear.com/7.x/avataaars/svg?seed=phillip',
                  'https://api.dicebear.com/7.x/avataaars/svg?seed=michael',
                  'https://api.dicebear.com/7.x/avataaars/svg?seed=dylan'
                ].map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt="User"
                    className="w-10 h-10 rounded-full border-2 border-[var(--background)] bg-[var(--surface)] hover:scale-105 transition-transform"
                  />
                ))}
              </div>
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  ))}
                  <span className="text-xs font-black ml-1 tracking-tight text-[var(--foreground)]">4.9/5</span>
                </div>
                <p className="text-xs text-[var(--foreground)] opacity-60 font-semibold tracking-tight">
                  Trusted by 10,000+ professionals for painless PDF management.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Illustration & Floating Badges */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.15 }}
            className="lg:col-span-5 relative flex items-center justify-center lg:pl-6"
          >
            {/* Elegant Background Glow and blobs */}
            <div className="absolute w-[360px] h-[360px] rounded-full bg-[var(--accent)]/5 blur-[80px] -z-10 animate-pulse duration-4000"></div>
            <div className="absolute w-[240px] h-[240px] rounded-full bg-red-400/5 blur-[60px] -z-10 -top-10 -right-10"></div>

            {/* Premium Professional Character & Illustration inside glass frame */}
            <div className="relative group rounded-[2.5rem] overflow-hidden border border-[var(--border)] bg-[var(--surface)]/30 backdrop-blur-md p-3 max-w-md w-full hover:scale-[1.01] hover:border-red-500/20 transition-all duration-700 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-tr from-[var(--accent)]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              
              <img
                src="/pdf_hero_girl.png"
                alt="PDF Spark Professional"
                className="w-full h-auto object-cover rounded-3xl drop-shadow-2xl transition-transform duration-700 group-hover:scale-[1.02]"
              />

              {/* Floating Badge 1: Compression Badge */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-8 -left-6 max-w-[210px] flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/80 dark:bg-[#121517]/85 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/60 shadow-xl"
              >
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-xs font-extrabold text-[var(--foreground)]">Report_final.pdf</span>
                  <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mt-0.5">Compressed -68%</span>
                </div>
              </motion.div>

              {/* Floating Badge 2: Encryption Security Badge */}
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                className="absolute bottom-16 -right-4 max-w-[220px] flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/80 dark:bg-[#121517]/85 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/60 shadow-xl"
              >
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-xs font-extrabold text-[var(--foreground)]">AES-256 Security</span>
                  <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider mt-0.5">100% Encrypted</span>
                </div>
              </motion.div>

              {/* Floating Badge 3: Conversion Success */}
              <motion.div
                animate={{ x: [0, -5, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute -bottom-4 left-6 max-w-[190px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white/75 dark:bg-[#121517]/80 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 shadow-lg"
              >
                <div className="p-2 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Word to PDF</span>
                  <span className="text-xs font-extrabold text-emerald-500 mt-0.5">Done Successfully</span>
                </div>
              </motion.div>

            </div>
          </motion.div>

        </div>
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
