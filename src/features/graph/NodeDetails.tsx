import { useState } from 'react'
import { portraitFor } from '../../data/visualAssets'
import { ArrowRight, ArrowUpRight, BookOpen } from '../../components/icons'
import type { ExplorerDataset, ExplorerNode, SourceCitation } from '../../types/explorer'
import type { ExplorerFilters } from './explorerModel'
import { nodeThemeKey, kindNames } from './graphTheme'
import { allowedRelation } from './explorerModel'

const kindLabels = {
  person: '人物档案',
  faction: '阵营档案',
  event: '事件档案',
  concept: '知识档案',
  polity: '政权档案',
  period: '历史时期',
  work: '作品档案',
}

function Citations({
  citations,
  dataset,
}: {
  citations: SourceCitation[]
  dataset: ExplorerDataset
}) {
  return (
    <ol className="citation-list">
      {citations.map((citation, index) => {
        const source = dataset.sources.find((item) => item.id === citation.sourceId)!
        return (
          <li key={`${citation.sourceId}-${index}`}>
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.title}
              <ArrowUpRight size={13} />
            </a>
            <span className="citation-kind">
              {source.kind === 'literature'
                ? '文学作品'
                : source.kind === 'reference'
                  ? '研究与参考资料'
                  : '史料原文'}{' '}
              · {source.author}
            </span>
            <p>{citation.locator}</p>
            <p className="citation-note">依据摘要：{citation.note}</p>
          </li>
        )
      })}
    </ol>
  )
}

