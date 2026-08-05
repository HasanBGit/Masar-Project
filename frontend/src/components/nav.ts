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

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  staffOnly?: boolean
}

export interface NavGroup {
  id: string
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [{ label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard }],
  },
  {
    id: 'integrations',
    label: 'Integrations & Signals',
    items: [{ label: 'Gmail & Email Integrations', to: '/email-integrations', icon: Mail }],
  },
  {
    id: 'trust',
    label: 'Trust & Approvals',
    items: [{ label: 'Trust & Evidence', to: '/trust-evidence', icon: ShieldCheck }],
  },
  {
    id: 'documents',
    label: 'Documents & Schedule',
    items: [{ label: 'RFIs & Change Orders', to: '/rfi-change-control', icon: FileStack }],
  },
  {
    id: 'contracts',
    label: 'Contracts & Payments',
    items: [{ label: 'Contract & Payments', to: '/contract-payments', icon: Receipt }],
  },
  {
    id: 'handover',
    label: 'Handover',
    items: [{ label: 'Punch List & Defects', to: '/handover', icon: PackageCheck }],
  },
  {
    id: 'design',
    label: 'Design & Drawings',
    items: [{ label: 'Drawings Studio', to: '/drawings-studio', icon: Box }],
  },
  {
    id: 'admin',
    label: 'Administration',
    items: [
      { label: 'Access Control', to: '/access-control', icon: Users },
      { label: 'Platform API', to: '/platform-api', icon: KeySquare },
    ],
  },
  {
    id: 'internal',
    label: 'San3 Internal',
    items: [{ label: 'Observability', to: '/observability', icon: Radar, staffOnly: true }],
  },
]

export const DOCS_LINK: NavItem = { label: 'Documentation', to: '/docs', icon: BookOpen }
