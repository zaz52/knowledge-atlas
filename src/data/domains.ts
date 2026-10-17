import type { KnowledgeTopic } from '../types/knowledge'
export const domains = [
  {
    id: 'history',
    label: '人文历史',
    title: '历史典藏',
    detail: '朝代、人物、战争与故事',
    icon: 'scroll',
  },
  {
    id: 'science',
    label: '自然科学',
    title: '科学发现',
    detail: '宇宙、物理与生命的奥秘',
    icon: 'orbit',
  },
  {
    id: 'literature',
    label: '文学',
    title: '文学书藏',
    detail: '名著、作家与作品的世界',
    icon: 'book',
  },
  {
    id: 'culture',
    label: '传统文化',
    title: '传统文化',
    detail: '思想、节日与文化传承',
    icon: 'lightbulb',
  },
  {
    id: 'nature',
    label: '自然地理',
    title: '自然地理',
    detail: '植物、山川与身边的自然',
    icon: 'sprout',
  },
] as const
export function topicDomain(topic: KnowledgeTopic) {
  return topic.theme === 'history' ? 'history' : topic.theme === 'nature' ? 'nature' : 'science'
}
export function matchesCategory(topic: KnowledgeTopic, category: string) {
  if (category === '全部专题') return true
  if (category === '宇宙探索') return topic.category === category
  return topicDomain(topic) === domains.find((domain) => domain.label === category)?.id
}
