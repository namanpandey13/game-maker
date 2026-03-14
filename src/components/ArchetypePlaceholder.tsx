import type { GameConfig } from '../lib/gameConfig'

type ArchetypePlaceholderProps = {
  config: GameConfig
}

function ArchetypePlaceholder({ config }: ArchetypePlaceholderProps) {
  return (
    <div className="preview-frame preview-message-frame">
      <div className="preview-message-card">
        <p className="preview-message-title">Prototype style coming soon</p>
        <p className="preview-message-subtitle">Coming soon</p>
        <p>
          This prototype style is not playable yet. The generated summary is
          shown below so the demo stays safe and informative.
        </p>

        <dl className="preview-config-summary">
          <div>
            <dt>Title</dt>
            <dd>{config.title}</dd>
          </div>
          <div>
            <dt>Difficulty</dt>
            <dd>{config.difficultyLabel}</dd>
          </div>
          <div>
            <dt>Theme</dt>
            <dd>{config.themeLabel}</dd>
          </div>
          <div>
            <dt>Objective</dt>
            <dd>{config.objective}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

export default ArchetypePlaceholder
