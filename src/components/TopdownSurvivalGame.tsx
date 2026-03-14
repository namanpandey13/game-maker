import { useEffect, useRef, useState } from 'react'
import type {
  NpcBehaviorId,
  TopdownSurvivalGameConfig,
  VisualThemeId,
} from '../lib/gameConfig'
import './TopdownSurvivalGame.css'

type TopdownSurvivalGameProps = {
  config: TopdownSurvivalGameConfig
}

type PlayerState = {
  x: number
  y: number
  vx: number
  vy: number
  facing: number
}

type Enemy = {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  health: number
  maxHealth: number
  radius: number
  speedScale: number
  strafeScale: number
  pulseOffset: number
}

type AmbientNpc = {
  id: number
  label: string
  x: number
  y: number
  vx: number
  vy: number
  anchorX: number
  anchorY: number
  radius: number
  phase: number
  retargetTimer: number
  wanderTargetX: number
  wanderTargetY: number
  followDistance: number
  followOffsetAngle: number
}

type Burst = {
  id: number
  x: number
  y: number
  radius: number
  maxRadius: number
  life: number
  maxLife: number
  color: string
}

type Projectile = {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  life: number
  maxLife: number
}

type TrailPoint = {
  x: number
  y: number
  life: number
}

type Palette = {
  backgroundTop: string
  backgroundBottom: string
  grid: string
  gridHighlight: string
  player: string
  playerCore: string
  playerTrail: string
  enemy: string
  enemyOutline: string
  enemyGlow: string
  ally: string
  allyGlow: string
  hudText: string
  hudPanel: string
  arenaBorder: string
  accent: string
  warning: string
  hitFlash: string
  shadow: string
}

const GAME_WIDTH = 720
const GAME_HEIGHT = 405
const ARENA_PADDING = 20
const TRAIL_LIFE = 0.32

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function lerp(start: number, end: number, amount: number) {
  return start + (end - start) * amount
}

function getThreatLabel(value: number) {
  if (value >= 1.15) {
    return 'Critical'
  }

  if (value >= 0.78) {
    return 'Hot'
  }

  if (value >= 0.42) {
    return 'Active'
  }

  return 'Stabilized'
}

function getPalette(theme: VisualThemeId): Palette {
  switch (theme) {
    case 'desert_wastes':
      return {
        backgroundTop: '#2f2017',
        backgroundBottom: '#8d6135',
        grid: 'rgba(255, 233, 179, 0.08)',
        gridHighlight: 'rgba(255, 209, 122, 0.26)',
        player: '#ffe49e',
        playerCore: '#fffef4',
        playerTrail: 'rgba(255, 228, 158, 0.22)',
        enemy: '#8c2c1a',
        enemyOutline: '#ffd5a8',
        enemyGlow: 'rgba(140, 44, 26, 0.32)',
        ally: '#7be4c3',
        allyGlow: 'rgba(123, 228, 195, 0.22)',
        hudText: '#fff7e7',
        hudPanel: 'rgba(52, 29, 16, 0.62)',
        arenaBorder: 'rgba(255, 223, 164, 0.28)',
        accent: '#ffd77f',
        warning: '#ff8b61',
        hitFlash: 'rgba(255, 139, 97, 0.12)',
        shadow: 'rgba(14, 10, 8, 0.34)',
      }
    case 'deep_space':
      return {
        backgroundTop: '#05101c',
        backgroundBottom: '#163250',
        grid: 'rgba(143, 210, 255, 0.08)',
        gridHighlight: 'rgba(143, 210, 255, 0.28)',
        player: '#88efff',
        playerCore: '#f7ffff',
        playerTrail: 'rgba(136, 239, 255, 0.24)',
        enemy: '#ff7c98',
        enemyOutline: '#ffd6e1',
        enemyGlow: 'rgba(255, 124, 152, 0.26)',
        ally: '#b4ff8f',
        allyGlow: 'rgba(180, 255, 143, 0.22)',
        hudText: '#eff7ff',
        hudPanel: 'rgba(8, 18, 34, 0.64)',
        arenaBorder: 'rgba(143, 210, 255, 0.26)',
        accent: '#8fe1ff',
        warning: '#ff7b8d',
        hitFlash: 'rgba(255, 123, 141, 0.12)',
        shadow: 'rgba(6, 12, 22, 0.36)',
      }
    default:
      return {
        backgroundTop: '#150922',
        backgroundBottom: '#3f1258',
        grid: 'rgba(230, 116, 255, 0.08)',
        gridHighlight: 'rgba(100, 240, 255, 0.24)',
        player: '#6cf4ff',
        playerCore: '#fcffff',
        playerTrail: 'rgba(108, 244, 255, 0.24)',
        enemy: '#ff6d92',
        enemyOutline: '#ffd7eb',
        enemyGlow: 'rgba(255, 109, 146, 0.28)',
        ally: '#b8ff94',
        allyGlow: 'rgba(184, 255, 148, 0.22)',
        hudText: '#f8f3ff',
        hudPanel: 'rgba(22, 8, 34, 0.62)',
        arenaBorder: 'rgba(100, 240, 255, 0.22)',
        accent: '#ff7ad9',
        warning: '#ff7a7a',
        hitFlash: 'rgba(255, 122, 122, 0.12)',
        shadow: 'rgba(8, 6, 14, 0.38)',
      }
  }
}

