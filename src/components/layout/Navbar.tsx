import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, Menu, Moon, Sun, X, Sparkles } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '../../lib/utils'

import { useAuth } from '../../lib/auth'

const navLinks = [
  { name: 'Home', path: '/' },
  { name: 'Tools', path: '/tools' },
  { name: 'Blog', path: '/blog' },
  { name: 'Guides', path: '/guides' },
  { name: 'About', path: '/about' },
  { name: 'Contact', path: '/contact' }
]

function isActivePath(currentPath: string, path: string) {
  if (path === '/') return currentPath === '/'
  if (path === '/tools') return currentPath === '/tools' || currentPath.startsWith('/tool/')
  return currentPath === path || currentPath.startsWith(`${path}/`)
}

export function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [isDark, setIsDark] = React.useState(false)
  const location = useLocation()
  const { user } = useAuth()

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  React.useEffect(() => {
    setIsOpen(false)
  }, [location.pathname])

  return (
    <header className="sticky top-0 z-50 w-full px-0 sm:px-3 pt-0 sm:pt-3">
      <div className="max-w-7xl mx-auto">
        <div className="glass-panel rounded-none sm:rounded-2xl border-b sm:border border-[var(--border)] px-3 sm:px-5">
          <div className="flex h-16 items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-3 group min-w-0">
              <div className="h-10 w-10 flex items-center justify-center bg-[var(--accent)] rounded-xl text-white shadow-lg shadow-red-500/20 group-hover:scale-110 transition-transform duration-300">
                <Sparkles className="w-6 h-6 fill-current" />
              </div>
              <span className="text-xl font-black text-[var(--accent)]">PDF Spark</span>
            </Link>

            <nav className="hidden lg:flex items-center rounded-full bg-[var(--surface)]/70 p-1 ring-1 ring-[var(--border)]">
              {navLinks.map((link) => {
                const active = isActivePath(location.pathname, link.path)
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={cn(
                      'px-4 py-2 text-sm font-semibold rounded-full transition-colors',
                      active
                        ? 'bg-[var(--foreground)] text-[var(--background)] shadow-sm'
                        : 'text-[var(--foreground)]/70 hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]'
                    )}
                  >
                    {link.name}
                  </Link>
                )
              })}
            </nav>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsDark((value) => !value)}
                className="h-10 w-10 inline-flex items-center justify-center rounded-full text-[var(--foreground)]/70 hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors"
                aria-label="Toggle theme"
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              {user && (
                <Link
                  to="/dashboard"
                  className="hidden md:inline-flex h-10 items-center gap-2 rounded-full bg-[var(--surface)] border border-[var(--border)] px-5 text-sm font-bold text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors"
                >
                  Dashboard
                </Link>
              )}

              <Link
                to="/tools"
                className="hidden md:inline-flex h-10 items-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-bold text-white shadow-sm shadow-red-900/10 hover:bg-[var(--accent-hover)] transition-colors"
              >
                Open Tools
                <ArrowRight className="h-4 w-4" />
              </Link>

              <button
                type="button"
                onClick={() => setIsOpen((value) => !value)}
                className="lg:hidden h-10 w-10 inline-flex items-center justify-center rounded-full hover:bg-[var(--surface-hover)] transition-colors"
                aria-label="Toggle navigation"
                aria-expanded={isOpen}
              >
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isOpen ? (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="lg:hidden mt-2 glass-panel rounded-2xl border border-[var(--border)] p-2"
            >
              <div className="grid grid-cols-2 gap-2">
                {navLinks.map((link) => {
                  const active = isActivePath(location.pathname, link.path)
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={cn(
                        'rounded-xl px-4 py-3 text-sm font-semibold transition-colors text-center',
                        active
                          ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                          : 'hover:bg-[var(--surface-hover)]'
                      )}
                    >
                      {link.name}
                    </Link>
                  )
                })}
              </div>
              <div className="grid gap-2 mt-2">
                {user && (
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] px-4 py-3 text-sm font-bold text-[var(--foreground)]"
                  >
                    Dashboard
                  </Link>
                )}
                <Link
                  to="/tools"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-600/20"
                >
                  Open Tools
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </header>
  )
}
