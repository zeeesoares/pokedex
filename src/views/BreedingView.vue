<script setup>
import { ref, reactive } from 'vue'
import IVGrid from '../components/IVGrid.vue'
import { useBreeding, STATS, ITEMS } from '../composables/useBreeding.js'

const { calcProbability, calcProbabilityAtLeast, tip } = useBreeding()

const p1 = reactive({ ivs: [31,31,31,31,31,31], item: '' })
const p2 = reactive({ ivs: [31,31,31,31,31,31], item: '' })

// Mode A: "at least N perfect IVs, any combination" — default
// Mode B: "these specific stats must be 31" — for competitive breeding
const targetMode  = ref('count')
const targetCount = ref(5)
const targetSpec  = ref([31,31,31,31,31,null])

const result = ref(null)

function setMode(mode) {
  targetMode.value = mode
  result.value = null
}

function setCount(n) {
  targetMode.value = 'count'
  targetCount.value = n
  result.value = null
}

function toggleSpec(i) {
  const next = [...targetSpec.value]
  next[i] = next[i] === null ? 31 : null
  targetSpec.value = next
  result.value = null
}

function calculate() {
  let prob
  if (targetMode.value === 'count') {
    prob = calcProbabilityAtLeast(p1.ivs, p2.ivs, targetCount.value, p1.item, p2.item)
  } else {
    prob = calcProbability(p1.ivs, p2.ivs, targetSpec.value, p1.item, p2.item)
  }

  const avg = prob > 0 ? Math.round(1 / prob) : Infinity
  result.value = {
    prob,
    probPct: prob >= 1 ? '100%' : `${(prob * 100).toFixed(3)}%`,
    avg: avg === Infinity ? '∞' : avg.toLocaleString('en-US'),
    tip: tip(targetMode.value, targetMode.value === 'count' ? targetCount.value : targetSpec.value, p1.item, p2.item),
  }
}
</script>

<template>
  <div class="breed-layout">

    <h2 class="view-title">Breeding 1v1</h2>

    <!-- ── Parents ────────────────────────────────────────── -->
    <div class="parents-wrap">

      <div class="parent-card card">
        <span class="section-title">Parent 1</span>
        <select v-model="p1.item" class="field">
          <option v-for="item in ITEMS" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
        <IVGrid v-model="p1.ivs" />
      </div>

      <div class="vs-badge">VS</div>

      <div class="parent-card card">
        <span class="section-title">Parent 2</span>
        <select v-model="p2.item" class="field">
          <option v-for="item in ITEMS" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
        <IVGrid v-model="p2.ivs" />
      </div>
    </div>

    <!-- ── Target ─────────────────────────────────────────── -->
    <div class="card target-card">

      <!-- Mode switcher -->
      <div class="mode-row">
        <button
          class="mode-btn"
          :class="{ active: targetMode === 'count' }"
          @click="setMode('count')"
        >Any N IVs</button>
        <button
          class="mode-btn"
          :class="{ active: targetMode === 'specific' }"
          @click="setMode('specific')"
        >Specific Stats</button>
      </div>

      <!-- Count mode -->
      <template v-if="targetMode === 'count'">
        <p class="mode-desc">Probability of getting at least <strong>{{ targetCount }} IVs at 31</strong>, regardless of which ones.</p>
        <div class="preset-chips">
          <button
            v-for="n in [3, 4, 5, 6]"
            :key="n"
            class="chip"
            :class="{ 'chip-active': targetCount === n }"
            @click="setCount(n)"
          >{{ n }} IVs</button>
        </div>
      </template>

      <!-- Specific mode -->
      <template v-else>
        <p class="mode-desc">Probability of getting exactly <strong>these stats at 31</strong> (useful for competitive breeding).</p>
        <div class="target-grid">
          <div v-for="(stat, i) in STATS" :key="stat" class="target-cell">
            <span class="tv-label">{{ stat }}</span>
            <button
              class="target-toggle"
              :class="{ active: targetSpec[i] === 31 }"
              @click="toggleSpec(i)"
            >{{ targetSpec[i] === 31 ? '31' : 'any' }}</button>
          </div>
        </div>
      </template>

    </div>

    <!-- ── Calculate ─────────────────────────────────────── -->
    <button class="btn btn-red btn-block" @click="calculate">
      🧮 Calculate Probability
    </button>

    <!-- ── Result ────────────────────────────────────────── -->
    <Transition name="fade">
      <div v-if="result" class="results-wrap">
        <div class="result-tile tile-blue">
          <span class="tile-label">Probability per egg</span>
          <span class="tile-big">{{ result.probPct }}</span>
        </div>
        <div class="result-tile tile-green">
          <span class="tile-label">Average eggs</span>
          <span class="tile-big">{{ result.avg }}</span>
        </div>
        <div class="result-tile tile-yellow full">
          <span class="tile-label">💡 Tip</span>
          <span class="tile-tip">{{ result.tip }}</span>
        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
