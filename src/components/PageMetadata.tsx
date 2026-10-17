import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { topics } from '../data/catalog'
import { normalizeSiteUrl, pageMetadata } from '../lib/pageMetadata'

export function PageMetadata() {
  const { pathname } = useLocation()
  useEffect(() => {
    const siteUrl = normalizeSiteUrl(import.meta.env.VITE_SITE_URL || '') ?? window.location.origin
    const metadata = pageMetadata(pathname, topics, siteUrl)
    document.title = metadata.title
    const entries = {
      'name:description': metadata.description,
      'name:robots': metadata.robots,
      'property:og:title': metadata.title,
      'property:og:description': metadata.description,
      'property:og:type': 'website',
      'property:og:locale': 'zh_CN',
      'property:og:site_name': '知图 Knowledge Atlas',
      'property:og:url': metadata.url!,
      'name:twitter:card': 'summary',
      'name:twitter:title': metadata.title,
      'name:twitter:description': metadata.description,
    }
    for (const [key, value] of Object.entries(entries)) {
      const separator = key.indexOf(':')
      const attribute = key.slice(0, separator)
      const name = key.slice(separator + 1)
      let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`)
      if (!element) {
        element = document.createElement('meta')
        element.setAttribute(attribute, name)
        document.head.append(element)
      }
      element.content = value
    }
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.append(canonical)
    }
    canonical.href = metadata.url!
  }, [pathname])
  return null
}
