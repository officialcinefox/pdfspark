import React from 'react'
import { Link } from 'react-router-dom'
import { Mail, Heart, Sparkles } from 'lucide-react'
import { SITE } from '../../lib/siteConfig'

export function Footer() {
  return (
    <footer className="bg-[var(--surface)]/55 backdrop-blur-xl border-t border-[var(--border)] pt-20 pb-12 mt-auto relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-6 gap-x-8 gap-y-16 mb-20">
          
          <div className="col-span-2 space-y-8">
            <Link to="/" className="flex items-center space-x-3 group w-max">
              <div className="h-12 w-12 flex items-center justify-center bg-[var(--accent)] rounded-xl text-white shadow-xl shadow-red-500/20 group-hover:scale-110 transition-transform duration-300">
                <Sparkles className="w-7 h-7 fill-current" />
              </div>
              <span className="text-2xl font-black text-[var(--accent)]">PDF Spark</span>
            </Link>
            <p className="text-lg opacity-60 text-[var(--foreground)] leading-relaxed max-w-sm">
              A fast, account-free PDF toolkit for daily document work: merge, compress, convert, protect, and edit from one polished workspace.
            </p>
            <a
              href={`mailto:${SITE.supportEmail}`}
              className="inline-flex h-12 items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 font-bold hover:bg-[var(--accent)] hover:text-white transition-colors"
            >
              <Mail className="w-5 h-5" />
              {SITE.supportEmail}
            </a>
          </div>

          <div>
            <h3 className="text-sm font-black uppercase tracking-widest mb-8 opacity-40">Product</h3>
            <ul className="space-y-4 text-base font-medium opacity-70">
              <li><Link to="/features" className="hover:text-[var(--accent)] transition-colors">Features</Link></li>
              <li><Link to="/tools" className="hover:text-[var(--accent)] transition-colors">All Tools</Link></li>
              <li><Link to="/guides" className="hover:text-[var(--accent)] transition-colors">Guides</Link></li>
              <li><Link to="/security" className="hover:text-[var(--accent)] transition-colors">Security</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-black uppercase tracking-widest mb-8 opacity-40">Popular</h3>
            <ul className="space-y-4 text-base font-medium opacity-70">
              <li><Link to="/tool/merge" className="hover:text-[var(--accent)] transition-colors">Merge PDF</Link></li>
              <li><Link to="/tool/split" className="hover:text-[var(--accent)] transition-colors">Split PDF</Link></li>
              <li><Link to="/tool/compress" className="hover:text-[var(--accent)] transition-colors">Compress PDF</Link></li>
              <li><Link to="/tool/organize-pdf" className="hover:text-[var(--accent)] transition-colors">Organize PDF</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest mb-8 opacity-40">Convert</h3>
            <ul className="space-y-4 text-base font-medium opacity-70">
              <li><Link to="/tool/image-to-pdf" className="hover:text-[var(--accent)] transition-colors">Image to PDF</Link></li>
              <li><Link to="/tool/pdf-to-word" className="hover:text-[var(--accent)] transition-colors">PDF to Word</Link></li>
              <li><Link to="/tool/pdf-to-image" className="hover:text-[var(--accent)] transition-colors">PDF to Image</Link></li>
              <li><Link to="/tools" className="hover:text-[var(--accent)] transition-colors">All Converters</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-black uppercase tracking-widest mb-8 opacity-40">Resources</h3>
            <ul className="space-y-4 text-base font-medium opacity-70">
              <li><Link to="/guides" className="hover:text-[var(--accent)] transition-colors">Help Guides</Link></li>
              <li><Link to="/about" className="hover:text-[var(--accent)] transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-[var(--accent)] transition-colors">Contact</Link></li>
              <li><Link to="/blog" className="hover:text-[var(--accent)] transition-colors">Blog</Link></li>
            </ul>
          </div>

        </div>
        
        <div className="pt-12 border-t border-[var(--border)] text-sm font-bold opacity-40 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="flex items-center">
            Made with <Heart className="w-4 h-4 mx-2 text-red-500 fill-current" /> for a better web
          </p>
          <p>&copy; {new Date().getFullYear()} PDF Spark. All rights reserved.</p>
          <div className="flex items-center space-x-6">
            <Link to="/privacy-policy" className="hover:text-[var(--accent)] transition-colors">Privacy</Link>
            <Link to="/terms-and-conditions" className="hover:text-[var(--accent)] transition-colors">Terms</Link>
            <Link to="/disclaimer" className="hover:text-[var(--accent)] transition-colors">Disclaimer</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