.breed-layout { display: flex; flex-direction: column; gap: 16px; }
.view-title { font-size: 1.2rem; font-weight: 900; }

/* Parents */
.parents-wrap {
  display: grid; grid-template-columns: 1fr auto 1fr;
  gap: 12px; align-items: start;
}
@media (max-width: 600px) {
  .parents-wrap { grid-template-columns: 1fr; }
  .vs-badge { display: none; }
}

.parent-card { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.vs-badge {
  align-self: center; padding-top: 40px;
  font-size: 18px; font-weight: 900; color: var(--muted);
}

/* Target */
.target-card { padding: 16px; display: flex; flex-direction: column; gap: 14px; }

.mode-row { display: flex; gap: 0; border: 1.5px solid var(--border); border-radius: 8px; overflow: hidden; }
.mode-btn {
  flex: 1; padding: 9px 12px;
  font-size: 13px; font-weight: 800; font-family: var(--font);
  background: var(--surface); border: none; cursor: pointer;
  color: var(--muted); transition: all .15s;
}
.mode-btn + .mode-btn { border-left: 1.5px solid var(--border); }
.mode-btn.active { background: var(--red); color: #fff; }

.mode-desc { font-size: 13px; color: var(--muted); margin: 0; }

.preset-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.chip {
  padding: 8px 20px; border: 2px solid var(--border);
  border-radius: 20px; background: var(--surface);
  font-size: 13px; font-weight: 800; cursor: pointer; color: var(--muted);
  font-family: var(--font); transition: all .15s;
}
.chip:hover { border-color: var(--red); color: var(--red); }
.chip.chip-active { border-color: var(--red); background: var(--red); color: #fff; }

.target-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
}
.target-cell { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.tv-label {
  font-size: 10px; font-weight: 900; text-transform: uppercase;
  letter-spacing: .4px; color: var(--muted);
}
.target-toggle {
  width: 100%; padding: 8px 4px;
  font-size: 13px; font-weight: 800; font-family: var(--font);
  border: 2px solid var(--border); border-radius: 6px;
  background: #f8f9fa; cursor: pointer; color: var(--muted);
  transition: all .15s;
}
.target-toggle.active { background: var(--iv-31); border-color: var(--iv-31); color: #fff; }

/* Results */
.results-wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.full { grid-column: 1 / -1; }

.result-tile {
  border-radius: var(--radius); padding: 18px;
  display: flex; flex-direction: column; gap: 6px;
}
.tile-blue   { background: #EFF6FF; }
.tile-green  { background: #F0FDF4; }
.tile-yellow { background: #FFFDE7; }

.tile-label { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); }
.tile-big   { font-size: 2rem; font-weight: 900; }
.tile-blue  .tile-big { color: #1D4ED8; }
.tile-green .tile-big { color: #15803D; }
.tile-tip   { font-size: 14px; font-weight: 600; color: #555; line-height: 1.5; }
</style>
