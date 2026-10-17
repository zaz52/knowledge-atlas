import { ArrowRight } from './icons'
import { TopicMiniMap } from './TopicMiniMap'
import { Link } from 'react-router-dom'
import type { KnowledgeTopic } from '../types/knowledge'
import { isExplorerTopic } from '../types/knowledge'
import { topicDomain, domains } from '../data/domains'
import { topicCovers } from '../data/visualAssets'
export function TopicCard({ topic, index }: { topic: KnowledgeTopic; index: number }) {
  const explorer = isExplorerTopic(topic)
  const count = explorer ? topic.dataset.nodes.length : topic.nodes.length
  const edges = explorer ? topic.dataset.relations.length : topic.edges.length
  const domain = topicDomain(topic)
  const cover = topicCovers[topic.id]
  return (
    <Link
      className={'topic-card ' + topic.theme + (cover ? ' has-cover' : '')}
      data-domain={domain}
      to={'/topics/' + topic.id}
    >
      {cover && <img className="topic-cover" src={cover} alt="" loading="eager" />}
      <div className="topic-card-body">
        <div className="card-meta">
          <span>{domains.find((item) => item.id === domain)?.title}</span>
          <span>馆藏 0{index + 1}</span>
        </div>
        <h3>{topic.title}</h3>
        <p>{topic.subtitle}</p>
        <div className="card-tags">
          {topic.tags.slice(0, 2).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <div className="card-bottom">
          <span>
            {count} 个节点 · {edges} 条关系
          </span>
          <span className="card-enter">
            进入探索 <ArrowRight size={15} />
          </span>
        </div>
      </div>
      {!cover && (
        <div className="topic-art" aria-hidden="true">
          <span className="art-number">COLLECTION / 0{index + 1}</span>
          <TopicMiniMap topic={topic} />
          <span className="topic-status">{explorer ? '互动知识地图' : '基础知识图谱'}</span>
        </div>
      )}
    </Link>
  )
}
