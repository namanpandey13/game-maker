import ArchetypePlaceholder from './ArchetypePlaceholder'
import MissileDefenseGame from './MissileDefenseGame'
import PhysicsFlickGame from './PhysicsFlickGame'
import TopdownSurvivalGame from './TopdownSurvivalGame'
import type { GameConfig } from '../lib/gameConfig'

type ArchetypeRendererProps = {
  config: GameConfig
}

export function MissileDefenseRenderer({ config }: ArchetypeRendererProps) {
  if (config.archetype !== 'missile_defense') {
    return null
  }

  return <MissileDefenseGame config={config} />
}

export function PlaceholderArchetypeRenderer({
  config,
}: ArchetypeRendererProps) {
  return <ArchetypePlaceholder config={config} />
}

export function TopdownSurvivalRenderer({ config }: ArchetypeRendererProps) {
  if (config.archetype !== 'topdown_survival') {
    return null
  }

  return <TopdownSurvivalGame config={config} />
}

export function PhysicsFlickRenderer({ config }: ArchetypeRendererProps) {
  if (config.archetype !== 'physics_flick') {
    return null
  }

  return <PhysicsFlickGame config={config} />
}
