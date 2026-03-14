import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import GamePreviewRenderer from './components/GamePreviewRenderer'
import {
  difficultyOptions,
  type BuilderFormValues,
  type DifficultyLabel,
  type GeneratedGameState,
  npcBehaviorOptions,
  type NpcBehaviorId,
  type PlayerAvatar,
  visualThemeOptions,
  type VisualThemeLabel,
} from './lib/gameConfig'
import { createGeneratedGameState } from './lib/localGameGeneration'
import './App.css'

const defaultLore =
  'A ring of scavenger camps surrounds the last safe district, and rival crews keep pressing closer every night.'

const defaultConcept =
  'Build a neon survival prototype where the player dodges waves of raiders and stays alive as long as possible.'

const generationMessages = [
  'Interpreting your game idea...',
  'Building a playable prototype...',
  'Tuning player, enemy, and world behaviors...',
] as const

function getPlayerSummary(generatedGame: GeneratedGameState | null) {
  if (!generatedGame) {
    return 'Tune difficulty to shape resilience, mobility, and control feel.'
  }

  const { config } = generatedGame

  switch (config.archetype) {
    case 'missile_defense':
      return `Defense integrity ${config.archetypeConfig.player.cityHealth} with ${config.archetypeConfig.player.label.toLowerCase()} blast coverage.`
    case 'topdown_survival':
      return `${config.archetypeConfig.player.health} health, ${config.archetypeConfig.player.moveSpeed}px/s movement, ${config.archetypeConfig.player.shotDamage} damage per shot, and ${config.playerAvatar ? 'a custom avatar active.' : 'the default runner silhouette.'}`
    case 'physics_flick':
      return `${config.archetypeConfig.projectile.label} shots with ${config.archetypeConfig.round.attempts} attempts in the round.`
    case 'match3':
      return 'Player tuning will appear here once this prototype style is playable.'
  }
}

function getEnemySummary(generatedGame: GeneratedGameState | null) {
  if (!generatedGame) {
    return 'Adjust speed to control pressure, pacing, and prototype intensity.'
  }

  const { config } = generatedGame

  switch (config.archetype) {
    case 'missile_defense':
      return `${config.archetypeConfig.enemy.label} incoming pressure with missiles at ${config.archetypeConfig.enemy.missileSpeed}px/s.`
    case 'topdown_survival':
      return `${config.archetypeConfig.enemy.label} pursuit with ${config.archetypeConfig.enemy.health} health, ${config.archetypeConfig.enemy.contactDamage} contact damage, and ${config.archetypeConfig.enemy.maxCount} active hostiles.`
    case 'physics_flick':
      return `${config.archetypeConfig.target.label} target movement with ${config.archetypeConfig.target.pointsPerHit} points per hit.`
    case 'match3':
      return 'Challenge pacing will appear here once this prototype style is playable.'
  }
}

function getNpcSummary(generatedGame: GeneratedGameState | null, lore: string) {
  const wordCount = lore.trim().split(/\s+/).filter(Boolean).length

  if (generatedGame?.config.archetype !== 'topdown_survival') {
    return `${wordCount} words tracked`
  }

  return `${wordCount} words tracked • ${generatedGame.config.archetypeConfig.npcs.count} NPCs set to ${generatedGame.config.archetypeConfig.npcs.behaviorLabel.toLowerCase()} mode`
}

