import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, CheckCircle2, Loader2 } from 'lucide-react'
import { motion } from 'motion/react'
import { Background } from '../components/Background'
import { getToolById } from '../lib/toolsData'
import { SEO } from '../components/SEO'
import { supabase } from '../lib/supabase'
import * as Accordion from '@radix-ui/react-accordion'

const workflows = [
  {
    title: 'Combine a document pack',
    description: 'Turn several PDFs into one clean file, then reduce the size before sharing.',
    tools: ['merge', 'compress'],
    steps: ['Upload all PDFs', 'Drag files into order', 'Merge, then compress the output']
  },
  {
    title: 'Send only selected pages',
    description: 'Extract the exact pages you need and keep the original document unchanged.',
    tools: ['split', 'extract-pages'],
    steps: ['Pick the source PDF', 'Choose the page range', 'Download the smaller PDF']
  },
  {
    title: 'Create a PDF from images',
    description: 'Convert screenshots, scans, and photos into one ordered PDF.',
    tools: ['image-to-pdf', 'rotate'],
    steps: ['Add images', 'Arrange the order', 'Choose page size and convert']
  },
  {
    title: 'Protect before sharing',
    description: 'Lock a sensitive document and keep the password separate from the file.',
    tools: ['lock', 'digital-signature'],
    steps: ['Upload the PDF', 'Set a strong password', 'Download the protected file']
  }
]

export function Guides() {
  const [faqs, setFaqs] = React.useState<any[]>([])
  const [loadingFaqs, setLoadingFaqs] = React.useState(true)

  React.useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const { data, error } = await supabase
          .from('faqs')
          .select('*')
          .contains('category_list', ['Guide'])
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
        title="PDF Workflow Guides"
        description="Follow quick PDF workflow guides for merging, compressing, extracting, converting, rotating, and protecting documents."
        canonical="/guides"
      />
      <Background />

      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-14">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--surface)]/80 px-4 py-2 text-sm font-bold text-[var(--accent)] ring-1 ring-[var(--border)]">
            <BookOpen className="h-4 w-4" />
            PDF workflow guides
          </span>
          <h1 className="mt-7 text-3xl md:text-5xl font-black leading-[1.1] tracking-tight">
            Common PDF jobs, already mapped out.
          </h1>
          <p className="mt-6 text-base md:text-lg opacity-75 leading-relaxed">
            Use these quick paths when you know the result you want but do not want to hunt through every tool first.
          </p>
        </motion.div>
      </section>

      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid md:grid-cols-2 gap-6">
          {workflows.map((workflow, index) => {
            const tools = workflow.tools.map((id) => getToolById(id)!).filter(Boolean)
            return (
              <motion.article
                key={workflow.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.06 }}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/84 p-7"
              >
                <div className="flex items-start justify-between gap-5 mb-6">
                  <div>
                    <h2 className="text-2xl font-black">{workflow.title}</h2>
                    <p className="mt-3 opacity-65 leading-relaxed">{workflow.description}</p>
                  </div>
                  <div className="flex -space-x-3 shrink-0">
                    {tools.map((tool) => (
                      <img key={tool.id} src={tool.iconSrc} alt="" aria-hidden="true" className="h-12 w-12 rounded-2xl ring-4 ring-[var(--surface)]" />
                    ))}
                  </div>
                </div>

                <ol className="space-y-3 mb-6">
                  {workflow.steps.map((step, stepIndex) => (
                    <li key={step} className="flex gap-3 text-sm font-medium opacity-75">
                      <span className="h-6 w-6 shrink-0 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center text-xs font-black">
                        {stepIndex + 1}
                      </span>
                      <span className="pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>

                <div className="flex flex-wrap gap-2">
                  {tools.map((tool) => (
                    <Link key={tool.id} to={tool.path} className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-2 text-sm font-bold hover:bg-[var(--surface-hover)] transition-colors">
                      {tool.title}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ))}
                </div>
              </motion.article>
            )
          })}
        </div>
      </section>

      <section className="relative z-10 py-16 bg-[var(--surface)]/45 border-y border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[360px_minmax(0,1fr)] gap-10 items-start">
            <div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight">Quick PDF checklist</h2>
              <p className="mt-3 opacity-70 text-base leading-relaxed">
                A few small habits make PDF sharing easier, especially when documents move between teams, clients, or devices.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                'Rename the final file clearly.',
                'Compress large PDFs before email.',
                'Lock sensitive documents before sharing.',
                'Keep original files until the new PDF is verified.'
              ].map((item) => (
                <div key={item} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-[var(--accent)] shrink-0 mt-0.5" />
                  <span className="font-semibold opacity-80">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-[var(--surface)]/30 backdrop-blur-sm border-t border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4 tracking-tight">Guide & Workflow FAQ</h2>
            <p className="opacity-70 text-base sm:text-lg">Quick answers to common PDF processing questions.</p>
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
                <p className="italic">No guide FAQs available yet.</p>
              </div>
            )}
          </Accordion.Root>
        </div>
      </section>
    </div>
  )
}
