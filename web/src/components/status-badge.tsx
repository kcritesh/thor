import { HugeiconsIcon } from '@hugeicons/react'
import type { WorkItemStatus } from '@/lib/api'
import { STATUS_META } from '@/lib/status'
import { cn } from '@/lib/utils'

export function StatusBadge({ status }: { status: WorkItemStatus }) {
  const { label, icon, tone } = STATUS_META[status]
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full pr-2.5 pl-2 text-xs font-medium',
        tone.bg,
        tone.text,
      )}
    >
      <HugeiconsIcon
        icon={icon}
        strokeWidth={2}
        className={cn('size-3.5', status === 'ANALYSING' && 'animate-pulse')}
      />
      {label}
    </span>
  )
}
