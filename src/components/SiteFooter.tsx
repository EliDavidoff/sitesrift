import { Link } from 'react-router-dom'
import { cn } from '../lib/cn.ts'

type Props = {
  className?: string
}

const link = cn(
  'font-mono text-[11px] uppercase tracking-[0.22em] text-muted transition',
  'underline-offset-4 hover:text-accent hover:underline',
)

export function SiteFooter({ className }: Props) {
  const y = new Date().getFullYear()
  return (
    <footer
      className={cn('relative z-[4] space-y-5 pt-9 text-center', className)}
    >
      <nav
        className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
        aria-label="Legal and policies"
      >
        <Link className={link} to="/terms">
          Terms
        </Link>
        <span className="font-mono text-[10px] text-border" aria-hidden>
          ·
        </span>
        <Link className={link} to="/privacy">
          Privacy
        </Link>
        <span className="font-mono text-[10px] text-border" aria-hidden>
          ·
        </span>
        <Link className={link} to="/accessibility">
          Accessibility
        </Link>
        <span className="font-mono text-[10px] text-border" aria-hidden>
          ·
        </span>
        <Link className={link} to="/developers">
          Developers
        </Link>
      </nav>
      <p className="text-[11px] font-mono uppercase tracking-[0.38em] text-muted">
        © {y} Sitesrift · outside-in snapshot
      </p>
    </footer>
  )
}
