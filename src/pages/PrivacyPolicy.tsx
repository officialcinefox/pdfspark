import React, { useState, useEffect } from 'react'
import { Mail, ShieldCheck, Loader2 } from 'lucide-react'
import { Background } from '../components/Background'
import { SEO } from '../components/SEO'
import { SITE } from '../lib/siteConfig'
import { supabase } from '../lib/supabase'

export function PrivacyPolicy() {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string>('');

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const { data, error } = await supabase
          .from('pages')
          .select('content, updated_at')
          .eq('slug', 'privacy-policy')
          .single();

        if (error) throw error;
        if (data) {
          setContent(data.content);
          setUpdatedAt(new Date(data.updated_at).toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
          }));
        }
      } catch (err) {
        console.error('Error fetching privacy policy:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, []);

  return (
    <div className="relative min-h-screen">
      <SEO
        title="Privacy Policy"
        description="Read the PDF Spark privacy policy for browser-based PDF tools, contact messages, cookies, analytics, and AdSense use."
        canonical="/privacy-policy"
      />
      <Background />

      <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
        <div className="mb-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-4 py-2 text-sm font-bold text-[var(--accent)] ring-1 ring-[var(--border)]">
            <ShieldCheck className="h-4 w-4" />
            Last updated: {loading ? '...' : updatedAt}
          </span>
          <h1 className="mt-7 text-3xl md:text-5xl font-black leading-[1.1] tracking-tight">Privacy Policy</h1>
          <p className="mt-5 text-base md:text-lg opacity-75 leading-relaxed">
            This policy explains how {SITE.name} handles information when you use our PDF tools, guides, and contact options.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/88 p-6 md:p-8 space-y-8 min-h-[400px] flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-[var(--accent)]" />
            </div>
          ) : (
            <>
              <div 
                className="prose prose-zinc dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: content }}
              />

              <section className="mt-12 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6">
                <h2 className="text-2xl font-black mb-3">Contact</h2>
                <p className="opacity-75 leading-relaxed mb-4">For privacy questions, please reach out to us at:</p>
                <a href={`mailto:${SITE.supportEmail}`} className="inline-flex items-center gap-3 font-bold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors text-lg">
                  <Mail className="h-5 w-5" />
                  {SITE.supportEmail}
                </a>
              </section>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
