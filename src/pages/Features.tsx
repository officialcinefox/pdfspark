import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Sparkles, Timer, Workflow } from 'lucide-react'
import { motion } from 'motion/react'
import { Background } from '../components/Background'
import { ALL_TOOLS, TOOL_CATEGORIES } from '../lib/toolsData'
import { SEO } from '../components/SEO'

const highlights = [
  {
    title: 'Focused PDF Workflows',
    description: 'Merge, split, rotate, compress, convert, protect, and annotate from one clean workspace.',
    icon: Workflow
  },
  {
    title: 'Fast Browser Tools',
    description: 'Most jobs run in your browser, so everyday document work stays quick and direct.',
    icon: Timer
  },
  {
    title: 'Polished Output',
    description: 'Every tool is tuned for readable names, tidy downloads, and document-ready results.',
    icon: Sparkles
  }
]

export function Features() {
  const popularTools = ALL_TOOLS.slice(0, 8)

  return (
    <div className="relative min-h-screen">
      <SEO
        title="PDF Spark Features"
        description="Explore PDF Spark features for fast browser-based PDF management, conversion, security, and editing workflows."
        canonical="/features"
      />
      <Background />

      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_420px] gap-12 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-flex items-center rounded-full bg-[var(--surface)]/80 px-4 py-2 text-sm font-bold text-[var(--accent)] ring-1 ring-[var(--border)]">
              PDF toolkit, rebuilt for speed
            </span>
            <h1 className="mt-7 text-3xl md:text-5xl font-black leading-[1.1] tracking-tight">
              Tools that make PDF work feel lighter.
            </h1>
            <p className="mt-6 text-base md:text-lg opacity-75 max-w-2xl leading-relaxed">
              PDF Spark brings the daily document actions together in a cleaner, faster interface with small PNG tool icons and no account wall.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <Link to="/tools" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 font-bold text-white hover:bg-[var(--accent-hover)] transition-colors">
                Browse Tools
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/guides" className="inline-flex h-12 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 font-bold hover:bg-[var(--surface-hover)] transition-colors">
                View Guides
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.12 }}
            className="grid grid-cols-4 gap-3"
          >
            {popularTools.map((tool) => (
              <Link
                key={tool.id}
                to={tool.path}
                className="group aspect-square rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-3 shadow-sm hover:-translate-y-1 hover:border-[var(--accent)] transition-all"
                aria-label={tool.title}
              >
                <img src={tool.iconSrc} alt="" aria-hidden="true" className="h-full w-full object-contain group-hover:scale-105 transition-transform" />
              </Link>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="relative z-10 py-16 bg-[var(--surface)]/45 border-y border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-5">
            {highlights.map((item, index) => {
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
        <div className="mb-10">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">Feature Groups</h2>
          <p className="mt-3 text-base md:text-lg opacity-70 max-w-2xl">Pick a workflow and jump straight into the right PDF tool.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {TOOL_CATEGORIES.map((category) => (
            <div key={category.title} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/82 p-7">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <h3 className="text-2xl font-black">{category.title}</h3>
                  <p className="mt-2 opacity-65 leading-relaxed">{category.description}</p>
                </div>
                <div className="flex -space-x-3 shrink-0">
                  {category.tools.slice(0, 3).map((tool) => (
                    <img key={tool.id} src={tool.iconSrc} alt="" aria-hidden="true" className="h-12 w-12 rounded-2xl ring-4 ring-[var(--surface)]" />
                  ))}
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {category.tools.slice(0, 5).map((tool) => (
                  <Link key={tool.id} to={tool.path} className="rounded-full border border-[var(--border)] px-3 py-2 text-sm font-semibold hover:bg-[var(--surface-hover)] transition-colors">
                    {tool.title}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="rounded-2xl bg-[var(--foreground)] text-[var(--background)] p-8 md:p-12 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">No login. No setup. Just tools.</h2>
            <p className="mt-3 opacity-75 text-base sm:text-lg">Start with the workflow you need and download the result when it is ready.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 text-sm font-semibold">
            {['Free access', 'PNG tool icons', 'Mobile ready'].map((item) => (
              <span key={item} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3">
                <CheckCircle2 className="h-4 w-4" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
