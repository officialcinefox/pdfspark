import { Helmet } from 'react-helmet-async'
import { SITE } from '../lib/siteConfig'

interface SEOProps {
  title: string
  description: string
  canonical?: string
  ogType?: 'website' | 'article'
  image?: string
}

export function SEO({ 
  title, 
  description, 
  canonical, 
  ogType = 'website',
  image = '/assets/og-image.png' // Default OG image
}: SEOProps) {
  const siteName = SITE.name
  const fullTitle = `${title} | ${siteName}`
  const url = SITE.url.replace(/\/$/, '')

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {canonical && <link rel="canonical" href={`${url}${canonical}`} />}

      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:image" content={`${url}${image}`} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${url}${image}`} />

      <meta name="robots" content="index, follow" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta charSet="utf-8" />
    </Helmet>
  )
}
