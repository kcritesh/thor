import { Alert02Icon, InboxIcon } from '@hugeicons/core-free-icons'
import { IconChip } from '@/components/icon-chip'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { WorkItem, WorkItemStatus } from '@/lib/api'
import { PRIORITY_TONE, STATUS_META, humanize, timeAgo } from '@/lib/status'
import { cn } from '@/lib/utils'

const EMPTY_COPY: Record<WorkItemStatus | 'ALL', string> = {
  ALL: 'No work items yet. They appear here when the CRM sends them, or add one yourself.',
  RECEIVED: 'Nothing waiting for analysis.',
  ANALYSING: 'Nothing is being analysed right now.',
  READY_FOR_REVIEW: 'Nothing to review. Analysed items land here.',
  FAILED: 'No failed analyses.',
  COMPLETED: 'No completed items yet.',
}

export function WorkItemList({
  items,
  isLoading,
  error,
  onRetry,
  status,
  selectedId,
  onSelect,
}: {
  items?: WorkItem[]
  isLoading: boolean
  error: Error | null
  onRetry: () => void
  status?: WorkItemStatus
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Loading work items">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-[92px] rounded-xl bg-card" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-failed/20 bg-failed-soft p-5">
        <IconChip icon={Alert02Icon} tone={{ text: 'text-failed', bg: 'bg-card' }} />
        <div>
          <p className="font-medium text-failed">Couldn't load work items</p>
          <p className="mt-1 text-sm text-failed/80">{error.message}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    )
  }

  if (!items?.length) {
    const tone = status ? STATUS_META[status].tone : { text: 'text-primary', bg: 'bg-primary-soft' }
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-input px-6 py-12 text-center">
        <IconChip icon={status ? STATUS_META[status].icon : InboxIcon} tone={tone} size="lg" />
        <p className="max-w-64 text-sm text-muted-foreground">{EMPTY_COPY[status ?? 'ALL']}</p>
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const selected = item.id === selectedId
        return (
          <li key={item.id}>
            <button
              onClick={() => onSelect(item.id)}
              aria-current={selected || undefined}
              className={cn(
                'relative w-full rounded-xl bg-card p-4 text-left shadow-[inset_0_0_0_1px_var(--border)] transition-shadow outline-none hover:shadow-[inset_0_0_0_1px_var(--input),0_2px_8px_-4px_rgb(27_31_59/0.15)] focus-visible:ring-2 focus-visible:ring-ring/40',
                selected &&
                  'shadow-[inset_0_0_0_1.5px_var(--primary),0_4px_14px_-8px_rgb(59_63_182/0.45)] hover:shadow-[inset_0_0_0_1.5px_var(--primary),0_4px_14px_-8px_rgb(59_63_182/0.45)]',
              )}
            >
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="truncate font-mono">{item.externalId}</span>
                <time dateTime={item.createdAt} className="shrink-0">
                  {timeAgo(item.createdAt)}
                </time>
              </div>
              <p className="mt-1.5 truncate font-medium">{item.title}</p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <StatusBadge status={item.status} />
                {item.priority && (
                  <span
                    className={cn(
                      'inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium',
                      PRIORITY_TONE[item.priority].bg,
                      PRIORITY_TONE[item.priority].text,
                    )}
                  >
                    {humanize(item.priority)} priority
                  </span>
                )}
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
