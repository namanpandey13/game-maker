import { useEffect, useRef, useState, type MouseEvent } from 'react'
import type { PhysicsFlickGameConfig, VisualThemeId } from '../lib/gameConfig'
import './PhysicsFlickGame.css'

type PhysicsFlickGameProps = {
  config: PhysicsFlickGameConfig
}

type ProjectileState = {
  active: boolean
  x: number
  y: number
  vx: number
  vy: number
}

type TargetState = {
  x: number
  y: number
  direction: 1 | -1
}

type Palette = {
  backgroundTop: string
  backgroundBottom: string
  grid: string
  launcher: string
  aimLine: string
  projectile: string
  targetOuter: string
  targetInner: string
  hudText: string
  accent: string
  boundary: string
}

const GAME_WIDTH = 720
const GAME_HEIGHT = 405
const FLOOR_Y = GAME_HEIGHT - 34
const LAUNCH_X = 128
const LAUNCH_Y = FLOOR_Y - 8
const GRAVITY = 560

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getPalette(theme: VisualThemeId): Palette {
  switch (theme) {
    case 'desert_wastes':
      return {
        backgroundTop: '#3e2b20',
        backgroundBottom: '#8f5e32',
        grid: 'rgba(255, 229, 176, 0.08)',
        launcher: '#ffd082',
        aimLine: 'rgba(255, 243, 207, 0.5)',
        projectile: '#fff2c4',
        targetOuter: '#8a2418',
        targetInner: '#fff0c5',
        hudText: '#fff6df',
        accent: '#ffe08a',
        boundary: 'rgba(255, 228, 176, 0.22)',
      }
    case 'deep_space':
      return {
        backgroundTop: '#081322',
        backgroundBottom: '#112f4a',
        grid: 'rgba(125, 196, 255, 0.08)',
        launcher: '#7fe0ff',
        aimLine: 'rgba(185, 238, 255, 0.48)',
        projectile: '#effdff',
        targetOuter: '#ff7c92',
        targetInner: '#fef2ff',
        hudText: '#eef7ff',
        accent: '#95e7ff',
        boundary: 'rgba(125, 196, 255, 0.24)',
      }
    default:
      return {
        backgroundTop: '#180a29',
        backgroundBottom: '#30124c',
        grid: 'rgba(235, 110, 255, 0.08)',
        launcher: '#67f2ff',
        aimLine: 'rgba(236, 180, 255, 0.46)',
        projectile: '#fef7ff',
        targetOuter: '#ff7798',
        targetInner: '#fff1cc',
        hudText: '#faf3ff',
        accent: '#ff7edf',
        boundary: 'rgba(103, 242, 255, 0.2)',
      }
  }
}

