import {
  getArchetypeLabel,
  getDifficultyId,
  getVisualThemeId,
  type BuilderFormValues,
  type GameArchetype,
  type GeneratedGameState,
} from './gameConfig'
import { getArchetypeRegistryEntry } from './gameArchetypeRegistry'

const stopWords = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'by',
  'for',
  'from',
  'in',
  'into',
  'is',
  'of',
  'on',
  'or',
  'the',
  'to',
  'while',
  'with',
])

type RoutingResult = {
  archetype: GameArchetype
  mode: 'detected' | 'override'
  reason: string
}

function toTitleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

function condenseText(value: string, maxLength: number) {
  const condensed = value.replace(/\s+/g, ' ').trim()

  if (condensed.length <= maxLength) {
    return condensed
  }

  return `${condensed.slice(0, maxLength - 3).trimEnd()}...`
}

function extractKeywords(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word))
}

function deriveGeneratedTitle(
  conceptPrompt: string,
  loreKeywords: string[],
  fallbackLabel: string,
) {
  const conceptKeywords = extractKeywords(conceptPrompt).slice(0, 2).map(toTitleCase)
  const loreTitleKeywords = loreKeywords.slice(0, 2).map(toTitleCase)
  const keywords =
    conceptKeywords.length > 0 ? conceptKeywords : loreTitleKeywords

  if (keywords.length === 0) {
    return `${fallbackLabel} Prototype`
  }

  return `${keywords.join(' ')} Prototype`
}

export function routeIdeaToArchetypeLocally(
  input: Pick<BuilderFormValues, 'conceptPrompt' | 'lore' | 'archetypeOverride'>,
): RoutingResult {
  if (input.archetypeOverride) {
    return {
      archetype: input.archetypeOverride,
      mode: 'override',
      reason: `Manual override selected: ${getArchetypeLabel(input.archetypeOverride)}.`,
    }
  }

  const ideaText = `${input.conceptPrompt} ${input.lore}`.toLowerCase()
  const keywords = extractKeywords(ideaText)
  const scoreMap: Record<GameArchetype, number> = {
    missile_defense: 0,
    topdown_survival: 0,
    physics_flick: 0,
    match3: 0,
  }

  const keywordGroups: Record<GameArchetype, string[]> = {
    missile_defense: [
      'missile',
      'missiles',
      'defense',
      'defend',
      'city',
      'intercept',
      'radar',
      'barrage',
      'falling',
      'sky',
    ],
    topdown_survival: [
      'survive',
      'survival',
      'horde',
      'arena',
      'zombie',
      'swarm',
      'wave',
      'waves',
      'dodge',
      'topdown',
      'top-down',
    ],
    physics_flick: [
      'flick',
      'shot',
      'shots',
      'soccer',
      'basketball',
      'goal',
      'slingshot',
      'toss',
      'projectile',
      'aim',
      'cannon',
      'target',
    ],
    match3: [
      'match',
      'match3',
      'match-3',
      'swap',
      'tile',
      'tiles',
      'puzzle',
      'board',
      'gem',
      'gems',
      'candy',
      'combo',
    ],
  }

  Object.entries(keywordGroups).forEach(([archetype, words]) => {
    words.forEach((word) => {
      if (ideaText.includes(word)) {
        scoreMap[archetype as GameArchetype] += 2
      }
    })
  })

  keywords.forEach((keyword) => {
    if (keyword.includes('surviv')) {
      scoreMap.topdown_survival += 2
    }
    if (keyword.includes('match') || keyword.includes('swap')) {
      scoreMap.match3 += 2
    }
    if (
      keyword.includes('flick') ||
      keyword.includes('shot') ||
      keyword.includes('goal')
    ) {
      scoreMap.physics_flick += 2
    }
    if (
      keyword.includes('missile') ||
      keyword.includes('defen') ||
      keyword.includes('intercept')
    ) {
      scoreMap.missile_defense += 2
    }
  })

  const ordered = (Object.entries(scoreMap) as Array<[GameArchetype, number]>).sort(
    (a, b) => b[1] - a[1],
  )
  const [bestArchetype, bestScore] = ordered[0]

  if (bestScore <= 0) {
    return {
      archetype: 'topdown_survival',
      mode: 'detected',
      reason:
        'No strong genre keywords found, so the idea was mapped to Topdown Survival as the broadest supported action archetype.',
    }
  }

  const matchedKeyword = keywordGroups[bestArchetype].find((word) =>
    ideaText.includes(word),
  )

  return {
    archetype: bestArchetype,
    mode: 'detected',
    reason: matchedKeyword
      ? `Detected ${getArchetypeLabel(bestArchetype)} from idea keywords like "${matchedKeyword}".`
      : `Detected ${getArchetypeLabel(bestArchetype)} from the overall idea description.`,
  }
}

function deriveObjectiveHint(
  input: BuilderFormValues,
  mappedArchetype: GameArchetype,
  loreKeywords: string[],
) {
  const conceptBase = condenseText(input.conceptPrompt, 72)
  const assetClause =
    input.assets.length > 0 ? ` Integrate ${input.assets.length} uploaded assets.` : ''

  switch (mappedArchetype) {
    case 'missile_defense': {
      const threatHint = loreKeywords.find((keyword) =>
        ['missile', 'missiles', 'storm', 'storms', 'attack', 'impact'].includes(
          keyword,
        ),
      )
      const threatText = threatHint ? `${threatHint} strikes` : 'incoming missiles'
      return condenseText(
        `Protect the city from ${threatText} and keep the skyline intact.${assetClause}`,
        110,
      )
    }
    case 'topdown_survival':
      return condenseText(
        `${conceptBase || 'Survive a hostile arena while collecting breathing room.'}${assetClause}`,
        110,
      )
    case 'physics_flick':
      return condenseText(
        `${conceptBase || 'Flick shots to clear targets with controlled rebounds.'}${assetClause}`,
        110,
      )
    case 'match3':
      return condenseText(
        `${conceptBase || 'Chain matches to stabilize the board under pressure.'}${assetClause}`,
        110,
      )
  }
}

export function generateGameConfigLocally(input: BuilderFormValues) {
  const routing = routeIdeaToArchetypeLocally(input)
  const loreKeywords = extractKeywords(input.lore)
  const archetypeLabel = getArchetypeLabel(routing.archetype)
  const registryEntry = getArchetypeRegistryEntry(routing.archetype)

  return registryEntry.defaultConfigGenerator({
    input,
    mappedArchetype: routing.archetype,
    archetypeLabel,
    routingMode: routing.mode,
    routingReason: routing.reason,
    difficultyId: getDifficultyId(input.difficulty),
    visualThemeId: getVisualThemeId(input.visualTheme),
    loreKeywords,
    missionText: condenseText(input.lore, 110),
    title: deriveGeneratedTitle(input.conceptPrompt, loreKeywords, 'Survival'),
    objectiveHint: deriveObjectiveHint(input, routing.archetype, loreKeywords),
    assetNames: input.assets,
    playerAvatar: input.playerAvatar,
  })
}

export function createGeneratedGameState(
  formValues: BuilderFormValues,
): GeneratedGameState {
  return {
    id: Date.now(),
    config: generateGameConfigLocally(formValues),
  }
}
