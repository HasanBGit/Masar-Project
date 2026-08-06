import { AxiosError } from 'axios'
import { api } from '../../lib/api'
import { unwrapList, type Paginated } from '../../lib/pagination'

export interface EmailAccount {
  id: number
  project: number
  email_address: string
  connected_by: number
  connected_by_name: string
  last_synced_at: string | null
  created_at: string
}

export type EmailCategory = 'rfi' | 'submittal' | 'payment' | 'safety' | 'general'

export interface EmailMessage {
  id: number
  project: number
  gmail_thread_id: string
  from_address: string
  subject: string
  snippet: string
  category: EmailCategory
  requires_action: boolean
  received_at: string
  read_at: string | null
  read_by: number | null
  read_by_name: string | null
  decision_id: number | null
  decision_status: string | null
  created_at: string
}

export const OAUTH_REDIRECT_PATH = '/email-integrations/oauth-callback'

export function oauthRedirectUri(): string {
  return `${window.location.origin}${OAUTH_REDIRECT_PATH}`
}

export async function getEmailAccount(project: number): Promise<EmailAccount | null> {
  try {
    const res = await api.get<EmailAccount>('/email-integrations/account/', { params: { project } })
    return res.data
  } catch (err) {
    if (err instanceof AxiosError && err.response?.status === 404) return null
    throw err
  }
}

export async function getConnectUrl(project: number): Promise<string> {
  const res = await api.get<{ authorize_url: string }>('/email-integrations/connect-url/', {
    params: { project, redirect_uri: oauthRedirectUri() },
  })
  return res.data.authorize_url
}

export async function completeConnect(project: number, code: string, state: string): Promise<EmailAccount> {
  const res = await api.post<EmailAccount>('/email-integrations/callback/', {
    project,
    code,
    state,
    redirect_uri: oauthRedirectUri(),
  })
  return res.data
}

export async function disconnectAccount(project: number): Promise<void> {
  await api.delete('/email-integrations/account/', { params: { project } })
}

export async function syncInbox(project: number): Promise<{ new_messages: number }> {
  const res = await api.post<{ new_messages: number }>('/email-integrations/sync/', { project })
  return res.data
}

export async function listMessages(project: number): Promise<EmailMessage[]> {
  const res = await api.get<EmailMessage[] | Paginated<EmailMessage>>('/email-integrations/messages/', {
    params: { project },
  })
  return unwrapList(res.data)
}

export async function acknowledgeMessage(id: number): Promise<EmailMessage> {
  const res = await api.post<EmailMessage>(`/email-integrations/messages/${id}/acknowledge/`)
  return res.data
}