function buildAmbientNpcs(
  count: number,
  radius: number,
  behavior: NpcBehaviorId,
) {
  const npcs: AmbientNpc[] = []

  for (let index = 0; index < count; index += 1) {
    const columns = Math.max(2, Math.ceil(Math.sqrt(count || 1)))
    const row = Math.floor(index / columns)
    const column = index % columns
    const usableWidth = GAME_WIDTH - ARENA_PADDING * 2 - 120
    const usableHeight = GAME_HEIGHT - ARENA_PADDING * 2 - 110
    const anchorX =
      ARENA_PADDING + 60 + (column / Math.max(columns - 1, 1)) * usableWidth
    const anchorY =
      ARENA_PADDING + 58 + (row / Math.max(Math.ceil(count / columns) - 1, 1)) * usableHeight
    const followDistance = behavior === 'follow_player' ? 34 + (index % 3) * 16 : 0
    const followOffsetAngle = (index / Math.max(count, 1)) * Math.PI * 2

    npcs.push({
      id: index,
      label: `N${index + 1}`,
      x: anchorX,
      y: anchorY,
      vx: 0,
      vy: 0,
      anchorX,
      anchorY,
      radius,
      phase: index * 0.7,
      retargetTimer: 0.5 + (index % 4) * 0.18,
      wanderTargetX: anchorX,
      wanderTargetY: anchorY,
      followDistance,
      followOffsetAngle,
    })
  }

  return npcs
}

