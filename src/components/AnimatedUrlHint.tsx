import { useEffect, useRef, useState } from 'react'
import { URL_HINT_ROTATION } from '../lib/url-hints.ts'

const TYPING_MS = 44
const DELETING_MS = 30
const PAUSE_AT_FULL_MS = 2200
const PAUSE_EMPTY_MS = 520
const ROTATE_STATIC_MS = 4200

type Props = {
  reducedMotion: boolean
  className?: string
}

/**
 * Decorative typewriter loop for the URL field. Mount only while idle + empty + unfocused.
 * Screen readers use `<label>` + `<input>`; this span is `aria-hidden`.
 */
export function AnimatedUrlHint({ reducedMotion, className }: Props) {
  const [display, setDisplay] = useState(() =>
    reducedMotion ? URL_HINT_ROTATION[0] : '',
  )
  const idxRef = useRef(0)

  useEffect(() => {
    if (reducedMotion) {
      idxRef.current = 0
      const id = window.setInterval(() => {
        idxRef.current = (idxRef.current + 1) % URL_HINT_ROTATION.length
        setDisplay(URL_HINT_ROTATION[idxRef.current])
      }, ROTATE_STATIC_MS)
      return () => clearInterval(id)
    }

    let cancelled = false
    const timeouts: ReturnType<typeof setTimeout>[] = []
    const schedule = (fn: () => void, ms: number) => {
      timeouts.push(window.setTimeout(fn, ms))
    }

    let exampleIndex = 0

    const runCycle = () => {
      if (cancelled) return
      const target = URL_HINT_ROTATION[exampleIndex % URL_HINT_ROTATION.length]

      const typeChar = (pos: number) => {
        if (cancelled) return
        setDisplay(target.slice(0, pos))
        if (pos < target.length) {
          schedule(() => typeChar(pos + 1), TYPING_MS)
        } else {
          schedule(() => deleteFrom(target.length), PAUSE_AT_FULL_MS)
        }
      }

      const deleteFrom = (len: number) => {
        if (cancelled) return
        if (len > 0) {
          setDisplay(target.slice(0, len - 1))
          schedule(() => deleteFrom(len - 1), DELETING_MS)
        } else {
          exampleIndex += 1
          schedule(() => {
            if (!cancelled) runCycle()
          }, PAUSE_EMPTY_MS)
        }
      }

      typeChar(0)
    }

    runCycle()

    return () => {
      cancelled = true
      timeouts.forEach((t) => clearTimeout(t))
    }
  }, [reducedMotion])

  return (
    <span aria-hidden className={className}>
      {display}
      <span className="ml-px inline-block h-[1em] w-[1.5px] animate-pulse bg-accent/55 align-[-0.12em]" />
    </span>
  )
}
