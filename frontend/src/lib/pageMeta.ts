import { useEffect } from 'react'

const SITE_NAME = 'Truepoint'
const SITE_URL = 'https://truepoint.sa'

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertCanonical(path: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', `${SITE_URL}${path}`)
}

function upsertJsonLd(id: string, data: object) {
  let el = document.getElementById(id) as HTMLScriptElement | null
  if (!el) {
    el = document.createElement('script')
    el.id = id
    el.type = 'application/ld+json'
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(data)
}

/**
 * Sets document.title, meta description, canonical URL, and OG/Twitter tags
 * for the current route. No react-helmet dependency: this is a client-side
 * SPA, so these are DOM writes rather than server-rendered head tags, but
 * they still update before crawlers that execute JS (Googlebot, and most
 * modern AI answer-engine crawlers) read the page.
 */
export function usePageMeta({
  title,
  description,
  path,
  jsonLd,
}: {
  title: string
  description: string
  path: string
  jsonLd?: object
}) {
  useEffect(() => {
    const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`
    document.title = fullTitle
    upsertMeta('name', 'description', description)
    upsertMeta('property', 'og:title', fullTitle)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:url', `${SITE_URL}${path}`)
    upsertMeta('property', 'og:type', 'website')
    upsertMeta('property', 'og:site_name', SITE_NAME)
    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', fullTitle)
    upsertMeta('name', 'twitter:description', description)
    upsertCanonical(path)

    const jsonLdId = 'page-jsonld'
    if (jsonLd) {
      upsertJsonLd(jsonLdId, jsonLd)
    } else {
      document.getElementById(jsonLdId)?.remove()
    }
  }, [title, description, path, jsonLd])
}
