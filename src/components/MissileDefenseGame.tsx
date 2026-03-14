import { useEffect, useRef, useState, type MouseEvent } from 'react'
import type { MissileDefenseGameConfig, VisualThemeId } from '../lib/gameConfig'
import './MissileDefenseGame.css'

type MissileDefenseGameProps = {
  config: MissileDefenseGameConfig
}

type Missile = {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  radius: number
}

type Explosion = {
  id: number
  x: number
  y: number
  radius: number
  maxRadius: number
  growthRate: number
  shrinking: boolean
}

type ThemePalette = {
  backgroundTop: string
  backgroundBottom: string
  grid: string
  ground: string
  city: string
  cityGlow: string
  missile: string
  missileTrail: string
  explosionCore: string
  explosionRing: string
  text: string
}

const GAME_WIDTH = 720
const GAME_HEIGHT = 405
const GROUND_HEIGHT = 52
const CITY_COUNT = 6

function getThemePalette(visualTheme: VisualThemeId): ThemePalette {
  switch (visualTheme) {
    case 'desert_wastes':
      return {
        backgroundTop: '#35271e',
        backgroundBottom: '#8b5f38',
        grid: 'rgba(255, 228, 170, 0.08)',
        ground: '#402819',
        city: '#f5c781',
        cityGlow: 'rgba(245, 199, 129, 0.2)',
        missile: '#ffe5a8',
        missileTrail: 'rgba(255, 210, 132, 0.35)',
        explosionCore: '#fff1be',
        explosionRing: 'rgba(255, 172, 77, 0.42)',
        text: '#fff5dd',
      }
    case 'deep_space':
      return {
        backgroundTop: '#071421',
        backgroundBottom: '#132b45',
        grid: 'rgba(119, 182, 255, 0.08)',
        ground: '#0d1a2b',
        city: '#85b9ff',
        cityGlow: 'rgba(133, 185, 255, 0.24)',
        missile: '#cfe5ff',
        missileTrail: 'rgba(141, 194, 255, 0.3)',
        explosionCore: '#ffffff',
        explosionRing: 'rgba(95, 208, 255, 0.4)',
        text: '#eef6ff',
      }
    default:
      return {
        backgroundTop: '#150a25',
        backgroundBottom: '#2c1240',
        grid: 'rgba(233, 109, 255, 0.08)',
        ground: '#170d2f',
        city: '#5ce1e6',
        cityGlow: 'rgba(92, 225, 230, 0.2)',
        missile: '#ffe88b',
        missileTrail: 'rgba(255, 168, 89, 0.36)',
        explosionCore: '#fff7cb',
        explosionRing: 'rgba(255, 112, 214, 0.34)',
        text: '#f7f3ff',
      }
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function MissileDefenseGame({ config }: MissileDefenseGameProps) {
  const {
    title,
    objective,
    theme,
    themeLabel,
    difficultyLabel,
    speed,
    assets,
    metadata: { missionText },
    archetypeConfig,
  } = config
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const missilesRef = useRef<Missile[]>([])
  const explosionsRef = useRef<Explosion[]>([])
  const missileIdRef = useRef(0)
  const explosionIdRef = useRef(0)
  const gameOverRef = useRef(false)
  const healthRef = useRef(0)
  const scoreRef = useRef(0)

  const [restartCount, setRestartCount] = useState(0)
  const [score, setScore] = useState(0)
  const [health, setHealth] = useState(archetypeConfig.player.cityHealth)
  const [gameOver, setGameOver] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')

    if (!context) {
      return
    }

    const palette = getThemePalette(theme)
    const groundY = GAME_HEIGHT - GROUND_HEIGHT

    canvas.width = GAME_WIDTH
    canvas.height = GAME_HEIGHT

    missilesRef.current = []
    explosionsRef.current = []
    missileIdRef.current = 0
    explosionIdRef.current = 0
    gameOverRef.current = false
    healthRef.current = archetypeConfig.player.cityHealth
    scoreRef.current = 0

    let cancelled = false
    let lastTimestamp = 0
    let spawnTimer = 0

    const damageCity = () => {
      const nextHealth = Math.max(healthRef.current - 1, 0)
      healthRef.current = nextHealth
      setHealth(nextHealth)

      if (nextHealth <= 0) {
        gameOverRef.current = true
        setGameOver(true)
      }
    }

    const addScore = (points: number) => {
      const nextScore = scoreRef.current + points
      scoreRef.current = nextScore
      setScore(nextScore)
    }

    const spawnMissile = () => {
      const startX = 28 + Math.random() * (GAME_WIDTH - 56)
      const targetX = 50 + Math.random() * (GAME_WIDTH - 100)
      const startY = -18
      const deltaX = targetX - startX
      const deltaY = groundY - startY
      const length = Math.hypot(deltaX, deltaY) || 1
      const missileSpeed =
        archetypeConfig.enemy.missileSpeed * (0.85 + Math.random() * 0.35)

      missilesRef.current.push({
        id: missileIdRef.current++,
        x: startX,
        y: startY,
        vx: (deltaX / length) * missileSpeed,
        vy: (deltaY / length) * missileSpeed,
        radius: 4,
      })
    }

    const updateExplosions = (deltaTime: number) => {
      explosionsRef.current = explosionsRef.current.filter((explosion) => {
        const growthStep = explosion.growthRate * deltaTime

        if (!explosion.shrinking) {
          explosion.radius += growthStep

          if (explosion.radius >= explosion.maxRadius) {
            explosion.radius = explosion.maxRadius
            explosion.shrinking = true
          }
        } else {
          explosion.radius -= growthStep * 0.85
        }

        return explosion.radius > 1
      })
    }

    const updateMissiles = (deltaTime: number) => {
      const nextMissiles: Missile[] = []

      missilesRef.current.forEach((missile) => {
        missile.x += missile.vx * deltaTime
        missile.y += missile.vy * deltaTime

        const intercepted = explosionsRef.current.some((explosion) => {
          const distance = Math.hypot(
            missile.x - explosion.x,
            missile.y - explosion.y,
          )

          return distance <= explosion.radius + missile.radius
        })

        if (intercepted) {
          addScore(10)
          return
        }

        if (missile.y >= groundY) {
          damageCity()
          return
        }

        nextMissiles.push(missile)
      })

      missilesRef.current = nextMissiles
    }

    const drawCities = () => {
      const cityWidth = GAME_WIDTH / CITY_COUNT

      for (let index = 0; index < CITY_COUNT; index += 1) {
        const isAlive = index < healthRef.current
        const baseX = index * cityWidth + 14
        const baseY = groundY + 10

        context.fillStyle = isAlive
          ? palette.cityGlow
          : 'rgba(255, 255, 255, 0.05)'
        context.fillRect(baseX - 8, baseY - 18, cityWidth - 12, 28)

        context.fillStyle = isAlive ? palette.city : 'rgba(255, 255, 255, 0.14)'
        context.fillRect(baseX, baseY, cityWidth - 28, 14)
        context.fillRect(baseX + 8, baseY - 12, 18, 12)
        context.fillRect(baseX + 30, baseY - 20, 16, 20)
      }
    }

    const drawScene = () => {
      context.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

      const background = context.createLinearGradient(0, 0, 0, GAME_HEIGHT)
      background.addColorStop(0, palette.backgroundTop)
      background.addColorStop(1, palette.backgroundBottom)
      context.fillStyle = background
      context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

      context.strokeStyle = palette.grid
      context.lineWidth = 1

      for (let x = 0; x <= GAME_WIDTH; x += 48) {
        context.beginPath()
        context.moveTo(x, 0)
        context.lineTo(x, GAME_HEIGHT)
        context.stroke()
      }

      for (let y = 0; y <= groundY; y += 36) {
        context.beginPath()
        context.moveTo(0, y)
        context.lineTo(GAME_WIDTH, y)
        context.stroke()
      }

      context.fillStyle = palette.ground
      context.fillRect(0, groundY, GAME_WIDTH, GROUND_HEIGHT)
      drawCities()

      missilesRef.current.forEach((missile) => {
        context.strokeStyle = palette.missileTrail
        context.lineWidth = 2
        context.beginPath()
        context.moveTo(missile.x - missile.vx * 0.08, missile.y - missile.vy * 0.08)
        context.lineTo(missile.x, missile.y)
        context.stroke()

        context.fillStyle = palette.missile
        context.beginPath()
        context.arc(missile.x, missile.y, missile.radius, 0, Math.PI * 2)
        context.fill()
      })

      explosionsRef.current.forEach((explosion) => {
        context.fillStyle = palette.explosionRing
        context.beginPath()
        context.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2)
        context.fill()

        context.fillStyle = palette.explosionCore
        context.beginPath()
        context.arc(
          explosion.x,
          explosion.y,
          explosion.radius * 0.42,
          0,
          Math.PI * 2,
        )
        context.fill()
      })

      context.fillStyle = palette.text
      context.font = '600 15px "Avenir Next", "Segoe UI", sans-serif'
      context.fillText('Click to trigger an intercept blast', 18, 28)

      if (gameOverRef.current) {
        context.fillStyle = 'rgba(7, 12, 18, 0.62)'
        context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

        context.fillStyle = palette.text
        context.textAlign = 'center'
        context.font = '700 30px "Avenir Next", "Segoe UI", sans-serif'
        context.fillText('City Lost', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10)
        context.font = '500 16px "Avenir Next", "Segoe UI", sans-serif'
        context.fillText(
          'Restart to stage another defense run.',
          GAME_WIDTH / 2,
          GAME_HEIGHT / 2 + 24,
        )
        context.textAlign = 'start'
      }
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

      if (!gameOverRef.current) {
        spawnTimer += deltaTime

        while (spawnTimer >= archetypeConfig.enemy.spawnInterval) {
          spawnMissile()
          spawnTimer -= archetypeConfig.enemy.spawnInterval
        }

        updateExplosions(deltaTime)
        updateMissiles(deltaTime)
      }

      drawScene()
      animationFrameRef.current = window.requestAnimationFrame(animate)
    }

    drawScene()
    animationFrameRef.current = window.requestAnimationFrame(animate)

    return () => {
      cancelled = true

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [archetypeConfig, theme, restartCount])

  const handleCanvasClick = (event: MouseEvent<HTMLCanvasElement>) => {
    if (gameOverRef.current) {
      return
    }

    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    const rect = canvas.getBoundingClientRect()
    const scaleX = GAME_WIDTH / rect.width
    const scaleY = GAME_HEIGHT / rect.height

    const x = (event.clientX - rect.left) * scaleX
    const y = clamp(
      (event.clientY - rect.top) * scaleY,
      18,
      GAME_HEIGHT - GROUND_HEIGHT - 10,
    )

    explosionsRef.current.push({
      id: explosionIdRef.current++,
      x,
      y,
      radius: 2,
      maxRadius: archetypeConfig.player.explosionRadius,
      growthRate: archetypeConfig.player.explosionGrowth,
      shrinking: false,
    })
  }

  const handleRestart = () => {
    setScore(0)
    setHealth(archetypeConfig.player.cityHealth)
    setGameOver(false)
    setRestartCount((count) => count + 1)
  }

  return (
    <div className="missile-defense-game">
      <section className="generated-brief">
        <div className="generated-copy">
          <p className="generated-label">Generated Build</p>
          <h3>{title}</h3>
          <p className="generated-mission">{missionText}</p>
        </div>

        <div className="generated-summary-card">
          <p className="generated-summary-title">Summary</p>
          <dl>
            <div>
              <dt>Theme</dt>
              <dd>{themeLabel}</dd>
            </div>
            <div>
              <dt>Difficulty</dt>
              <dd>{difficultyLabel}</dd>
            </div>
            <div>
              <dt>Objective</dt>
              <dd>{objective}</dd>
            </div>
          </dl>
        </div>
      </section>

      {assets.length > 0 ? (
        <section className="using-assets">
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

      <div className="missile-defense-hud">
        <div className="hud-chip">
          <span>Score</span>
          <strong>{score}</strong>
        </div>
        <div className="hud-chip">
          <span>City Health</span>
          <strong>{health}</strong>
        </div>
        <div className="hud-chip">
          <span>Difficulty</span>
          <strong>{difficultyLabel}</strong>
        </div>
        <div className="hud-chip">
          <span>Theme</span>
          <strong>{themeLabel}</strong>
        </div>
        <div className="hud-chip">
          <span>Speed</span>
          <strong>{speed.toFixed(1)}x</strong>
        </div>
        <div className="hud-chip">
          <span>Enemy Pace</span>
          <strong>{archetypeConfig.enemy.label}</strong>
        </div>
        <div className="hud-chip">
          <span>Player Pace</span>
          <strong>{archetypeConfig.player.label}</strong>
        </div>
      </div>

      <div className="preview-frame preview-game-frame">
        <canvas
          ref={canvasRef}
          className="missile-defense-canvas"
          onClick={handleCanvasClick}
          aria-label="Missile Defense game canvas"
        />
      </div>

      <div className="missile-defense-footer">
        <p>
          Click inside the sky to detonate intercept explosions before missiles
          reach the city.
        </p>
        <button type="button" onClick={handleRestart}>
          {gameOver ? 'Restart Game' : 'Restart Run'}
        </button>
      </div>
    </div>
  )
}

export default MissileDefenseGame
