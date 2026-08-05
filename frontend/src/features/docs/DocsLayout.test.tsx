import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { DocsLayout } from './DocsLayout'

function renderDocs() {
  return render(
    <MemoryRouter initialEntries={['/docs']}>
      <DocsLayout>
        <p>Docs body</p>
      </DocsLayout>
    </MemoryRouter>,
  )
}

describe('DocsLayout search', () => {
  it('filters the docs nav to matching links', async () => {
    const user = userEvent.setup()
    renderDocs()

    await user.type(screen.getByLabelText('Search docs'), 'webhook')

    const results = screen.getByRole('list', { name: 'Search results' })
    expect(within(results).getByRole('link', { name: /Webhooks & rate limits/ })).toHaveAttribute(
      'href',
      '/docs/webhooks',
    )
    expect(within(results).queryByText('Module reference')).not.toBeInTheDocument()
  })

  it('matches against the group label too and shows an empty state otherwise', async () => {
    const user = userEvent.setup()
    renderDocs()

    const input = screen.getByLabelText('Search docs')
    await user.type(input, 'public api')
    let results = screen.getByRole('list', { name: 'Search results' })
    expect(within(results).getAllByRole('link')).toHaveLength(2)

    await user.clear(input)
    await user.type(input, 'zzzz')
    results = screen.getByRole('list', { name: 'Search results' })
    expect(within(results).getByText('No matching pages')).toBeInTheDocument()
  })
})
