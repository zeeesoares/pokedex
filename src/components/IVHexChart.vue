<script setup>
import { computed } from 'vue'

const props = defineProps({
  ivs:    { type: Array,  default: () => [31,31,31,31,31,31] },
  title:  { type: String, default: '' },
  empty:  { type: Boolean, default: false },
})

const W = 220, H = 220
const cx = W / 2, cy = H / 2
const R  = 76

const LABELS = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe']
// clockwise from top
const ANGLES = [-90, -30, 30, 90, 150, 210]

function pt(deg, r) {
  const rad = deg * Math.PI / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function polygon(level) {
  return ANGLES.map(a => { const p = pt(a, R * level); return `${p.x.toFixed(1)},${p.y.toFixed(1)}` }).join(' ')
}

const ivPolygon = computed(() =>
  props.ivs.map((v, i) => {
    const p = pt(ANGLES[i], R * Math.max(v, 0) / 31)
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
  }).join(' ')
)

const dots = computed(() =>
  props.ivs.map((v, i) => ({ ...pt(ANGLES[i], R * Math.max(v, 0) / 31), iv: v }))
)

const labelPos = ANGLES.map((a, i) => ({ ...pt(a, R + 20), label: LABELS[i] }))
const axisEnd  = ANGLES.map(a => pt(a, R))

function ivColor(v) {
  if (v === 31) return '#16a34a'
  if (v >= 28)  return '#65a30d'
  if (v >= 21)  return '#ca8a04'
  return '#dc2626'
}
</script>

<template>
  <div class="hex-wrap">
    <p class="hex-title">{{ title || 'Passa o rato num exemplar' }}</p>

    <svg :width="W" :height="H" :viewBox="`0 0 ${W} ${H}`" class="hex-svg">
      <!-- Grid rings -->
      <polygon
        v-for="lvl in [0.25, 0.5, 0.75, 1]" :key="lvl"
        :points="polygon(lvl)"
        fill="none" :stroke="lvl === 1 ? '#d1d5db' : '#e5e7eb'" :stroke-width="lvl === 1 ? 1.5 : 1"
      />
      <!-- Axis lines -->
      <line
        v-for="(end, i) in axisEnd" :key="'ax'+i"
        :x1="cx" :y1="cy" :x2="end.x" :y2="end.y"
        stroke="#e5e7eb" stroke-width="1"
      />
      <!-- IV filled area -->
      <polygon
        v-if="!empty"
        :points="ivPolygon"
        fill="rgba(204,0,0,.12)" stroke="#CC0000" stroke-width="2" stroke-linejoin="round"
      />
      <!-- Dots -->
      <template v-if="!empty">
        <circle
          v-for="(d, i) in dots" :key="'d'+i"
          :cx="d.x" :cy="d.y" r="4.5"
          :fill="ivColor(d.iv)" stroke="#fff" stroke-width="1.5"
        />
      </template>
      <!-- Stat labels -->
      <text
        v-for="lp in labelPos" :key="lp.label"
        :x="lp.x" :y="lp.y"
        text-anchor="middle" dominant-baseline="middle"
        font-size="11" font-weight="800" fill="#6b7280" font-family="Nunito, sans-serif"
      >{{ lp.label }}</text>
    </svg>

    <!-- IV values row -->
    <div v-if="!empty" class="hex-values">
      <div v-for="(v, i) in ivs" :key="i" class="hex-val">
        <span class="hex-stat">{{ LABELS[i] }}</span>
        <span class="hex-num" :style="{ color: ivColor(v) }">{{ v }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hex-wrap {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 14px 12px;
}
.hex-title {
  font-size: 12px; font-weight: 800; color: #374151;
  text-align: center; margin: 0;
  max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.hex-svg { overflow: visible; }
.hex-values {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 4px 8px; width: 100%; padding: 0 4px;
}
.hex-val   { display: flex; align-items: center; justify-content: space-between; gap: 4px; }
.hex-stat  { font-size: 10px; font-weight: 900; color: #9ca3af; text-transform: uppercase; }
.hex-num   { font-size: 13px; font-weight: 900; }
</style>
