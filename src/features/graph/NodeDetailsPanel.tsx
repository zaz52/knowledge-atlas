import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { ArrowDown, X } from '../../components/icons'

const query = '(max-width: 760px)'
const subscribe = (notify: () => void) => {
  const media = window.matchMedia(query)
  media.addEventListener('change', notify)
  return () => media.removeEventListener('change', notify)
}
const mobileSnapshot = () => window.matchMedia(query).matches

export function NodeDetailsPanel({
  open,
  onClose,
  nodeId,
  label,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  nodeId: string
  label: string
  children: ReactNode
  footer: ReactNode
}) {
  const mobile = useSyncExternalStore(subscribe, mobileSnapshot, () => false)
  const [present, setPresent] = useState(open)
  const [expanded, setExpanded] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (open) {
      const frame = window.requestAnimationFrame(() => setPresent(true))
      return () => window.cancelAnimationFrame(frame)
    }
    const timer = window.setTimeout(() => setPresent(false), 180)
    return () => window.clearTimeout(timer)
  }, [open])
  useEffect(() => {
    if (open) contentRef.current?.scrollTo(0, 0)
  }, [nodeId, open])
  useEffect(() => {
    if (!open) return
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [mobile, open, onClose])
  if (!open && !present) return null
  const body = (
    <>
      <div className="detail-panel-header">
        {mobile ? (
          <button
            className="sheet-size-toggle"
            type="button"
            aria-label={expanded ? '收起详情面板' : '展开详情面板'}
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            <span className="sheet-handle" />
            {expanded ? '收起详情' : '展开阅读'}
            <ArrowDown size={14} />
          </button>
        ) : (
          <span>
            知识档案 <small>KNOWLEDGE NOTES</small>
          </span>
        )}
        <button
          className="detail-close"
          type="button"
          aria-label="关闭详情"
          onClick={onClose}
          autoFocus={mobile}
        >
          <X size={19} />
        </button>
      </div>
      <div ref={contentRef} className="detail-panel-content mobile-sheet-content">
        {children}
      </div>
      <div className="detail-panel-footer">{footer}</div>
    </>
  )
  const state = open ? 'is-open' : 'is-closing'
  if (!mobile)
    return (
      <section className={'desktop-node-drawer ' + state} aria-label={label + '详情'}>
        {body}
      </section>
    )
  return (
    <section
      className={'mobile-node-sheet ' + state + (expanded ? ' is-expanded' : '')}
      aria-label={label + '详情'}
    >
      {body}
    </section>
  )
}
