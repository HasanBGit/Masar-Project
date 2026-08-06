import { api } from '../../lib/api'
import { unwrapList, type Paginated } from '../../lib/pagination'
import type { DrawingComment, DrawingCommentViewpoint, DrawingModel } from '../../lib/types'

export async function listDrawingModels(project: number): Promise<DrawingModel[]> {
  const res = await api.get<Paginated<DrawingModel>>('/drawings-studio/models/', { params: { project } })
  return unwrapList(res.data)
}

export async function listDrawingComments(modelId: number): Promise<DrawingComment[]> {
  const res = await api.get<Paginated<DrawingComment>>('/drawings-studio/comments/', { params: { model: modelId } })
  return unwrapList(res.data)
}

export async function createDrawingComment(params: {
  model: number
  body: string
  parent?: number
  position?: { x: number; y: number; z: number }
  viewpoint?: DrawingCommentViewpoint
}): Promise<DrawingComment> {
  const res = await api.post<DrawingComment>('/drawings-studio/comments/', {
    model: params.model,
    body: params.body,
    parent: params.parent ?? null,
    position_x: params.position?.x ?? null,
    position_y: params.position?.y ?? null,
    position_z: params.position?.z ?? null,
    viewpoint: params.viewpoint ?? null,
  })
  return res.data
}

export async function setDrawingCommentResolved(id: number, resolved: boolean): Promise<DrawingComment> {
  const res = await api.patch<DrawingComment>(`/drawings-studio/comments/${id}/`, { resolved })
  return res.data
}

export async function deleteDrawingComment(id: number): Promise<void> {
  await api.delete(`/drawings-studio/comments/${id}/`)
}

export async function uploadDrawingModel(project: number, file: File, name: string): Promise<DrawingModel> {
  const formData = new FormData()
  formData.append('project', String(project))
  formData.append('name', name)
  formData.append('file', file)
  const res = await api.post<DrawingModel>('/drawings-studio/models/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function deleteDrawingModel(id: number): Promise<void> {
  await api.delete(`/drawings-studio/models/${id}/`)
}
