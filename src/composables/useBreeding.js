export const STATS = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe']

export const POWER_STAT = {
  power_hp: 0, power_atk: 1, power_def: 2,
  power_spa: 3, power_spd: 4, power_spe: 5,
}

export const ITEMS = [
  { value: '',             label: 'No item' },
  { value: 'destiny_knot', label: 'Destiny Knot' },
  { value: 'everstone',    label: 'Everstone' },
  { value: 'power_hp',     label: 'Power Weight (HP)' },
  { value: 'power_atk',    label: 'Power Bracer (Atk)' },
  { value: 'power_def',    label: 'Power Belt (Def)' },
  { value: 'power_spa',    label: 'Power Lens (SpA)' },
  { value: 'power_spd',    label: 'Power Band (SpD)' },
  { value: 'power_spe',    label: 'Power Anklet (Spe)' },
]

// ── Shared helpers ────────────────────────────────────────────────────────────

function subsets(arr, k) {
  if (k <= 0)           return [[]]
  if (k > arr.length)   return []
  if (k === arr.length) return [arr.slice()]
  const result = [], cur = []
  ;(function bt(start) {
    if (cur.length === k) { result.push(cur.slice()); return }
    for (let i = start; i < arr.length; i++) { cur.push(arr[i]); bt(i + 1); cur.pop() }
  })(0)
  return result
}

function buildInheritance(item1, item2) {
  const hasDK = item1 === 'destiny_knot' || item2 === 'destiny_knot'
  const pw1   = POWER_STAT[item1] ?? -1
  const pw2   = POWER_STAT[item2] ?? -1
  const nInh  = hasDK ? 5 : 3
  const locked = new Map()                         // slot → src (0=p1, 1=p2, -1=conflict)
  if (pw1 >= 0) locked.set(pw1, 0)
  if (pw2 >= 0) { if (locked.has(pw2)) locked.set(pw2, -1); else locked.set(pw2, 1) }
  const free     = [0,1,2,3,4,5].filter(i => !locked.has(i))
  const nFreeInh = Math.max(0, Math.min(nInh - locked.size, free.length))
  return { locked, free, nFreeInh }
}

// ── Mode 1: specific target  (P that exact listed stats = listed values) ──────
// target[i] = 31 | null (null = "don't care")

function exactProbSpecific(p1, p2, target, item1, item2) {
  const { locked, free, nFreeInh } = buildInheritance(item1, item2)

  function pm(i, src) {
    const t = target[i]
    if (t === null) return 1
    if (src === 'rnd') return 1 / 32
    if (src === -1) return 0.5 * (p1[i] === t ? 1 : 0) + 0.5 * (p2[i] === t ? 1 : 0)
    return (src === 0 ? p1 : p2)[i] === t ? 1 : 0
  }

  let pLocked = 1
  for (const [i, src] of locked) {
    pLocked *= pm(i, src)
    if (pLocked === 0) return 0
  }

  const ss = subsets(free, nFreeInh)
  if (!ss.length) return pLocked

  let total = 0
  const pEach = 1 / ss.length
  for (const inherited of ss) {
    const iSet = new Set(inherited)
    let p = pEach * pLocked
    for (const i of free) p *= pm(i, iSet.has(i) ? -1 : 'rnd')
    total += p
  }
  return total
}

// ── Mode 2: count target  (P that AT LEAST n of the 6 IVs = 31) ──────────────
// This is the correct interpretation of "5IV offspring":
//   any 5 stats perfect, regardless of which one isn't.
// With 6x31 parents + DK: always inherits 5 IVs (all 31) → guaranteed ≥ 5IV → 100%.

function exactProbAtLeast(p1, p2, n, item1, item2) {
  if (n <= 0) return 1
  if (n > 6)  return 0
  const { locked, free, nFreeInh } = buildInheritance(item1, item2)

  // P(stat i = 31) given source
  function p31(i, src) {
    if (src === -1) return 0.5 * (p1[i] === 31 ? 1 : 0) + 0.5 * (p2[i] === 31 ? 1 : 0)
    return (src === 0 ? p1 : p2)[i] === 31 ? 1 : 0
  }

  // P(at least minK of probs[] events succeed) via DP — O(6²) = trivial
  function pAtLeast(probs, minK) {
    const dp = new Array(probs.length + 1).fill(0)
    dp[0] = 1
    for (let j = 0; j < probs.length; j++) {
      const p = probs[j]
      for (let k = j + 1; k >= 1; k--) dp[k] = dp[k] * (1 - p) + dp[k - 1] * p
      dp[0] *= (1 - p)
    }
    let sum = 0
    for (let k = minK; k <= probs.length; k++) sum += dp[k]
    return sum
  }

  const ss = subsets(free, nFreeInh)
  const pEach = 1 / ss.length

  let total = 0
  for (const inherited of ss) {
    const iSet = new Set(inherited)
    const perStat = [0, 1, 2, 3, 4, 5].map(i => {
      if (locked.has(i)) return p31(i, locked.get(i))
      if (iSet.has(i))   return p31(i, -1)
      return 1 / 32
    })
    total += pEach * pAtLeast(perStat, n)
  }
  return total
}