function App() {
  const [lore, setLore] = useState(defaultLore)
  const [conceptPrompt, setConceptPrompt] = useState(defaultConcept)
  const [difficulty, setDifficulty] = useState<DifficultyLabel>('Normal')
  const [visualTheme, setVisualTheme] =
    useState<VisualThemeLabel>('Neon Arcade')
  const [gameSpeed, setGameSpeed] = useState(1)
  const [playerSpeed, setPlayerSpeed] = useState(1)
  const [playerHealth, setPlayerHealth] = useState(1)
  const [playerDamage, setPlayerDamage] = useState(1)
  const [enemySpeed, setEnemySpeed] = useState(1)
  const [enemyHealth, setEnemyHealth] = useState(1)
  const [enemyDamage, setEnemyDamage] = useState(1)
  const [uploadedAssets, setUploadedAssets] = useState<string[]>([])
  const [playerAvatar, setPlayerAvatar] = useState<PlayerAvatar | null>(null)
  const [npcCount, setNpcCount] = useState(4)
  const [npcBehavior, setNpcBehavior] =
    useState<NpcBehaviorId>('wander')
  const [actionStatus, setActionStatus] = useState(
    'Describe an idea and generate a playable prototype.',
  )
  const [generatedGame, setGeneratedGame] =
    useState<GeneratedGameState | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStepIndex, setGenerationStepIndex] = useState(0)
  const [isIdeaDockOpen, setIsIdeaDockOpen] = useState(true)
  const [openSections, setOpenSections] = useState({
    player: true,
    enemies: true,
    npcs: false,
    assets: false,
    world: false,
  })
  const playerAvatarUrlRef = useRef<string | null>(null)
  const generationTimeoutsRef = useRef<number[]>([])

  useEffect(() => {
    return () => {
      generationTimeoutsRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId)
      })

      if (playerAvatarUrlRef.current) {
        URL.revokeObjectURL(playerAvatarUrlRef.current)
      }
    }
  }, [])

  const getFormValues = (
    overrides: Partial<BuilderFormValues> = {},
  ): BuilderFormValues => {
    return {
      lore,
      conceptPrompt,
      archetypeOverride: null,
      difficulty,
      visualTheme,
      gameSpeed,
      playerSpeed,
      playerHealth,
      playerDamage,
      enemySpeed,
      enemyHealth,
      enemyDamage,
      assets: uploadedAssets,
      playerAvatar,
      npcCount,
      npcBehavior,
      ...overrides,
    }
  }

  const replacePlayerAvatar = (nextAvatar: PlayerAvatar | null) => {
    const previousUrl = playerAvatarUrlRef.current
    playerAvatarUrlRef.current = nextAvatar?.url ?? null
    setPlayerAvatar(nextAvatar)

    if (previousUrl && previousUrl !== nextAvatar?.url) {
      URL.revokeObjectURL(previousUrl)
    }
  }

  const regenerateIfLive = (
    overrides: Partial<BuilderFormValues>,
    status: string,
  ) => {
    if (!generatedGame || isGenerating) {
      setActionStatus(status)
      return
    }

    const generated = createGeneratedGameState(getFormValues(overrides))
    setGeneratedGame(generated)
    setActionStatus(status)
  }

  const clearGenerationTimers = () => {
    generationTimeoutsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId)
    })
    generationTimeoutsRef.current = []
  }

  const handleGenerate = () => {
    clearGenerationTimers()

    const nextGeneratedGame = createGeneratedGameState(getFormValues())
    const stepDurations = [320, 460, 560]

    setIsGenerating(true)
    setGenerationStepIndex(0)
    setActionStatus(generationMessages[0])

    let elapsed = 0
    stepDurations.forEach((duration, index) => {
      elapsed += duration

      if (index < generationMessages.length - 1) {
        const timeoutId = window.setTimeout(() => {
          const nextIndex = index + 1
          setGenerationStepIndex(nextIndex)
          setActionStatus(generationMessages[nextIndex])
        }, elapsed)

        generationTimeoutsRef.current.push(timeoutId)
      }
    })

    const completionTimeoutId = window.setTimeout(() => {
      setGeneratedGame(nextGeneratedGame)
      setIsGenerating(false)
      setGenerationStepIndex(generationMessages.length - 1)
      setIsIdeaDockOpen(false)
      setActionStatus(
        'Prototype ready. The live game and tweak panel are synced to this build.',
      )
      generationTimeoutsRef.current = []
    }, elapsed + 120)

    generationTimeoutsRef.current.push(completionTimeoutId)
  }

  const handleDifficultyChange = (nextDifficulty: DifficultyLabel) => {
    setDifficulty(nextDifficulty)
    regenerateIfLive(
      { difficulty: nextDifficulty },
      `Player and challenge tuning updated to ${nextDifficulty.toLowerCase()}.`,
    )
  }

  const handleThemeChange = (nextTheme: VisualThemeLabel) => {
    setVisualTheme(nextTheme)
    regenerateIfLive(
      { visualTheme: nextTheme },
      `World theme updated to ${nextTheme}.`,
    )
  }

  const handleSpeedChange = (nextSpeed: number) => {
    setGameSpeed(nextSpeed)
    regenerateIfLive(
      { gameSpeed: nextSpeed },
      `Prototype pacing updated to ${nextSpeed.toFixed(1)}x.`,
    )
  }

  const handlePlayerSpeedChange = (nextValue: number) => {
    setPlayerSpeed(nextValue)
    regenerateIfLive(
      { playerSpeed: nextValue },
      `Player speed tuned to ${nextValue.toFixed(1)}x.`,
    )
  }

  const handlePlayerHealthChange = (nextValue: number) => {
    setPlayerHealth(nextValue)
    regenerateIfLive(
      { playerHealth: nextValue },
      `Player health tuning updated to ${nextValue.toFixed(1)}x.`,
    )
  }

  const handlePlayerDamageChange = (nextValue: number) => {
    setPlayerDamage(nextValue)
    regenerateIfLive(
      { playerDamage: nextValue },
      `Player damage output updated to ${nextValue.toFixed(1)}x.`,
    )
  }

  const handleEnemySpeedChange = (nextValue: number) => {
    setEnemySpeed(nextValue)
    regenerateIfLive(
      { enemySpeed: nextValue },
      `Enemy speed tuned to ${nextValue.toFixed(1)}x.`,
    )
  }

  const handleEnemyHealthChange = (nextValue: number) => {
    setEnemyHealth(nextValue)
    regenerateIfLive(
      { enemyHealth: nextValue },
      `Enemy health tuning updated to ${nextValue.toFixed(1)}x.`,
    )
  }

  const handleEnemyDamageChange = (nextValue: number) => {
    setEnemyDamage(nextValue)
    regenerateIfLive(
      { enemyDamage: nextValue },
      `Enemy damage output updated to ${nextValue.toFixed(1)}x.`,
    )
  }

  const handleLoreChange = (nextLore: string) => {
    setLore(nextLore)
    regenerateIfLive(
      { lore: nextLore },
      'World and NPC notes refreshed in the live prototype.',
    )
  }

  const handleAssetUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).map((file) => file.name)
    setUploadedAssets(files)
    regenerateIfLive(
      { assets: files },
      files.length > 0
        ? `Loaded ${files.length} asset reference${files.length === 1 ? '' : 's'} into the prototype.`
        : 'Cleared prototype asset references.',
    )
  }

  const handlePlayerAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      setActionStatus('That file is not a supported image. Try PNG, JPG, WebP, or GIF.')
      event.target.value = ''
      return
    }

    if (file.size > 12 * 1024 * 1024) {
      setActionStatus('That image is a bit too large for the live avatar slot. Try one under 12MB.')
      event.target.value = ''
      return
    }

    const nextAvatar = {
      name: file.name,
      url: URL.createObjectURL(file),
    }

    replacePlayerAvatar(nextAvatar)
    regenerateIfLive(
      { playerAvatar: nextAvatar },
      `Loaded ${file.name} as the live player avatar.`,
    )
    event.target.value = ''
  }

  const handleClearPlayerAvatar = () => {
    replacePlayerAvatar(null)
    regenerateIfLive(
      { playerAvatar: null },
      'Removed the custom player avatar and restored the default runner.',
    )
  }

  const handleNpcCountChange = (nextNpcCount: number) => {
    setNpcCount(nextNpcCount)
    regenerateIfLive(
      { npcCount: nextNpcCount },
      `Updated the world to ${nextNpcCount} visible NPC${nextNpcCount === 1 ? '' : 's'}.`,
    )
  }

  const handleNpcBehaviorChange = (nextNpcBehavior: NpcBehaviorId) => {
    setNpcBehavior(nextNpcBehavior)
    const behaviorLabel =
      npcBehaviorOptions.find((option) => option.value === nextNpcBehavior)?.label ??
      'Wander'
    regenerateIfLive(
      { npcBehavior: nextNpcBehavior },
      `NPC behavior changed to ${behaviorLabel.toLowerCase()}.`,
    )
  }

  const handleMakeHarder = () => {
    const currentIndex = difficultyOptions.findIndex(
      (option) => option.label === difficulty,
    )
    const nextIndex = Math.min(currentIndex + 1, difficultyOptions.length - 1)
    handleDifficultyChange(difficultyOptions[nextIndex].label)
  }

  const handleChangeTheme = () => {
    const currentIndex = visualThemeOptions.findIndex(
      (option) => option.label === visualTheme,
    )
    const nextIndex = (currentIndex + 1) % visualThemeOptions.length
    handleThemeChange(visualThemeOptions[nextIndex].label)
  }

  const handleReset = () => {
    clearGenerationTimers()
    replacePlayerAvatar(null)
    setLore(defaultLore)
    setConceptPrompt(defaultConcept)
    setDifficulty('Normal')
    setVisualTheme('Neon Arcade')
    setGameSpeed(1)
    setPlayerSpeed(1)
    setPlayerHealth(1)
    setPlayerDamage(1)
    setEnemySpeed(1)
    setEnemyHealth(1)
    setEnemyDamage(1)
    setUploadedAssets([])
    setNpcCount(4)
    setNpcBehavior('wander')
    setGeneratedGame(null)
    setIsGenerating(false)
    setGenerationStepIndex(0)
    setIsIdeaDockOpen(true)
    setActionStatus('Reset the lab to its default survival prototype setup.')
  }

  const setSectionOpen = (
    section: keyof typeof openSections,
    isOpen: boolean,
  ) => {
    setOpenSections((current) => ({
      ...current,
      [section]: isOpen,
    }))
  }

  const liveTitle = generatedGame?.config.title ?? 'Playable Prototype'
  const liveObjective =
    generatedGame?.config.objective ??
    'Generate an idea-driven prototype, then tune it live from the control rail.'
  const currentGenerationMessage = generationMessages[generationStepIndex]
  const showWorkspace = generatedGame !== null || isGenerating
  const isLiveMode = showWorkspace

  return (
    <div className={`app-shell${isLiveMode ? ' app-shell--live' : ''}`}>
      <header className="top-bar">
        <div className="top-bar-copy">
          <p className="eyebrow">Checkpoint</p>
          <h1>Checkpoint</h1>
          <p className="top-bar-description">
            Describe any game idea, generate a playable prototype, and iterate
            live. The survival demo leads the experience today, while the
            creative direction stays broad.
          </p>
        </div>
        <div className="top-bar-meta" aria-label="Lab status">
          <span>Live prototype</span>
          <span>Broad game direction</span>
          <span>Local generation</span>
          <span>No backend</span>
        </div>
      </header>

      <details
        className={`idea-dock-drawer${isIdeaDockOpen ? ' is-open' : ''}`}
        open={isIdeaDockOpen}
        onToggle={(event) =>
          setIsIdeaDockOpen((event.currentTarget as HTMLDetailsElement).open)
        }
      >
        <summary className="idea-dock-summary">
          <div>
            <p className="field-label">Idea Composer</p>
            <strong>
              {isIdeaDockOpen ? 'Hide setup' : 'Show setup and generation controls'}
            </strong>
          </div>
          <span>
            Any game idea in, playable prototype out. Checkpoint keeps the live
            build front and center.
          </span>
        </summary>

        <section className="idea-dock">
        <div className="idea-composer">
          <label className="field-label" htmlFor="game-idea">
            Game Idea
          </label>
          <textarea
            id="game-idea"
            value={conceptPrompt}
            onChange={(event) => setConceptPrompt(event.target.value)}
            placeholder="Describe the prototype you want to spin up: loop, enemies, scoring, movement, and tone."
          />
        </div>

        <div className="idea-sidecar">
          <p className="field-label">Prototype flow</p>
          <p className="idea-sidecar-copy">
            Generate a playable prototype from the idea, then keep iterating
            from the right-side controls without leaving the live game view.
          </p>
          <div className="idea-actions">
            <button
              type="button"
              className="action-primary"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Generate Prototype'}
            </button>
            <button type="button" className="secondary-button" onClick={handleReset}>
              Reset Lab
            </button>
          </div>
          <p className="action-status" aria-live="polite">
            {actionStatus}
          </p>
        </div>
        </section>
      </details>

      {showWorkspace ? (
        <main className="lab-layout">
          <section className="stage-panel">
            <div className={`stage-surface${isGenerating ? ' stage-surface--generating' : ''}`}>
              {isGenerating ? (
                <div className="preview-frame preview-generating-frame">
                  <div className="generation-card">
                    <p className="generation-kicker">Checkpoint Generation</p>
                    <h3>{currentGenerationMessage}</h3>
                    <div className="generation-steps" aria-live="polite">
                      {generationMessages.map((message, index) => {
                        const state =
                          index < generationStepIndex
                            ? 'complete'
                            : index === generationStepIndex
                              ? 'active'
                              : 'upcoming'

                        return (
                          <div
                            key={message}
                            className={`generation-step generation-step--${state}`}
                          >
                            <span className="generation-step-dot" aria-hidden="true" />
                            <span>{message}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ) : generatedGame ? (
                <GamePreviewRenderer generatedGame={generatedGame} />
              ) : null}
            </div>

            <div className="stage-details">
              {!isGenerating && generatedGame ? (
                <div className="stage-summary-card">
                  <div>
                    <span className="stage-summary-label">Generated Title</span>
                    <strong>{generatedGame.config.title}</strong>
                  </div>
                  <div>
                    <span className="stage-summary-label">Objective</span>
                    <p>{generatedGame.config.objective}</p>
                  </div>
                  <div>
                    <span className="stage-summary-label">Theme</span>
                    <strong>{generatedGame.config.themeLabel}</strong>
                  </div>
                </div>
              ) : null}

              <div className="stage-header">
                <div>
                  <p className="field-label">Live Playtest</p>
                  <h2>{isGenerating ? 'Generating Prototype' : liveTitle}</h2>
                  <p>
                    {isGenerating
                      ? 'Checkpoint is shaping your idea into a playable survival prototype with live-tunable systems.'
                      : `${liveObjective} The studio direction stays broad, while this build showcases the survival loop as the live foundation.`}
                  </p>
                </div>
                {!isGenerating ? (
                  <div className="stage-quick-actions">
                    <button type="button" className="action-accent" onClick={handleMakeHarder}>
                      Make Harder
                    </button>
                    <button type="button" className="action-neutral" onClick={handleChangeTheme}>
                      Change Theme
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <aside className={`tweak-panel${isGenerating ? ' tweak-panel--muted' : ''}`}>
            <div className="tweak-panel-header">
              <p className="field-label">Live Tweak Panel</p>
              <h2>Prototype Controls</h2>
              <p>
                {isGenerating
                  ? 'The control rail will be ready the moment the prototype lands.'
                  : 'Open only what you need and keep the game front and center.'}
              </p>
            </div>

            {isGenerating ? (
              <div className="tweak-panel-waiting">
                <div className="tweak-panel-waiting-card">
                  <span className="field-label">Preparing Controls</span>
                  <strong>Live tuning is almost ready</strong>
                  <p>
                    Checkpoint is locking in the player, enemy, and world tuning
                    for this pass.
                  </p>
                </div>
              </div>
            ) : null}

            {!isGenerating ? (
              <>
                <details
                  className="tweak-group"
                  open={openSections.player}
                  onToggle={(event) =>
                    setSectionOpen('player', (event.currentTarget as HTMLDetailsElement).open)
                  }
                >
                  <summary className="tweak-group-summary">
                    <div className="tweak-group-header">
                      <h3>Player</h3>
                      <p>Resilience, handling, and avatar</p>
                    </div>
                  </summary>
                  <div className="tweak-group-body">
                    <label className="field-label" htmlFor="difficulty">
                      Difficulty
                    </label>
                    <select
                      id="difficulty"
                      value={difficulty}
                      onChange={(event) =>
                        handleDifficultyChange(event.target.value as DifficultyLabel)
                      }
                    >
                      {difficultyOptions.map((option) => (
                        <option key={option.value} value={option.label}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <label className="field-label" htmlFor="player-speed">
                      Player speed
                    </label>
                    <div className="speed-control">
                      <input
                        id="player-speed"
                        type="range"
                        min="0.7"
                        max="1.6"
                        step="0.1"
                        value={playerSpeed}
                        onChange={(event) =>
                          handlePlayerSpeedChange(Number(event.target.value))
                        }
                      />
                      <span>{playerSpeed.toFixed(1)}x</span>
                    </div>
                    <label className="field-label" htmlFor="player-health">
                      Player health
                    </label>
                    <div className="speed-control">
                      <input
                        id="player-health"
                        type="range"
                        min="0.6"
                        max="1.8"
                        step="0.1"
                        value={playerHealth}
                        onChange={(event) =>
                          handlePlayerHealthChange(Number(event.target.value))
                        }
                      />
                      <span>{playerHealth.toFixed(1)}x</span>
                    </div>
                    <label className="field-label" htmlFor="player-damage">
                      Damage output
                    </label>
                    <div className="speed-control">
                      <input
                        id="player-damage"
                        type="range"
                        min="0.5"
                        max="3"
                        step="0.1"
                        value={playerDamage}
                        onChange={(event) =>
                          handlePlayerDamageChange(Number(event.target.value))
                        }
                      />
                      <span>{playerDamage.toFixed(1)}x</span>
                    </div>
                    <label className="field-label" htmlFor="player-avatar-upload">
                      Avatar image
                    </label>
                    <input
                      id="player-avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handlePlayerAvatarUpload}
                    />
                    {playerAvatar ? (
                      <div className="player-avatar-preview">
                        <img src={playerAvatar.url} alt="Player avatar preview" />
                        <div className="player-avatar-copy">
                          <strong>{playerAvatar.name}</strong>
                          <span>Live avatar preview for the survival runner</span>
                        </div>
                        <button
                          type="button"
                          className="secondary-button compact-button"
                          onClick={handleClearPlayerAvatar}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="panel-footnote">
                        Upload a photo to drop your own face or character into the live run.
                      </div>
                    )}
                    <p className="tweak-note">{getPlayerSummary(generatedGame)}</p>
                  </div>
                </details>

                <details
                  className="tweak-group"
                  open={openSections.enemies}
                  onToggle={(event) =>
                    setSectionOpen('enemies', (event.currentTarget as HTMLDetailsElement).open)
                  }
                >
                  <summary className="tweak-group-summary">
                    <div className="tweak-group-header">
                      <h3>Enemies</h3>
                      <p>Pressure, pacing, health, and damage</p>
                    </div>
                  </summary>
                  <div className="tweak-group-body">
                    <label className="field-label" htmlFor="enemy-speed">
                      Enemy speed
                    </label>
                    <div className="speed-control">
                      <input
                        id="enemy-speed"
                        type="range"
                        min="0.7"
                        max="1.6"
                        step="0.1"
                        value={enemySpeed}
                        onChange={(event) =>
                          handleEnemySpeedChange(Number(event.target.value))
                        }
                      />
                      <span>{enemySpeed.toFixed(1)}x</span>
                    </div>
                    <label className="field-label" htmlFor="enemy-health">
                      Enemy health
                    </label>
                    <div className="speed-control">
                      <input
                        id="enemy-health"
                        type="range"
                        min="0.5"
                        max="2.5"
                        step="0.1"
                        value={enemyHealth}
                        onChange={(event) =>
                          handleEnemyHealthChange(Number(event.target.value))
                        }
                      />
                      <span>{enemyHealth.toFixed(1)}x</span>
                    </div>
                    <label className="field-label" htmlFor="enemy-damage">
                      Damage output
                    </label>
                    <div className="speed-control">
                      <input
                        id="enemy-damage"
                        type="range"
                        min="0.5"
                        max="3"
                        step="0.1"
                        value={enemyDamage}
                        onChange={(event) =>
                          handleEnemyDamageChange(Number(event.target.value))
                        }
                      />
                      <span>{enemyDamage.toFixed(1)}x</span>
                    </div>
                    <p className="tweak-note">{getEnemySummary(generatedGame)}</p>
                  </div>
                </details>

                <details
                  className="tweak-group"
                  open={openSections.npcs}
                  onToggle={(event) =>
                    setSectionOpen('npcs', (event.currentTarget as HTMLDetailsElement).open)
                  }
                >
                  <summary className="tweak-group-summary">
                    <div className="tweak-group-header">
                      <h3>NPCs</h3>
                      <p>Allies, ambience, and world activity</p>
                    </div>
                  </summary>
                  <div className="tweak-group-body">
                    <label className="field-label" htmlFor="lore-notes">
                      Notes
                    </label>
                    <textarea
                      id="lore-notes"
                      value={lore}
                      onChange={(event) => handleLoreChange(event.target.value)}
                      placeholder="Describe camps, factions, NPC roles, or ambient world details."
                    />
                    <label className="field-label" htmlFor="npc-count">
                      NPC count
                    </label>
                    <div className="speed-control">
                      <input
                        id="npc-count"
                        type="range"
                        min="0"
                        max="12"
                        step="1"
                        value={npcCount}
                        onChange={(event) => handleNpcCountChange(Number(event.target.value))}
                      />
                      <span>{npcCount}</span>
                    </div>
                    <label className="field-label" htmlFor="npc-behavior">
                      Behavior mode
                    </label>
                    <select
                      id="npc-behavior"
                      value={npcBehavior}
                      onChange={(event) =>
                        handleNpcBehaviorChange(event.target.value as NpcBehaviorId)
                      }
                    >
                      {npcBehaviorOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <div className="panel-footnote">{getNpcSummary(generatedGame, lore)}</div>
                  </div>
                </details>

                <details
                  className="tweak-group"
                  open={openSections.assets}
                  onToggle={(event) =>
                    setSectionOpen('assets', (event.currentTarget as HTMLDetailsElement).open)
                  }
                >
                  <summary className="tweak-group-summary">
                    <div className="tweak-group-header">
                      <h3>Assets</h3>
                      <p>Reference files and future content hooks</p>
                    </div>
                  </summary>
                  <div className="tweak-group-body">
                    <label className="field-label" htmlFor="asset-upload">
                      Upload files
                    </label>
                    <input
                      id="asset-upload"
                      type="file"
                      multiple
                      onChange={handleAssetUpload}
                    />
                    <div className="asset-list compact-asset-list">
                      <ul>
                        {(uploadedAssets.length > 0
                          ? uploadedAssets
                          : ['No assets loaded yet']
                        ).map((asset) => (
                          <li key={asset}>{asset}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </details>

                <details
                  className="tweak-group"
                  open={openSections.world}
                  onToggle={(event) =>
                    setSectionOpen('world', (event.currentTarget as HTMLDetailsElement).open)
                  }
                >
                  <summary className="tweak-group-summary">
                    <div className="tweak-group-header">
                      <h3>World / Theme</h3>
                      <p>Look, tone, and overall prototype mood</p>
                    </div>
                  </summary>
                  <div className="tweak-group-body">
                    <label className="field-label" htmlFor="game-speed">
                      Global game speed
                    </label>
                    <div className="speed-control">
                      <input
                        id="game-speed"
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={gameSpeed}
                        onChange={(event) => handleSpeedChange(Number(event.target.value))}
                      />
                      <span>{gameSpeed.toFixed(1)}x</span>
                    </div>
                    <label className="field-label" htmlFor="visual-theme">
                      Visual theme
                    </label>
                    <select
                      id="visual-theme"
                      value={visualTheme}
                      onChange={(event) =>
                        handleThemeChange(event.target.value as VisualThemeLabel)
                      }
                    >
                      {visualThemeOptions.map((option) => (
                        <option key={option.value} value={option.label}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="tweak-note">
                      Current pass: {visualTheme}. Shift the world look while keeping the
                      same live prototype structure.
                    </p>
                  </div>
                </details>
              </>
            ) : null}
          </aside>
        </main>
      ) : null}
    </div>
  )
}

export default App
