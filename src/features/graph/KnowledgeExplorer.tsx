import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  X,
  BookOpen,
  Filter,
  MoreHorizontal,
  RotateCcw,
  ListTree,
} from '../../components/icons'
import type { ExplorerDataset } from '../../types/explorer'
import { ExplorerCanvas } from './ExplorerCanvas'
import type { ExplorerCanvasHandle } from './ExplorerCanvas'
import { NodeDetails } from './NodeDetails'
import { NodeDetailsPanel } from './NodeDetailsPanel'
import { ExplorerSearch } from './ExplorerSearch'
import { kindNames, nodeThemeKey, relationThemeKey } from './graphTheme'
import { ShareLinkButton } from '../../components/ShareLinkButton'
import {
  defaultFilters,
  expandAssociations,
  expandableNodes,
  initialNodeIds,
  revealSelection,
  explorationRoot,
  peopleScene,
  searchNodes,
  visibleScene,
} from './explorerModel'
import '../../styles/explorer.css'

export function KnowledgeExplorer({ dataset }: { dataset: ExplorerDataset }) {
  const { metadata } = dataset
  const [urlParams] = useSearchParams()
  const linkedNode = urlParams.get('node')
  const canvasRef = useRef<ExplorerCanvasHandle>(null)
  const [revealedIds, setRevealedIds] = useState(() => initialNodeIds(dataset))
  const [rootId, setRootId] = useState<string | null>(null)
  const explorationRef = useRef<{
    rootId: string | null
    filters: ReturnType<typeof defaultFilters>
  }>({ rootId: null, filters: defaultFilters(dataset) })
  const [selectedId, setSelectedId] = useState(metadata.initialSelectionId)
  const [filters, setFilters] = useState(() => defaultFilters(dataset))
  const [highlight, setHighlight] = useState(true)
  const [query, setQuery] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [panel, setPanel] = useState<'tools' | 'filters' | 'legend' | 'index' | null>(null)
  const rootRef = useRef<HTMLElement>(null)
  const [graphStatus, setGraphStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [zoom, setZoom] = useState(1)
  const [layoutRevision, setLayoutRevision] = useState(0)
  const [announcement, setAnnouncement] = useState('点击一个节点，读懂一段联系。')
  const [cameraRequest, setCameraRequest] = useState<{
    id: string
    reset?: boolean
    zoom?: number
  } | null>(null)
  const fullScene = useMemo(
    () => visibleScene(dataset, revealedIds, filters),
    [dataset, revealedIds, filters],
  )
  const scene = useMemo(
    () => (rootId ? peopleScene(dataset, fullScene, rootId, selectedId) : fullScene),
    [dataset, fullScene, rootId, selectedId],
  )
  const root = dataset.nodes.find((node) => node.id === rootId)
  useEffect(() => {
    explorationRef.current = { rootId, filters }
  }, [rootId, filters])
  const selected = dataset.nodes.find((node) => node.id === selectedId)!
  const remaining = useMemo(
    () => expandableNodes(dataset, selectedId, revealedIds, filters),
    [dataset, selectedId, revealedIds, filters],
  )
  const results = useMemo(
    () => searchNodes(dataset, query, filters.includeLiterary),
    [dataset, query, filters.includeLiterary],
  )
  const hasLiterary = dataset.nodes.some((node) => node.basis === 'literary')

  const selectNode = useCallback(
    (id: string, focus = true) => {
      const node = dataset.nodes.find((candidate) => candidate.id === id)
      if (!node) return
      if (node.basis === 'literary')
        setFilters((previous) => ({ ...previous, includeLiterary: true }))
      const nextRoot = explorationRoot(dataset, id, explorationRef.current.rootId)
      if (nextRoot !== explorationRef.current.rootId) setLayoutRevision((value) => value + 1)
      setRootId(nextRoot)
      setRevealedIds((previous) =>
        revealSelection(
          dataset,
          dataset.metadata.story && nextRoot !== explorationRef.current.rootId
            ? initialNodeIds(dataset)
            : previous,
          id,
          {
            ...explorationRef.current.filters,
            includeLiterary:
              node.basis === 'literary' || explorationRef.current.filters.includeLiterary,
          },
          nextRoot,
        ),
      )
      setSelectedId(id)
      setDetailsOpen(true)
      setPanel(null)
      setQuery('')
      if (document.activeElement instanceof HTMLInputElement) document.activeElement.blur()
      setAnnouncement(`正在阅读${node.label}，可以展开关联继续探索。`)
      if (focus) setCameraRequest({ id })
    },
    [dataset],
  )
  useEffect(() => {
    if (!linkedNode || !dataset.nodes.some((node) => node.id === linkedNode)) return
    const frame = window.requestAnimationFrame(() => selectNode(linkedNode))
    return () => window.cancelAnimationFrame(frame)
  }, [linkedNode, dataset, selectNode])
  const selectFromCanvas = useCallback((id: string) => selectNode(id), [selectNode])

  useEffect(() => {
    if (!cameraRequest || graphStatus !== 'ready') return
    if (cameraRequest.reset) {
      if (metadata.viewport?.focusOnExpand) {
        const target =
          cameraRequest.zoom !== undefined &&
          !rootId &&
          !(metadata.story && window.innerWidth < 600)
            ? (metadata.viewport.initialFocusIds ?? cameraRequest.id)
            : cameraRequest.id
        canvasRef.current?.focus(target, cameraRequest.zoom)
        return
      }
      canvasRef.current?.fit()
      if (cameraRequest.zoom !== undefined)
        canvasRef.current?.focus(cameraRequest.id, cameraRequest.zoom)
      else if (window.matchMedia('(max-width: 760px)').matches)
        canvasRef.current?.focus(cameraRequest.id)
    } else {
      const sideInset =
        detailsOpen && window.matchMedia('(min-width:761px)').matches
          ? Number.parseFloat(
              getComputedStyle(rootRef.current!).getPropertyValue('--detail-width'),
            ) + 50
          : 0
      canvasRef.current?.focus(cameraRequest.id, undefined, sideInset)
    }
  }, [cameraRequest, graphStatus, metadata.viewport, metadata.story, detailsOpen, rootId])

  useEffect(() => {
    const viewport = window.visualViewport
    const update = () =>
      rootRef.current?.style.setProperty(
        '--keyboard-inset',
        Math.max(
          0,
          window.innerHeight -
            (viewport?.height ?? window.innerHeight) -
            (viewport?.offsetTop ?? 0),
        ) + 'px',
      )
    viewport?.addEventListener('resize', update)
    viewport?.addEventListener('scroll', update)
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPanel(null)
    }
    document.addEventListener('keydown', escape)
    update()
    return () => {
      viewport?.removeEventListener('resize', update)
      viewport?.removeEventListener('scroll', update)
      document.removeEventListener('keydown', escape)
    }
  }, [])

  function expandSelected() {
    setDetailsOpen(false)
    setRevealedIds(
      (previous) => expandAssociations(dataset, selectedId, previous, filters).revealedIds,
    )
    setAnnouncement(`已展开${selected.label}的关联，点击新出现的节点继续阅读。`)
    setCameraRequest({ id: selectedId, reset: true })
  }
  function reset() {
    setRootId(null)
    setPanel(null)
    setDetailsOpen(false)
    setLayoutRevision((previous) => previous + 1)
    setRevealedIds(initialNodeIds(dataset))
    setSelectedId(metadata.initialSelectionId)
    setFilters(defaultFilters(dataset))
    setHighlight(true)
    setQuery('')
    setAnnouncement('已回到初始关系网。')
    setCameraRequest({
      id: metadata.initialSelectionId,
      reset: true,
      zoom:
        metadata.viewport?.initialZoom ??
        (window.matchMedia('(max-width: 599px)').matches ? 0.72 : 0.9),
    })
  }
  function showOverview() {
    setRootId(null)
    setDetailsOpen(false)
    setPanel(null)
    setRevealedIds(initialNodeIds(dataset))
    setSelectedId(metadata.initialSelectionId)
    setLayoutRevision((value) => value + 1)
    setCameraRequest({
      id: metadata.initialSelectionId,
      reset: true,
      zoom: metadata.viewport?.initialZoom,
    })
  }
  function toggleType(id: string) {
    setFilters((previous) => ({
      ...previous,
      relationTypes: previous.relationTypes.includes(id)
        ? previous.relationTypes.filter((type) => type !== id)
        : [...previous.relationTypes, id],
    }))
  }

  return (
    <section
      ref={rootRef}
      data-exploration-root={rootId ?? ''}
      className={
        'atlas-explorer' + (detailsOpen ? ' has-details' : '') + (query ? ' is-searching' : '')
      }
    >
      <div className="atlas-graph-stage">
        <ExplorerCanvas
          ref={canvasRef}
          dataset={dataset}
          scene={scene}
          explorationRootId={rootId}
          selectedId={selectedId}
          highlight={highlight}
          layoutRevision={layoutRevision}
          onSelect={selectFromCanvas}
          onStatusChange={setGraphStatus}
          onZoomChange={setZoom}
        />
      </div>
      <header className="atlas-topbar">
        <div className="atlas-brand-group">
          <Link to="/" className="atlas-brand" aria-label="知图首页">
            <BookOpen size={25} />
            <strong>知图</strong>
            <span>KNOWLEDGE ATLAS</span>
          </Link>
          <span className="atlas-brand-divider" />
          <div className="atlas-topic-title">
            <h1>
              {root
                ? `${root.label} · ${metadata.story ? '人物与事件' : '人物与事迹'}`
                : metadata.title}
            </h1>
            <span>{root ? `${root.period} · 点击节点，阅读关联与经历` : metadata.scope}</span>
          </div>
        </div>
        <div className="atlas-top-stats">
          <span>
            <i /> {scene.nodes.length}
            <small> / {dataset.nodes.length} 个知识节点</small>
          </span>
          <span>{scene.relations.length} 条关系</span>
          <span className="source-status">资料可追溯</span>
        </div>
      </header>
      <div className="atlas-context">
        {root ? (
          <button type="button" className="back-link people-overview-link" onClick={showOverview}>
            <ArrowLeft size={14} /> {metadata.story?.overviewLabel ?? '返回朝代总览'}
          </button>
        ) : (
          <Link to="/topics" className="back-link">
            <ArrowLeft size={14} /> 专题图书馆
          </Link>
        )}
        <span className="section-kicker">FOLLOW YOUR CURIOSITY</span>
        <h2>{metadata.question}</h2>
        <p>
          {metadata.story
            ? '选择阶段，展开人物与事件；沿背景与影响读懂变化。'
            : '点亮一个知识，沿着联系继续探索。'}
        </p>
      </div>
      {metadata.story && (
        <nav className="atlas-story-nav" aria-label="历史脉络">
          {metadata.story.chapters.map((chapter, index) => {
            const node = dataset.nodes.find((item) => item.id === chapter.nodeId)!
            return (
              <button
                key={node.id}
                type="button"
                aria-current={rootId === node.id ? 'step' : undefined}
                onClick={() => selectNode(node.id)}
              >
                <small>
                  {String(index + 1).padStart(2, '0')} · {node.period}
                </small>
                <strong>{node.label}</strong>
                <span>{chapter.caption}</span>
              </button>
            )
          })}
        </nav>
      )}
      <div className="atlas-relation-key" aria-label="关系图例">
        <span>关系类型</span>
        {metadata.relationTypes.map(
          (type, index) =>
            scene.relations.some((edge) => edge.type === type.id) && (
              <div key={type.id} data-tone={relationThemeKey(index)}>
                <i className={'relation-line ' + (type.dashed ? 'dashed' : '')} />
                <span>{type.label}</span>
                <small>{type.directed ? '→' : '↔'}</small>
              </div>
            ),
        )}
      </div>
      <div className="atlas-bottom-note">
        <div className="atlas-type-legend">
          {[...new Set(dataset.nodes.map((node) => node.kind))].map((kind) => (
            <span key={kind} data-kind={nodeThemeKey(kind)}>
              <i />
              {kindNames[kind]}
            </span>
          ))}
        </div>
        <p data-testid="scene-count">
          {scene.nodes.length} / {dataset.nodes.length} 个节点 · {scene.relations.length} 条连线
        </p>
        <p className="atlas-gesture-hint">拖动探索 · 双指或滚轮缩放</p>
      </div>
      <div className="atlas-search-dock">
        <ExplorerSearch
          query={query}
          onQuery={setQuery}
          results={results}
          revealedIds={revealedIds}
          onSelect={selectNode}
          onEmpty={() => setAnnouncement('没有找到匹配的节点，请换一个名字或字号。')}
        />
        <p className="atlas-search-caption">从一个名字，发现一个更大的世界</p>
      </div>
      <div className="atlas-floating-tools" aria-label="图谱工具">
        <button
          className="atlas-tool-button"
          type="button"
          aria-label="适应屏幕"
          title="适应屏幕"
          disabled={graphStatus !== 'ready'}
          onClick={() => canvasRef.current?.fit()}
        >
          <Compass size={20} />
        </button>
        <button
          className="atlas-tool-button"
          type="button"
          aria-label="关系筛选"
          title="关系筛选"
          aria-expanded={panel === 'filters'}
          onClick={() => setPanel(panel === 'filters' ? null : 'filters')}
        >
          <Filter size={19} />
        </button>
        <button
          className="atlas-tool-button"
          type="button"
          aria-label="更多工具"
          title="更多工具"
          aria-expanded={panel === 'tools'}
          onClick={() => setPanel(panel === 'tools' ? null : 'tools')}
        >
          <MoreHorizontal size={21} />
        </button>
      </div>
      {panel && (
        <section
          className={'atlas-floating-panel panel-' + panel}
          role="dialog"
          aria-label={
            {
              tools: '图谱工具面板',
              filters: '关系筛选面板',
              index: '已显示节点',
              legend: '图例与阅读说明',
            }[panel]
          }
        >
          <div className="atlas-panel-heading">
            <h2>
              {
                {
                  tools: '探索工具',
                  filters: '关系与显示',
                  index: '已显示节点',
                  legend: '一张图，怎样读？',
                }[panel]
              }
            </h2>
            <button type="button" aria-label="关闭工具面板" onClick={() => setPanel(null)}>
              <X size={18} />
            </button>
          </div>
          {panel === 'tools' && (
            <>
              <div className="atlas-zoom">
                <button
                  type="button"
                  aria-label="缩小图谱"
                  disabled={graphStatus !== 'ready'}
                  onClick={() => canvasRef.current?.zoom(0.8)}
                >
                  −
                </button>
                <output aria-label="图谱缩放比例">
                  {graphStatus === 'ready' ? Math.round(zoom * 100) + '%' : '—'}
                </output>
                <button
                  type="button"
                  aria-label="放大图谱"
                  disabled={graphStatus !== 'ready'}
                  onClick={() => canvasRef.current?.zoom(1.25)}
                >
                  +
                </button>
              </div>
              <button className="panel-menu-item" type="button" onClick={reset}>
                <RotateCcw size={17} />
                重新开始<span>恢复初始探索</span>
              </button>
              <button className="panel-menu-item" type="button" onClick={() => setPanel('index')}>
                <ListTree size={17} />
                已显示节点<span>{scene.nodes.length}</span>
              </button>
              <button className="panel-menu-item" type="button" onClick={() => setPanel('legend')}>
                <BookOpen size={17} />
                图例与阅读说明
              </button>
              <button
                className="panel-menu-item"
                type="button"
                onClick={() => {
                  setPanel(null)
                  setDetailsOpen(true)
                  setCameraRequest({ id: selectedId })
                }}
              >
                <ArrowRight size={17} />
                查看{selected.label}详情
              </button>
              <ShareLinkButton topicId={metadata.id} />
            </>
          )}
          {panel === 'filters' && (
            <>
              <p className="panel-description">选择关系类型，画布与关联展开会同时更新。</p>
              <fieldset className="atlas-relation-filters">
                <legend className="sr-only">关系类型</legend>
                {metadata.relationTypes.map((type, index) => (
                  <label
                    key={type.id}
                    className={
                      'relation-chip ' + (filters.relationTypes.includes(type.id) ? 'checked' : '')
                    }
                    data-tone={relationThemeKey(index)}
                  >
                    <input
                      type="checkbox"
                      aria-label={type.label}
                      checked={filters.relationTypes.includes(type.id)}
                      onChange={() => toggleType(type.id)}
                    />
                    <span className={'relation-line ' + (type.dashed ? 'dashed' : '')} />
                    {type.label}
                    <small>{type.directed ? '→' : '↔'}</small>
                  </label>
                ))}
              </fieldset>
              <div className="filter-actions">
                <button
                  type="button"
                  disabled={filters.relationTypes.length === metadata.relationTypes.length}
                  onClick={() =>
                    setFilters((previous) => ({
                      ...previous,
                      relationTypes: metadata.relationTypes.map((type) => type.id),
                    }))
                  }
                >
                  全选
                </button>
                <button
                  type="button"
                  disabled={!filters.relationTypes.length}
                  onClick={() => setFilters((previous) => ({ ...previous, relationTypes: [] }))}
                >
                  清空
                </button>
                <span>
                  {filters.relationTypes.length}/{metadata.relationTypes.length} 已选
                </span>
              </div>
              <div className="atlas-switches">
                <label>
                  <input
                    type="checkbox"
                    checked={highlight}
                    onChange={(event) => setHighlight(event.target.checked)}
                  />
                  关系高亮
                </label>
                {hasLiterary && (
                  <label>
                    <input
                      type="checkbox"
                      checked={filters.includeLiterary}
                      onChange={(event) => {
                        const includeLiterary = event.target.checked
                        setFilters((previous) => ({ ...previous, includeLiterary }))
                        if (!includeLiterary && selected.basis === 'literary') {
                          setSelectedId(rootId ?? metadata.initialSelectionId)
                          setDetailsOpen(false)
                        }
                      }}
                    />
                    显示{metadata.basisLabels.literary}
                  </label>
                )}
              </div>
              {!scene.relations.length && (
                <p className="atlas-filter-empty" role="status">
                  当前筛选未显示连线，可勾选其他关系类型。已展开的节点会保留。
                </p>
              )}
            </>
          )}
          {panel === 'index' && (
            <div className="atlas-node-index">
              <p className="panel-description">也可以点名字选择，继续探索。</p>
              <div>
                {scene.nodes.map((node) => (
                  <button
                    type="button"
                    key={node.id}
                    data-node-id={node.id}
                    data-kind={nodeThemeKey(node.kind)}
                    aria-pressed={selectedId === node.id}
                    onClick={() => selectNode(node.id)}
                  >
                    <i />
                    {node.label}
                    {node.basis === 'literary' && <small>{metadata.basisLabels.literary}</small>}
                  </button>
                ))}
              </div>
            </div>
          )}
          {panel === 'legend' && (
            <div className="atlas-legend">
              <div className="atlas-type-legend">
                {[...new Set(dataset.nodes.map((node) => node.kind))].map((kind) => (
                  <span key={kind} data-kind={nodeThemeKey(kind)}>
                    <i />
                    {kindNames[kind]}
                  </span>
                ))}
              </div>
              <p>{metadata.readingNote}</p>
              {metadata.layoutNote && <p>{metadata.layoutNote}</p>}
              <dl>
                {metadata.relationTypes.map((type, index) => (
                  <div key={type.id} data-tone={relationThemeKey(index)}>
                    <dt>
                      <span className={'relation-line ' + (type.dashed ? 'dashed' : '')} />
                      {type.label} {type.directed ? '→' : '↔'}
                    </dt>
                    <dd>{type.description}</dd>
                  </div>
                ))}
              </dl>
              <p>
                时期总称使用虚线边框；演义内容另有文字标记。拖动节点可调整位置，展开关联会保留已拖动的位置。
              </p>
            </div>
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
            <button
              type="button"
              className="expand-button"
              onClick={expandSelected}
              disabled={!remaining.length}
            >
              展开关联
              <span>
                {remaining.length ? '+' + remaining.length : '已全部显示'}
                <ArrowRight size={17} />
              </span>
            </button>
            <p>
              {remaining.length
                ? '继续发现尚未显示的人物、事件与联系'
                : '当前筛选下的相邻节点已全部显示'}
            </p>
          </div>
        }
      >
        <NodeDetails
          key={selected.id}
          dataset={dataset}
          node={selected}
          filters={filters}
          onSelect={selectNode}
        />
      </NodeDetailsPanel>
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </section>
  )
}
