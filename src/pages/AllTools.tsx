import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { 
  ArrowRight, Search
} from 'lucide-react'
import { TOOL_CATEGORIES } from '../lib/toolsData'
import { Background } from '../components/Background'
import { SEO } from '../components/SEO'
import { ToolIcon } from '../components/ui/ToolIcon'
import { cn } from '../lib/utils'

export function AllTools() {
  const [search, setSearch] = React.useState('')

  const filteredCategories = TOOL_CATEGORIES.map(category => ({
    ...category,
    tools: category.tools.filter(tool => 
      tool.title.toLowerCase().includes(search.toLowerCase()) ||
      tool.description.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(category => category.tools.length > 0)

  return (
    <div className="relative min-h-screen">
      <SEO
        title="All Free PDF Tools"
        description="Browse PDF Spark tools to merge, split, compress, rotate, convert, protect, watermark, number, and organize PDF files online."
        canonical="/tools"
      />
      <Background />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative z-10">
        <div className="text-center mb-24">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-black mb-8 text-gradient"
          >
            All PDF Power Tools
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-xl opacity-60 max-w-2xl mx-auto mb-12"
          >
            Everything you need to edit, convert, and manage your PDFs in one place.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="max-w-xl mx-auto relative group"
          >
            <div className="relative flex items-center">
              <Search className="absolute left-6 w-6 h-6 opacity-30 group-focus-within:opacity-100 group-focus-within:text-[var(--accent)] transition-all" />
              <input 
                type="text" 
                placeholder="Search for a tool (e.g. 'merge', 'word')..."
                className="w-full h-16 pl-16 pr-8 rounded-2xl glass-panel focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 text-lg transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </motion.div>
        </div>

        <div className="space-y-32">
          {filteredCategories.map((category, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              key={category.title}
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
                <div>
                  <h2 className="text-4xl font-bold mb-2">{category.title}</h2>
                  <p className="opacity-60 text-lg">{category.description}</p>
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent hidden md:block mx-8 mb-4 opacity-50" />
                <span className="text-sm font-bold opacity-40 uppercase tracking-widest">{category.tools.length} Tools</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {category.tools.map((tool, j) => (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: j * 0.03 }}
                    key={tool.id}
                  >
                    <Link to={tool.path} className="block group h-full">
                      <div className="tool-card h-full flex flex-col items-start glass-panel hover:bg-[var(--surface-hover)] transition-all duration-300">
                        <div className={cn(
                          "rounded-2xl mb-6 transition-all duration-500 group-hover:scale-110",
                          tool.color === 'bg-transparent' ? "p-0" : cn("p-3 shadow-sm", tool.color)
                        )}>
                          <ToolIcon icon={tool.icon} className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-bold mb-2 group-hover:text-[var(--accent)] transition-colors">{tool.title}</h3>
                        <p className="opacity-60 text-sm leading-relaxed mb-6 flex-1">
                          {tool.description}
                        </p>
                        <div className="mt-auto flex items-center text-xs font-black uppercase opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all">
                          Open <ArrowRight className="ml-1 w-3 h-3" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}

          {filteredCategories.length === 0 && (
            <div className="text-center py-32">
              <p className="text-2xl opacity-40">No tools found matching "{search}"</p>
              <button 
                onClick={() => setSearch('')}
                className="mt-4 text-[var(--accent)] font-bold hover:underline"
              >
                Clear search
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
