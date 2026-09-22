import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { HugeiconsIcon } from '@hugeicons/react'
import { Loading03Icon } from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'

// Tactile, not flat: an inset top highlight and a darker bottom edge that
// collapses on press, so buttons read as physical keys.
const buttonVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap select-none transition-[background-color,box-shadow,transform,color] duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/35 focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-55 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.22),inset_0_-2px_0_var(--primary-strong),0_1px_2px_rgb(27_31_59/0.18)] hover:bg-[#4549c4] active:translate-y-px active:shadow-[inset_0_1px_0_rgb(255_255_255/0.15),inset_0_0_0_var(--primary-strong)]',
        soft: 'bg-primary-soft text-primary shadow-[inset_0_0_0_1px_rgb(59_63_182/0.14),inset_0_-2px_0_rgb(59_63_182/0.12)] hover:bg-[#dcdef8] active:translate-y-px active:shadow-[inset_0_0_0_1px_rgb(59_63_182/0.18)]',
        outline:
          'bg-card text-foreground shadow-[inset_0_0_0_1px_var(--input),inset_0_-2px_0_var(--border),0_1px_1px_rgb(27_31_59/0.04)] hover:bg-muted active:translate-y-px active:shadow-[inset_0_0_0_1px_var(--input)]',
        danger:
          'bg-failed-soft text-failed shadow-[inset_0_0_0_1px_rgb(180_35_60/0.16),inset_0_-2px_0_rgb(180_35_60/0.14)] hover:bg-[#fbd9de] active:translate-y-px',
        ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
      },
      size: {
        sm: 'h-8 px-3 text-[13px] [&_svg]:size-4',
        md: 'h-9 px-3.5 text-sm [&_svg]:size-[18px]',
        lg: 'h-11 px-5 text-[15px] [&_svg]:size-5',
        'icon-sm': 'size-8 [&_svg]:size-4',
        icon: 'size-9 [&_svg]:size-[18px]',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { loading?: boolean }

function Button({
  className,
  variant,
  size,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      data-slot="button"
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {loading && <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />}
      {children}
    </button>
  )
}

export { Button }
