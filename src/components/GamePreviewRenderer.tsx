import type { GeneratedGameState } from '../lib/gameConfig'
import { getArchetypeRegistryEntry } from '../lib/gameArchetypeRegistry'

type GamePreviewRendererProps = {
  generatedGame: GeneratedGameState | null
}

function GamePreviewRenderer({ generatedGame }: GamePreviewRendererProps) {
  if (!generatedGame) {
    return (
      <div className="preview-frame preview-placeholder-frame">
        <p>Generated game will appear here</p>
      </div>
    )
  }

  const entry = getArchetypeRegistryEntry(generatedGame.config.archetype)
  const Renderer = entry.Renderer

  return <Renderer key={generatedGame.id} config={generatedGame.config} />
}

export default GamePreviewRenderer
