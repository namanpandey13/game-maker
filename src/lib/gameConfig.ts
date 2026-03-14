export const archetypeOptions = [
  { label: 'Missile Defense', value: 'missile_defense' },
  { label: 'Topdown Survival', value: 'topdown_survival' },
  { label: 'Physics Flick', value: 'physics_flick' },
  { label: 'Match 3', value: 'match3' },
] as const

export const difficultyOptions = [
  { label: 'Easy', value: 'easy' },
  { label: 'Normal', value: 'normal' },
  { label: 'Hard', value: 'hard' },
  { label: 'Expert', value: 'expert' },
] as const

export const visualThemeOptions = [
  { label: 'Neon Arcade', value: 'neon_arcade' },
  { label: 'Desert Wastes', value: 'desert_wastes' },
  { label: 'Deep Space', value: 'deep_space' },
] as const

export const npcBehaviorOptions = [
  { label: 'Stationary', value: 'stationary' },
  { label: 'Wander', value: 'wander' },
  { label: 'Follow Player', value: 'follow_player' },
] as const

export type GameArchetype = (typeof archetypeOptions)[number]['value']
export type DifficultyId = (typeof difficultyOptions)[number]['value']
export type DifficultyLabel = (typeof difficultyOptions)[number]['label']
export type VisualThemeId = (typeof visualThemeOptions)[number]['value']
export type VisualThemeLabel = (typeof visualThemeOptions)[number]['label']
export type NpcBehaviorId = (typeof npcBehaviorOptions)[number]['value']
export type NpcBehaviorLabel = (typeof npcBehaviorOptions)[number]['label']

export type PlayerAvatar = {
  name: string
  url: string
}

export type BuilderFormValues = {
  lore: string
  conceptPrompt: string
  archetypeOverride: GameArchetype | null
  difficulty: DifficultyLabel
  visualTheme: VisualThemeLabel
  gameSpeed: number
  playerSpeed: number
  playerHealth: number
  playerDamage: number
  enemySpeed: number
  enemyHealth: number
  enemyDamage: number
  assets: string[]
  playerAvatar: PlayerAvatar | null
  npcCount: number
  npcBehavior: NpcBehaviorId
}

export type GameMetadata = {
  archetypeLabel: string
  routingMode: 'detected' | 'override'
  routingReason: string
  missionText: string
  generationMode: 'local_ai_simulator'
  inspectedLoreKeywords: string[]
  inspectedAssets: string[]
}

type BaseGameConfig = {
  archetype: GameArchetype
  title: string
  objective: string
  theme: VisualThemeId
  themeLabel: VisualThemeLabel
  difficulty: DifficultyId
  difficultyLabel: DifficultyLabel
  speed: number
  assets: string[]
  playerAvatar: PlayerAvatar | null
  metadata: GameMetadata
}

export type MissileDefenseArchetypeConfig = {
  player: {
    label: string
    cityHealth: number
    explosionRadius: number
    explosionGrowth: number
  }
  enemy: {
    label: string
    spawnInterval: number
    missileSpeed: number
  }
}

export type TopdownSurvivalArchetypeConfig = {
  player: {
    label: string
    health: number
    moveSpeed: number
    shotDamage: number
    radius: number
    damageCooldown: number
  }
  enemy: {
    label: string
    spawnInterval: number
    moveSpeed: number
    health: number
    contactDamage: number
    radius: number
    maxCount: number
  }
  npcs: {
    label: string
    count: number
    behavior: NpcBehaviorId
    behaviorLabel: NpcBehaviorLabel
    moveSpeed: number
    radius: number
  }
}

export type PhysicsFlickArchetypeConfig = {
  round: {
    label: string
    attempts: number
    roundTime: number
  }
  projectile: {
    label: string
    speedMultiplier: number
    radius: number
    dragScale: number
  }
  target: {
    label: string
    radius: number
    moveSpeed: number
    pointsPerHit: number
  }
}

export type PlaceholderArchetypeConfig = {
  summary: string
}

export type MissileDefenseGameConfig = BaseGameConfig & {
  archetype: 'missile_defense'
  archetypeConfig: MissileDefenseArchetypeConfig
}

export type TopdownSurvivalGameConfig = BaseGameConfig & {
  archetype: 'topdown_survival'
  archetypeConfig: TopdownSurvivalArchetypeConfig
}

export type PhysicsFlickGameConfig = BaseGameConfig & {
  archetype: 'physics_flick'
  archetypeConfig: PhysicsFlickArchetypeConfig
}

export type Match3GameConfig = BaseGameConfig & {
  archetype: 'match3'
  archetypeConfig: PlaceholderArchetypeConfig
}

export type GameConfig =
  | MissileDefenseGameConfig
  | TopdownSurvivalGameConfig
  | PhysicsFlickGameConfig
  | Match3GameConfig

export type GeneratedGameState = {
  id: number
  config: GameConfig
}

export type LocalGenerationContext = {
  input: BuilderFormValues
  mappedArchetype: GameArchetype
  archetypeLabel: string
  routingMode: 'detected' | 'override'
  routingReason: string
  difficultyId: DifficultyId
  visualThemeId: VisualThemeId
  loreKeywords: string[]
  missionText: string
  title: string
  objectiveHint: string
  assetNames: string[]
  playerAvatar: PlayerAvatar | null
}

export function getArchetypeLabel(archetype: GameArchetype) {
  return (
    archetypeOptions.find((option) => option.value === archetype)?.label ??
    'Unknown Archetype'
  )
}

export function getDifficultyId(label: DifficultyLabel): DifficultyId {
  return (
    difficultyOptions.find((option) => option.label === label)?.value ?? 'normal'
  )
}

export function getVisualThemeId(label: VisualThemeLabel): VisualThemeId {
  return (
    visualThemeOptions.find((option) => option.label === label)?.value ??
    'neon_arcade'
  )
}

export function getNpcBehaviorLabel(value: NpcBehaviorId): NpcBehaviorLabel {
  return (
    npcBehaviorOptions.find((option) => option.value === value)?.label ??
    'Wander'
  )
}
