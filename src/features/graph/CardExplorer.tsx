import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Compass,
  Filter,
  MoreHorizontal,
  X,
} from '../../components/icons'
import { ShareLinkButton } from '../../components/ShareLinkButton'
import type { ExplorerDataset } from '../../types/explorer'
import { ExplorerCanvas } from './ExplorerCanvas'
import type { ExplorerCanvasHandle } from './ExplorerCanvas'
import { ExplorerSearch } from './ExplorerSearch'
import { NodeDetails } from './NodeDetails'
import { NodeDetailsPanel } from './NodeDetailsPanel'
import { defaultFilters, searchNodes } from './explorerModel'
import { kindNames, nodeThemeKey } from './graphTheme'
import {
  CARD_BATCH,
  cardNeighbors,
  cardScene,
  cardVisibleIds,
  defaultFocusPerson,
  expandAllCards,
  expandCard,
  focusRegion,
  locateCard,
  collapseCard,
} from './cardExploration'
import { relationFamilyOf, RELATION_FAMILY_NAMES, relationTypeColor } from './cardPresentation'
import '../../styles/explorer.css'
import '../../styles/card-atlas.css'

export function CardExplorer({ dataset }: { dataset: ExplorerDataset }) {
  const { metadata } = dataset
  const [params] = useSearchParams()
  const linkedNode = params.get('node')
  const canvasRef = useRef<ExplorerCanvasHandle>(null)
  const rootRef = useRef<HTMLElement>(null)
  // Research-first atlas: the default view is a focused local graph around
  // the central figure (two-hop neighborhood); panorama, the faction lens
  // and the legend filters all act in place without leaving the canvas.
  const [filters, setFilters] = useState(() => defaultFilters(dataset))
  const [state, setState] = useState(() => {
    const initialFilters = defaultFilters(dataset)
    return focusRegion(dataset, initialFilters, defaultFocusPerson(dataset, initialFilters))
  })
  const [factionFocus, setFactionFocus] = useState<string | null>(null)
  const [chapterNav, setChapterNav] = useState(
    () => metadata.story?.chapters[0]?.nodeId ?? metadata.initialNodeIds[0],
  )
  const [pinned, setPinned] = useState(true)
  const [highlight, setHighlight] = useState(true)
  const [allRelations, setAllRelations] = useState(false)
  const [inspector, setInspector] = useState(() => window.innerWidth > 760)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [panel, setPanel] = useState<'filters' | 'tools' | 'legend' | null>(null)
  const [query, setQuery] = useState('')
  const [zoom, setZoom] = useState(1)
  const [revision] = useState(0)
  const [graphStatus, setGraphStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [camera, setCamera] = useState<{ id: string; reset?: boolean } | null>(null)
  const [logs, setLogs] = useState(() => [
    {
      id: 0,
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      text: `已聚焦「${dataset.nodes.find((n) => n.id === state.focusId)?.label ?? ''}」及其周围一圈关系：点选人物可聚焦其关系网，底部图例可按关系家族开关连线，聚焦标识旁可切换全景。`,
    },
  ])
  const sequence = useRef(0)
  const addLog = useCallback((text: string) => {
    const id = ++sequence.current
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
    setLogs((previous) => [{ id, time, text }, ...previous].slice(0, 24))
  }, [])
  const visibleIds = useMemo(() => cardVisibleIds(state), [state])
  const fullScene = useMemo(() => cardScene(dataset, state, filters), [dataset, state, filters])
  const scene = useMemo(() => {
    if (allRelations) return fullScene
    const pairs = new Set<string>()
    return {
      ...fullScene,
      relations: fullScene.relations.filter((edge) => {
        const key = [edge.source, edge.target].sort().join(':')
        if (pairs.has(key)) return false
        pairs.add(key)
        return true
      }),
    }
  }, [fullScene, allRelations])
  const selected = dataset.nodes.find((n) => n.id === state.selectedId)!
  const remaining = cardNeighbors(dataset, selected.id, filters).filter(
    (id) => !scene.nodes.some((n) => n.id === id),
  )
  const cardView = useMemo(
    () => ({ state, filters, pinned, factionFocus }),
    [state, filters, pinned, factionFocus],
  )
  const results = useMemo(
    () => searchNodes(dataset, query, filters.includeLiterary),
    [dataset, query, filters.includeLiterary],
  )
  const roots = metadata.story?.chapters.map((c) => c.nodeId) ?? metadata.initialNodeIds
  const hasLiterary = dataset.nodes.some((n) => n.basis === 'literary')

  const navigateToNode = useCallback(
    (id: string) => {
      const node = dataset.nodes.find((n) => n.id === id)
      if (!node) return
      const effective = {
        ...filters,
        includeLiterary: node.basis === 'literary' || filters.includeLiterary,
      }
      if (effective.includeLiterary !== filters.includeLiterary) setFilters(effective)
      setState((previous) => locateCard(dataset, previous, id, effective))
      setDetailsOpen(false)
      setQuery('')
      setPanel(null)
      setCamera({ id })
      if (document.activeElement instanceof HTMLInputElement) document.activeElement.blur()
      addLog(`已定位「${node.label}」，可点击节点继续展开，或阅读知识档案。`)
    },
    [dataset, filters, addLog],
  )
  const navigateRef = useRef(navigateToNode)
  useEffect(() => {
    navigateRef.current = navigateToNode
  }, [navigateToNode])
  useEffect(() => {
    if (!linkedNode || !dataset.nodes.some((n) => n.id === linkedNode)) return
    const frame = requestAnimationFrame(() => navigateRef.current(linkedNode))
    return () => cancelAnimationFrame(frame)
  }, [linkedNode, dataset])
  const clickCard = useCallback(
    (id: string) => {
      setState((previous) => ({ ...previous, selectedId: id }))
      setDetailsOpen(false)
      const name = dataset.nodes.find((n) => n.id === id)!.label
      addLog(`已选中「${name}」，使用角标展开，或主动阅读详情。`)
    },
    [dataset, addLog],
  )
  const expandBatch = state.focusId ? 48 : CARD_BATCH
  const expandSelected = () => {
    const next = expandCard(dataset, state, selected.id, filters, 'cumulative', expandBatch)
    addLog(
      `展开「${selected.label}」 · 新增${cardVisibleIds(next).length - visibleIds.length}张知识节点`,
    )
    setState(next)
  }
  const goPanorama = useCallback(() => {
    setState((previous) => ({
      ...expandAllCards(dataset, previous, filters),
      focusId: null,
      focusDepth: 0,
      selectedId: previous.rootId,
    }))
    setFactionFocus(null)
    setDetailsOpen(false)
    setPanel(null)
    setQuery('')
    setCamera({ id: state.rootId, reset: true })
    addLog('已展开整张图谱全景，可缩放平移继续探索。')
  }, [dataset, filters, state.rootId, addLog])
  const refocus = useCallback(
    (id: string) => {
      const node = dataset.nodes.find((n) => n.id === id)
      if (!node) return
      setState(focusRegion(dataset, filters, id))
      setDetailsOpen(false)
      setPanel(null)
      setCamera({ id })
      addLog(`已聚焦「${node.label}」及其周围一圈关系。`)
    },
    [dataset, filters, addLog],
  )
  const expandDepth = useCallback(() => {
    setState((previous) => {
      if (!previous.focusId) return previous
      const nextDepth = (previous.focusDepth || 1) + 1
      return focusRegion(dataset, filters, previous.focusId, nextDepth)
    })
    addLog('已扩大一圈关系范围。')
  }, [dataset, filters, addLog])
  const resetView = () => {
    goPanorama()
  }
  useEffect(() => {
    if (!camera || graphStatus !== 'ready') return
    if (camera.reset) {
      // Back to the full map: frame every node, then center on the root.
      canvasRef.current?.fit()
      canvasRef.current?.focus(camera.id)
    } else {
      canvasRef.current?.focus(camera.id, 0.95)
    }
  }, [camera, graphStatus])
  const selectedRef = useRef(state.selectedId)
  useEffect(() => {
    selectedRef.current = state.selectedId
  }, [state.selectedId])
  useEffect(() => {
    if (graphStatus !== 'ready') return
    const frame = requestAnimationFrame(() => canvasRef.current?.focus(selectedRef.current))
    return () => cancelAnimationFrame(frame)
  }, [inspector, detailsOpen, graphStatus])
  useEffect(() => {
    const viewport = window.visualViewport
    const update = () =>
      rootRef.current?.style.setProperty(
        '--keyboard-inset',
        Math.max(0, innerHeight - (viewport?.height ?? innerHeight) - (viewport?.offsetTop ?? 0)) +
          'px',
      )
    update()
    viewport?.addEventListener('resize', update)
    viewport?.addEventListener('scroll', update)
    return () => {
      viewport?.removeEventListener('resize', update)
      viewport?.removeEventListener('scroll', update)
    }
  }, [])
  const toggleType = (type: string) => {
    setFilters((previous) => ({
      ...previous,
      relationTypes: previous.relationTypes.includes(type)
        ? previous.relationTypes.filter((t) => t !== type)
        : [...previous.relationTypes, type],
    }))
    addLog(`调整关系筛选 · ${metadata.relationTypes.find((t) => t.id === type)!.label}`)
  }
  const familyTypeIds = useCallback(
    (family: string) =>
      metadata.relationTypes
        .filter((t) => relationFamilyOf(t.id) === family)
        .map((t) => t.id),
    [metadata],
  )
  const toggleFamily = (family: string) => {
    const typeIds = familyTypeIds(family)
    const turningOff = typeIds.every((id) => filters.relationTypes.includes(id))
    setFilters((previous) => ({
      ...previous,
      relationTypes: turningOff
        ? previous.relationTypes.filter((id) => !typeIds.includes(id))
        : [...new Set([...previous.relationTypes, ...typeIds])],
    }))
    addLog(`${turningOff ? '隐藏' : '显示'}「${RELATION_FAMILY_NAMES[family]}」类连线`)
  }
  const relationResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const matches: {
      id: string
      label: string
      typeLabel: string
      sourceLabel: string
      targetLabel: string
    }[] = []
    for (const edge of dataset.relations) {
      if (matches.length >= 6) break
      if (!filters.relationTypes.includes(edge.type)) continue
      const type = metadata.relationTypes.find((t) => t.id === edge.type)!
      if (
        !type.label.toLowerCase().includes(q) &&
        !edge.label.toLowerCase().includes(q)
      )
        continue
      matches.push({
        id: edge.id,
        label: edge.label,
        typeLabel: type.label,
        sourceLabel: dataset.nodes.find((n) => n.id === edge.source)?.label ?? edge.source,
        targetLabel: dataset.nodes.find((n) => n.id === edge.target)?.label ?? edge.target,
      })
    }
    return matches
  }, [dataset, metadata, query, filters.relationTypes])
  const selectRelation = (edgeId: string) => {
    const edge = dataset.relations.find((r) => r.id === edgeId)
    if (!edge) return
    const type = metadata.relationTypes.find((t) => t.id === edge.type)!
    setState((previous) => {
      const withSource = locateCard(dataset, previous, edge.source, filters)
      const withBoth = locateCard(dataset, withSource, edge.target, filters)
      return { ...withBoth, selectedId: edge.source }
    })
    setQuery('')
    setPanel(null)
    setDetailsOpen(false)
    setCamera({ id: edge.source })
    const sourceLabel = dataset.nodes.find((n) => n.id === edge.source)?.label ?? ''
    const targetLabel = dataset.nodes.find((n) => n.id === edge.target)?.label ?? ''
    addLog(`已定位「${sourceLabel}」与「${targetLabel}」的${type.label}关系。`)
  }
  const allowLiterary = (includeLiterary: boolean) => {
    setFilters((previous) => ({ ...previous, includeLiterary }))
    if (!includeLiterary && selected.basis === 'literary') {
      setState((previous) => ({ ...previous, selectedId: previous.rootId }))
      setDetailsOpen(false)
    }
    addLog(includeLiterary ? '已显示单独标识的演义内容' : '已收起演义节点与连线')
  }
  const showDetails = () => {
    setDetailsOpen(true)
    setPanel(null)
  }
  return (
    <section
      ref={rootRef}
      className={`atlas-explorer circle-atlas ${inspector ? 'has-inspector' : ''} ${detailsOpen ? 'has-details' : ''} ${panel ? 'has-tool-panel' : ''}`}
      data-selected-node={selected.id}
      data-exploration-root={state.rootId}
      data-pinned={pinned}
    >
      <div className="atlas-graph-stage">
        <ExplorerCanvas
          ref={canvasRef}
          dataset={dataset}
          scene={scene}
          selectedId={selected.id}
          explorationRootId={state.rootId}
          highlight={highlight}
          layoutRevision={revision}
          cardView={cardView}
          onSelect={clickCard}
          onExpand={(id) => {
            const expanding = !state.expanded[id]?.length
            setState((previous) =>
              expanding
                ? expandCard(dataset, previous, id, filters, 'cumulative', expandBatch)
                : collapseCard(previous, id),
            )
            setDetailsOpen(false)
            addLog(
              expanding
                ? `展开「${dataset.nodes.find((n) => n.id === id)!.label}」的关联`
                : '已收起分支，共享知识继续保留',
            )
          }}
          onStatusChange={setGraphStatus}
          onZoomChange={setZoom}
        />
      </div>
      <header className="card-topbar">
        <div className="card-brand-group">
          <Link className="card-brand" to="/" aria-label="知图首页">
            <span>知图</span>
            <small>Knowledge Atlas</small>
          </Link>
          <div className="card-brand-copy">
            <h1>{metadata.title}</h1>
            <span>{metadata.subtitle}</span>
          </div>
          <Link className="card-home-link" to="/">
            <ArrowLeft size={16} />
            <span>返回首页</span>
          </Link>
        </div>
        <div className="card-header-meta">
          <span className="card-total-count">
            {dataset.nodes.length} 个知识节点 · {dataset.relations.length} 条关系
          </span>
          <div className="card-header-legend">
            <span data-kind="period">历史阶段</span>
            <span data-kind="event">历史事件</span>
            <span data-kind="person">人物</span>
            <span data-kind="polity">朝代 / 组织</span>
          </div>
        </div>
      </header>
      <div className="card-context-row">
        <label>
          <span>{metadata.story ? '历史阶段' : '朝代'} · 快速定位</span>
          <select
            className="card-root-select"
            aria-label="在同一张图谱内快速定位到历史阶段或朝代"
            value={chapterNav}
            onChange={(e) => {
              setChapterNav(e.target.value)
              navigateToNode(e.target.value)
            }}
          >
            {roots.map((id) => (
              <option key={id} value={id}>
                {dataset.nodes.find((n) => n.id === id)!.label}
              </option>
            ))}
          </select>
        </label>
        <span className="card-visible-count">
          已显示 {scene.nodes.length} 个知识点 · {scene.relations.length} 条联系
        </span>
        {state.focusId && (
          <span className="card-focus-chip">
            聚焦「{dataset.nodes.find((n) => n.id === state.focusId)?.label}」
            <button type="button" onClick={expandDepth}>
              扩大一圈
            </button>
            <button type="button" onClick={goPanorama}>
              全景
            </button>
          </span>
        )}
        <button
          className="card-btn card-inspector-toggle"
          type="button"
          aria-pressed={inspector}
          onClick={() => {
            setInspector((v) => !v)
            setDetailsOpen(false)
          }}
        >
          当前探索
        </button>
      </div>
      <aside
        className="card-inspector"
        aria-label="探索状态面板"
        hidden={!inspector || detailsOpen}
      >
        <div className="card-panel-title">
          <span>当前探索</span>
          <button
            type="button"
            className="card-panel-close"
            aria-label="关闭状态面板"
            onClick={() => setInspector(false)}
          >
            <X size={18} />
          </button>
        </div>
        <p className="card-panel-description">
          已显示 {scene.nodes.length} 个知识点 · {scene.relations.length} 条联系
        </p>
        <div className="card-selected-note" data-kind={selected.kind}>
          <div className="card-selected-heading">
            <i className="selected-orb" />
            <div>
              <h3>{selected.label}</h3>
              <span>
                {kindNames[selected.kind]} · {selected.period}
              </span>
            </div>
          </div>
          <p>{selected.description}</p>
          {Boolean(selected.lifeEvents?.length) && (
            <div className="card-life-summary">
              <h4>重要经历</h4>
              {selected.lifeEvents?.slice(0, 3).map((entry) => (
                <span key={entry.title}>
                  {entry.date} · {entry.title}
                </span>
              ))}
            </div>
          )}
          <div>
            <button type="button" className="card-btn card-btn-primary" onClick={showDetails}>
              <BookOpen size={18} />
              阅读详情
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              className="card-btn"
              disabled={!remaining.length}
              onClick={expandSelected}
            >
              展开关联
              {remaining.length ? ` +${Math.min(expandBatch, remaining.length)}` : ' · 已显示'}
            </button>
            <button type="button" className="card-btn" onClick={() => refocus(selected.id)}>
              以此为中心
            </button>
          </div>
        </div>
        <details className="card-exploration-extra">
          <summary>当前探索范围 · {scene.nodes.length} 个知识点</summary>
          <div className="card-visible-set">
            {scene.nodes.map((n) => (
              <button
                key={n.id}
                type="button"
                aria-pressed={n.id === selected.id}
                onClick={() => navigateToNode(n.id)}
              >
                {n.label}
              </button>
            ))}
          </div>
        </details>
        <details className="card-exploration-extra">
          <summary>探索足迹</summary>
          <div className="card-log-list" aria-label="探索足迹">
            {logs.map((log) => (
              <p key={log.id}>
                <time>{log.time}</time>
                {log.text}
              </p>
            ))}
          </div>
        </details>
      </aside>
      <div className="card-bottom-legend">
        <div className="family-chips" role="group" aria-label="按关系家族开关连线">
          {(
            ['person', 'ally', 'conflict', 'event', 'structure', 'culture', 'background'] as const
          )
            .filter((family) => familyTypeIds(family).length > 0)
            .map((family) => {
              const typeIds = familyTypeIds(family)
              const on = typeIds.some((id) => filters.relationTypes.includes(id))
              return (
                <button
                  key={family}
                  type="button"
                  className={`family-chip${on ? '' : ' is-off'}`}
                  aria-pressed={on}
                  title={`开关${RELATION_FAMILY_NAMES[family]}类连线`}
                  onClick={() => toggleFamily(family)}
                >
                  <i
                    className="rel-color-dot"
                    style={{ background: relationTypeColor(typeIds[0]) }}
                    aria-hidden="true"
                  />
                  {RELATION_FAMILY_NAMES[family]}
                </button>
              )
            })}
        </div>
        <button type="button" onClick={() => setPanel('legend')}>
          图例与说明
        </button>
      </div>
      <div className="atlas-search-dock">
        <ExplorerSearch
          query={query}
          onQuery={setQuery}
          results={results}
          relationResults={relationResults}
          revealedIds={visibleIds}
          onSelect={navigateToNode}
          onSelectRelation={selectRelation}
          onEmpty={() => addLog('没有找到匹配知识，请换一个名字或字号。')}
        />
      </div>
      <div className="card-floating-tools" aria-label="图谱工具">
        <div className="card-quick-zoom">
          <button type="button" aria-label="缩小图谱" onClick={() => canvasRef.current?.zoom(0.8)}>
            −
          </button>
          <output aria-label="图谱缩放比例">{Math.round(zoom * 100)}%</output>
          <button type="button" aria-label="放大图谱" onClick={() => canvasRef.current?.zoom(1.25)}>
            +
          </button>
        </div>
        <button type="button" aria-label="阅读详情" title="阅读当前知识" onClick={showDetails}>
          <BookOpen size={19} />
        </button>
        <button
          type="button"
          aria-label="关系筛选"
          title="关系筛选"
          aria-expanded={panel === 'filters'}
          onClick={() => setPanel(panel === 'filters' ? null : 'filters')}
        >
          <Filter size={19} />
        </button>
        <button
          type="button"
          aria-label="适应屏幕"
          title="适应屏幕"
          disabled={graphStatus !== 'ready'}
          onClick={() => canvasRef.current?.fit()}
        >
          <Compass size={19} />
        </button>
        <button
          type="button"
          aria-label="更多工具"
          title="更多工具"
          aria-expanded={panel === 'tools'}
          onClick={() => setPanel(panel === 'tools' ? null : 'tools')}
        >
          <MoreHorizontal size={19} />
        </button>
      </div>
      {panel && (
        <section
          className="card-tool-panel"
          role="dialog"
          aria-label={
            panel === 'filters'
              ? '关系筛选面板'
              : panel === 'legend'
                ? '图例与阅读说明'
                : '图谱工具面板'
          }
        >
          <div className="card-panel-title">
            <h2>
              {panel === 'filters'
                ? '关系与显示'
                : panel === 'legend'
                  ? '一张图，怎样读？'
                  : '探索工具'}
            </h2>
            <button
              type="button"
              className="card-panel-close"
              aria-label="关闭工具面板"
              onClick={() => setPanel(null)}
            >
              <X size={18} />
            </button>
          </div>
          {panel === 'filters' ? (
            <>
              <p className="card-panel-description">筛选同时作用于画布连线；取消勾选会隐藏该类连线，节点保留在原位。</p>
              {(metadata.groups?.length ?? 0) > 0 && (
                <div className="card-faction-row" role="group" aria-label="阵营视角">
                  <span>阵营视角</span>
                  <button
                    type="button"
                    aria-pressed={factionFocus === null}
                    onClick={() => {
                      setFactionFocus(null)
                      addLog('已退出阵营视角')
                    }}
                  >
                    全部
                  </button>
                  {metadata.groups.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      aria-pressed={factionFocus === group.id}
                      onClick={() => {
                        const next = factionFocus === group.id ? null : group.id
                        setFactionFocus(next)
                        addLog(
                          next
                            ? `阵营视角：${group.label}，跨阵营的关键联系保持高亮`
                            : '已退出阵营视角',
                        )
                      }}
                    >
                      <i
                        className="rel-color-dot"
                        style={{ background: group.color }}
                        aria-hidden="true"
                      />
                      {group.label}
                    </button>
                  ))}
                </div>
              )}
              <fieldset className="card-filter-list">
                <legend className="sr-only">关系类型</legend>
                {metadata.relationTypes.map((type) => (
                  <label key={type.id}>
                    <input
                      type="checkbox"
                      aria-label={type.label}
                      checked={filters.relationTypes.includes(type.id)}
                      onChange={() => toggleType(type.id)}
                    />
                    <i
                      className="rel-color-dot"
                      style={{ background: relationTypeColor(type.id) }}
                      aria-hidden="true"
                    />
                    <span>
                      {type.label}
                      <small>{type.description}</small>
                    </span>
                    <b>{type.directed ? '→' : '↔'}</b>
                  </label>
                ))}
              </fieldset>
              <div className="card-filter-actions">
                <button
                  type="button"
                  onClick={() =>
                    setFilters((previous) => ({
                      ...previous,
                      relationTypes: metadata.relationTypes.map((t) => t.id),
                    }))
                  }
                >
                  全选
                </button>
                <button
                  type="button"
                  onClick={() => setFilters((previous) => ({ ...previous, relationTypes: [] }))}
                >
                  清空
                </button>
              </div>
              <label className="card-setting">
                <input
                  type="checkbox"
                  checked={highlight}
                  onChange={(e) => setHighlight(e.target.checked)}
                />
                关系高亮
              </label>
              {hasLiterary && (
                <label className="card-setting">
                  <input
                    type="checkbox"
                    checked={filters.includeLiterary}
                    onChange={(e) => allowLiterary(e.target.checked)}
                  />
                  显示演义内容
                </label>
              )}
              {!scene.relations.length && (
                <p role="status" className="card-panel-description">
                  当前筛选暂无可见连线，可勾选其他关系类型。已展开节点保留。
                </p>
              )}
            </>
          ) : panel === 'tools' ? (
            <>
              <div className="card-zoom">
                <button
                  type="button"
                  aria-label="缩小图谱"
                  onClick={() => canvasRef.current?.zoom(0.8)}
                >
                  −
                </button>
                <output aria-label="图谱缩放比例">{Math.round(zoom * 100)}%</output>
                <button
                  type="button"
                  aria-label="放大图谱"
                  onClick={() => canvasRef.current?.zoom(1.25)}
                >
                  +
                </button>
              </div>
              <button
                type="button"
                className="card-menu-item"
                onClick={() => {
                  canvasRef.current?.focus(selected.id)
                  setPanel(null)
                }}
              >
                定位当前知识 <Compass size={17} />
              </button>
              <div className="card-segmented-control">
                <button
                  type="button"
                  aria-pressed={!allRelations}
                  onClick={() => setAllRelations(false)}
                >
                  主线关系
                </button>
                <button
                  type="button"
                  aria-pressed={allRelations}
                  onClick={() => setAllRelations(true)}
                >
                  全部关系
                </button>
              </div>
              <p className="card-panel-description">
                主线合并同一对知识的平行线；全部关系展示每一条有依据的联系。
              </p>
              <label className="card-setting">
                <input
                  type="checkbox"
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                />
                锁定已展开节点
              </label>
              <button
                type="button"
                className="card-menu-item"
                onClick={() => {
                  canvasRef.current?.fit()
                  setPanel(null)
                  addLog('已适应整张图谱')
                }}
              >
                显示整张图谱 <ArrowRight size={17} />
              </button>
              <button type="button" className="card-menu-item" onClick={() => resetView()}>
                重置回全景 <ArrowLeft size={17} />
              </button>
              <button type="button" className="card-menu-item" onClick={() => setPanel('legend')}>
                图例与阅读说明 <BookOpen size={17} />
              </button>
              <ShareLinkButton topicId={metadata.id} />
              <Link className="card-menu-item" to="/topics">
                专题图书馆 <ArrowRight size={17} />
              </Link>
            </>
          ) : (
            <>
              <p className="card-panel-description">
                图谱默认聚焦关键人物及其周围一圈关系：点击任意节点可聚焦其关系网（其余淡化），「以此为中心」可把焦点换到该人物，「扩大一圈」可逐步看到更远的关系；底部图例可按关系家族开关连线，筛选面板里有阵营视角。拖动画布平移，滚轮或双指缩放；拖动节点可以调整位置。点击节点上的
                − 角标可收起分支。人物与人物之间的连线默认显示关系文字，全景下只保留选中人物的连线文字。
              </p>
              <div className="card-kind-legend">
                {[...new Set(dataset.nodes.map((n) => n.kind))].map((kind) => (
                  <span key={kind} data-kind={nodeThemeKey(kind)}>
                    {kindNames[kind]}
                  </span>
                ))}
              </div>
              <p className="card-panel-description">
                连线颜色代表关系的类别：蓝色是人物关系（君臣、亲属、交游等），绿色是联盟，红色是敌对，紫色是事件关联，青色是归属与结构，黄色是文化创作，灰色是背景与影响；虚线多为间接或跨越时空的联系，具体含义以关系文字、箭头与资料依据为准。
              </p>
              <dl className="card-relation-legend">
                {metadata.relationTypes.map((type) => (
                  <div key={type.id}>
                    <dt>
                      <i
                        className="rel-color-dot"
                        style={{ background: relationTypeColor(type.id) }}
                        aria-hidden="true"
                      />
                      {type.label} {type.directed ? '→' : '↔'}
                    </dt>
                    <dd>{type.description}</dd>
                  </div>
                ))}
              </dl>
              <p className="card-panel-description">{metadata.readingNote}</p>
            </>
          )}
        </section>
      )}
      <NodeDetailsPanel
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        nodeId={selected.id}
        label={selected.label}
        footer={
          <div className="node-expand-block">
            <button type="button" disabled={!remaining.length} onClick={expandSelected}>
              展开关联{' '}
              <span>
                {remaining.length ? `+${Math.min(expandBatch, remaining.length)}` : '已显示'}
              </span>
              <ArrowRight size={16} />
            </button>
            <p>
              {remaining.length
                ? `还有${remaining.length}个关联知识，逐批加入当前图谱`
                : '当前筛选下的直接关联已显示'}
            </p>
          </div>
        }
      >
        <NodeDetails
          key={selected.id}
          dataset={dataset}
          node={selected}
          filters={filters}
          onSelect={navigateToNode}
        />
      </NodeDetailsPanel>
      <div className="sr-only" role="status" aria-live="polite">
        {logs[0]?.text}
      </div>
    </section>
  )
}
