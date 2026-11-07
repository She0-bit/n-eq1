
export const EARLY_BIRD_LIMIT = 10
export const EARLY_BIRD_BONUS = 5
export const MATCH_BONUS      = 5

export function basePoints(minutes: number): number {
  if (minutes <= 5)  return 10
  if (minutes <= 15) return 20
  if (minutes <= 30) return 35
  return 50
}

export function minFillSeconds(minutes: number): number {
  return Math.max(60, Math.round(minutes * 60 * 0.5))
}

type Criteria = {
  roles?: string[]
  countries?: string[]
  sex?: string
  min_age?: number | null
  max_age?: number | null
} | null | undefined

type ViewerProfile = {
  role?: string | null
  country?: string | null
  sex?: string | null
  age?: number | null
} | null | undefined

export function matchesTarget(criteria: Criteria, p: ViewerProfile): boolean {
  if (!criteria || !p) return false

  const hasRoles     = (criteria.roles?.length ?? 0) > 0
  const hasCountries = (criteria.countries?.length ?? 0) > 0
  const hasSex       = !!criteria.sex && criteria.sex !== 'any'
  const hasAge       = criteria.min_age != null || criteria.max_age != null

  if (!hasRoles && !hasCountries && !hasSex && !hasAge) return false

  if (hasRoles && !(p.role && criteria.roles!.includes(p.role))) return false
  if (hasCountries && !(p.country && criteria.countries!.includes(p.country))) return false
  if (hasSex && p.sex !== criteria.sex) return false
  if (hasAge) {
    if (p.age == null) return false
    if (criteria.min_age != null && p.age < criteria.min_age) return false
    if (criteria.max_age != null && p.age > criteria.max_age) return false
  }
  return true
}

export function calcPoints({
  minutes,
  fillCount,
  isMatch,
}: {
  minutes: number
  fillCount: number
  isMatch: boolean
}) {
  const base  = basePoints(minutes)
  const early = fillCount < EARLY_BIRD_LIMIT ? EARLY_BIRD_BONUS : 0
  const match = isMatch ? MATCH_BONUS : 0
  return { base, early, match, total: base + early + match }
}
