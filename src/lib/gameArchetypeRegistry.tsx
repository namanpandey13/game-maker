import type { ComponentType } from 'react'
import {
  PhysicsFlickRenderer,
  MissileDefenseRenderer,
  PlaceholderArchetypeRenderer,
  TopdownSurvivalRenderer,
} from '../components/ArchetypeRenderers'
import { getNpcBehaviorLabel } from './gameConfig'
import type {
  GameArchetype,
  GameConfig,
  LocalGenerationContext,
  MissileDefenseGameConfig,
  PlaceholderArchetypeConfig,
  PhysicsFlickGameConfig,
  TopdownSurvivalGameConfig,
} from './gameConfig'

type ArchetypeRegistryEntry = {
  label: string
  supported: boolean
  Renderer: ComponentType<{ config: GameConfig }>
  defaultConfigGenerator: (context: LocalGenerationContext) => GameConfig
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function buildBaseConfig(context: LocalGenerationContext) {
  return {
    archetype: context.mappedArchetype,
    title: context.title,
    objective: context.objectiveHint,
    theme: context.visualThemeId,
    themeLabel: context.input.visualTheme,
    difficulty: context.difficultyId,
    difficultyLabel: context.input.difficulty,
    speed: context.input.gameSpeed,
    assets: context.assetNames,
    playerAvatar: context.playerAvatar,
    metadata: {
      archetypeLabel: context.archetypeLabel,
      routingMode: context.routingMode,
      routingReason: context.routingReason,
      missionText: context.missionText,
      generationMode: 'local_ai_simulator' as const,
      inspectedLoreKeywords: context.loreKeywords.slice(0, 6),
      inspectedAssets: context.assetNames,
    },
  }
}

function buildMissileDefenseArchetypeConfig(context: LocalGenerationContext) {
  const normalizedSpeed = clamp(context.input.gameSpeed, 0.5, 2)

  const baseByDifficulty = {
    easy: {
      cityHealth: 6,
      spawnInterval: 1.1 / normalizedSpeed,
      missileSpeed: 72 * normalizedSpeed,
      explosionRadius: 52,
      explosionGrowth: 165,
    },
    normal: {
      cityHealth: 5,
      spawnInterval: 0.88 / normalizedSpeed,
      missileSpeed: 92 * normalizedSpeed,
      explosionRadius: 48,
      explosionGrowth: 170,
    },
    hard: {
      cityHealth: 4,
      spawnInterval: 0.7 / normalizedSpeed,
      missileSpeed: 115 * normalizedSpeed,
      explosionRadius: 44,
      explosionGrowth: 172,
    },
    expert: {
      cityHealth: 3,
      spawnInterval: 0.52 / normalizedSpeed,
      missileSpeed: 140 * normalizedSpeed,
      explosionRadius: 40,
      explosionGrowth: 180,
    },
  }[context.difficultyId]

  const threatWords = new Set([
    'attack',
    'barrage',
    'collapse',
    'falling',
    'frontier',
    'hostile',
    'impact',
    'missile',
    'missiles',
    'rival',
    'siege',
    'storm',
    'storms',
    'swarm',
    'wasteland',
  ])

  const supportAssetWords = [
    'shield',
    'turret',
    'defense',
    'radar',
    'core',
    'upgrade',
  ]

  const threatLevel = context.loreKeywords.filter((keyword) =>
    threatWords.has(keyword),
  ).length
  const supportAssets = context.assetNames.filter((asset) =>
    supportAssetWords.some((word) => asset.toLowerCase().includes(word)),
  ).length

  const enemyPressure = clamp(
    1 + threatLevel * 0.06 + context.assetNames.length * 0.015,
    1,
    1.35,
  )
  const playerAssist = clamp(
    1 + supportAssets * 0.05 - threatLevel * 0.015,
    0.9,
    1.18,
  )

  return {
    player: {
      label:
        playerAssist >= 1.08
          ? 'Forgiving'
          : playerAssist <= 0.96
            ? 'Tense'
            : 'Balanced',
      cityHealth: Math.max(1, Math.round(baseByDifficulty.cityHealth * playerAssist)),
      explosionRadius: Math.round(baseByDifficulty.explosionRadius * playerAssist),
      explosionGrowth: Math.round(
        baseByDifficulty.explosionGrowth * clamp(playerAssist, 0.95, 1.12),
      ),
    },
    enemy: {
      label:
        enemyPressure >= 1.22
          ? 'Aggressive'
          : enemyPressure <= 1.06
            ? 'Measured'
            : 'Escalating',
      spawnInterval: Number(
        (baseByDifficulty.spawnInterval / enemyPressure).toFixed(3),
      ),
      missileSpeed: Math.round(baseByDifficulty.missileSpeed * enemyPressure),
    },
  }
}

function createMissileDefenseConfig(
  context: LocalGenerationContext,
): MissileDefenseGameConfig {
  return {
    ...buildBaseConfig(context),
    archetype: 'missile_defense',
    objective: context.objectiveHint.includes('Protect the city')
      ? context.objectiveHint
      : `Protect the city and neutralize the incoming strike pattern.`,
    archetypeConfig: buildMissileDefenseArchetypeConfig(context),
  }
}

function createPlaceholderConfig(
  context: LocalGenerationContext,
  archetype: 'match3',
): GameConfig {
  const placeholderSummary = context.objectiveHint

  switch (archetype) {
    case 'match3':
      return {
        ...buildBaseConfig(context),
        archetype: 'match3',
        archetypeConfig: {
          summary: placeholderSummary,
        } satisfies PlaceholderArchetypeConfig,
      }
  }
}

function createPhysicsFlickConfig(
  context: LocalGenerationContext,
): PhysicsFlickGameConfig {
  const normalizedSpeed = clamp(context.input.gameSpeed, 0.5, 2)

  const baseByDifficulty = {
    easy: {
      attempts: 10,
      roundTime: 34,
      targetRadius: 28,
      targetMoveSpeed: 42 * normalizedSpeed,
      projectileSpeedMultiplier: 1.08 * normalizedSpeed,
      dragScale: 3.2,
      projectileRadius: 11,
      pointsPerHit: 12,
    },
    normal: {
      attempts: 8,
      roundTime: 28,
      targetRadius: 24,
      targetMoveSpeed: 58 * normalizedSpeed,
      projectileSpeedMultiplier: 1.2 * normalizedSpeed,
      dragScale: 3.45,
      projectileRadius: 10,
      pointsPerHit: 15,
    },
    hard: {
      attempts: 7,
      roundTime: 24,
      targetRadius: 20,
      targetMoveSpeed: 76 * normalizedSpeed,
      projectileSpeedMultiplier: 1.32 * normalizedSpeed,
      dragScale: 3.75,
      projectileRadius: 10,
      pointsPerHit: 18,
    },
    expert: {
      attempts: 6,
      roundTime: 20,
      targetRadius: 17,
      targetMoveSpeed: 94 * normalizedSpeed,
      projectileSpeedMultiplier: 1.45 * normalizedSpeed,
      dragScale: 4,
      projectileRadius: 9,
      pointsPerHit: 22,
    },
  }[context.difficultyId]

  const sportsWords = new Set([
    'soccer',
    'basketball',
    'goal',
    'shot',
    'toss',
    'flick',
    'slingshot',
    'target',
  ])
  const sportSignals = context.loreKeywords.filter((keyword) =>
    sportsWords.has(keyword),
  ).length
  const controlAssets = context.assetNames.filter((asset) =>
    ['aim', 'ball', 'goal', 'target', 'shot'].some((word) =>
      asset.toLowerCase().includes(word),
    ),
  ).length

  const targetPressure = clamp(1 + sportSignals * 0.05, 1, 1.22)
  const projectileAssist = clamp(1 + controlAssets * 0.04, 1, 1.18)

  return {
    ...buildBaseConfig(context),
    archetype: 'physics_flick',
    objective: context.objectiveHint.includes('Flick')
      ? context.objectiveHint
      : 'Flick accurate shots into the moving target zone before your round expires.',
    archetypeConfig: {
      round: {
        label:
          baseByDifficulty.roundTime <= 22
            ? 'Short Clock'
            : baseByDifficulty.roundTime >= 32
              ? 'Open Window'
              : 'Arcade Round',
        attempts: baseByDifficulty.attempts,
        roundTime: baseByDifficulty.roundTime,
      },
      projectile: {
        label:
          projectileAssist >= 1.1
            ? 'Responsive'
            : projectileAssist <= 1.02
              ? 'Direct'
              : 'Balanced',
        speedMultiplier: Number(
          (baseByDifficulty.projectileSpeedMultiplier * projectileAssist).toFixed(2),
        ),
        radius: baseByDifficulty.projectileRadius,
        dragScale: Number((baseByDifficulty.dragScale / projectileAssist).toFixed(2)),
      },
      target: {
        label:
          targetPressure >= 1.16
            ? 'Shifty'
            : targetPressure <= 1.05
              ? 'Steady'
              : 'Active',
        radius: Math.max(12, Math.round(baseByDifficulty.targetRadius / targetPressure)),
        moveSpeed: Math.round(baseByDifficulty.targetMoveSpeed * targetPressure),
        pointsPerHit: baseByDifficulty.pointsPerHit,
      },
    },
  }
}

function createTopdownSurvivalConfig(
  context: LocalGenerationContext,
): TopdownSurvivalGameConfig {
  const normalizedSpeed = clamp(context.input.gameSpeed, 0.5, 2)
  const playerSpeedTuning = clamp(context.input.playerSpeed, 0.7, 1.6)
  const playerHealthTuning = clamp(context.input.playerHealth, 0.6, 1.8)
  const playerDamageTuning = clamp(context.input.playerDamage, 0.5, 3)
  const enemySpeedTuning = clamp(context.input.enemySpeed, 0.7, 1.6)
  const enemyHealthTuning = clamp(context.input.enemyHealth, 0.5, 2.5)
  const enemyDamageTuning = clamp(context.input.enemyDamage, 0.5, 3)

  const baseByDifficulty = {
    easy: {
      health: 10,
      moveSpeed: 184 * normalizedSpeed,
      shotDamage: 2,
      playerRadius: 13,
      damageCooldown: 0.9,
      spawnInterval: 1.02 / normalizedSpeed,
      enemySpeed: 60 * normalizedSpeed,
      enemyHealth: 2,
      enemyContactDamage: 1,
      enemyRadius: 11,
      maxCount: 10,
    },
    normal: {
      health: 8,
      moveSpeed: 194 * normalizedSpeed,
      shotDamage: 2,
      playerRadius: 12,
      damageCooldown: 0.78,
      spawnInterval: 0.82 / normalizedSpeed,
      enemySpeed: 74 * normalizedSpeed,
      enemyHealth: 3,
      enemyContactDamage: 1,
      enemyRadius: 12,
      maxCount: 13,
    },
    hard: {
      health: 6,
      moveSpeed: 202 * normalizedSpeed,
      shotDamage: 2,
      playerRadius: 12,
      damageCooldown: 0.66,
      spawnInterval: 0.68 / normalizedSpeed,
      enemySpeed: 88 * normalizedSpeed,
      enemyHealth: 4,
      enemyContactDamage: 2,
      enemyRadius: 12,
      maxCount: 16,
    },
    expert: {
      health: 5,
      moveSpeed: 210 * normalizedSpeed,
      shotDamage: 3,
      playerRadius: 11,
      damageCooldown: 0.58,
      spawnInterval: 0.54 / normalizedSpeed,
      enemySpeed: 102 * normalizedSpeed,
      enemyHealth: 5,
      enemyContactDamage: 2,
      enemyRadius: 13,
      maxCount: 20,
    },
  }[context.difficultyId]

  const threatWords = new Set([
    'hostile',
    'swarm',
    'storm',
    'storms',
    'siege',
    'rival',
    'collapse',
    'frontier',
    'attack',
  ])
  const threatLevel = context.loreKeywords.filter((keyword) =>
    threatWords.has(keyword),
  ).length
  const enemyPressure = clamp(
    1 + threatLevel * 0.06 + context.assetNames.length * 0.015,
    1,
    1.34,
  )
  const playerAssist = clamp(
    1 + context.assetNames.length * 0.02 - threatLevel * 0.025,
    0.9,
    1.08,
  )
  const npcCount = clamp(context.input.npcCount, 0, 12)
  const npcBehavior = context.input.npcBehavior
  const npcMoveSpeedByBehavior = {
    stationary: 0,
    wander: 42 * normalizedSpeed,
    follow_player: 64 * normalizedSpeed,
  }[npcBehavior]
  const npcLabelByBehavior = {
    stationary:
      npcCount === 0 ? 'Offline' : npcCount >= 7 ? 'Fortified' : 'Anchored',
    wander: npcCount >= 7 ? 'Scouting' : npcCount <= 2 ? 'Sparse' : 'Patrolling',
    follow_player:
      npcCount >= 7 ? 'Escort Swarm' : npcCount <= 2 ? 'Escort Pair' : 'Escort Wing',
  }[npcBehavior]

  return {
    ...buildBaseConfig(context),
    archetype: 'topdown_survival',
    objective: context.objectiveHint.includes('Survive')
      ? context.objectiveHint
      : `Survive the encroaching wave and keep moving through the arena.`,
    archetypeConfig: {
      player: {
        label:
          playerAssist >= 1.03
            ? 'Agile'
            : playerAssist <= 0.94
              ? 'Scrappy'
              : 'Balanced',
        health: Math.max(
          1,
          Math.round(baseByDifficulty.health * playerAssist * playerHealthTuning),
        ),
        moveSpeed: Math.round(
          baseByDifficulty.moveSpeed * playerAssist * playerSpeedTuning,
        ),
        shotDamage: Math.max(
          1,
          Math.round(baseByDifficulty.shotDamage * playerDamageTuning),
        ),
        radius: baseByDifficulty.playerRadius,
        damageCooldown: Number(
          (baseByDifficulty.damageCooldown / clamp(playerAssist, 0.92, 1.08)).toFixed(2),
        ),
      },
      enemy: {
        label:
          enemyPressure >= 1.18
            ? 'Relentless'
            : enemyPressure <= 1.06
              ? 'Measured'
              : 'Closing In',
        spawnInterval: Number(
          (baseByDifficulty.spawnInterval / enemyPressure).toFixed(3),
        ),
        moveSpeed: Math.round(
          baseByDifficulty.enemySpeed * enemyPressure * enemySpeedTuning,
        ),
        health: Math.max(
          1,
          Math.round(baseByDifficulty.enemyHealth * enemyHealthTuning),
        ),
        contactDamage: Math.max(
          1,
          Math.round(baseByDifficulty.enemyContactDamage * enemyDamageTuning),
        ),
        radius: baseByDifficulty.enemyRadius,
        maxCount: Math.max(
          6,
          Math.round(baseByDifficulty.maxCount * clamp(enemyPressure, 1, 1.2)),
        ),
      },
      npcs: {
        label: npcLabelByBehavior,
        count: npcCount,
        behavior: npcBehavior,
        behaviorLabel: getNpcBehaviorLabel(npcBehavior),
        moveSpeed: Math.round(npcMoveSpeedByBehavior),
        radius: npcBehavior === 'follow_player' ? 8 : 7,
      },
    },
  }
}

export const gameArchetypeRegistry: Record<GameArchetype, ArchetypeRegistryEntry> = {
  missile_defense: {
    label: 'Missile Defense',
    supported: true,
    Renderer: MissileDefenseRenderer,
    defaultConfigGenerator: createMissileDefenseConfig,
  },
  topdown_survival: {
    label: 'Topdown Survival',
    supported: true,
    Renderer: TopdownSurvivalRenderer,
    defaultConfigGenerator: createTopdownSurvivalConfig,
  },
  physics_flick: {
    label: 'Physics Flick',
    supported: true,
    Renderer: PhysicsFlickRenderer,
    defaultConfigGenerator: createPhysicsFlickConfig,
  },
  match3: {
    label: 'Match 3',
    supported: false,
    Renderer: PlaceholderArchetypeRenderer,
    defaultConfigGenerator: (context) => createPlaceholderConfig(context, 'match3'),
  },
}

export function getArchetypeRegistryEntry(archetype: GameArchetype) {
  return gameArchetypeRegistry[archetype]
}
