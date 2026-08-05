import {
  Box,
  BookOpen,
  FileStack,
  KeySquare,
  LayoutDashboard,
  Mail,
  PackageCheck,
  Radar,
  Receipt,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { MessageKey } from '../lib/i18n'

export interface NavItem {
  labelKey: MessageKey
  to: string
  icon: LucideIcon
  staffOnly?: boolean
}

export interface NavGroup {
  id: string
  labelKey: MessageKey
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    labelKey: 'nav.overview',
    items: [{ labelKey: 'nav.dashboard', to: '/dashboard', icon: LayoutDashboard }],
  },
  {
    id: 'integrations',
    labelKey: 'nav.integrations',
    items: [{ labelKey: 'nav.email', to: '/email-integrations', icon: Mail }],
  },
  {
    id: 'trust',
    labelKey: 'nav.trustGroup',
    items: [{ labelKey: 'nav.trustEvidence', to: '/trust-evidence', icon: ShieldCheck }],
  },
  {
    id: 'documents',
    labelKey: 'nav.documents',
    items: [{ labelKey: 'nav.rfis', to: '/rfi-change-control', icon: FileStack }],
  },
  {
    id: 'contracts',
    labelKey: 'nav.contracts',
    items: [{ labelKey: 'nav.contractPayments', to: '/contract-payments', icon: Receipt }],
  },
  {
    id: 'handover',
    labelKey: 'nav.handover',
    items: [{ labelKey: 'nav.punchList', to: '/handover', icon: PackageCheck }],
  },
  {
    id: 'design',
    labelKey: 'nav.design',
    items: [{ labelKey: 'nav.drawingsStudio', to: '/drawings-studio', icon: Box }],
  },
  {
    id: 'admin',
    labelKey: 'nav.admin',
    items: [
      { labelKey: 'nav.accessControl', to: '/access-control', icon: Users },
      { labelKey: 'nav.platformApi', to: '/platform-api', icon: KeySquare },
    ],
  },
  {
    id: 'internal',
    labelKey: 'nav.internal',
    items: [{ labelKey: 'nav.observability', to: '/observability', icon: Radar, staffOnly: true }],
  },
]

export const DOCS_LINK: NavItem = { labelKey: 'nav.docs', to: '/docs', icon: BookOpen }
