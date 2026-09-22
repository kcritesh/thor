import { useState } from 'react'
import { FileSearchIcon, PlusSignIcon, ZapIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { CreateWorkItemDialog } from '@/components/create-work-item-dialog'
import { IconChip } from '@/components/icon-chip'
import { StatusFilter } from '@/components/status-filter'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { WorkItemDetail } from '@/components/work-item-detail'
import { WorkItemList } from '@/components/work-item-list'
import { useWorkItems } from '@/hooks/use-work-items'
import type { WorkItemStatus } from '@/lib/api'
import { cn } from '@/lib/utils'

const NEEDS_ATTENTION: WorkItemStatus[] = ['RECEIVED', 'READY_FOR_REVIEW', 'FAILED']

export default function App() {
  const [status, setStatus] = useState<WorkItemStatus>()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const all = useWorkItems()
  const filtered = useWorkItems(status)
  const attention = all.data?.filter((item) => NEEDS_ATTENTION.includes(item.status)).length

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <IconChip icon={ZapIcon} tone={{ text: 'text-primary', bg: 'bg-primary-soft' }} />
          <div className="leading-tight">
            <p className="font-semibold tracking-[-0.01em]">Thor</p>
            <p className="text-xs text-muted-foreground">Work intake</p>
          </div>
          <Button className="ml-auto" onClick={() => setCreating(true)}>
            <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
            <span className="max-sm:sr-only">Add work item</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl min-h-0 flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-5">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Work queue</h1>
          <p className="mt-1 text-muted-foreground">
            {attention === undefined
              ? 'Loading queue'
              : attention === 0
                ? 'Nothing needs attention right now.'
                : `${attention} ${attention === 1 ? 'item needs' : 'items need'} attention.`}
          </p>
        </div>

        <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(340px,420px)_1fr]">
          <section className={cn('flex min-h-0 min-w-0 flex-col gap-4', selectedId && 'max-lg:hidden')}>
            <StatusFilter value={status} onChange={setStatus} items={all.data} />
            <ScrollArea className="-m-1 min-h-0 flex-1 lg:-mr-4">
              <div className="p-1 lg:pr-4">
                <WorkItemList
                  items={filtered.data}
                  isLoading={filtered.isLoading}
                  error={filtered.error}
                  onRetry={() => filtered.refetch()}
                  status={status}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              </div>
            </ScrollArea>
          </section>

          <section className={cn('min-h-0 min-w-0 lg:overflow-y-auto', !selectedId && 'max-lg:hidden')}>
            {selectedId ? (
              <WorkItemDetail id={selectedId} onBack={() => setSelectedId(null)} />
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-input px-6 py-20 text-center">
                <IconChip
                  icon={FileSearchIcon}
                  tone={{ text: 'text-primary', bg: 'bg-primary-soft' }}
                  size="lg"
                />
                <p className="text-sm text-muted-foreground">
                  Select a work item to see its analysis and next step.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>

      <CreateWorkItemDialog open={creating} onOpenChange={setCreating} onCreated={setSelectedId} />
    </div>
  )
}
