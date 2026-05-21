import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, FileCheck2, KeyRound, ShieldCheck } from 'lucide-react'
import { motion } from 'motion/react'
import { Background } from '../components/Background'
import { getToolById } from '../lib/toolsData'
import { SEO } from '../components/SEO'

const lockTool = getToolById('lock')!
const unlockTool = getToolById('unlock')!
const restrictionTool = getToolById('remove-restrictions')!
const signatureTool = getToolById('digital-signature')!

const principles = [
  {
    title: 'No Account Required',
    description: 'The site is built around direct tool access, so there are no login or signup steps blocking PDF work.',
    icon: CheckCircle2
  },
  {
    title: 'Document Control',
    description: 'You choose the files, the action, and the final download. Workflows stay focused on your current task.',
    icon: FileCheck2
  },
  {
    title: 'Password Protection',
    description: 'The lock tool creates encrypted PDFs that ask for a password in compatible PDF readers.',
    icon: KeyRound
  }
]

export function Security() {
  return (
    <div className="relative min-h-screen">
      <SEO
        title="PDF Security Tools"
        description="Protect PDFs, unlock your own documents, remove restrictions, and add visible signatures with PDF Spark security workflows."
        canonical="/security"
      />
      <Background />

      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_420px] gap-12 items-center">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--surface)]/80 px-4 py-2 text-sm font-bold text-[var(--accent)] ring-1 ring-[var(--border)]">
              <ShieldCheck className="h-4 w-4" />
              Security-first PDF workflows
            </span>
            <h1 className="mt-7 text-3xl md:text-5xl font-black leading-[1.1] tracking-tight">
              Protect documents without making the site heavier.
            </h1>
            <p className="mt-6 text-base md:text-lg opacity-75 max-w-2xl leading-relaxed">
              PDF Spark keeps security tools visible, simple, and account-free: lock sensitive files, unlock your own documents, and prepare signed copies from one place.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <Link to={lockTool.path} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 font-bold text-white hover:bg-[var(--accent-hover)] transition-colors">
                Protect a PDF
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/tools" className="inline-flex h-12 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 font-bold hover:bg-[var(--surface-hover)] transition-colors">
                See Security Tools
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.12 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/86 p-5 shadow-sm"
          >
            {[lockTool, unlockTool, restrictionTool, signatureTool].map((tool) => (
              <Link key={tool.id} to={tool.path} className="flex items-center gap-4 rounded-xl p-4 hover:bg-[var(--surface-hover)] transition-colors">
                <img src={tool.iconSrc} alt="" aria-hidden="true" className="h-12 w-12 object-contain" />
                <span className="min-w-0">
                  <span className="block font-black">{tool.title}</span>
                  <span className="block text-sm opacity-60 truncate">{tool.description}</span>
                </span>
              </Link>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="relative z-10 py-16 bg-[var(--surface)]/45 border-y border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-5">
            {principles.map((item, index) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.06 }}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7"
                >
                  <div className="h-11 w-11 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center mb-5">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-xl font-black mb-3">{item.title}</h2>
                  <p className="opacity-65 leading-relaxed">{item.description}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/82 p-8">
            <h2 className="text-3xl font-black mb-4">Best for sensitive files</h2>
            <p className="opacity-70 leading-relaxed mb-7">
              Use the security tools when you need to share contracts, invoices, certificates, financial records, IDs, or internal reports with a cleaner PDF workflow.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {['Contracts', 'Invoices', 'Reports', 'Certificates'].map((item) => (
                <span key={item} className="rounded-xl bg-[var(--background)] px-4 py-3 text-sm font-bold border border-[var(--border)]">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/82 p-8">
            <h2 className="text-3xl font-black mb-4">Security workflow</h2>
            <ol className="space-y-4">
              {[
                'Upload the file into the right PDF tool.',
                'Choose the password, signature, or restriction action.',
                'Download the finished PDF and store the password separately.'
              ].map((step, index) => (
                <li key={step} className="flex gap-4">
                  <span className="h-8 w-8 shrink-0 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-sm font-black">{index + 1}</span>
                  <span className="pt-1 opacity-75 leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </div>
  )
}
