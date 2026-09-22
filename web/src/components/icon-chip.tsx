import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import type { Tone } from '@/lib/status'
import { cn } from '@/lib/utils'

const sizes = {
  sm: 'size-6 rounded-md [&_svg]:size-3.5',
  md: 'size-8 rounded-lg [&_svg]:size-[18px]',
  lg: 'size-10 rounded-xl [&_svg]:size-5',
}

// Hugeicons free set is stroke-only; a strong icon on its own soft tint gives
// the two-tone look without the Pro duotone set.
export function IconChip({
  icon,
  tone,
  size = 'md',
  className,
}: {
  icon: IconSvgElement
  tone: Tone
  size?: keyof typeof sizes
  className?: string
}) {
  return (
    <span
      className={cn('inline-grid shrink-0 place-items-center', sizes[size], tone.bg, tone.text, className)}
    >
      <HugeiconsIcon icon={icon} strokeWidth={1.8} />
    </span>
  )
}