// ── Public composable ─────────────────────────────────────────────────────────
export function useBreeding() {

  // "These exact stats must be 31"
  function calcProbability(p1, p2, target, item1, item2) {
    return exactProbSpecific(p1, p2, target, item1, item2)
  }

  // "At least n of the 6 IVs = 31, any combination"
  function calcProbabilityAtLeast(p1, p2, n, item1, item2) {
    return exactProbAtLeast(p1, p2, n, item1, item2)
  }

  // targetMode: 'count' (at least n perfect IVs) | 'specific' (exact stat array)
  // targetValue: number for count, array for specific
  // prioritizeNature: force Everstone on the nature-holder; Power Items never used
  // targetNature: when set, only pairs where ≥1 parent has this nature are included
  function findBestPairs(specimens, targetMode, targetValue, prioritizeNature = false, targetNature = '', topN = 5) {
    function calcP(ivs1, ivs2, i1, i2) {
      return targetMode === 'count'
        ? exactProbAtLeast(ivs1, ivs2, targetValue, i1, i2)
        : exactProbSpecific(ivs1, ivs2, targetValue, i1, i2)
    }

    const pairs = []
    for (let i = 0; i < specimens.length; i++) {
      for (let j = i + 1; j < specimens.length; j++) {
        const a = specimens[i], b = specimens[j]

        const aHas = !targetNature || a.nature === targetNature
        const bHas = !targetNature || b.nature === targetNature

        // With a target nature, skip pairs where neither parent has it
        if (prioritizeNature && targetNature && !aHas && !bHas) continue

        // Items are never stored on specimens — algorithm always picks from scratch
        let configs
        if (!prioritizeNature) {
          configs = [['', ''], ['destiny_knot', ''], ['', 'destiny_knot']]
        } else {
          configs = []
          if (aHas) configs.push(['everstone', ''], ['everstone', 'destiny_knot'])
          if (bHas) configs.push(['', 'everstone'], ['destiny_knot', 'everstone'])
          if (!configs.length) configs = [['everstone', ''], ['', 'everstone']]
        }

        let best = { prob: -1, item1: '', item2: '' }
        for (const [i1, i2] of configs) {
          const p = calcP(a.ivs, b.ivs, i1, i2)
          if (p > best.prob) best = { prob: p, item1: i1, item2: i2 }
        }
        pairs.push({ a, b, ...best })
      }
    }
    pairs.sort((x, y) => y.prob - x.prob)
    return pairs.slice(0, topN)
  }

  function tip(mode, value, item1, item2) {
    const hasDK = item1 === 'destiny_knot' || item2 === 'destiny_knot'
    if (mode === 'count') {
      const n = value
      if (n === 0) return 'Select at least 1 target IV.'
      if (n >= 5 && !hasDK)
        return 'Equip Destiny Knot on one parent — with DK, 5 IVs are inherited per egg, essential for 5IV or 6IV.'
      if (n === 5 && hasDK)
        return 'With Destiny Knot and 6x31 parents: always inherits 5 perfect IVs → 100% chance of 5IV or better!'
      if (n === 6 && hasDK)
        return 'With DK and 6x31 parents: the 5 inherited are always 31, the 6th is random (1/32) → ~3.1% for 6IV per egg.'
      if (hasDK)
        return 'Good setup! Improve the parents\' IVs to increase the odds.'
      return 'Consider using Destiny Knot to inherit 5 IVs instead of 3.'
    } else {
      const target = value
      const n = target.filter(t => t !== null).length
      if (n === 0) return 'Select at least 1 target stat.'
      if (n >= 5 && !hasDK)
        return 'Equip Destiny Knot — essential for 5–6 IVs on specific stats.'
      if (n === 6 && hasDK)
        return 'With DK: 5 IVs are inherited, the 6th is random (1/32) → max ~3.1% for these 6 specific stats.'
      if (hasDK)
        return 'Great setup with Destiny Knot! Improve parents\' IVs to increase the odds.'
      return 'Consider using Destiny Knot to inherit 5 IVs instead of 3.'
    }
  }

  return { calcProbability, calcProbabilityAtLeast, findBestPairs, tip }
}
