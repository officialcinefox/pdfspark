import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft, Upload, FileText, Shield, Zap } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { TOOL_CATEGORIES } from '../../lib/toolsData'
import { Background } from '../../components/Background'

export function ToolPlaceholder() {
  const { toolId } = useParams()
  
  // Find tool in data
  const tool = TOOL_CATEGORIES.flatMap(c => c.tools).find(t => t.id === toolId)

  if (!tool) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <h1 className="text-4xl font-bold mb-4">Tool Not Found</h1>
        <Link
          to="/tools"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--accent)] px-6 font-medium text-white hover:bg-[var(--accent-hover)] transition-colors"
        >
          Back to All Tools
        </Link>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      <Background />
      
      <div className="max-w-5xl mx-auto px-4 py-12 relative z-10">
        <Link to="/tools" className="inline-flex items-center text-sm font-bold opacity-60 hover:opacity-100 mb-12 transition-opacity group">
          <ArrowLeft className="mr-2 w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to all tools
        </Link>

        <div className="text-center mb-16">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`w-24 h-24 mx-auto rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl ${tool.color}`}
          >
            {tool.icon}
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-6xl font-black mb-6"
          >
            {tool.title}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-xl opacity-60 max-w-2xl mx-auto leading-relaxed"
          >
            {tool.description}
          </motion.p>
        </div>

        {/* Upload Zone Area */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel rounded-[3rem] p-12 md:p-24 border-2 border-dashed border-blue-500/30 hover:border-blue-500/60 transition-all text-center group cursor-pointer"
        >
          <div className="w-24 h-24 bg-blue-500 text-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/40 group-hover:scale-110 transition-transform">
            <Upload className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Select PDF files</h2>
          <p className="text-lg opacity-50 mb-12">or drop PDFs here</p>
          <Button size="lg" className="h-16 px-12 text-xl rounded-2xl shadow-xl shadow-blue-500/20">
            Choose Files
          </Button>
          
          <div className="mt-12 flex flex-wrap justify-center gap-8 opacity-40">
            <div className="flex items-center space-x-2 text-sm font-bold">
              <Shield className="w-4 h-4" />
              <span>TLS ENCRYPTED</span>
            </div>
            <div className="flex items-center space-x-2 text-sm font-bold">
              <FileText className="w-4 h-4" />
              <span>SECURE PROCESSING</span>
            </div>
            <div className="flex items-center space-x-2 text-sm font-bold">
              <Zap className="w-4 h-4" />
              <span>FAST & FREE</span>
            </div>
          </div>
        </motion.div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24">
          {[
            { title: "How it works", desc: `Our ${tool.title} tool uses professional engines to ensure the best possible quality.` },
            { title: "Privacy First", desc: "Your documents are processed with high-grade security and are never stored on our servers." },
            { title: "Universal", desc: "Works on all platforms - Windows, Mac, Linux, iOS, and Android." }
          ].map((item, i) => (
            <div key={i} className="glass-panel p-8 rounded-3xl">
              <h3 className="text-xl font-bold mb-4">{item.title}</h3>
              <p className="opacity-60 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
