import type { ExplorerKnowledgeTopic } from './explorer'

export type TopicCategory = '人文历史' | '自然科学' | '宇宙探索'

export interface KnowledgeNode {
  id: string
  label: string
  description: string
  x: number
  y: number
}
export interface KnowledgeEdge {
  id: string
  source: string
  target: string
  label: string
}
export interface BasicKnowledgeTopic {
  mode?: 'basic'
  id: string
  title: string
  subtitle: string
  description: string
  category: TopicCategory
  status: 'preview' | 'planned'
  theme: 'history' | 'nature' | 'space'
  tags: string[]
  question: string
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
}

export type KnowledgeTopic = BasicKnowledgeTopic | ExplorerKnowledgeTopic

export function isExplorerTopic(topic: KnowledgeTopic): topic is ExplorerKnowledgeTopic {
  return topic.mode === 'explorer'
}
