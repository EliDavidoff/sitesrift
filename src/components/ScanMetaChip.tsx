import { Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useId, useState } from 'react'
import { cn } from '../lib/cn.ts'

type Props = {
  children: ReactNode
  /** Used in aria-label; names what the help explains */
  helpLabel: string
  hint: string
  className?: string
  /** Wide row (e.g. TLS note) vs inline metric pills */
  variant?: 'compact' | 'stretch'
}

export function ScanMetaChip({ children, helpLabel, hint, className, variant = 'compact' }: Props) {
  const panelId = useId()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  const stretch = variant === 'stretch'

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-well font-mono text-xs text-muted',
        stretch
          ? 'flex min-w-[min(440px,calc(100%-1rem))] flex-1 flex-col px-4 py-3'
          : 'inline-flex max-w-full flex-col px-4 py-2',
        className,
      )}
    >
      <div
        className={cn(
          'flex gap-2',
          stretch ? 'w-full items-start' : 'inline-flex max-w-full flex-wrap items-center',
        )}
      >
        <div
          className={cn(
            'min-w-0',
            stretch ? 'flex-1 leading-relaxed' : 'inline-flex flex-wrap items-center gap-x-2 gap-y-1',
          )}
        >
          {children}
        </div>
        <button
          type="button"
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-md border border-transparent',
            'min-h-9 min-w-9 text-muted transition hover:border-border hover:bg-well/80 hover:text-accent',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          )}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={`Help: ${helpLabel}`}
          onClick={() => setOpen((v) => !v)}
        >
          <Info className="size-4" strokeWidth={2} aria-hidden />
        </button>
      </div>
      <div
        id={panelId}
        role="region"
        aria-label={helpLabel}
        hidden={!open}
        className="border-t border-border/50 pt-2 text-left text-[11px] leading-relaxed text-muted"
      >
        {hint}
      </div>
    </div>
  )
}