function TopdownSurvivalGame({ config }: TopdownSurvivalGameProps) {
  const {
    title,
    objective,
    theme,
    themeLabel,
    difficultyLabel,
    speed,
    assets,
    playerAvatar,
    metadata: { missionText },
    archetypeConfig,
  } = config

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const pressedKeysRef = useRef<Set<string>>(new Set())
  const playerRef = useRef<PlayerState>({
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT / 2,
    vx: 0,
    vy: 0,
    facing: -Math.PI / 2,
  })
  const enemiesRef = useRef<Enemy[]>([])
  const ambientNpcsRef = useRef<AmbientNpc[]>([])
  const burstsRef = useRef<Burst[]>([])
  const projectilesRef = useRef<Projectile[]>([])
  const playerTrailRef = useRef<TrailPoint[]>([])
  const enemyIdRef = useRef(0)
  const burstIdRef = useRef(0)
  const projectileIdRef = useRef(0)
  const gameOverRef = useRef(false)
  const healthRef = useRef(archetypeConfig.player.health)
  const scoreRef = useRef(0)
  const elapsedRef = useRef(0)
  const damageCooldownRef = useRef(0)
  const hitFlashRef = useRef(0)
  const screenShakeRef = useRef(0)
  const fireCooldownRef = useRef(0)
  const aimPointRef = useRef({ x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 })
  const avatarImageRef = useRef<HTMLImageElement | null>(null)

  const [restartCount, setRestartCount] = useState(0)
  const [score, setScore] = useState(0)
  const [health, setHealth] = useState(archetypeConfig.player.health)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [enemyCount, setEnemyCount] = useState(0)
  const [threatLevel, setThreatLevel] = useState(0)
  const [eliminations, setEliminations] = useState(0)
  const [gameOver, setGameOver] = useState(false)

  useEffect(() => {
    avatarImageRef.current = null

    if (!playerAvatar?.url) {
      return
    }

    let cancelled = false
    const image = new Image()
    image.decoding = 'async'

    image.onload = () => {
      if (cancelled) {
        return
      }

      avatarImageRef.current = image
    }

    image.onerror = () => {
      if (cancelled) {
        return
      }

      avatarImageRef.current = null
    }

    image.src = playerAvatar.url

    return () => {
      cancelled = true
      image.onload = null
      image.onerror = null
    }
  }, [playerAvatar])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()

      if (
        key === 'w' ||
        key === 'a' ||
        key === 's' ||
        key === 'd' ||
        key === 'arrowup' ||
        key === 'arrowdown' ||
        key === 'arrowleft' ||
        key === 'arrowright'
      ) {
        event.preventDefault()
        pressedKeysRef.current.add(key)
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      pressedKeysRef.current.delete(event.key.toLowerCase())
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')

    if (!context) {
      return
    }

    const palette = getPalette(theme)
    canvas.width = GAME_WIDTH
    canvas.height = GAME_HEIGHT

    enemiesRef.current = []
    ambientNpcsRef.current = buildAmbientNpcs(
      archetypeConfig.npcs.count,
      archetypeConfig.npcs.radius,
      archetypeConfig.npcs.behavior,
    )
    burstsRef.current = []
    projectilesRef.current = []
    playerTrailRef.current = []
    enemyIdRef.current = 0
    burstIdRef.current = 0
    projectileIdRef.current = 0
    playerRef.current = {
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT / 2,
      vx: 0,
      vy: 0,
      facing: -Math.PI / 2,
    }
    gameOverRef.current = false
    healthRef.current = archetypeConfig.player.health
    scoreRef.current = 0
    elapsedRef.current = 0
    damageCooldownRef.current = 0
    hitFlashRef.current = 0
    screenShakeRef.current = 0
    fireCooldownRef.current = 0
    aimPointRef.current = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 }
    pressedKeysRef.current.clear()

    let cancelled = false
    let lastTimestamp = 0
    let spawnTimer = 0
    let hudSyncTimer = 0

    const toCanvasPoint = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect()
      const scaleX = GAME_WIDTH / bounds.width
      const scaleY = GAME_HEIGHT / bounds.height

      return {
        x: clamp((event.clientX - bounds.left) * scaleX, 0, GAME_WIDTH),
        y: clamp((event.clientY - bounds.top) * scaleY, 0, GAME_HEIGHT),
      }
    }

    const addBurst = (
      x: number,
      y: number,
      color: string,
      maxRadius = 42,
      maxLife = 0.24,
    ) => {
      burstsRef.current.push({
        id: burstIdRef.current += 1,
        x,
        y,
        radius: 4,
        maxRadius,
        life: maxLife,
        maxLife,
        color,
      })
    }

    const spawnEnemy = () => {
      const radius =
        archetypeConfig.enemy.radius * (0.9 + Math.random() * 0.35)
      const side = Math.floor(Math.random() * 4)
      const margin = radius * 3
      let x = 0
      let y = 0

      if (side === 0) {
        x = Math.random() * GAME_WIDTH
        y = -margin
      } else if (side === 1) {
        x = GAME_WIDTH + margin
        y = Math.random() * GAME_HEIGHT
      } else if (side === 2) {
        x = Math.random() * GAME_WIDTH
        y = GAME_HEIGHT + margin
      } else {
        x = -margin
        y = Math.random() * GAME_HEIGHT
      }

      enemiesRef.current.push({
        id: enemyIdRef.current++,
        x,
        y,
        vx: 0,
        vy: 0,
        health: archetypeConfig.enemy.health,
        maxHealth: archetypeConfig.enemy.health,
        radius,
        speedScale: 0.88 + Math.random() * 0.28,
        strafeScale: (Math.random() > 0.5 ? 1 : -1) * (14 + Math.random() * 18),
        pulseOffset: Math.random() * Math.PI * 2,
      })
      addBurst(x, y, palette.accent, radius * 2.4, 0.18)
    }

    const fireProjectile = (targetX: number, targetY: number) => {
      if (gameOverRef.current || fireCooldownRef.current > 0) {
        return
      }

      const player = playerRef.current
      const dx = targetX - player.x
      const dy = targetY - player.y
      const length = Math.hypot(dx, dy) || 1
      const projectileSpeed = Math.max(
        380,
        archetypeConfig.player.moveSpeed * 2.35,
      )

      projectilesRef.current.push({
        id: projectileIdRef.current++,
        x: player.x + (dx / length) * (archetypeConfig.player.radius + 10),
        y: player.y + (dy / length) * (archetypeConfig.player.radius + 10),
        vx: (dx / length) * projectileSpeed,
        vy: (dy / length) * projectileSpeed,
        radius: 4,
        life: 0.75,
        maxLife: 0.75,
      })
      fireCooldownRef.current = 0.16
      player.facing = Math.atan2(dy, dx)
      addBurst(player.x, player.y, palette.accent, 22, 0.14)
    }

    const handlePointerMove = (event: PointerEvent) => {
      aimPointRef.current = toCanvasPoint(event)
    }

    const handlePointerDown = (event: PointerEvent) => {
      event.preventDefault()
      const point = toCanvasPoint(event)
      aimPointRef.current = point
      fireProjectile(point.x, point.y)
    }

    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerdown', handlePointerDown)

    const movePlayer = (deltaTime: number) => {
      let dx = 0
      let dy = 0
      const pressedKeys = pressedKeysRef.current

      if (pressedKeys.has('w') || pressedKeys.has('arrowup')) {
        dy -= 1
      }
      if (pressedKeys.has('s') || pressedKeys.has('arrowdown')) {
        dy += 1
      }
      if (pressedKeys.has('a') || pressedKeys.has('arrowleft')) {
        dx -= 1
      }
      if (pressedKeys.has('d') || pressedKeys.has('arrowright')) {
        dx += 1
      }

      const player = playerRef.current
      const hasInput = dx !== 0 || dy !== 0
      const vectorLength = Math.hypot(dx, dy) || 1
      const targetVelocityX = hasInput
        ? (dx / vectorLength) * archetypeConfig.player.moveSpeed
        : 0
      const targetVelocityY = hasInput
        ? (dy / vectorLength) * archetypeConfig.player.moveSpeed
        : 0
      const easing = clamp(deltaTime * (hasInput ? 10 : 7), 0.08, 0.2)

      player.vx = lerp(player.vx, targetVelocityX, easing)
      player.vy = lerp(player.vy, targetVelocityY, easing)
      player.x = clamp(
        player.x + player.vx * deltaTime,
        ARENA_PADDING + archetypeConfig.player.radius,
        GAME_WIDTH - ARENA_PADDING - archetypeConfig.player.radius,
      )
      player.y = clamp(
        player.y + player.vy * deltaTime,
        ARENA_PADDING + archetypeConfig.player.radius,
        GAME_HEIGHT - ARENA_PADDING - archetypeConfig.player.radius,
      )

      if (Math.hypot(player.vx, player.vy) > 12) {
        player.facing = Math.atan2(player.vy, player.vx)
      }

      playerTrailRef.current.unshift({
        x: player.x,
        y: player.y,
        life: TRAIL_LIFE,
      })
      playerTrailRef.current = playerTrailRef.current.slice(0, 14)
    }

    const updateAmbientNpcs = (deltaTime: number) => {
      const player = playerRef.current
      const behavior = archetypeConfig.npcs.behavior
      const moveSpeed = archetypeConfig.npcs.moveSpeed
      const steer = clamp(deltaTime * 4.5, 0.05, 0.18)

      ambientNpcsRef.current.forEach((npc, index) => {
        let targetX = npc.anchorX
        let targetY = npc.anchorY

        if (behavior === 'wander') {
          npc.retargetTimer -= deltaTime
          if (npc.retargetTimer <= 0) {
            const spread = 34 + (index % 3) * 10
            npc.wanderTargetX = clamp(
              npc.anchorX + (Math.random() - 0.5) * spread * 2,
              ARENA_PADDING + 28,
              GAME_WIDTH - ARENA_PADDING - 28,
            )
            npc.wanderTargetY = clamp(
              npc.anchorY + (Math.random() - 0.5) * spread * 2,
              ARENA_PADDING + 28,
              GAME_HEIGHT - ARENA_PADDING - 28,
            )
            npc.retargetTimer = 0.85 + Math.random() * 1.15
          }
          targetX = npc.wanderTargetX
          targetY = npc.wanderTargetY
        }

        if (behavior === 'follow_player') {
          const angle =
            npc.followOffsetAngle + elapsedRef.current * 0.6 + index * 0.08
          targetX =
            player.x + Math.cos(angle) * npc.followDistance
          targetY =
            player.y + Math.sin(angle) * (npc.followDistance * 0.72)
          targetX = clamp(targetX, ARENA_PADDING + 24, GAME_WIDTH - ARENA_PADDING - 24)
          targetY = clamp(targetY, ARENA_PADDING + 24, GAME_HEIGHT - ARENA_PADDING - 24)
        }

        if (behavior === 'stationary') {
          npc.vx = 0
          npc.vy = 0
          npc.x = npc.anchorX + Math.cos(elapsedRef.current * 1.4 + npc.phase) * 1.8
          npc.y = npc.anchorY + Math.sin(elapsedRef.current * 1.1 + npc.phase) * 1.8
          return
        }

        npc.vx = lerp(npc.vx, (targetX - npc.x) * 2.1, steer)
        npc.vy = lerp(npc.vy, (targetY - npc.y) * 2.1, steer)
        npc.x = clamp(
          npc.x + npc.vx * deltaTime * moveSpeed * 0.1,
          ARENA_PADDING + 20,
          GAME_WIDTH - ARENA_PADDING - 20,
        )
        npc.y = clamp(
          npc.y + npc.vy * deltaTime * moveSpeed * 0.1,
          ARENA_PADDING + 20,
          GAME_HEIGHT - ARENA_PADDING - 20,
        )
      })
    }

    const updateEnemies = (deltaTime: number, pressureMultiplier: number) => {
      const player = playerRef.current
      const steer = clamp(deltaTime * 5.5, 0.05, 0.18)

      enemiesRef.current.forEach((enemy) => {
        const dx = player.x - enemy.x
        const dy = player.y - enemy.y
        const distance = Math.hypot(dx, dy) || 1
        const pursuitSpeed =
          archetypeConfig.enemy.moveSpeed * enemy.speedScale * pressureMultiplier
        const weave =
          Math.sin(elapsedRef.current * 2.2 + enemy.pulseOffset) * enemy.strafeScale
        const desiredVelocityX =
          (dx / distance) * pursuitSpeed + (-dy / distance) * weave
        const desiredVelocityY =
          (dy / distance) * pursuitSpeed + (dx / distance) * weave

        enemy.vx = lerp(enemy.vx, desiredVelocityX, steer)
        enemy.vy = lerp(enemy.vy, desiredVelocityY, steer)
        enemy.x += enemy.vx * deltaTime
        enemy.y += enemy.vy * deltaTime
      })

      for (let index = 0; index < enemiesRef.current.length; index += 1) {
        const current = enemiesRef.current[index]

        for (
          let comparisonIndex = index + 1;
          comparisonIndex < enemiesRef.current.length;
          comparisonIndex += 1
        ) {
          const comparison = enemiesRef.current[comparisonIndex]
          const dx = comparison.x - current.x
          const dy = comparison.y - current.y
          const distance = Math.hypot(dx, dy) || 1
          const minimumDistance = current.radius + comparison.radius + 6

          if (distance >= minimumDistance) {
            continue
          }

          const overlap = (minimumDistance - distance) * 0.5
          const offsetX = (dx / distance) * overlap
          const offsetY = (dy / distance) * overlap

          current.x -= offsetX
          current.y -= offsetY
          comparison.x += offsetX
          comparison.y += offsetY
        }
      }
    }

    const updateProjectiles = (deltaTime: number) => {
      fireCooldownRef.current = Math.max(0, fireCooldownRef.current - deltaTime)

      projectilesRef.current = projectilesRef.current
        .map((projectile) => ({
          ...projectile,
          x: projectile.x + projectile.vx * deltaTime,
          y: projectile.y + projectile.vy * deltaTime,
          life: projectile.life - deltaTime,
        }))
        .filter(
          (projectile) =>
            projectile.life > 0 &&
            projectile.x >= -20 &&
            projectile.x <= GAME_WIDTH + 20 &&
            projectile.y >= -20 &&
            projectile.y <= GAME_HEIGHT + 20,
        )

      const removedProjectiles = new Set<number>()
      let kills = 0

      projectilesRef.current.forEach((projectile) => {
        const hitEnemy = enemiesRef.current.find((enemy) => {
          const distance = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y)
          return distance <= projectile.radius + enemy.radius
        })

        if (!hitEnemy) {
          return
        }

        removedProjectiles.add(projectile.id)
        hitEnemy.health = Math.max(
          0,
          hitEnemy.health - archetypeConfig.player.shotDamage,
        )
        addBurst(hitEnemy.x, hitEnemy.y, palette.accent, hitEnemy.radius * 2.8, 0.14)

        if (hitEnemy.health <= 0) {
          kills += 1
          addBurst(hitEnemy.x, hitEnemy.y, palette.warning, hitEnemy.radius * 3.8, 0.18)
        }
      })

      if (removedProjectiles.size > 0) {
        projectilesRef.current = projectilesRef.current.filter(
          (projectile) => !removedProjectiles.has(projectile.id),
        )
      }

      if (kills > 0) {
        enemiesRef.current = enemiesRef.current.filter(
          (enemy) => enemy.health > 0,
        )
        scoreRef.current += kills * 18
        setEliminations((count) => count + kills)
      }
    }

    const updateEffects = (deltaTime: number) => {
      playerTrailRef.current = playerTrailRef.current
        .map((point) => ({
          ...point,
          life: point.life - deltaTime,
        }))
        .filter((point) => point.life > 0)

      burstsRef.current = burstsRef.current
        .map((burst) => ({
          ...burst,
          life: burst.life - deltaTime,
          radius: burst.radius + (burst.maxRadius / burst.maxLife) * deltaTime,
        }))
        .filter((burst) => burst.life > 0)
    }

    const applyCollisions = (deltaTime: number) => {
      damageCooldownRef.current = Math.max(
        0,
        damageCooldownRef.current - deltaTime,
      )
      hitFlashRef.current = Math.max(0, hitFlashRef.current - deltaTime * 2.8)
      screenShakeRef.current = Math.max(0, screenShakeRef.current - deltaTime * 3.5)

      if (damageCooldownRef.current > 0) {
        return
      }

      const player = playerRef.current
      const collidedEnemies = enemiesRef.current.filter((enemy) => {
        const distance = Math.hypot(player.x - enemy.x, player.y - enemy.y)
        return distance <= archetypeConfig.player.radius + enemy.radius
      })

      if (collidedEnemies.length === 0) {
        return
      }

      const impactedIds = new Set(collidedEnemies.slice(0, 2).map((enemy) => enemy.id))
      enemiesRef.current = enemiesRef.current.filter(
        (enemy) => !impactedIds.has(enemy.id),
      )

      collidedEnemies.forEach((enemy) => {
        addBurst(enemy.x, enemy.y, palette.warning, enemy.radius * 3.6, 0.2)
      })

      const nextHealth = Math.max(
        healthRef.current - archetypeConfig.enemy.contactDamage,
        0,
      )
      healthRef.current = nextHealth
      damageCooldownRef.current = archetypeConfig.player.damageCooldown
      hitFlashRef.current = 1
      screenShakeRef.current = 1
      setHealth(nextHealth)
      addBurst(player.x, player.y, palette.warning, 76, 0.32)

      if (nextHealth <= 0) {
        gameOverRef.current = true
        pressedKeysRef.current.clear()
        setGameOver(true)
      }
    }

    const drawArena = (pressureMultiplier: number) => {
      const background = context.createLinearGradient(0, 0, 0, GAME_HEIGHT)
      background.addColorStop(0, palette.backgroundTop)
      background.addColorStop(1, palette.backgroundBottom)
      context.fillStyle = background
      context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

      const vignette = context.createRadialGradient(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        40,
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        GAME_WIDTH / 1.2,
      )
      vignette.addColorStop(0, 'rgba(255, 255, 255, 0)')
      vignette.addColorStop(1, 'rgba(0, 0, 0, 0.24)')
      context.fillStyle = vignette
      context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

      context.strokeStyle = palette.grid
      context.lineWidth = 1
      for (let x = ARENA_PADDING; x <= GAME_WIDTH - ARENA_PADDING; x += 36) {
        context.beginPath()
        context.moveTo(x, ARENA_PADDING)
        context.lineTo(x, GAME_HEIGHT - ARENA_PADDING)
        context.stroke()
      }

      for (let y = ARENA_PADDING; y <= GAME_HEIGHT - ARENA_PADDING; y += 36) {
        context.beginPath()
        context.moveTo(ARENA_PADDING, y)
        context.lineTo(GAME_WIDTH - ARENA_PADDING, y)
        context.stroke()
      }

      const sweepY =
        ARENA_PADDING +
        ((elapsedRef.current * 48) % (GAME_HEIGHT - ARENA_PADDING * 2))
      context.strokeStyle = palette.gridHighlight
      context.lineWidth = 2
      context.beginPath()
      context.moveTo(ARENA_PADDING, sweepY)
      context.lineTo(GAME_WIDTH - ARENA_PADDING, sweepY)
      context.stroke()

      context.strokeStyle = palette.arenaBorder
      context.lineWidth = 2
      context.strokeRect(
        ARENA_PADDING,
        ARENA_PADDING,
        GAME_WIDTH - ARENA_PADDING * 2,
        GAME_HEIGHT - ARENA_PADDING * 2,
      )

      context.fillStyle = palette.hudPanel
      context.fillRect(ARENA_PADDING + 10, GAME_HEIGHT - 42, 178, 22)
      context.fillStyle = palette.hudText
      context.font = '600 12px "Avenir Next", "Segoe UI", sans-serif'
      context.fillText(
        `Pacing ${speed.toFixed(1)}x  •  threat ramp ${(pressureMultiplier * 100).toFixed(0)}%`,
        ARENA_PADDING + 18,
        GAME_HEIGHT - 27,
      )
    }

    const drawAmbientNpcs = () => {
      const behavior = archetypeConfig.npcs.behavior

      ambientNpcsRef.current.forEach((npc) => {
        context.fillStyle = palette.allyGlow
        context.beginPath()
        context.arc(npc.x, npc.y, npc.radius * 2.8, 0, Math.PI * 2)
        context.fill()

        context.strokeStyle = palette.allyGlow
        context.lineWidth = 1
        context.beginPath()
        context.moveTo(npc.x, npc.y)

        if (behavior === 'follow_player') {
          context.lineTo(playerRef.current.x, playerRef.current.y)
        } else {
          context.lineTo(npc.anchorX, npc.anchorY)
        }
        context.stroke()

        context.fillStyle = palette.ally
        context.beginPath()
        context.moveTo(npc.x, npc.y - npc.radius - 1)
        context.lineTo(npc.x + npc.radius + 1, npc.y)
        context.lineTo(npc.x, npc.y + npc.radius + 1)
        context.lineTo(npc.x - npc.radius - 1, npc.y)
        context.closePath()
        context.fill()

        context.strokeStyle = palette.playerCore
        context.lineWidth = 1.5
        context.beginPath()
        context.moveTo(npc.x, npc.y - npc.radius)
        context.lineTo(npc.x + npc.radius, npc.y)
        context.lineTo(npc.x, npc.y + npc.radius)
        context.lineTo(npc.x - npc.radius, npc.y)
        context.closePath()
        context.stroke()

        context.fillStyle = palette.hudText
        context.font = '600 10px "Avenir Next", "Segoe UI", sans-serif'
        context.fillText(npc.label, npc.x - npc.radius - 4, npc.y - npc.radius - 6)
      })
    }

    const drawEffects = () => {
      playerTrailRef.current.forEach((point, index) => {
        const alpha = clamp(point.life / TRAIL_LIFE, 0, 1) * (1 - index * 0.05)
        context.globalAlpha = alpha
        context.fillStyle = palette.playerTrail
        context.beginPath()
        context.arc(
          point.x,
          point.y,
          archetypeConfig.player.radius * (0.82 - index * 0.03),
          0,
          Math.PI * 2,
        )
        context.fill()
        context.globalAlpha = 1
      })

      burstsRef.current.forEach((burst) => {
        const alpha = clamp(burst.life / burst.maxLife, 0, 1)
        context.strokeStyle = burst.color
        context.globalAlpha = alpha
        context.lineWidth = 3
        context.beginPath()
        context.arc(burst.x, burst.y, burst.radius, 0, Math.PI * 2)
        context.stroke()
        context.globalAlpha = 1
      })

      projectilesRef.current.forEach((projectile) => {
        const alpha = clamp(projectile.life / projectile.maxLife, 0.35, 1)
        context.globalAlpha = alpha
        context.strokeStyle = palette.accent
        context.lineWidth = 2
        context.beginPath()
        context.moveTo(projectile.x - projectile.vx * 0.015, projectile.y - projectile.vy * 0.015)
        context.lineTo(projectile.x, projectile.y)
        context.stroke()

        context.fillStyle = palette.playerCore
        context.beginPath()
        context.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2)
        context.fill()
        context.globalAlpha = 1
      })
    }

    const drawEntities = () => {
      const player = playerRef.current

      enemiesRef.current.forEach((enemy) => {
        const pulse = 1 + Math.sin(elapsedRef.current * 4 + enemy.pulseOffset) * 0.08
        const healthRatio = clamp(enemy.health / enemy.maxHealth, 0, 1)

        context.fillStyle = palette.enemyGlow
        context.beginPath()
        context.arc(enemy.x, enemy.y, enemy.radius * 1.9, 0, Math.PI * 2)
        context.fill()

        context.fillStyle = palette.enemy
        context.beginPath()
        context.arc(enemy.x, enemy.y, enemy.radius * pulse, 0, Math.PI * 2)
        context.fill()

        context.strokeStyle = palette.enemyOutline
        context.lineWidth = 2
        context.beginPath()
        context.arc(enemy.x, enemy.y, enemy.radius + 2, 0, Math.PI * 2)
        context.stroke()

        context.strokeStyle = palette.playerCore
        context.lineWidth = 2
        context.beginPath()
        context.arc(
          enemy.x,
          enemy.y,
          enemy.radius + 5,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * healthRatio,
        )
        context.stroke()
      })

      const invulnerableFlash =
        damageCooldownRef.current > 0 &&
        Math.floor(damageCooldownRef.current * 14) % 2 === 0

      context.fillStyle = palette.shadow
      context.beginPath()
      context.ellipse(
        player.x,
        player.y + archetypeConfig.player.radius + 6,
        archetypeConfig.player.radius + 10,
        archetypeConfig.player.radius * 0.8,
        0,
        0,
        Math.PI * 2,
      )
      context.fill()

      context.fillStyle = palette.playerTrail
      context.beginPath()
      context.arc(
        player.x,
        player.y,
        archetypeConfig.player.radius * 1.9,
        0,
        Math.PI * 2,
      )
      context.fill()

      const avatarImage = avatarImageRef.current

      if (avatarImage) {
        const drawRadius = archetypeConfig.player.radius + 1
        const cropSize = Math.min(
          avatarImage.naturalWidth || avatarImage.width,
          avatarImage.naturalHeight || avatarImage.height,
        )
        const sourceX = ((avatarImage.naturalWidth || avatarImage.width) - cropSize) / 2
        const sourceY = ((avatarImage.naturalHeight || avatarImage.height) - cropSize) / 2

        context.save()
        context.beginPath()
        context.arc(player.x, player.y, drawRadius, 0, Math.PI * 2)
        context.closePath()
        context.clip()
        context.drawImage(
          avatarImage,
          sourceX,
          sourceY,
          cropSize,
          cropSize,
          player.x - drawRadius,
          player.y - drawRadius,
          drawRadius * 2,
          drawRadius * 2,
        )
        context.restore()

        context.strokeStyle = invulnerableFlash ? palette.warning : palette.playerCore
        context.lineWidth = 2.5
        context.beginPath()
        context.arc(player.x, player.y, drawRadius, 0, Math.PI * 2)
        context.stroke()

        context.strokeStyle = palette.accent
        context.globalAlpha = 0.65
        context.lineWidth = 4
        context.beginPath()
        context.arc(player.x, player.y, drawRadius + 4, 0, Math.PI * 2)
        context.stroke()
        context.globalAlpha = 1
      } else {
        context.fillStyle = invulnerableFlash ? palette.warning : palette.player
        context.beginPath()
        context.arc(player.x, player.y, archetypeConfig.player.radius, 0, Math.PI * 2)
        context.fill()

        context.fillStyle = palette.playerCore
        context.beginPath()
        context.arc(player.x, player.y, archetypeConfig.player.radius * 0.48, 0, Math.PI * 2)
        context.fill()
      }

      context.strokeStyle = palette.accent
      context.lineWidth = 3
      context.beginPath()
      context.moveTo(player.x, player.y)
      context.lineTo(
        player.x + Math.cos(player.facing) * (archetypeConfig.player.radius + 10),
        player.y + Math.sin(player.facing) * (archetypeConfig.player.radius + 10),
      )
      context.stroke()
    }

    const drawCanvasHud = (liveEnemyCap: number, liveThreatLevel: number) => {
      const healthRatio = clamp(
        healthRef.current / archetypeConfig.player.health,
        0,
        1,
      )

      context.fillStyle = palette.hudPanel
      context.beginPath()
      context.roundRect(16, 14, 232, 72, 14)
      context.fill()

      context.fillStyle = palette.hudText
      context.font = '700 14px "Avenir Next", "Segoe UI", sans-serif'
      context.fillText('SURVIVAL MODE', 28, 36)
      context.font = '500 12px "Avenir Next", "Segoe UI", sans-serif'
      context.fillText('Move with keys, click to shoot hostiles', 28, 54)
      context.fillText(
        `Hostiles ${enemiesRef.current.length}/${liveEnemyCap}  •  NPCs ${archetypeConfig.npcs.count} ${archetypeConfig.npcs.behaviorLabel.toLowerCase()}`,
        28,
        71,
      )

      context.fillStyle = palette.hudPanel
      context.beginPath()
      context.roundRect(GAME_WIDTH - 210, 14, 194, 72, 14)
      context.fill()

      context.fillStyle = palette.hudText
      context.font = '600 12px "Avenir Next", "Segoe UI", sans-serif'
      context.fillText('Health', GAME_WIDTH - 194, 34)
      context.fillRect(GAME_WIDTH - 194, 42, 164, 12)
      context.fillStyle = palette.warning
      context.fillRect(
        GAME_WIDTH - 194,
        42,
        164 * healthRatio,
        12,
      )
      context.fillStyle = palette.hudText
      context.font = '700 18px "Avenir Next", "Segoe UI", sans-serif'
      context.fillText(
        `${healthRef.current}/${archetypeConfig.player.health}`,
        GAME_WIDTH - 64,
        73,
      )

      context.fillStyle = palette.hudPanel
      context.beginPath()
      context.roundRect(GAME_WIDTH - 184, GAME_HEIGHT - 84, 168, 54, 14)
      context.fill()

      context.fillStyle = palette.hudText
      context.font = '600 12px "Avenir Next", "Segoe UI", sans-serif'
      context.fillText('Threat', GAME_WIDTH - 168, GAME_HEIGHT - 58)
      context.font = '700 18px "Avenir Next", "Segoe UI", sans-serif'
      context.fillText(
        getThreatLabel(liveThreatLevel),
        GAME_WIDTH - 168,
        GAME_HEIGHT - 34,
      )
      context.font = '500 12px "Avenir Next", "Segoe UI", sans-serif'
      context.fillText(
        `${Math.round(liveThreatLevel * 100)}% arena pressure`,
        GAME_WIDTH - 104,
        GAME_HEIGHT - 34,
      )
    }

    const drawOverlay = () => {
      if (!gameOverRef.current) {
        const aimPoint = aimPointRef.current
        context.strokeStyle = palette.accent
        context.globalAlpha = 0.55
        context.lineWidth = 1.5
        context.beginPath()
        context.arc(aimPoint.x, aimPoint.y, 11, 0, Math.PI * 2)
        context.stroke()
        context.beginPath()
        context.moveTo(aimPoint.x - 16, aimPoint.y)
        context.lineTo(aimPoint.x + 16, aimPoint.y)
        context.moveTo(aimPoint.x, aimPoint.y - 16)
        context.lineTo(aimPoint.x, aimPoint.y + 16)
        context.stroke()
        context.globalAlpha = 1
      }

      if (hitFlashRef.current > 0) {
        context.fillStyle = palette.hitFlash
        context.globalAlpha = hitFlashRef.current
        context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
        context.globalAlpha = 1
      }

      if (!gameOverRef.current) {
        return
      }

      context.fillStyle = 'rgba(6, 10, 16, 0.62)'
      context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
      context.fillStyle = palette.hudText
      context.textAlign = 'center'
      context.font = '700 34px "Avenir Next", "Segoe UI", sans-serif'
      context.fillText('Run Collapsed', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 14)
      context.font = '500 16px "Avenir Next", "Segoe UI", sans-serif'
      context.fillText(
        `Survived ${elapsedRef.current.toFixed(1)}s  •  score ${Math.floor(scoreRef.current)}`,
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 + 16,
      )
      context.fillText(
        'Restart to stage another survival pass.',
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 + 42,
      )
      context.textAlign = 'start'
    }

    const animate = (timestamp: number) => {
      if (cancelled) {
        return
      }

      if (lastTimestamp === 0) {
        lastTimestamp = timestamp
      }

      const deltaTime = Math.min((timestamp - lastTimestamp) / 1000, 0.032)
      lastTimestamp = timestamp

      const pressureMultiplier = 1 + Math.min(elapsedRef.current / 34, 0.7)
      const liveEnemyCap = Math.min(
        archetypeConfig.enemy.maxCount + 4,
        archetypeConfig.enemy.maxCount + Math.floor(elapsedRef.current / 18),
      )
      const liveSpawnInterval =
        archetypeConfig.enemy.spawnInterval / pressureMultiplier

      if (!gameOverRef.current) {
        spawnTimer += deltaTime
        elapsedRef.current += deltaTime

        while (
          spawnTimer >= liveSpawnInterval &&
          enemiesRef.current.length < liveEnemyCap
        ) {
          spawnEnemy()
          spawnTimer -= liveSpawnInterval
        }

        movePlayer(deltaTime)
        updateAmbientNpcs(deltaTime)
        updateEnemies(deltaTime, pressureMultiplier)
        updateProjectiles(deltaTime)
        applyCollisions(deltaTime)
        updateEffects(deltaTime)

        scoreRef.current +=
          deltaTime *
          (10 + pressureMultiplier * 5 + enemiesRef.current.length * 0.4)
      } else {
        updateAmbientNpcs(deltaTime)
        updateProjectiles(deltaTime)
        updateEffects(deltaTime)
        applyCollisions(deltaTime)
      }

      const liveThreatLevel = clamp(
        enemiesRef.current.length / Math.max(liveEnemyCap, 1) +
          (pressureMultiplier - 1) * 0.42,
        0,
        1.5,
      )

      hudSyncTimer += deltaTime
      if (hudSyncTimer >= 0.08 || gameOverRef.current) {
        hudSyncTimer = 0
        setScore(Math.floor(scoreRef.current))
        setElapsedTime(elapsedRef.current)
        setEnemyCount(enemiesRef.current.length)
        setThreatLevel(liveThreatLevel)
      }

      context.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

      context.save()
      if (screenShakeRef.current > 0) {
        const magnitude = screenShakeRef.current * 5
        context.translate(
          (Math.random() - 0.5) * magnitude,
          (Math.random() - 0.5) * magnitude,
        )
      }
      drawArena(pressureMultiplier)
      drawAmbientNpcs()
      drawEffects()
      drawEntities()
      context.restore()

      drawCanvasHud(liveEnemyCap, liveThreatLevel)
      drawOverlay()

      animationFrameRef.current = window.requestAnimationFrame(animate)
    }

    drawArena(1)
    drawAmbientNpcs()
    drawEffects()
    drawEntities()
    drawCanvasHud(archetypeConfig.enemy.maxCount, 0)
    drawOverlay()
    animationFrameRef.current = window.requestAnimationFrame(animate)

    return () => {
      cancelled = true
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerdown', handlePointerDown)
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [archetypeConfig, restartCount, speed, theme])

  const handleRestart = () => {
    setScore(0)
    setElapsedTime(0)
    setEnemyCount(0)
    setThreatLevel(0)
    setEliminations(0)
    setHealth(archetypeConfig.player.health)
    setGameOver(false)
    setRestartCount((count) => count + 1)
  }

  return (
    <div className="topdown-survival-game">
      <div className="preview-frame preview-game-frame topdown-stage-frame">
        <canvas
          ref={canvasRef}
          className="topdown-survival-canvas"
          aria-label="Top-down survival game canvas"
        />
      </div>

      <details className="topdown-meta-drawer">
        <summary className="topdown-meta-summary">
          <div>
            <p className="generated-label">Prototype Brief</p>
            <strong>{title}</strong>
          </div>
          <span>
            {difficultyLabel} • {themeLabel} • {assets.length} assets
          </span>
        </summary>

        <section className="generated-brief compact-generated-brief">
          <div className="generated-copy">
            <p className="generated-label">Mission</p>
            <p className="generated-mission">{missionText}</p>
          </div>

          <div className="generated-summary-card">
            <p className="generated-summary-title">Summary</p>
            <dl>
              <div>
                <dt>Objective</dt>
                <dd>{objective}</dd>
              </div>
              <div>
                <dt>Player Build</dt>
                <dd>
                  {archetypeConfig.player.health} hp, {archetypeConfig.player.moveSpeed}px/s, {archetypeConfig.player.shotDamage} shot damage
                </dd>
              </div>
              <div>
                <dt>Enemy Build</dt>
                <dd>
                  {archetypeConfig.enemy.health} hp, {archetypeConfig.enemy.moveSpeed}px/s, {archetypeConfig.enemy.contactDamage} contact damage
                </dd>
              </div>
              <div>
                <dt>NPC Network</dt>
                <dd>
                  {archetypeConfig.npcs.count} nearby, {archetypeConfig.npcs.behaviorLabel.toLowerCase()} and {archetypeConfig.npcs.label.toLowerCase()}
                </dd>
              </div>
              <div>
                <dt>Avatar</dt>
                <dd>{playerAvatar ? playerAvatar.name : 'Default runner'}</dd>
              </div>
            </dl>
          </div>
        </section>

        {assets.length > 0 ? (
          <section className="using-assets compact-using-assets">
            <p className="generated-label">Using Assets</p>
            <div className="asset-chip-list">
              {assets.map((asset) => (
                <span key={asset} className="asset-chip">
                  {asset}
                </span>
              ))}
            </div>
          </section>
        ) : null}
      </details>

      <div className="topdown-hero-hud">
        <div className="topdown-stat-card">
          <span>Survival</span>
          <strong>{elapsedTime.toFixed(1)}s</strong>
          <small>Score {score}</small>
        </div>
        <div className="topdown-stat-card">
          <span>Elims</span>
          <strong>{eliminations}</strong>
          <small>Click to clear hostiles</small>
        </div>
        <div className="topdown-stat-card">
          <span>Health</span>
          <strong>{health}</strong>
          <small>{archetypeConfig.player.shotDamage} dmg shots</small>
        </div>
        <div className="topdown-stat-card">
          <span>Hostiles</span>
          <strong>{enemyCount}</strong>
          <small>{archetypeConfig.enemy.health} hp each</small>
        </div>
        <div className="topdown-stat-card">
          <span>Pressure</span>
          <strong>{getThreatLabel(threatLevel)}</strong>
          <small>{archetypeConfig.enemy.contactDamage} dmg on contact</small>
        </div>
        <div className="topdown-stat-card">
          <span>World</span>
          <strong>{archetypeConfig.npcs.count} NPCs</strong>
          <small>{archetypeConfig.npcs.behaviorLabel}</small>
        </div>
      </div>

      <div className="topdown-stage-note">
        <strong>WASD / Arrow Keys to move</strong>
        <span>Click to shoot hostiles</span>
        <span>NPC mode: {archetypeConfig.npcs.behaviorLabel}</span>
        <span>Speed split: player {Math.round(archetypeConfig.player.moveSpeed)} / enemy {Math.round(archetypeConfig.enemy.moveSpeed)}</span>
      </div>

      <div className="topdown-footer">
        <div className="topdown-footer-copy">
          <p>{objective}</p>
          <span>Checkpoint keeps this survival run live while the broader prototype direction stays open.</span>
        </div>
        <button type="button" onClick={handleRestart}>
          {gameOver ? 'Restart Game' : 'Restart Run'}
        </button>
      </div>
    </div>
  )
}

export default TopdownSurvivalGame
