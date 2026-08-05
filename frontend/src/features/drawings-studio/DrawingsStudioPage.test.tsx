import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DrawingsStudioPage } from './DrawingsStudioPage'
import { LanguageProvider } from '../../lib/i18n'
import { ToastProvider } from '../../components/ui/Toast'
import type { DrawingModel, Project } from '../../lib/types'

const { listDrawingModelsMock, uploadDrawingModelMock, deleteDrawingModelMock } = vi.hoisted(() => ({
  listDrawingModelsMock: vi.fn(),
  uploadDrawingModelMock: vi.fn(),
  deleteDrawingModelMock: vi.fn(),
}))

vi.mock('./api', () => ({
  listDrawingModels: listDrawingModelsMock,
  uploadDrawingModel: uploadDrawingModelMock,
  deleteDrawingModel: deleteDrawingModelMock,
}))

// Three.js needs a real WebGL context; in jsdom the viewers are stubbed out
// entirely and the page is tested around them.
vi.mock('./viewer/ModelViewer', () => ({
  ModelViewer: () => <div data-testid="model-viewer" />,
  default: () => <div data-testid="model-viewer" />,
}))

vi.mock('./viewer/PrimitiveViewer', () => ({
  PrimitiveViewer: () => <div data-testid="primitive-viewer" />,
  default: () => <div data-testid="primitive-viewer" />,
}))

vi.mock('./viewer/primitives', () => ({
  COLOR_PRESETS: [
    { name: 'Saudi Gold', value: '#d97706' },
    { name: 'Blue Steel', value: '#2563eb' },
  ],
  DEFAULT_DIMENSIONS: { width: 10, depth: 10, height: 36, radius: 5, color: '#d97706' },
  buildPrimitiveMesh: vi.fn(),
  buildSaudiArchitectureMesh: vi.fn(),
  exportMeshToGlb: vi.fn(),
}))

const testProject: Project = { id: 12, name: 'Diriyah Gate Phase 2', slug: 'diriyah-gate-2', role: 'owner' }

const testModel: DrawingModel = {
  id: 3,
  project: 12,
  name: 'Podium Massing',
  file: '/media/drawings_studio/podium.glb',
  format: 'glb',
  uploaded_by: 1,
  uploaded_by_name: 'Mohammed Al-Rashid',
  created_at: new Date().toISOString(),
}

function renderPage() {
  return render(
    <LanguageProvider>
      <ToastProvider>
        <DrawingsStudioPage project={testProject} />
      </ToastProvider>
    </LanguageProvider>,
  )
}

beforeEach(() => {
  listDrawingModelsMock.mockReset()
  uploadDrawingModelMock.mockReset()
  deleteDrawingModelMock.mockReset()
})

describe('DrawingsStudioPage', () => {
  it('renders the saved model list from the API', async () => {
    listDrawingModelsMock.mockResolvedValue([testModel])
    renderPage()

    expect(await screen.findByText('Podium Massing')).toBeInTheDocument()
    expect(screen.getByText('Saved Models & 3D Exports (1)')).toBeInTheDocument()
    // The live shape studio (mocked viewer) is shown by default.
    expect(screen.getByTestId('primitive-viewer')).toBeInTheDocument()
    // No auto-seed upload when the project already has models.
    expect(uploadDrawingModelMock).not.toHaveBeenCalled()
  })

  it('deletes a model through the confirmation dialog', async () => {
    listDrawingModelsMock.mockResolvedValue([testModel])
    deleteDrawingModelMock.mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Delete Podium Massing' }))

    // Nothing is deleted until the ConfirmDialog is confirmed.
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Delete model')
    expect(deleteDrawingModelMock).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(deleteDrawingModelMock).toHaveBeenCalledWith(3))
    expect(await screen.findByText('Deleted "Podium Massing".')).toBeInTheDocument()
    // The list is re-fetched after the delete.
    await waitFor(() => expect(listDrawingModelsMock.mock.calls.length).toBeGreaterThanOrEqual(2))
  })

  it('shows an ErrorState with retry when loading the models fails', async () => {
    listDrawingModelsMock.mockRejectedValueOnce(new Error('The models service is down.'))
    listDrawingModelsMock.mockResolvedValue([testModel])
    const user = userEvent.setup()
    renderPage()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('The models service is down.')

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Podium Massing')).toBeInTheDocument()
  })
})
