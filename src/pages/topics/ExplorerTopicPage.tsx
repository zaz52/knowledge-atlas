import { KnowledgeExplorer } from '../../features/graph/KnowledgeExplorer'
import type { ExplorerDataset } from '../../types/explorer'

export default function ExplorerTopicPage({ dataset }: { dataset: ExplorerDataset }) {
  return <KnowledgeExplorer key={dataset.metadata.id} dataset={dataset} />
}
