import { Alert02Icon, ArrowLeft01Icon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { IconChip } from '@/components/icon-chip'
import { NextStep } from '@/components/next-step'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useWorkItem } from '@/hooks/use-work-items'
import type { AnalysisAttempt, WorkItemDetail as Detail } from '@/lib/api'
import { PRIORITY_TONE, humanize, timeAgo } from '@/lib/status'
import { cn } from '@/lib/utils'

export function WorkItemDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { data: item, isLoading, error, refetch } = useWorkItem(id)

  return (
    <div className="rounded-2xl bg-card p-5 shadow-[inset_0_0_0_1px_var(--border),0_8px_24px_-16px_rgb(27_31_59/0.18)] sm:p-7">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 mb-3 lg:hidden">
        <HugeiconsIcon icon={ArrowLeft01Icon} />
        Back to queue
      </Button>

      {isLoading && <DetailSkeleton />}
      {error && (
        <div className="flex flex-col items-start gap-3 py-6">
          <p className="font-medium text-failed">Couldn't load this work item</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}
      {item && <DetailBody key={item.id} item={item} />}
    </div>
  )
}

function DetailBody({ item }: { item: Detail }) {
  return (
    <article className="space-y-7">
      <header>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono text-foreground/70">{item.externalId}</span>
          <StatusBadge status={item.status} />
          <time dateTime={item.createdAt} className="ml-auto">
            Received {timeAgo(item.createdAt)}
          </time>
        </div>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.015em] text-balance">
          {item.title}
        </h2>
        <p className="mt-2 max-w-[68ch] leading-relaxed whitespace-pre-line text-foreground/80">
          {item.description}
        </p>
      </header>

      <NextStep item={item} />

      {item.category && <Analysis item={item} />}
      {item.attempts.length > 0 && <Attempts attempts={item.attempts} />}
    </article>
  )
}

function Analysis({ item }: { item: Detail }) {
  const priority = item.priority ? PRIORITY_TONE[item.priority] : null
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-semibold">AI analysis</h3>
        {item.analysedAt && (
          <span className="text-xs text-muted-foreground">{timeAgo(item.analysedAt)}</span>
        )}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-muted/70 p-3">
          <dt className="text-xs text-muted-foreground">Category</dt>
          <dd className="mt-1 font-medium">{humanize(item.category!)}</dd>
        </div>
        <div className={cn('rounded-xl p-3', priority?.bg)}>
          <dt className="text-xs text-foreground/60">Priority</dt>
          <dd className={cn('mt-1 font-medium', priority?.text)}>
            {item.priority && humanize(item.priority)}
          </dd>
        </div>
      </dl>
      <div className="mt-4 space-y-4">
        <div>
          <h4 className="text-xs text-muted-foreground">Summary</h4>
          <p className="mt-1 max-w-[68ch] leading-relaxed">{item.summary}</p>
        </div>
        <div className="border-l-2 border-primary pl-4">
          <h4 className="text-xs text-muted-foreground">Recommended action</h4>
          <p className="mt-1 max-w-[68ch] leading-relaxed font-medium">{item.recommendedAction}</p>
        </div>
      </div>
    </section>
  )
}

function Attempts({ attempts }: { attempts: AnalysisAttempt[] }) {
  return (
    <section>
      <h3 className="font-semibold">Analysis attempts</h3>
      <ol className="mt-3 space-y-2">
        {attempts.map((attempt) => (
          <li key={attempt.id} className="flex items-start gap-3 text-sm">
            <IconChip
              size="sm"
              icon={attempt.success ? CheckmarkCircle02Icon : Alert02Icon}
              tone={
                attempt.success
                  ? { text: 'text-completed', bg: 'bg-completed-soft' }
                  : { text: 'text-failed', bg: 'bg-failed-soft' }
              }
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {attempt.success ? 'Succeeded' : humanize(attempt.errorType ?? 'PROVIDER_ERROR')}
                <span className="font-normal text-muted-foreground">
                  {' '}
                  in {(attempt.latencyMs / 1000).toFixed(1)}s with {attempt.model}
                </span>
              </p>
              {attempt.errorMessage && (
                <p className="mt-0.5 line-clamp-2 break-words text-muted-foreground">
                  {attempt.errorMessage}
                </p>
              )}
            </div>
            <time dateTime={attempt.createdAt} className="shrink-0 text-xs text-muted-foreground">
              {timeAgo(attempt.createdAt)}
            </time>
          </li>
        ))}
      </ol>
    </section>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </div>
  )
}