export function NodeDetails({
  dataset,
  node,
  filters,
  onSelect,
}: {
  dataset: ExplorerDataset
  node: ExplorerNode
  filters: ExplorerFilters
  onSelect: (id: string) => void
}) {
  const portrait = portraitFor(
    dataset.metadata.id,
    node.id,
    dataset.metadata.showPortraits !== false,
  )
  const [readingSection, setReadingSection] = useState('intro')
  const jumpTo = (section: string) => {
    setReadingSection(section)
    const target = document
      .getElementById('node-details')
      ?.querySelector<HTMLElement>('[data-reading="' + section + '"]')
    if (target instanceof HTMLDetailsElement) target.open = true
    target?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
      block: 'start',
    })
  }
  const relations = dataset.relations.filter(
    (relation) =>
      (relation.source === node.id || relation.target === node.id) &&
      allowedRelation(relation, filters),
  )
  const events = node.relatedEventIds
    .map((id) => dataset.nodes.find((candidate) => candidate.id === id)!)
    .filter((event) => filters.includeLiterary || event.basis !== 'literary')
  const works = (node.relatedWorkIds ?? []).map(
    (id) => dataset.nodes.find((item) => item.id === id)!,
  )
  const backgrounds = (node.relatedBackgroundIds ?? []).map(
    (id) => dataset.nodes.find((item) => item.id === id)!,
  )
  const people = [
    ...new Set([
      ...(node.relatedPersonIds ?? []),
      ...relations
        .map((relation) => (relation.source === node.id ? relation.target : relation.source))
        .filter((id) => dataset.nodes.some((item) => item.id === id && item.kind === 'person')),
    ]),
  ].map((id) => dataset.nodes.find((item) => item.id === id)!)
  const lifeEvents =
    node.lifeEvents ??
    (node.kind === 'person'
      ? events.map((event) => ({
          date: event.period,
          title: event.label,
          description: event.description,
          citations: event.citations,
        }))
      : [])
  const historyLinks = relations.filter((relation) => relation.type === 'influence')
  const chapterIndex =
    dataset.metadata.story?.chapters.findIndex((chapter) => chapter.nodeId === node.id) ?? -1
  const renderRelation = (relation: (typeof relations)[number]) => {
    const source = dataset.nodes.find((candidate) => candidate.id === relation.source)!
    const target = dataset.nodes.find((candidate) => candidate.id === relation.target)!
    const other = source.id === node.id ? target : source
    const definition = dataset.metadata.relationTypes.find((type) => type.id === relation.type)!
    return (
      <article className="node-relation" key={relation.id}>
        <div className="node-relation-heading">
          <span>{definition.label}</span>
          <span>{relation.period}</span>
        </div>
        <button className="related-node-link" type="button" onClick={() => onSelect(other.id)}>
          {source.label} {definition.directed ? '→' : '↔'} {target.label}
          <ArrowRight size={14} />
        </button>
        <p>
          {relation.label} · {relation.description}
        </p>
        {relation.basis === 'literary' && (
          <span className="basis-badge literary">{dataset.metadata.basisLabels.literary}</span>
        )}
        <details className="relation-sources">
          <summary>关系依据</summary>
          <Citations dataset={dataset} citations={relation.citations} />
        </details>
      </article>
    )
  }
  return (
    <aside className="node-sidebar" id="node-details" aria-label="节点详情">
      <div className="node-detail-heading" data-kind={nodeThemeKey(node.kind)}>
        <span className="node-monogram" aria-hidden="true">
          {portrait ? <img src={portrait} alt={node.label + '艺术形象'} /> : node.label.slice(0, 1)}
        </span>
        <span className="section-kicker">{kindLabels[node.kind]} / FIELD NOTES</span>
        <div className="node-name-row">
          <h2>{node.label}</h2>
          <span className={`basis-badge ${node.basis === 'literary' ? 'literary' : ''}`}>
            {dataset.metadata.basisLabels[node.basis]}
          </span>
        </div>
        <span className="node-kind-label">{kindNames[node.kind]}</span>
        <p className="node-identity">{node.identity}</p>
        <p className="node-period">{node.period}</p>
        {node.groupId && (
          <p className="node-group">
            所属分组 · {dataset.metadata.groups.find((group) => group.id === node.groupId)?.label}
          </p>
        )}
      </div>
      <nav className="detail-reading-nav" aria-label="知识档案阅读导航">
        {[
          ['intro', '简介'],
          ...(works.length ? [['works', '作品']] : []),
          ['connections', '关联知识'],
          ['sources', '资料来源'],
        ].map(([id, label]) => (
          <button
            type="button"
            key={id}
            aria-pressed={readingSection === id}
            onClick={() => jumpTo(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      <section className="node-introduction" data-reading="intro">
        <h3>内容简介</h3>
        <p>{node.description}</p>
        {node.facts && (
          <dl className="node-facts">
            {node.facts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
      {Boolean(node.achievements?.length) && (
        <section className="node-detail-section biography-achievements">
          <h3>主要事迹与贡献</h3>
          {node.achievements?.map((entry) => (
            <article key={entry.title}>
              <h4>{entry.title}</h4>
              <p>{entry.description}</p>
              <details className="relation-sources">
                <summary>事迹依据</summary>
                <Citations dataset={dataset} citations={entry.citations} />
              </details>
            </article>
          ))}
        </section>
      )}
      {chapterIndex >= 0 && (
        <nav className="history-reading-links" aria-label="继续阅读历史阶段">
          {[-1, 1].map((step) => {
            const chapter = dataset.metadata.story!.chapters[chapterIndex + step]
            if (!chapter) return null
            const next = dataset.nodes.find((item) => item.id === chapter.nodeId)!
            return (
              <button key={next.id} type="button" onClick={() => onSelect(next.id)}>
                <small>{step < 0 ? '上一阶段' : '下一阶段'}</small>
                <span>
                  {next.label} <ArrowRight size={14} />
                </span>
              </button>
            )
          })}
        </nav>
      )}
      {Boolean(node.context?.length) && (
        <section className="node-detail-section biography-achievements historical-context">
          <h3>前因与后果</h3>
          {node.context!.map((entry) => (
            <article key={entry.title}>
              <h4>{entry.title}</h4>
              <p>{entry.description}</p>
              <details className="relation-sources">
                <summary>脉络依据</summary>
                <Citations dataset={dataset} citations={entry.citations} />
              </details>
            </article>
          ))}
          {Boolean(historyLinks.length) && (
            <div className="history-reading-links">
              {historyLinks.map((relation) => {
                const preceding = relation.target === node.id
                const other = dataset.nodes.find(
                  (item) => item.id === (preceding ? relation.source : relation.target),
                )!
                return (
                  <button key={relation.id} type="button" onClick={() => onSelect(other.id)}>
                    <small>
                      {preceding ? '前事' : '后续'} · {relation.label}
                    </small>
                    <span>
                      {other.label} <ArrowRight size={14} />
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      )}
      {Boolean(lifeEvents.length) && (
        <section className="node-detail-section biography-timeline">
          <h3>人生经历</h3>
          <ol>
            {lifeEvents.map((entry) => (
              <li key={entry.title}>
                <span>{entry.date}</span>
                <h4>{entry.title}</h4>
                <p>{entry.description}</p>
                <details className="relation-sources">
                  <summary>经历依据</summary>
                  <Citations dataset={dataset} citations={entry.citations} />
                </details>
              </li>
            ))}
          </ol>
        </section>
      )}
      {Boolean(backgrounds.length) && (
        <section className="node-detail-section person-works" data-reading="connections">
          <h3>
            时代与生活背景 <span>{backgrounds.length}</span>
          </h3>
          {backgrounds.map((background) => (
            <button key={background.id} type="button" onClick={() => onSelect(background.id)}>
              <span>
                {background.label}
                <small>
                  {background.identity} · {background.period}
                </small>
              </span>
              <ArrowRight size={17} />
            </button>
          ))}
        </section>
      )}
      {Boolean(works.length) && (
        <section className="node-detail-section person-works" data-reading="works">
          <h3>
            作品与著作 <span>{works.length}</span>
          </h3>
          {works.map((work) => (
            <button key={work.id} type="button" onClick={() => onSelect(work.id)}>
              <span>
                {work.label}
                <small>
                  {work.period} · {work.identity}
                </small>
              </span>
              <ArrowRight size={17} />
            </button>
          ))}
        </section>
      )}
      {Boolean(people.length) && (
        <section className="node-detail-section">
          <h3>
            {node.kind === 'person' ? '人物关系' : '相关人物'} <span>{people.length}</span>
          </h3>
          {dataset.metadata.peopleExploration?.rootKinds.includes(node.kind) && (
            <p className="detail-muted">
              当前为代表人物选录。画布先展示最多{' '}
              {dataset.metadata.peopleExploration.initialPeopleLimit ?? people.length} 位，
              可点选下方人物，或使用“展开关联”继续查看。
            </p>
          )}
          <div className="related-events">
            {people.map((person) => {
              return (
                <button type="button" key={person.id} onClick={() => onSelect(person.id)}>
                  <span>{person.label}</span>
                  <ArrowRight size={14} />
                </button>
              )
            })}
          </div>
        </section>
      )}
      <section className="node-detail-section" data-reading="connections">
        <h3>
          相关事件 <span>{events.length}</span>
        </h3>
        {events.length ? (
          <div className="related-events">
            {events.map((event) => (
              <button type="button" key={event.id} onClick={() => onSelect(event.id)}>
                <span>◇ {event.label}</span>
                <span className={event.basis === 'literary' ? 'event-literary' : ''}>
                  {event.basis === 'literary'
                    ? dataset.metadata.basisLabels.literary
                    : event.period}
                  <ArrowRight size={12} />
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="detail-muted">本批资料暂未收录其相关事件，可沿其他节点关系继续探索。</p>
        )}
      </section>
      <section className="node-detail-section">
        <h3>
          沿着关系继续 <span>{relations.length}</span>
        </h3>
        {relations.slice(0, 3).map(renderRelation)}
        {relations.length > 3 && (
          <details className="more-relations">
            <summary>展开其余 {relations.length - 3} 条关系</summary>
            {relations.slice(3).map(renderRelation)}
          </details>
        )}
        {relations.length === 0 && (
          <p className="detail-muted">当前关系筛选未匹配到连线，可重新勾选关系类型。</p>
        )}
      </section>
      <details className="node-detail-section node-sources" data-reading="sources">
        <summary>
          <BookOpen size={16} /> 资料来源与进一步阅读
        </summary>
        <Citations dataset={dataset} citations={node.citations} />
        {portrait && (
          <p className="source-reading-note">人物肖像为艺术插画，内容依据见上述资料。</p>
        )}
        <p className="source-reading-note">
          以上介绍与依据摘要为通俗转述。点开资料名称可查看来源，并按所列章节、年号或条目定位。
        </p>
      </details>
    </aside>
  )
}
