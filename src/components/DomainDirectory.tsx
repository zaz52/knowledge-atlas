import { Link } from 'react-router-dom'
import { domains, topicDomain } from '../data/domains'
import { topics } from '../data/catalog'
import { ArrowUpRight, BookOpen, Lightbulb, Orbit, ScrollText, Sprout } from './icons'
const icons = {
  scroll: ScrollText,
  orbit: Orbit,
  book: BookOpen,
  lightbulb: Lightbulb,
  sprout: Sprout,
}
export function DomainDirectory() {
  return (
    <nav className="domain-directory" aria-label="知识领域">
      {domains.map((domain) => {
        const Icon = icons[domain.icon]
        const count = topics.filter((topic) => topicDomain(topic) === domain.id).length
        return (
          <Link
            key={domain.id}
            data-domain={domain.id}
            to={'/topics?category=' + encodeURIComponent(domain.label)}
          >
            <span className="domain-icon">
              <Icon size={25} strokeWidth={1.5} />
            </span>
            <span className="domain-copy">
              <strong>{domain.title}</strong>
              <small>{domain.detail}</small>
              <em>{count} 个专题</em>
            </span>
            <ArrowUpRight size={14} />
          </Link>
        )
      })}
    </nav>
  )
}
