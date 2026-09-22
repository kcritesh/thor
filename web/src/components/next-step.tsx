import {
  AiBrain01Icon,
  AiMagicIcon,
  Alert02Icon,
  CheckmarkCircle02Icon,
  FileSearchIcon,
  Loading03Icon,
  RepeatIcon,
  Tick02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import { IconChip } from '@/components/icon-chip'
import { Button } from '@/components/ui/button'
import { useWorkItemAction } from '@/hooks/use-work-items'
import type { WorkItemDetail } from '@/lib/api'
import { STATUS_META } from '@/lib/status'
import { cn } from '@/lib/utils'

interface Step {
  icon: IconSvgElement
  title: string
  body: string
  action?: { label: string; icon: IconSvgElement; run: () => void }
}

// The one place the page tells the ops user what to do next. Its content is
// derived from status, so available actions always match the workflow rules.
export function NextStep({ item }: { item: WorkItemDetail }) {
  const analyse = useWorkItemAction('analyse')
  const retry = useWorkItemAction('retry')
  const complete = useWorkItemAction('complete')
  const pending = analyse.isPending || retry.isPending || complete.isPending
  const analysing = item.status === 'ANALYSING' || analyse.isPending || retry.isPending

  const status = analysing ? 'ANALYSING' : item.status
  const steps: Record<typeof status, Step> = {
    RECEIVED: {
      icon: AiMagicIcon,
      title: 'Run AI analysis',
      body: 'Classify this item and draft a recommended action for review.',
      action: { label: 'Analyse', icon: AiMagicIcon, run: () => analyse.mutate(item.id) },
    },
    ANALYSING: {
      icon: AiBrain01Icon,
      title: 'Analysing',
      body: 'Reading the item and drafting a recommendation. This usually takes a few seconds.',
    },
    READY_FOR_REVIEW: {
      icon: FileSearchIcon,
      title: 'Review the analysis',
      body: 'Check the suggestion below. Complete the item once the work is done.',
      action: { label: 'Mark complete', icon: Tick02Icon, run: () => complete.mutate(item.id) },
    },
    FAILED: {
      icon: Alert02Icon,
      title: 'Analysis failed',
      body: item.lastError ?? 'The AI provider did not return a usable result.',
      action: { label: 'Retry analysis', icon: RepeatIcon, run: () => retry.mutate(item.id) },
    },
    COMPLETED: {
      icon: CheckmarkCircle02Icon,
      title: 'Completed',
      body: 'No further action needed.',
    },
  }
  const step = steps[status]
  const { tone } = STATUS_META[status]

  return (
    <section
      aria-live="polite"
      className={cn(
        'flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center sm:p-5',
        tone.bg,
      )}
    >
      <IconChip icon={step.icon} tone={{ text: tone.text, bg: 'bg-card/80' }} size="lg" />
      <div className="min-w-0 flex-1">
        <h3 className={cn('font-semibold', tone.text)}>{step.title}</h3>
        <p className="mt-0.5 text-sm break-words text-foreground/75">{step.body}</p>
      </div>
      {analysing ? (
        <HugeiconsIcon
          icon={Loading03Icon}
          className={cn('size-6 shrink-0 animate-spin', tone.text)}
          aria-label="Analysing"
        />
      ) : (
        step.action && (
          <Button
            size="lg"
            onClick={step.action.run}
            loading={complete.isPending}
            disabled={pending}
            className="shrink-0"
          >
            {!complete.isPending && <HugeiconsIcon icon={step.action.icon} strokeWidth={2} />}
            {step.action.label}
          </Button>
        )
      )}
    </section>
  )
}
