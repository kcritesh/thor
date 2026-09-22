import {
  AiBrain01Icon,
  Alert02Icon,
  CheckmarkCircle02Icon,
  FileSearchIcon,
  InboxIcon,
} from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react'
import type { Priority, WorkItemStatus } from './api'

export interface Tone {
  text: string
  bg: string
}

export const STATUS_META: Record<
  WorkItemStatus,
  { label: string; icon: IconSvgElement; tone: Tone }
> = {
  RECEIVED: {
    label: 'Received',
    icon: InboxIcon,
    tone: { text: 'text-received', bg: 'bg-received-soft' },
  },
  ANALYSING: {
    label: 'Analysing',
    icon: AiBrain01Icon,
    tone: { text: 'text-analysing', bg: 'bg-analysing-soft' },
  },
  READY_FOR_REVIEW: {
    label: 'Ready for review',
    icon: FileSearchIcon,
    tone: { text: 'text-review', bg: 'bg-review-soft' },
  },
  FAILED: {
    label: 'Failed',
    icon: Alert02Icon,
    tone: { text: 'text-failed', bg: 'bg-failed-soft' },
  },
  COMPLETED: {
    label: 'Completed',
    icon: CheckmarkCircle02Icon,
    tone: { text: 'text-completed', bg: 'bg-completed-soft' },
  },
}

export const PRIORITY_TONE: Record<Priority, Tone> = {
  URGENT: { text: 'text-failed', bg: 'bg-failed-soft' },
  HIGH: { text: 'text-review', bg: 'bg-review-soft' },
  MEDIUM: { text: 'text-analysing', bg: 'bg-analysing-soft' },
  LOW: { text: 'text-received', bg: 'bg-received-soft' },
}

export const humanize = (value: string) =>
  value.charAt(0) + value.slice(1).toLowerCase().replaceAll('_', ' ')

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
]

export function timeAgo(iso: string) {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
  }
  return 'just now'
}
