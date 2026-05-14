import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Clock, Mail, MessageSquare, Send, Loader2 } from 'lucide-react'
import { motion } from 'motion/react'
import { Background } from '../components/Background'
import { SEO } from '../components/SEO'
import { getToolById } from '../lib/toolsData'
import { SITE } from '../lib/siteConfig'
import { supabase } from '../lib/supabase'
import * as Accordion from '@radix-ui/react-accordion'
import toast from 'react-hot-toast'

const supportLinks = [
  { label: 'Browse every tool', to: '/tools' },
  { label: 'Read workflow guides', to: '/guides' },
  { label: 'Open security tools', to: '/security' }
]

export function Contact() {
  const [sent, setSent] = React.useState(false)
  const [form, setForm] = React.useState({ name: '', email: '', message: '' })
  const [faqs, setFaqs] = React.useState<any[]>([])
  const [loadingFaqs, setLoadingFaqs] = React.useState(true)
  const mergeTool = getToolById('merge')!
  const lockTool = getToolById('lock')!
  const imageTool = getToolById('image-to-pdf')!

  React.useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const { data, error } = await supabase
          .from('faqs')
          .select('*')
          .contains('category_list', ['Contact Us'])
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

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    
    const toastId = toast.loading('Sending your message...')
    
    try {
      const { error } = await supabase.from('enquiries').insert([
        {
          name: form.name,
          email: form.email,
          message: form.message,
          subject: 'General Support Inquiry',
          status: 'new'
        }
      ]);

      if (error) throw error;

      toast.success('Message sent! We will get back to you soon.', { id: toastId });
      setSent(true)
    } catch (err: any) {
      toast.error('Failed to send message: ' + err.message, { id: toastId });
    }
  }

  return (
    <div className="relative min-h-screen">
      <SEO
        title="Contact Us"
        description="Contact PDF Spark for PDF tool support, feedback, bug reports, and website questions."
        canonical="/contact"
      />
      <Background />

      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-20">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_460px] gap-12 items-start">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--surface)]/80 px-4 py-2 text-sm font-bold text-[var(--accent)] ring-1 ring-[var(--border)]">
              <MessageSquare className="h-4 w-4" />
              Contact PDF Spark
            </span>
            <h1 className="mt-7 text-4xl md:text-6xl font-black leading-[1.05]">
              Need help choosing the right PDF tool?
            </h1>
            <p className="mt-6 text-lg md:text-xl opacity-70 max-w-2xl leading-relaxed">
              Tell us what you are trying to do, or jump into one of the most common workflows below.
            </p>

            <div className="mt-10 grid sm:grid-cols-3 gap-3 max-w-2xl">
              {[mergeTool, lockTool, imageTool].map((tool) => (
                <Link key={tool.id} to={tool.path} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/82 p-4 hover:-translate-y-1 hover:border-[var(--accent)] transition-all">
                  <img src={tool.iconSrc} alt="" aria-hidden="true" className="h-12 w-12 object-contain mb-3" />
                  <span className="block text-sm font-black">{tool.title}</span>
                </Link>
              ))}
            </div>

            <div className="mt-10 space-y-3">
              <div className="flex items-center gap-3 opacity-75">
                <Mail className="h-5 w-5 text-[var(--accent)]" />
                <a href={`mailto:${SITE.supportEmail}`} className="font-semibold hover:text-[var(--accent)] transition-colors">{SITE.supportEmail}</a>
              </div>
              <div className="flex items-center gap-3 opacity-75">
                <Clock className="h-5 w-5 text-[var(--accent)]" />
                <span className="font-semibold">Typical response: one business day</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.12 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/88 p-6 md:p-8 shadow-sm"
          >
            {sent ? (
              <div className="min-h-[420px] flex flex-col items-center justify-center text-center">
                <div className="h-16 w-16 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center mb-5">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-black mb-3">Message noted</h2>
                <p className="opacity-65 leading-relaxed max-w-sm">
                  Your email app should open with the message ready to send. You can also email us directly any time.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSent(false);
                    setForm({ name: '', email: '', message: '' });
                  }}
                  className="mt-7 rounded-xl border border-[var(--border)] px-5 py-3 font-bold hover:bg-[var(--surface-hover)] transition-colors"
                >
                  Write another message
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold mb-2 opacity-70">Name</label>
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 opacity-70">Email</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 opacity-70">Message</label>
                  <textarea
                    required
                    rows={6}
                    value={form.message}
                    onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                    className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                    placeholder="Tell us what PDF task you want to solve."
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 font-bold text-white hover:bg-[var(--accent-hover)] transition-colors"
                >
                  Send Message
                  <Send className="h-4 w-4" />
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-[var(--surface)]/30 backdrop-blur-sm border-t border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">Contact & Support FAQ</h2>
            <p className="opacity-60 text-lg">Quick answers to common support questions.</p>
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
                <p className="italic">No support FAQs available yet.</p>
              </div>
            )}
          </Accordion.Root>
        </div>
      </section>
    </div>
  )
}
