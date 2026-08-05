export interface DocsNavItem {
  slug: string
  title: string
}

export interface DocsNavGroup {
  label: string
  items: DocsNavItem[]
}

export const DOCS_NAV: DocsNavGroup[] = [
  {
    label: 'Getting started',
    items: [{ slug: '', title: 'Introduction' }],
  },
  {
    label: 'Core concepts',
    items: [{ slug: 'concepts', title: 'The 3 Edges, RACI & roles' }],
  },
  {
    label: 'Modules',
    items: [{ slug: 'modules', title: 'Module reference' }],
  },
  {
    label: 'Public API',
    items: [
      { slug: 'api', title: 'Authentication & endpoints' },
      { slug: 'webhooks', title: 'Webhooks & rate limits' },
    ],
  },
]

/** Returns the group + item matching the current /docs path, for breadcrumbs. */
export function findDocsLocation(slug: string): { group: DocsNavGroup; item: DocsNavItem } | null {
  for (const group of DOCS_NAV) {
    const item = group.items.find((i) => i.slug === slug)
    if (item) return { group, item }
  }
  return null
}