function PhysicsFlickGame({ config }: PhysicsFlickGameProps) {
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
  const projectileRef = useRef<ProjectileState>({
    active: false,
    x: LAUNCH_X,
    y: LAUNCH_Y,
    vx: 0,
    vy: 0,
  })
  const targetRef = useRef<TargetState>({
    x: GAME_WIDTH - 162,
    y: 118,
    direction: 1,
  })
  const draggingRef = useRef(false)
  const dragPointRef = useRef({ x: LAUNCH_X, y: LAUNCH_Y })
  const scoreRef = useRef(0)
  const attemptsRef = useRef(archetypeConfig.round.attempts)
  const timeRef = useRef(archetypeConfig.round.roundTime)
  const hitLockRef = useRef(false)
  const gameOverRef = useRef(false)

  const [restartCount, setRestartCount] = useState(0)
  const [score, setScore] = useState(0)
  const [attempts, setAttempts] = useState(archetypeConfig.round.attempts)
  const [timeLeft, setTimeLeft] = useState(archetypeConfig.round.roundTime)
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

    const palette = getPalette(theme)
    canvas.width = GAME_WIDTH
    canvas.height = GAME_HEIGHT

    projectileRef.current = {
      active: false,
      x: LAUNCH_X,
      y: LAUNCH_Y,
      vx: 0,
      vy: 0,
    }
    targetRef.current = {
      x: GAME_WIDTH - 162,
      y: 118,
      direction: 1,
    }
    draggingRef.current = false
    dragPointRef.current = { x: LAUNCH_X, y: LAUNCH_Y }
    scoreRef.current = 0
    attemptsRef.current = archetypeConfig.round.attempts
    timeRef.current = archetypeConfig.round.roundTime
    hitLockRef.current = false
    gameOverRef.current = false

    let cancelled = false
    let lastTimestamp = 0

    const resetProjectile = () => {
      projectileRef.current = {
        active: false,
        x: LAUNCH_X,
        y: LAUNCH_Y,
        vx: 0,
        vy: 0,
      }
      hitLockRef.current = false

      if (attemptsRef.current <= 0 || timeRef.current <= 0) {
        gameOverRef.current = true
        setGameOver(true)
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
      for (let x = 24; x <= GAME_WIDTH - 24; x += 48) {
        context.beginPath()
        context.moveTo(x, 24)
        context.lineTo(x, GAME_HEIGHT - 24)
        context.stroke()
      }
      for (let y = 24; y <= GAME_HEIGHT - 24; y += 48) {
        context.beginPath()
        context.moveTo(24, y)
        context.lineTo(GAME_WIDTH - 24, y)
        context.stroke()
      }

      context.strokeStyle = palette.boundary
      context.lineWidth = 2
      context.strokeRect(24, 24, GAME_WIDTH - 48, GAME_HEIGHT - 48)

      context.fillStyle = palette.launcher
      context.beginPath()
      context.arc(LAUNCH_X, LAUNCH_Y, 18, 0, Math.PI * 2)
      context.fill()

      context.fillStyle = 'rgba(255,255,255,0.18)'
      context.fillRect(56, FLOOR_Y, 120, 8)

      if (draggingRef.current && !projectileRef.current.active) {
        context.strokeStyle = palette.aimLine
        context.lineWidth = 3
        context.beginPath()
        context.moveTo(LAUNCH_X, LAUNCH_Y)
        context.lineTo(dragPointRef.current.x, dragPointRef.current.y)
        context.stroke()
      }

      const target = targetRef.current
      context.fillStyle = palette.targetOuter
      context.beginPath()
      context.arc(target.x, target.y, archetypeConfig.target.radius, 0, Math.PI * 2)
      context.fill()

      context.fillStyle = palette.targetInner
      context.beginPath()
      context.arc(target.x, target.y, archetypeConfig.target.radius * 0.46, 0, Math.PI * 2)
      context.fill()

      const projectile = projectileRef.current
      context.fillStyle = palette.projectile
      context.beginPath()
      context.arc(
        projectile.x,
        projectile.y,
        archetypeConfig.projectile.radius,
        0,
        Math.PI * 2,
      )
      context.fill()

      context.fillStyle = palette.hudText
      context.font = '600 15px "Avenir Next", "Segoe UI", sans-serif'
      context.fillText('Click-drag-release to flick a shot', 18, 28)

      if (gameOverRef.current) {
        context.fillStyle = 'rgba(7, 12, 18, 0.62)'
        context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
        context.fillStyle = palette.hudText
        context.textAlign = 'center'
        context.font = '700 30px "Avenir Next", "Segoe UI", sans-serif'
        context.fillText('Round Complete', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10)
        context.font = '500 16px "Avenir Next", "Segoe UI", sans-serif'
        context.fillText(
          'Restart to take another set of shots.',
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
        timeRef.current = Math.max(0, timeRef.current - deltaTime)
        setTimeLeft(timeRef.current)

        const target = targetRef.current
        target.x += target.direction * archetypeConfig.target.moveSpeed * deltaTime
        const minX = GAME_WIDTH * 0.52
        const maxX = GAME_WIDTH - 72
        if (target.x <= minX || target.x >= maxX) {
          target.direction *= -1
          target.x = clamp(target.x, minX, maxX)
        }

        const projectile = projectileRef.current
        if (projectile.active) {
          projectile.x += projectile.vx * deltaTime
          projectile.y += projectile.vy * deltaTime
          projectile.vy += GRAVITY * deltaTime

          const distanceToTarget = Math.hypot(
            projectile.x - target.x,
            projectile.y - target.y,
          )

          if (
            !hitLockRef.current &&
            distanceToTarget <=
              archetypeConfig.target.radius + archetypeConfig.projectile.radius
          ) {
            hitLockRef.current = true
            scoreRef.current += archetypeConfig.target.pointsPerHit
            setScore(scoreRef.current)
            attemptsRef.current = Math.max(0, attemptsRef.current - 1)
            setAttempts(attemptsRef.current)
            resetProjectile()
          } else if (
            projectile.x < -40 ||
            projectile.x > GAME_WIDTH + 40 ||
            projectile.y > GAME_HEIGHT + 40 ||
            projectile.y < -60
          ) {
            attemptsRef.current = Math.max(0, attemptsRef.current - 1)
            setAttempts(attemptsRef.current)
            resetProjectile()
          }
        }

        if (timeRef.current <= 0 && !projectile.active) {
          gameOverRef.current = true
          setGameOver(true)
        }
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

  const getCanvasPoint = (event: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) {
      return null
    }

    const rect = canvas.getBoundingClientRect()
    const scaleX = GAME_WIDTH / rect.width
    const scaleY = GAME_HEIGHT / rect.height
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    }
  }

  const handlePointerDown = (event: MouseEvent<HTMLCanvasElement>) => {
    if (gameOverRef.current || projectileRef.current.active || attemptsRef.current <= 0) {
      return
    }

    const point = getCanvasPoint(event)
    if (!point) {
      return
    }

    const distanceToLauncher = Math.hypot(point.x - LAUNCH_X, point.y - LAUNCH_Y)
    if (distanceToLauncher > 40) {
      return
    }

    draggingRef.current = true
    dragPointRef.current = point
  }

  const handlePointerMove = (event: MouseEvent<HTMLCanvasElement>) => {
    if (!draggingRef.current) {
      return
    }

    const point = getCanvasPoint(event)
    if (!point) {
      return
    }

    dragPointRef.current = {
      x: clamp(point.x, LAUNCH_X - 90, LAUNCH_X + 60),
      y: clamp(point.y, LAUNCH_Y - 110, LAUNCH_Y + 60),
    }
  }

  const handlePointerUp = () => {
    if (!draggingRef.current || gameOverRef.current || projectileRef.current.active) {
      draggingRef.current = false
      return
    }

    const dx = LAUNCH_X - dragPointRef.current.x
    const dy = LAUNCH_Y - dragPointRef.current.y
    const dragDistance = Math.hypot(dx, dy)

    draggingRef.current = false

    if (dragDistance < 12) {
      return
    }

    const launchForce = dragDistance * archetypeConfig.projectile.dragScale

    projectileRef.current = {
      active: true,
      x: LAUNCH_X,
      y: LAUNCH_Y,
      vx: (dx / dragDistance) * launchForce * archetypeConfig.projectile.speedMultiplier,
      vy:
        (dy / dragDistance) * launchForce * archetypeConfig.projectile.speedMultiplier -
        120,
    }
  }

  const handleRestart = () => {
    setScore(0)
    setAttempts(archetypeConfig.round.attempts)
    setTimeLeft(archetypeConfig.round.roundTime)
    setGameOver(false)
    setRestartCount((count) => count + 1)
  }

  return (
    <div className="physics-flick-game">
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

      <div className="physics-flick-hud">
        <div className="hud-chip">
          <span>Title</span>
          <strong>{title}</strong>
        </div>
        <div className="hud-chip">
          <span>Score</span>
          <strong>{score}</strong>
        </div>
        <div className="hud-chip">
          <span>Attempts</span>
          <strong>{attempts}</strong>
        </div>
        <div className="hud-chip">
          <span>Timer</span>
          <strong>{timeLeft.toFixed(1)}s</strong>
        </div>
        <div className="hud-chip">
          <span>Projectile</span>
          <strong>{archetypeConfig.projectile.label}</strong>
        </div>
        <div className="hud-chip">
          <span>Target</span>
          <strong>{archetypeConfig.target.label}</strong>
        </div>
        <div className="hud-chip">
          <span>Speed</span>
          <strong>{speed.toFixed(1)}x</strong>
        </div>
      </div>

      <div className="preview-frame preview-game-frame">
        <canvas
          ref={canvasRef}
          className="physics-flick-canvas"
          aria-label="Physics Flick game canvas"
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
        />
      </div>

      <div className="physics-flick-footer">
        <p>{objective}</p>
        <button type="button" onClick={handleRestart}>
          {gameOver ? 'Restart Game' : 'Restart Round'}
        </button>
      </div>
    </div>
  )
}

export default PhysicsFlickGame
