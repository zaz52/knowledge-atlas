import { useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ArrowRight, X } from './icons'
import { libraryResults } from '../features/topics/librarySearch'
export function LibrarySearch({
  value,
  onChange,
}: {
  value?: string
  onChange?: (value: string) => void
}) {
  const [local, setLocal] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const id = useId()
  const rootRef = useRef<HTMLFormElement>(null)
  const navigate = useNavigate()
  const query = value ?? local
  const results = libraryResults(query)
  const update = (text: string) => {
    setLocal(text)
    onChange?.(text)
    setActive(0)
    setOpen(true)
  }
  const select = (url: string) => {
    setOpen(false)
    ;(document.activeElement as HTMLElement)?.blur()
    navigate(url)
  }
  return (
    <form
      className="library-global-search"
      ref={rootRef}
      role="search"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false)
      }}
      onSubmit={(event) => {
        event.preventDefault()
        if (!query.trim()) select('/topics')
        else if (results[active]) select(results[active].url)
        else {
          setOpen(true)
        }
      }}
    >
      <Search size={19} />
      <input
        type="search"
        role="combobox"
        aria-label="搜索人物、事件或专题"
        aria-autocomplete="list"
        aria-controls={id}
        aria-expanded={open && Boolean(query.trim())}
        aria-activedescendant={open && results[active] ? id + '-' + active : undefined}
        placeholder="搜索人物、事件、朝代或知识点…"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => update(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setOpen(true)
            setActive((index) => Math.min(index + 1, results.length - 1))
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActive((index) => Math.max(index - 1, 0))
          }
          if (event.key === 'Escape') {
            event.preventDefault()
            setOpen(false)
            event.currentTarget.blur()
          }
        }}
      />
      {query && (
        <button
          type="button"
          aria-label="清除知识搜索"
          className="library-clear"
          onClick={() => update('')}
        >
          <X size={16} />
        </button>
      )}
      <button type="submit" aria-label="搜索知识">
        <Search size={20} />
      </button>
      {open && query.trim() && (
        <div className="library-results" id={id} role="listbox" aria-label="知识搜索结果">
          <div className="library-results-heading">
            馆藏检索 <span>{results.length ? '选择结果，继续探索' : '暂无匹配内容'}</span>
          </div>
          {results.length ? (
            results.map((result, index) => (
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                id={id + '-' + index}
                key={result.url}
                onClick={() => select(result.url)}
              >
                <span
                  className="result-initial"
                  data-kind={
                    result.kind === 'event'
                      ? 'event'
                      : result.kind === 'person'
                        ? 'person'
                        : 'polity'
                  }
                >
                  {result.label.slice(0, 1)}
                </span>
                <span>
                  <strong>{result.label}</strong>
                  <small>
                    {result.topic} · {result.detail}
                  </small>
                </span>
                <ArrowRight size={15} />
              </button>
            ))
          ) : (
            <p>试试“诸葛亮”“北宋”“赤壁”或“植物”。</p>
          )}
        </div>
      )}
    </form>
  )
}
