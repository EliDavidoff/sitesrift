import { ArrowDown } from 'lucide-react'
import { motion } from 'motion/react'
import type { ScanSnapshotModel } from '../lib/scan-summary.ts'
import { cn } from '../lib/cn.ts'

function scrollToTarget(jump: ScanSnapshotModel['jump'], prefersReducedMotion: boolean | null) {
  if (!jump) return
  const behavior = prefersReducedMotion ? 'auto' : 'smooth'
  if (jump.type === 'finding') {
    document.getElementById(jump.id)?.scrollIntoView({ behavior, block: 'center' })
    return
  }
  document.getElementById(`findings-${jump.pillar}`)?.scrollIntoView({ behavior, block: 'start' })
}

type Props = {
  model: ScanSnapshotModel
  prefersReducedMotion: boolean | null
}

export function ScanSnapshotHero({ model, prefersReducedMotion }: Props) {
  const reduced = !!prefersReducedMotion

  const container = {
    hidden: { opacity: reduced ? 1 : 0 },
    show: {
      opacity: 1,
      transition: reduced ? { duration: 0 } : { staggerChildren: 0.07, delayChildren: 0.05 },
    },
  }

  const item = {
    hidden: { opacity: reduced ? 1 : 0, y: reduced ? 0 : 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduced ? 0 : 0.38 },
    },
  }

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="show"
      variants={container}
    >
      <motion.p
        variants={item}
        className="font-mono text-xs uppercase tracking-[0.46em] text-muted"
      >
        Scan snapshot
      </motion.p>
      <motion.h2
        variants={item}
        className="text-balance font-sans text-3xl font-medium tracking-tight text-foreground md:text-[2.15rem] md:leading-snug"
      >
        {model.headline}
      </motion.h2>
      <motion.p
        variants={item}
        className="max-w-2xl font-sans text-base leading-relaxed text-muted md:text-lg"
      >
        {model.sub}
      </motion.p>

      {model.priority ? (
        <motion.div
          variants={item}
          className={cn(
            'rounded-xl border border-accent/35 bg-accent/5 px-5 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
            'md:flex md:items-start md:justify-between md:gap-6',
          )}
        >
          <div className="min-w-0 flex-1 border-l-2 border-accent pl-4">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.35em] text-accent">
              {model.priority.label}
            </p>
            <p className="mt-2 font-sans text-sm leading-relaxed text-foreground md:text-[15px]">
              {model.priority.detail}
            </p>
          </div>
          {model.jump ? (
            <button
              type="button"
              onClick={() => scrollToTarget(model.jump, prefersReducedMotion)}
              className={cn(
                'mt-4 inline-flex shrink-0 items-center gap-2 rounded-lg border border-accent/50 bg-well px-4 py-2.5',
                'font-mono text-xs font-semibold uppercase tracking-[0.12em] text-accent transition',
                'hover:border-accent hover:bg-well/90 md:mt-0',
              )}
            >
              Jump to details
              <ArrowDown className="size-4 opacity-90" aria-hidden strokeWidth={2} />
            </button>
          ) : null}
        </motion.div>
      ) : null}
    </motion.div>
  )
}
