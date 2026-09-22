import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, type WorkItemDetail, type WorkItemStatus } from '@/lib/api'

const keys = {
  all: ['work-items'] as const,
  list: (status?: WorkItemStatus) => ['work-items', 'list', status ?? 'ALL'] as const,
  detail: (id: string) => ['work-items', 'detail', id] as const,
}

export function useWorkItems(status?: WorkItemStatus) {
  return useQuery({
    queryKey: keys.list(status),
    queryFn: () => api.list(status),
    refetchInterval: 15_000,
  })
}

export function useWorkItem(id: string | null) {
  return useQuery({
    queryKey: keys.detail(id ?? ''),
    queryFn: () => api.get(id!),
    enabled: !!id,
  })
}

type Action = 'analyse' | 'retry' | 'complete'

const successMessage: Record<Action, (item: WorkItemDetail) => string> = {
  analyse: (item) =>
    item.status === 'FAILED' ? 'Analysis failed. You can retry it.' : 'Analysis ready for review',
  retry: (item) =>
    item.status === 'FAILED' ? 'Retry failed again' : 'Analysis ready for review',
  complete: () => 'Work item completed',
}

export function useWorkItemAction(action: Action) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api[action](id),
    onMutate: (id) => {
      if (action === 'complete') return
      queryClient.setQueryData<WorkItemDetail>(keys.detail(id), (item) =>
        item && { ...item, status: 'ANALYSING' },
      )
    },
    onSuccess: (item) => {
      queryClient.setQueryData(keys.detail(item.id), item)
      const notify = item.status === 'FAILED' ? toast.error : toast.success
      notify(successMessage[action](item))
    },
    onError: (error) => toast.error(error.message),
    onSettled: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  })
}

export function useCreateWorkItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  })
}
