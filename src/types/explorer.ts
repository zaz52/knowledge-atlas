import type { TopicCategory } from './knowledge'

export type EvidenceBasis = 'documented' | 'literary'
export type ExplorerNodeKind =
  | 'person'
  | 'faction'
  | 'event'
  | 'concept'
  | 'polity'
  | 'period'
  | 'work'

export interface BiographyEntry {
  title: string
  description: string
  date?: string
  citations: SourceCitation[]
}

export interface SourceCitation {
  sourceId: string
  locator: string
  note: string
}

export interface ExplorerSource {
  id: string
  title: string
  author: string
  kind: 'primary' | 'literature' | 'reference'
  url: string
  description: string
}

export interface ExplorerNode {
  id: string
  label: string
  aliases: string[]
  kind: ExplorerNodeKind
  identity: string
  description: string
  period: string
  facts?: { label: string; value: string }[]
  timeRange?: { start: number; end: number }
  relatedPersonIds?: string[]
  relatedWorkIds?: string[]
  relatedBackgroundIds?: string[]
  sharedFrom?: { topicId: string; nodeId: string }
  achievements?: BiographyEntry[]
  lifeEvents?: BiographyEntry[]
  context?: BiographyEntry[]
  groupId?: string
  basis: EvidenceBasis
  relatedEventIds: string[]
  citations: SourceCitation[]
  position: { x: number; y: number }
}

export interface ExplorerRelation {
  id: string
  source: string
  target: string
  type: string
  label: string
  description: string
  period: string
  timeRange?: { start: number; end: number }
  basis: EvidenceBasis
  citations: SourceCitation[]
}

export interface RelationDefinition {
  id: string
  label: string
  description: string
  color: string
  directed: boolean
  dashed: boolean
  temporalRule?: 'overlap'
}

export interface ExplorerMetadata {
  id: string
  mode: 'explorer'
  title: string
  subtitle: string
  description: string
  category: TopicCategory
  status: 'published'
  theme: 'history' | 'nature' | 'space'
  tags: string[]
  question: string
  scope: string
  readingNote: string
  searchPlaceholder?: string
  showPortraits?: boolean
  story?: {
    overviewLabel: string
    chapters: { nodeId: string; caption: string }[]
  }
  peopleExploration?: {
    rootKinds: ExplorerNodeKind[]
    membershipRelationType: string
    includeRootEvents?: boolean
    initialPeopleLimit?: number
  }
  viewport?: {
    initialZoom: number
    focusOnExpand: boolean
    minZoom?: number
    initialFocusIds?: string[]
  }
  layoutNote?: string
  edgeCurveOffset?: number
  initialNodeIds: string[]
  initialSelectionId: string
  groups: { id: string; label: string; color: string; fill: string }[]
  relationTypes: RelationDefinition[]
  basisLabels: Record<EvidenceBasis, string>
}

export interface ExplorerDataset {
  metadata: ExplorerMetadata
  nodes: ExplorerNode[]
  relations: ExplorerRelation[]
  sources: ExplorerSource[]
}

export interface ExplorerKnowledgeTopic extends ExplorerMetadata {
  dataset: ExplorerDataset
}
