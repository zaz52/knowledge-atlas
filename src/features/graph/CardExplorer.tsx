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
  expandAllCards,
  expandCard,
  expandCardLayer,
  initialCardExploration,
  locateCard,
  collapseCard,
} from './cardExploration'
import type { CardExpandMode } from './cardExploration'
import '../../styles/explorer.css'
import '../../styles/card-atlas.css'

export function CardExplorer({ dataset }: { dataset: ExplorerDataset }) {
  const { metadata } = dataset
  const [params] = useSearchParams()
  const linkedNode = params.get('node')
  const canvasRef = useRef<ExplorerCanvasHandle>(null)
  const rootRef = useRef<HTMLElement>(null)
  const [state, setState] = useState(() => initialCardExploration(dataset))
  const [filters, setFilters] = useState(() => defaultFilters(dataset))
  const [mode, setMode] = useState<CardExpandMode>('cumulative')
  const [pinned, setPinned] = useState(true)
  const [highlight, setHighlight] = useState(true)
  const [allRelations, setAllRelations] = useState(false)
  const [inspector, setInspector] = useState(() => window.innerWidth > 760)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [panel, setPanel] = useState<'filters' | 'tools' | 'legend' | null>(null)
  const [query, setQuery] = useState('')
  const [zoom, setZoom] = useState(1)
  const [revision, setRevision] = useState(0)
  const [graphStatus, setGraphStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [camera, setCamera] = useState<{ id: string; reset?: boolean } | null>(null)
  const [logs, setLogs] = useState(() => [
    {
      id: 0,
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      text: '从一个知识节点开始，点击蓝色角标逐批展开关联。',
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
  const cardView = useMemo(() => ({ state, filters, pinned }), [state, filters, pinned])
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
  const expandSelected = () => {
    const next = expandCard(dataset, state, selected.id, filters, mode)
    addLog(
      `展开「${selected.label}」 · 新增${cardVisibleIds(next).length - visibleIds.length}张知识节点`,
    )
    setState(next)
  }
  const restart = (id?: string) => {
    const next = initialCardExploration(dataset, id)
    setState(next)
    setFilters(defaultFilters(dataset))
    setDetailsOpen(false)
    setPanel(null)
    setQuery('')
    setRevision((v) => v + 1)
    setCamera({ id: next.rootId, reset: true })
    addLog(`回到「${dataset.nodes.find((n) => n.id === next.rootId)!.label}」 · 由起点逐步展开`)
  }
  useEffect(() => {
    if (!camera || graphStatus !== 'ready') return
    canvasRef.current?.focus(camera.id, camera.reset ? 1 : undefined)
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
      data-expand-mode={mode}
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
                ? expandCard(dataset, previous, id, filters, mode)
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
          <span>{metadata.story ? '历史阶段' : '选择朝代'}</span>
          <select
            className="card-root-select"
            aria-label="选择朝代或历史阶段"
            value={state.rootId}
            onChange={(e) => restart(e.target.value)}
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
              {remaining.length ? ` +${Math.min(CARD_BATCH, remaining.length)}` : ' · 已显示'}
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
        <span>点击 + 展开下一级 · 点击 − 收起分支</span>
        <button type="button" onClick={() => setPanel('legend')}>
          图例与说明
        </button>
      </div>
      <div className="atlas-search-dock">
        <ExplorerSearch
          query={query}
          onQuery={setQuery}
          results={results}
          revealedIds={visibleIds}
          onSelect={navigateToNode}
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
              <p className="card-panel-description">筛选同时作用于画布连线和后续关联展开。</p>
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
              <div className="card-segmented-control" role="group" aria-label="展开模式选择">
                <button
                  type="button"
                  aria-pressed={mode === 'cumulative'}
                  onClick={() => setMode('cumulative')}
                >
                  累加探索模式
                </button>
                <button
                  type="button"
                  aria-pressed={mode === 'accordion'}
                  onClick={() => setMode('accordion')}
                >
                  单路径聚焦模式
                </button>
              </div>
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
                  setState(expandCardLayer(dataset, state, filters))
                  addLog('已展开当前可见节点的下一层')
                  setPanel(null)
                }}
              >
                展开下一层 <ArrowRight size={17} />
              </button>
              <button
                type="button"
                className="card-menu-item"
                onClick={() => {
                  setState(expandAllCards(dataset, state, filters))
                  addLog('已展开当前筛选下的全部知识')
                  setPanel(null)
                }}
              >
                全部展开 <ArrowRight size={17} />
              </button>
              <button type="button" className="card-menu-item" onClick={() => restart()}>
                重置回起点 <ArrowLeft size={17} />
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
                点击蓝色 +N 角标逐批展开；显示 −
                时点击角标收起所属分支。其他分支共享的知识会保留。拖动节点调整位置，拖动画布或双指、滚轮缩放。
              </p>
              <div className="card-kind-legend">
                {[...new Set(dataset.nodes.map((n) => n.kind))].map((kind) => (
                  <span key={kind} data-kind={nodeThemeKey(kind)}>
                    {kindNames[kind]}
                  </span>
                ))}
              </div>
              <p className="card-panel-description">
                橙色虚线标记跨分支或平行关联，关系的具体含义以文字、箭头与资料依据为准。展开可探索人物跨阶段的生平联系，时间以关系说明为准；图中层级和距离表示探索路径。
              </p>
              <dl className="card-relation-legend">
                {metadata.relationTypes.map((type) => (
                  <div key={type.id}>
                    <dt>
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
                {remaining.length ? `+${Math.min(CARD_BATCH, remaining.length)}` : '已显示'}
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
