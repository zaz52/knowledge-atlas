import { useState } from 'react'
import { ArrowRight, Search, X } from '../../components/icons'
import { nodeThemeKey, kindNames } from './graphTheme'
import type { ExplorerNode } from '../../types/explorer'

export interface RelationSearchResult {
  id: string
  label: string
  typeLabel: string
  sourceLabel: string
  targetLabel: string
}

export function ExplorerSearch({
  query,
  onQuery,
  results,
  relationResults = [],
  revealedIds,
  onSelect,
  onSelectRelation,
  onEmpty,
}: {
  query: string
  onQuery: (query: string) => void
  results: ExplorerNode[]
  relationResults?: RelationSearchResult[]
  revealedIds: string[]
  onSelect: (id: string) => void
  onSelectRelation?: (id: string) => void
  onEmpty: () => void
}) {
  const [active, setActive] = useState(0)
  return (
    <form
      className="atlas-search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        const result = results[Math.min(active, results.length - 1)]
        if (result) onSelect(result.id)
        else onEmpty()
      }}
    >
      <Search size={20} />
      <input
        type="search"
        role="combobox"
        aria-label="搜索图谱节点"
        aria-expanded={Boolean(query.trim())}
        aria-controls="atlas-search-results"
        aria-autocomplete="list"
        aria-activedescendant={
          query && results[active] ? 'search-' + results[active].id : undefined
        }
        value={query}
        placeholder="搜索人物、事件或知识点……"
        onChange={(event) => {
          onQuery(event.target.value)
          setActive(0)
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setActive((index) => Math.min(index + 1, Math.max(0, results.length - 1)))
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActive((index) => Math.max(index - 1, 0))
          }
          if (event.key === 'Escape') {
            event.stopPropagation()
            onQuery('')
            event.currentTarget.blur()
          }
        }}
      />
      {query && (
        <button
          type="button"
          className="search-clear"
          aria-label="清除节点搜索"
          onClick={() => {
            onQuery('')
            setActive(0)
          }}
        >
          <X size={17} />
        </button>
      )}
      <button
        type="submit"
        className="search-submit"
        aria-label="查找节点"
        disabled={!query.trim()}
      >
        <ArrowRight size={20} />
      </button>
      {query.trim() && (
        <div
          id="atlas-search-results"
          className="atlas-search-results"
          role="listbox"
          aria-label="节点搜索结果"
        >
          <div className="search-result-heading">
            沿着好奇心，找到下一站 <span>{results.length} 个结果</span>
          </div>
          {results.length || relationResults.length ? (
            <>
              {results.map((node, index) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  id={'search-' + node.id}
                  key={node.id}
                  onClick={() => onSelect(node.id)}
                >
                  <span
                    className="graph-result-icon"
                    data-kind={nodeThemeKey(node.kind)}
                    aria-hidden="true"
                  >
                    {node.label.slice(0, 1)}
                  </span>
                  <span>
                    {node.label}
                    <small>
                      {kindNames[node.kind]} · {node.identity}
                    </small>
                  </span>
                  <span>
                    {revealedIds.includes(node.id) ? '定位节点' : '加入图谱'}{' '}
                    <ArrowRight size={14} />
                  </span>
                </button>
              ))}
              {relationResults.length > 0 && (
                <>
                  <div className="search-result-heading">
                    按关系找 <span>{relationResults.length} 个结果</span>
                  </div>
                  {relationResults.map((relation) => (
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      key={relation.id}
                      onClick={() => onSelectRelation?.(relation.id)}
                    >
                      <span className="graph-result-icon" data-kind="relation" aria-hidden="true">
                        系
                      </span>
                      <span>
                        {relation.sourceLabel} → {relation.targetLabel}
                        <small>
                          {relation.typeLabel} · {relation.label}
                        </small>
                      </span>
                      <span>
                        定位关系 <ArrowRight size={14} />
                      </span>
                    </button>
                  ))}
                </>
              )}
            </>
          ) : (
            <p>暂未找到匹配节点，试试其他名字或字号。</p>
          )}
        </div>
      )}
    </form>
  )
}
