import { TopicExplorer } from '../../features/topics/TopicExplorer'
import { topics } from '../../data/catalog'
import { isExplorerTopic } from '../../types/knowledge'
export function TopicsPage() {
  const nodes = topics.reduce(
    (sum, topic) =>
      sum + (isExplorerTopic(topic) ? topic.dataset.nodes.length : topic.nodes.length),
    0,
  )
  return (
    <section className="shell library-page">
      <div className="catalog-heading">
        <div>
          <span className="section-kicker">THE KNOWLEDGE COLLECTION</span>
          <h1>
            专题图书馆<span className="red-dot">。</span>
          </h1>
          <p className="page-description">按领域翻阅馆藏，沿着知识之间的联系，找到下一份好奇。</p>
        </div>
        <p className="catalog-total">
          <strong>{topics.length}</strong> 个专题 <span>{nodes} 个知识节点</span>
        </p>
      </div>
      <TopicExplorer showSearch />
    </section>
  )
}
