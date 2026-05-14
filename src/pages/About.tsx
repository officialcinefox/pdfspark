import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, FileText, ShieldCheck, Timer, Loader2 } from 'lucide-react'
import { motion } from 'motion/react'
import { Background } from '../components/Background'
import { SEO } from '../components/SEO'
import { SITE } from '../lib/siteConfig'
import { supabase } from '../lib/supabase'
import * as Accordion from '@radix-ui/react-accordion'

const values = [
  {
    title: 'Useful before flashy',
    description: 'Every page is designed around getting a real PDF task finished quickly.',
    icon: CheckCircle2
  },
  {
    title: 'Clear document workflows',
    description: 'Tools explain what they do, what files they accept, and what output you should expect.',
    icon: FileText
  },
  {
    title: 'Respect for privacy',
    description: 'Browser-first tools are preferred whenever possible so everyday files do not need an account.',
    icon: ShieldCheck
  },
  {
    title: 'Fast on mobile and desktop',
    description: 'The interface is built for quick scanning, touch-friendly controls, and direct downloads.',
    icon: Timer
  }
]

export function About() {
  const [faqs, setFaqs] = React.useState<any[]>([])
  const [loadingFaqs, setLoadingFaqs] = React.useState(true)

  React.useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const { data, error } = await supabase
          .from('faqs')
          .select('*')
          .contains('category_list', ['About Us'])
          .eq('is_published', true)
          .order('order_index', { ascending: true });

        if (error) throw error;
        setFaqs(data || []);
      } catch (err) {
        console.error('Error fetching FAQs:', err);
      } finally {
        setLoadingFaqs(false);
      }
    };
    fetchFaqs();
  }, [])

  return (
    <div className="relative min-h-screen">
      <SEO
        title="About Us"
        description="Learn about PDF Spark, a free browser-based PDF toolkit built for simple, fast, and privacy-conscious document workflows."
        canonical="/about"
      />
      <Background />

      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_420px] gap-12 items-start">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-flex rounded-full bg-[var(--accent-soft)] px-4 py-2 text-sm font-bold text-[var(--accent)] ring-1 ring-[var(--border)]">
              About PDF Spark
            </span>
            <h1 className="mt-7 text-4xl md:text-6xl font-black leading-[1.05]">
              A focused PDF toolkit for everyday document work.
            </h1>
            <p className="mt-6 text-lg md:text-xl opacity-70 max-w-3xl leading-relaxed">
              PDF Spark helps students, freelancers, office teams, and small businesses handle common PDF jobs without installing heavy software. The goal is simple: upload the right file, choose a clear setting, and download a polished result.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <Link to="/tools" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 font-bold text-white hover:bg-[var(--accent-hover)] transition-colors">
                Explore Tools
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/blog" className="inline-flex h-12 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 font-bold hover:bg-[var(--surface-hover)] transition-colors">
                Read Guides
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/86 p-7 shadow-sm"
          >
            <h2 className="text-2xl font-black mb-5">What you can do here</h2>
            <div className="space-y-4 text-sm leading-relaxed opacity-75">
              <p>Merge several PDFs into one file, split or extract selected pages, compress large documents, rotate scanned pages, convert images to PDF, add watermarks, and protect sensitive files with passwords.</p>
              <p>We also publish practical PDF tutorials so the website is useful even when you are still deciding which tool fits your task.</p>
              <p>Contact: <a href={`mailto:${SITE.supportEmail}`} className="font-bold text-[var(--accent)]">{SITE.supportEmail}</a></p>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="relative z-10 py-16 bg-[var(--surface)]/45 border-y border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {values.map((item, index) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"
                >
                  <div className="h-11 w-11 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center mb-5">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-black mb-3">{item.title}</h2>
                  <p className="opacity-65 leading-relaxed">{item.description}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-[var(--surface)]/30 backdrop-blur-sm border-t border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">About PDF Spark FAQ</h2>
            <p className="opacity-60 text-lg">Common questions about our mission and technology.</p>
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
                <p className="italic">No mission FAQs available yet.</p>
              </div>
            )}
          </Accordion.Root>
        </div>
      </section>
    </div>
  )
}
