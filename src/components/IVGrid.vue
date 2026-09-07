<script setup>
import { STATS } from '../composables/useBreeding.js'

const props = defineProps({
  modelValue: { type: Array, default: () => [31, 31, 31, 31, 31, 31] },
  readonly: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

function ivClass(v) {
  if (v === 31)  return 'iv-31'
  if (v >= 28)   return 'iv-high'
  if (v >= 21)   return 'iv-mid'
  return 'iv-low'
}

function update(i, e) {
  const v = Math.min(31, Math.max(0, parseInt(e.target.value) || 0))
  const next = [...props.modelValue]; next[i] = v
  emit('update:modelValue', next)
}

function setMax(i) {
  const next = [...props.modelValue]; next[i] = 31
  emit('update:modelValue', next)
}
</script>

<template>
  <div class="iv-grid">
    <div v-for="(stat, i) in STATS" :key="stat" class="iv-cell">
      <span class="iv-label">{{ stat }}</span>

      <!-- Read-only badge (inside collection specimen rows) -->
      <span v-if="readonly" class="iv-badge" :class="ivClass(modelValue[i])">
        {{ modelValue[i] }}
      </span>

      <!-- Editable input -->
      <template v-else>
        <input
          type="number" min="0" max="31"
          :value="modelValue[i]"
          class="iv-input field"
          :class="ivClass(modelValue[i])"
          @input="update(i, $event)"
        />
        <button class="iv-max btn btn-sm" :class="`iv-max-${ivClass(modelValue[i])}`" @click="setMax(i)">31</button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.iv-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.iv-cell {
  display: flex; flex-direction: column; align-items: center; gap: 3px;
}
.iv-label {
  font-size: 10px; font-weight: 900; text-transform: uppercase;
  letter-spacing: .4px; color: var(--muted);
}
.iv-input {
  width: 100%; text-align: center;
  padding: 6px 4px; font-size: 15px; font-weight: 800;
  border-width: 2px;
}
.iv-max {
  width: 100%; font-size: 10px; font-weight: 900;
  padding: 3px 0; border: none; border-radius: 4px;
  background: #f0f0f0; cursor: pointer;
}
.iv-max-iv-31   { background: #dcfce7; color: var(--iv-31); }
.iv-max-iv-high { background: #f0fdf4; color: var(--iv-high); }
.iv-max-iv-mid  { background: #fefce8; color: var(--iv-mid); }
.iv-max-iv-low  { background: #fef2f2; color: var(--iv-low); }

/* Read-only badge */
.iv-badge {
  padding: 4px 6px; border-radius: 6px; font-size: 13px; font-weight: 800;
  background: #f5f6fa;
}
</style>
