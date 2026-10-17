import { X } from '../../components/icons'
import { useSearchParams } from 'react-router-dom'
import { topics } from '../../data/catalog'
import { domains, matchesCategory } from '../../data/domains'
import { matchesKnowledge } from './librarySearch'
import { TopicCard } from '../../components/TopicCard'
import { LibrarySearch } from '../../components/LibrarySearch'
const categories = ['全部专题', ...domains.map((domain) => domain.label)]
export function TopicExplorer({ showSearch = false }: { showSearch?: boolean }) {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const category = params.get('category') ?? '全部专题'
  const filtered = topics.filter(
    (topic) => matchesCategory(topic, category) && matchesKnowledge(topic, query),
  )
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value && value !== '全部专题') next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true, preventScrollReset: true })
  }
  return (
    <div className={showSearch ? 'catalog-browser' : 'home-browser'}>
      <div className="filter-row">
        {showSearch && (
          <span className="catalog-index-title">
            知识分类 <small>SUBJECTS</small>
          </span>
        )}
        <div className="category-filters" aria-label="专题分类">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={category === item}
              className={category === item ? 'selected' : ''}
              data-domain={domains.find((domain) => domain.label === item)?.id}
              onClick={() => update('category', item)}
            >
              <i />
              {item}
              {showSearch && (
                <span>{topics.filter((topic) => matchesCategory(topic, item)).length}</span>
              )}
            </button>
          ))}
        </div>
        {!showSearch && <span className="results-count">共 {filtered.length} 个专题</span>}
        {showSearch && (
          <p className="catalog-note">
            从一个知识点出发，
            <br />
            发现更多相互连接的故事。
          </p>
        )}
      </div>
      <div className="catalog-content">
        {showSearch && (
          <div className="catalog-search-row">
            <LibrarySearch value={query} onChange={(value) => update('q', value)} />
            <span className="results-count">共 {filtered.length} 个专题</span>
          </div>
        )}
        {query && (
          <div className="search-feedback" role="status">
            搜索“{query}”
            <button type="button" onClick={() => update('q', '')}>
              <X size={14} /> 清除搜索
            </button>
          </div>
        )}
        {filtered.length ? (
          <div className="topic-grid">
            {filtered.map((topic) => (
              <TopicCard key={topic.id} topic={topic} index={topics.indexOf(topic)} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-index">∅</span>
            <h3>{query ? '暂未找到匹配的馆藏' : '这片知识领域，正在等待新故事'}</h3>
            <p>
              {query
                ? '试试“植物”“三国”“诸葛亮”或“北宋”。'
                : '本领域当前收录 0 个专题，你可以继续浏览已有馆藏。'}
            </p>
            <button className="text-link" onClick={() => setParams({})}>
              查看全部专题 →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
