export const STATUSES = [
  'RECEIVED',
  'ANALYSING',
  'READY_FOR_REVIEW',
  'FAILED',
  'COMPLETED',
] as const
export type WorkItemStatus = (typeof STATUSES)[number]

export type Category =
  | 'DOCUMENT_REQUEST'
  | 'INFORMATION_REQUEST'
  | 'COMPLAINT'
  | 'TECHNICAL_ISSUE'
  | 'GENERAL_INQUIRY'
  | 'OTHER'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type AnalysisErrorType = 'TIMEOUT' | 'INVALID_OUTPUT' | 'PROVIDER_ERROR'

export interface WorkItem {
  id: string
  externalId: string
  title: string
  description: string
  status: WorkItemStatus
  category: Category | null
  priority: Priority | null
  summary: string | null
  recommendedAction: string | null
  lastError: string | null
  analysedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AnalysisAttempt {
  id: string
  success: boolean
  errorType: AnalysisErrorType | null
  errorMessage: string | null
  model: string
  latencyMs: number
  createdAt: string
}

export interface WorkItemDetail extends WorkItem {
  attempts: AnalysisAttempt[]
}

export interface CreateWorkItemInput {
  externalId: string
  title: string
  description: string
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function send<T>(path: string, init?: RequestInit) {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...init?.headers },
    })
  } catch {
    throw new ApiError('Cannot reach the server. Check that the API is running.', 0)
  }

  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : (body?.message ?? `Request failed with status ${res.status}`)
    throw new ApiError(message, res.status)
  }
  return { body: body as T, status: res.status }
}

const request = async <T,>(path: string, init?: RequestInit) =>
  (await send<T>(path, init)).body

export const api = {
  list: (status?: WorkItemStatus) =>
    request<WorkItem[]>(`/work-items${status ? `?status=${status}` : ''}`),
  get: (id: string) => request<WorkItemDetail>(`/work-items/${id}`),
  create: async (input: CreateWorkItemInput) => {
    const { body, status } = await send<WorkItem>('/work-items', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return { item: body, created: status === 201 }
  },
  analyse: (id: string) =>
    request<WorkItemDetail>(`/work-items/${id}/analyse`, { method: 'POST' }),
  retry: (id: string) =>
    request<WorkItemDetail>(`/work-items/${id}/retry`, { method: 'POST' }),
  complete: (id: string) =>
    request<WorkItemDetail>(`/work-items/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'COMPLETED' }),
    }),
}
