import { api } from '../../lib/api'
import { unwrapList, type Paginated } from '../../lib/pagination'
import type { APIKey, ApiKeyScope, ApiKeyTier, WebhookDelivery, WebhookSubscription } from '../../lib/types'

export async function listApiKeys(project: number): Promise<APIKey[]> {
  const res = await api.get<Paginated<APIKey>>('/platform-api/api-keys/', { params: { project } })
  return unwrapList(res.data)
}

export async function createApiKey(project: number, label: string, scope: ApiKeyScope, tier: ApiKeyTier): Promise<APIKey> {
  const res = await api.post<APIKey>('/platform-api/api-keys/', { project, label, scope, tier })
  return res.data
}

export async function revokeApiKey(id: number): Promise<APIKey> {
  const res = await api.post<APIKey>(`/platform-api/api-keys/${id}/revoke/`)
  return res.data
}

export async function listWebhookSubscriptions(project: number): Promise<WebhookSubscription[]> {
  const res = await api.get<Paginated<WebhookSubscription>>('/platform-api/webhook-subscriptions/', { params: { project } })
  return unwrapList(res.data)
}

export async function createWebhookSubscription(project: number, targetUrl: string, eventTypes: string[]): Promise<WebhookSubscription> {
  const res = await api.post<WebhookSubscription>('/platform-api/webhook-subscriptions/', { project, target_url: targetUrl, event_types: eventTypes })
  return res.data
}

export async function listWebhookDeliveries(project: number): Promise<WebhookDelivery[]> {
  const res = await api.get<WebhookDelivery[]>('/platform-api/webhook-deliveries/', { params: { project } })
  return res.data
}
