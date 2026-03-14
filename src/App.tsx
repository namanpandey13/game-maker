import { useState, type ReactNode } from 'react'
import './App.css'

type TemplateOption =
  | 'Missile Defense'
  | 'Endless Runner'
  | 'Top-Down Survival'

type PanelProps = {
  title: string
  className?: string
  children: ReactNode
}

const templateOptions: TemplateOption[] = [
  'Missile Defense',
  'Endless Runner',
  'Top-Down Survival',
]

const assetPlaceholders = [
  'hero-sprite-sheet.png',
  'ambient-forest-loop.wav',
  'enemy-behaviors.json',
]

const themeOptions = ['Signal Grid', 'Ancient Ruins', 'Solar Drift']

const defaultLore =
  'A fading outpost survives by reactivating forgotten defense systems while rival factions push deeper into the frontier.'

const defaultConcept =
  'Build a compact arcade loop with escalating pressure, readable feedback, and room for one standout mechanic twist.'

function Panel({ title, className = '', children }: PanelProps) {
  return (
    <section className={`panel ${className}`.trim()}>
      <div className="panel-header">
        <h2>{title}</h2>
      </div>
      <div className="panel-body">{children}</div>
    </section>
  )
}

function App() {
  const [lore, setLore] = useState(defaultLore)
  const [conceptPrompt, setConceptPrompt] = useState(defaultConcept)
  const [template, setTemplate] = useState<TemplateOption>('Missile Defense')
  const [difficulty, setDifficulty] = useState(1)
  const [themeIndex, setThemeIndex] = useState(0)
  const [previewMessage, setPreviewMessage] = useState(
    'Generated game will appear here',
  )

  const theme = themeOptions[themeIndex]
  const difficultyLabel =
    difficulty === 1 ? 'Baseline' : `Level ${difficulty} challenge`
  const loreWordCount = lore.trim().split(/\s+/).filter(Boolean).length

  const handleGenerate = () => {
    setPreviewMessage(
      `Prototype queued: ${template} with ${theme.toLowerCase()} visuals and ${difficultyLabel.toLowerCase()}.`,
    )
  }

  const handleMakeHarder = () => {
    setDifficulty((current) => Math.min(current + 1, 5))
  }

  const handleChangeTheme = () => {
    setThemeIndex((current) => (current + 1) % themeOptions.length)
  }

  const handleReset = () => {
    setLore(defaultLore)
    setConceptPrompt(defaultConcept)
    setTemplate('Missile Defense')
    setDifficulty(1)
    setThemeIndex(0)
    setPreviewMessage('Generated game will appear here')
  }

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div>
          <p className="eyebrow">Game Prototyping Tool</p>
          <h1>Workspace Shell</h1>
        </div>
        <div className="top-bar-meta" aria-label="Workspace status">
          <span>Local only</span>
          <span>No backend</span>
          <span>Prototype mode</span>
        </div>
      </header>

      <main className="workspace-grid">
        <Panel title="Story / Lore" className="story-panel">
          <label className="field-label" htmlFor="story-lore">
            World notes
          </label>
          <textarea
            id="story-lore"
            value={lore}
            onChange={(event) => setLore(event.target.value)}
            placeholder="Capture story beats, factions, tone, and setting details."
          />
          <div className="panel-footnote">{loreWordCount} words tracked</div>
        </Panel>

        <Panel title="User Assets" className="assets-panel">
          <label className="field-label" htmlFor="asset-upload">
            Upload files
          </label>
          <input id="asset-upload" type="file" multiple />

          <div className="asset-list">
            <p className="field-label">Asset list</p>
            <ul>
              {assetPlaceholders.map((asset) => (
                <li key={asset}>{asset}</li>
              ))}
            </ul>
          </div>
        </Panel>

        <Panel title="Core Mechanics" className="mechanics-panel">
          <label className="field-label" htmlFor="concept-prompt">
            Game concept prompt
          </label>
          <textarea
            id="concept-prompt"
            value={conceptPrompt}
            onChange={(event) => setConceptPrompt(event.target.value)}
            placeholder="Describe the loop, goals, enemies, and feel of the game."
          />

          <label className="field-label" htmlFor="template-type">
            Template type
          </label>
          <select
            id="template-type"
            value={template}
            onChange={(event) =>
              setTemplate(event.target.value as TemplateOption)
            }
          >
            {templateOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <div className="summary-box" aria-live="polite">
            <p className="summary-title">Config summary</p>
            <p>Template: {template}</p>
            <p>Difficulty: {difficultyLabel}</p>
            <p>Theme: {theme}</p>
          </div>
        </Panel>

        <Panel title="Actions" className="actions-panel">
          <div className="actions-list">
            <button type="button" onClick={handleGenerate}>
              Generate MVP
            </button>
            <button type="button" onClick={handleMakeHarder}>
              Make Harder
            </button>
            <button type="button" onClick={handleChangeTheme}>
              Change Theme
            </button>
            <button type="button" className="secondary-button" onClick={handleReset}>
              Reset
            </button>
          </div>
        </Panel>

        <Panel title="Playable Preview" className="preview-panel">
          <div className="preview-placeholder">
            <div className="preview-canvas">
              <p>{previewMessage}</p>
            </div>
          </div>
        </Panel>
      </main>
    </div>
  )
}

export default App
