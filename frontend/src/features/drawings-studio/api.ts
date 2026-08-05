import { api } from '../../lib/api'
import { unwrapList, type Paginated } from '../../lib/pagination'
import type { DrawingModel } from '../../lib/types'

export async function listDrawingModels(project: number): Promise<DrawingModel[]> {
  const res = await api.get<Paginated<DrawingModel>>('/drawings-studio/models/', { params: { project } })
  return unwrapList(res.data)
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
