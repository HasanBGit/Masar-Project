import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Project } from '../../lib/types'
import { getApiError } from '../../lib/api'
import { ErrorState } from '../../components/ui/ErrorState'
import { PageSkeleton } from '../../components/ui/Skeleton'
import { completeConnect } from './api'

/** Google redirects here with ?code=... after the consent screen; this
 * finishes the connection and sends the user back to the integrations page. */
export function OAuthCallbackPage({ project }: { project: Project }) {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    const oauthError = params.get('error')

    if (oauthError) {
      setError('Google sign-in was cancelled or denied.')
      return
    }
    if (!code || !state) {
      setError('Missing authorization code from Google.')
      return
    }

    completeConnect(project.id, code, state)
      .then(() => navigate('/email-integrations', { replace: true }))
      .catch((err) => setError(getApiError(err, 'Could not finish connecting the Gmail account.')))
  }, [project.id, navigate])

  if (error) {
    return <ErrorState message={error} onRetry={() => navigate('/email-integrations', { replace: true })} />
  }

  return <PageSkeleton />
}
