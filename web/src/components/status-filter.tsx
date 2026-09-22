import { STATUSES, type WorkItem, type WorkItemStatus } from '@/lib/api'
import { STATUS_META } from '@/lib/status'
import { cn } from '@/lib/utils'

const OPTIONS: { value?: WorkItemStatus; label: string }[] = [
  { label: 'All' },
  ...STATUSES.map((value) => ({ value, label: STATUS_META[value].label })),
]

export function StatusFilter({
  value,
  onChange,
  items,
}: {
  value?: WorkItemStatus
  onChange: (status?: WorkItemStatus) => void
  items?: WorkItem[]
}) {
  const countFor = (status?: WorkItemStatus) =>
    items?.filter((item) => !status || item.status === status).length

  return (
    <div
      role="tablist"
      aria-label="Filter by status"
      className="flex flex-wrap gap-1 rounded-xl bg-muted p-1"
    >
      {OPTIONS.map((option) => {
        const active = option.value === value
        const count = countFor(option.value)
        return (
          <button
            key={option.label}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
              active
                ? 'bg-card text-foreground shadow-[0_1px_2px_rgb(27_31_59/0.08),inset_0_0_0_1px_var(--border)]'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
            {count !== undefined && (
              <span
                className={cn(
                  'min-w-5 rounded-md px-1 text-center text-[11px] tabular-nums',
                  active ? 'bg-primary-soft text-primary' : 'bg-background text-muted-foreground',
                )}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
