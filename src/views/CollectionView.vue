<script setup>
import { ref } from 'vue'
import { usePokeAPI } from '../composables/usePokeAPI.js'
import { useCollectionStore } from '../stores/useCollection.js'
import { useBreeding, STATS, ITEMS } from '../composables/useBreeding.js'
import TypeBadge from '../components/TypeBadge.vue'
import IVGrid from '../components/IVGrid.vue'
import { Pencil, Trash2, Plus, FlaskConical } from '@lucide/vue'

const store    = useCollectionStore()
const { fetchPokemon, fetchPokemonList } = usePokeAPI()
const { findBestPairs } = useBreeding()

const cap = s => s.charAt(0).toUpperCase() + s.slice(1)

const NATURES = [
  'Adamant','Bashful','Bold','Brave','Calm',
  'Careful','Docile','Gentle','Hardy','Hasty',
  'Impish','Jolly','Lax','Lonely','Mild',
  'Modest','Naive','Naughty','Quiet','Quirky',
  'Rash','Relaxed','Sassy','Serious','Timid',
]

const NATURE_EFFECT = {
  Lonely:'+Atk −Def', Brave:'+Atk −Spe', Adamant:'+Atk −SpA', Naughty:'+Atk −SpD',
  Bold:'+Def −Atk',   Relaxed:'+Def −Spe', Impish:'+Def −SpA', Lax:'+Def −SpD',
  Timid:'+Spe −Atk',  Hasty:'+Spe −Def',   Jolly:'+Spe −SpA',  Naive:'+Spe −SpD',
  Modest:'+SpA −Atk', Mild:'+SpA −Def',     Quiet:'+SpA −Spe',  Rash:'+SpA −SpD',
  Calm:'+SpD −Atk',   Gentle:'+SpD −Def',   Sassy:'+SpD −Spe',  Careful:'+SpD −SpA',
}

// ── Add-species search ────────────────────────────────────────
const speciesQuery       = ref('')
const speciesSuggestions = ref([])
const speciesLoading     = ref(false)
const speciesError       = ref('')
let searchTimer = null

async function onSpeciesInput() {
  const q = speciesQuery.value.trim().toLowerCase()
  if (!q) { speciesSuggestions.value = []; return }
  clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    const list = await fetchPokemonList()
    speciesSuggestions.value = list.filter(p => p.name.startsWith(q)).slice(0, 12)
  }, 250)
}

async function addSpecies(name) {
  if (store.hasSpecies(name)) {
    speciesQuery.value = ''; speciesSuggestions.value = []; return
  }
  speciesLoading.value = true; speciesError.value = ''
  try {
    const data = await fetchPokemon(name)
    store.addSpecies({
      name: data.name, displayName: cap(data.name), dexId: data.id,
      sprite: data.sprites.front_default, shinySprite: data.sprites.front_shiny,
      types: data.types.map(t => t.type.name),
    })
    speciesQuery.value = ''; speciesSuggestions.value = []
    expandedSpecies.value = data.name
    openForm(data.name, 'add')
  } catch { speciesError.value = 'Species not found.' }
  finally { speciesLoading.value = false }
}

// ── Species accordion ─────────────────────────────────────────
const expandedSpecies = ref(null)
function toggleSpecies(name) {
  expandedSpecies.value = expandedSpecies.value === name ? null : name
  if (expandedSpecies.value !== name) closeForm()
}

// ── Specimen form ─────────────────────────────────────────────
const formSpecies    = ref(null)
const formMode       = ref(null)   // 'add' | 'edit' | null
const formSpecimenId = ref(null)

const emptyForm = () => ({ gender: 'F', nature: '', ivs: [31,31,31,31,31,31] })
const specimenForm = ref(emptyForm())

function openForm(speciesName, mode, specimen = null) {
  formSpecies.value    = speciesName
  formMode.value       = mode
  formSpecimenId.value = specimen?.id ?? null
  specimenForm.value   = specimen
    ? { gender: specimen.gender, nature: specimen.nature ?? '', ivs: [...specimen.ivs] }
    : emptyForm()
}
function closeForm() { formMode.value = null; formSpecies.value = null; formSpecimenId.value = null }

function submitForm(speciesName) {
  const data = { ...specimenForm.value, ivs: [...specimenForm.value.ivs] }
  if (formMode.value === 'add') store.addSpecimen(speciesName, data)
  else store.updateSpecimen(speciesName, formSpecimenId.value, data)
  closeForm()
}

// ── Helpers ───────────────────────────────────────────────────
function ivClass(v) {
  if (v === 31) return 'iv-31'
  if (v >= 28)  return 'iv-high'
  if (v >= 21)  return 'iv-mid'
  return 'iv-low'
}

const GENDER_ICON = { M: '♂', F: '♀', '-': '⚲' }
const GENDER_OPTIONS = [
  { value: 'F', icon: '♀', cls: 'female'  },
  { value: 'M', icon: '♂', cls: 'male'    },
  { value: '-', icon: '⚲', cls: 'neutral' },
]

// ── Best Pairs ───────────────────────────────────────────────
const pairsTargetMode  = ref('count')
const pairsCount       = ref(5)
const pairsSpec        = ref([31,31,31,31,31,null])
const prioritizeNature = ref(false)
const targetNature     = ref('')
const pairsResult      = ref(null)
const pairsRunning     = ref(false)

function togglePairsSpec(i) {
  const next = [...pairsSpec.value]
  next[i] = next[i] === null ? 31 : null
  pairsSpec.value = next
}

function runBestPairs() {
  if (store.allSpecimens.length < 2) {
    pairsResult.value = { error: 'You need at least 2 specimens in your collection.' }; return
  }
  pairsRunning.value = true; pairsResult.value = null
  const tValue = pairsTargetMode.value === 'count' ? pairsCount.value : pairsSpec.value
  const nat    = prioritizeNature.value ? targetNature.value : ''
  const top    = findBestPairs(store.allSpecimens, pairsTargetMode.value, tValue, prioritizeNature.value, nat)
  pairsResult.value = { pairs: top }
  pairsRunning.value = false
}

const RANK_COLORS = ['#F9A825','#9E9E9E','#795548','#607D8B','#607D8B']
const RANK_LABELS = ['🥇','🥈','🥉','4th','5th']

function probStr(p) {
  if (p >= 1) return '100%'
  return p === 0 ? '<0.01%' : `${(p * 100).toFixed(3)}%`
}
function avgEggs(p) {
  const v = p > 0 ? Math.round(1 / p) : null
  return v ? `~${v.toLocaleString('en-US')} eggs` : '∞'
}

const ITEM_LABEL_MAP = Object.fromEntries(ITEMS.map(i => [i.value, i.label]))
</script>

<template>
  <div class="box-layout">
    <h2 class="view-title">My Box</h2>

    <!-- ── Add Species ────────────────────────────────────── -->
    <div class="card add-species-card">
      <span class="section-title">Add Species to Box</span>
      <div class="species-search-row">
        <input
          v-model="speciesQuery" class="field"
          placeholder="Search a species… (e.g. Ralts, Ditto)"
          autocomplete="off"
          @input="onSpeciesInput"
          @keydown.enter="speciesSuggestions[0] && addSpecies(speciesSuggestions[0].name)"
        />
        <span v-if="speciesLoading" class="loading-spinner">⟳</span>
      </div>
      <p v-if="speciesError" class="form-error">{{ speciesError }}</p>
      <div v-if="speciesSuggestions.length" class="species-suggestions">
        <button
          v-for="s in speciesSuggestions" :key="s.name"
          class="species-chip" :class="{ 'already-added': store.hasSpecies(s.name) }"
          @click="addSpecies(s.name)"
        >{{ cap(s.name) }}<span v-if="store.hasSpecies(s.name)" class="chip-checkmark">✓</span></button>
      </div>
    </div>

    <!-- ── Empty ──────────────────────────────────────────── -->
    <div v-if="!store.box.length" class="card empty-box">
      <span style="font-size:48px">📦</span>
      <p>Your Box is empty. Add a species above to get started!</p>
    </div>

    <!-- ── Species list ───────────────────────────────────── -->
    <div v-for="sp in store.box" :key="sp.name" class="species-card card">

      <button class="species-header" @click="toggleSpecies(sp.name)">
        <div class="species-header-left">
          <img :src="sp.sprite" :alt="sp.displayName" class="species-sprite" />
          <div class="species-meta">
            <span class="species-name">{{ sp.displayName }}</span>
            <span class="species-id">#{{ String(sp.dexId).padStart(4,'0') }}</span>
          </div>
          <div class="species-types">
            <TypeBadge v-for="t in sp.types" :key="t" :type="t" />
          </div>
        </div>
        <div class="species-header-right">
          <span class="specimen-count">{{ sp.specimens.length }} specimen{{ sp.specimens.length !== 1 ? 's' : '' }}</span>
          <span class="chevron" :class="{ open: expandedSpecies === sp.name }">›</span>
        </div>
      </button>

      <Transition name="expand">
        <div v-if="expandedSpecies === sp.name" class="species-body">

          <div v-if="sp.specimens.length" class="specimens-list">
            <div
              v-for="s in sp.specimens" :key="s.id"
              class="specimen-row"
              :class="{ editing: formMode === 'edit' && formSpecimenId === s.id }"
            >
              <!-- Global index -->
              <span class="sp-idx">
                #{{ store.allSpecimens.find(x => x.id === s.id)?.idx ?? '?' }}
              </span>
              <!-- Gender -->
              <span class="sp-gender" :class="s.gender === 'M' ? 'male' : s.gender === 'F' ? 'female' : 'neutral'">
                {{ GENDER_ICON[s.gender] ?? '⚲' }}
              </span>
              <!-- Nature -->
              <span class="sp-nature" :title="NATURE_EFFECT[s.nature] ?? ''">
                {{ s.nature || '—' }}
              </span>
              <!-- IVs -->
              <div class="sp-ivs">
                <span
                  v-for="(stat, i) in STATS" :key="stat"
                  class="sp-iv-cell" :class="ivClass(s.ivs[i])" :title="stat"
                >{{ s.ivs[i] }}</span>
              </div>
              <!-- Actions -->
              <div class="sp-actions">
                <button class="sp-edit"   @click="openForm(sp.name, 'edit', s)" title="Editar">
                  <Pencil :size="14" />
                </button>
                <button class="sp-delete" @click="store.removeSpecimen(sp.name, s.id)" title="Remover">
                  <Trash2 :size="14" />
                </button>
              </div>
            </div>

            <!-- Stat labels -->
            <div class="sp-labels-row">
              <span></span><span></span><span></span>
              <div class="sp-ivs sp-iv-labels">
                <span v-for="stat in STATS" :key="stat">{{ stat }}</span>
              </div>
              <span></span>
            </div>
          </div>
          <p v-else class="no-specimens">No specimens yet.</p>

          <!-- Buttons -->
          <div v-if="!formMode || formSpecies !== sp.name" class="add-btn-wrap">
            <button class="btn btn-ghost btn-sm" @click="openForm(sp.name, 'add')">
              <Plus :size="14" /> Add Specimen
            </button>
            <button class="btn btn-ghost btn-sm remove-species-btn" @click="store.removeSpecies(sp.name)">
              <Trash2 :size="14" /> Remove
            </button>
          </div>

          <!-- Form (add / edit) -->
          <Transition name="fade">
            <div v-if="formMode && formSpecies === sp.name" class="specimen-form card">
              <div class="form-title">{{ formMode === 'add' ? 'New specimen' : 'Edit specimen' }}</div>

              <div class="form-row">
                <!-- Gender -->
                <div class="form-field">
                  <label class="form-label">Gender</label>
                  <div class="gender-toggle">
                    <button
                      v-for="g in GENDER_OPTIONS" :key="g.value"
                      class="gender-btn" :class="[g.cls, { active: specimenForm.gender === g.value }]"
                      @click="specimenForm.gender = g.value"
                    >{{ g.icon }}</button>
                  </div>
                </div>
                <!-- Nature -->
                <div class="form-field">
                  <label class="form-label">Nature</label>
                  <select v-model="specimenForm.nature" class="field">
                    <option value="">— No nature —</option>
                    <option v-for="n in NATURES" :key="n" :value="n">
                      {{ n }}{{ NATURE_EFFECT[n] ? ' (' + NATURE_EFFECT[n] + ')' : '' }}
                    </option>
                  </select>
                </div>
              </div>

              <label class="form-label">IVs</label>
              <IVGrid v-model="specimenForm.ivs" />

              <div class="form-actions">
                <button class="btn btn-red" @click="submitForm(sp.name)">
                  {{ formMode === 'add' ? 'Add' : 'Save' }}
                </button>
                <button class="btn btn-ghost" @click="closeForm">Cancel</button>
              </div>
            </div>
          </Transition>

        </div>
      </Transition>
    </div>

    <!-- ── Best Pairs ─────────────────────────────────────── -->
    <div class="card pairs-card" v-if="store.box.length >= 1">
      <div class="pairs-header">
        <h3 class="section-title" style="font-size:13px">🔬 Best Breeding Combinations</h3>
      </div>

      <!-- Target mode -->
      <div class="mode-row">
        <button class="mode-btn" :class="{ active: pairsTargetMode === 'count' }"    @click="pairsTargetMode = 'count'">Any N IVs</button>
        <button class="mode-btn" :class="{ active: pairsTargetMode === 'specific' }" @click="pairsTargetMode = 'specific'">Specific Stats</button>
      </div>

      <template v-if="pairsTargetMode === 'count'">
        <div class="pairs-target-row">
          <span class="form-label">At least N IVs at 31</span>
          <div class="preset-chips">
            <button
              v-for="n in [3,4,5,6]" :key="n"
              class="chip" :class="{ 'chip-active': pairsCount === n }"
              @click="pairsCount = n"
            >{{ n }} IVs</button>
          </div>
        </div>
      </template>

      <template v-else>
        <p class="mode-desc">Select the stats that must be 31</p>
        <div class="target-grid">
          <div v-for="(stat, i) in STATS" :key="stat" class="target-cell">
            <span class="tv-label">{{ stat }}</span>
            <button
              class="target-toggle" :class="{ active: pairsSpec[i] === 31 }"
              @click="togglePairsSpec(i)"
            >{{ pairsSpec[i] === 31 ? '31' : 'any' }}</button>
          </div>
        </div>
      </template>

      <!-- Nature priority -->
      <div class="nature-section">
        <button
          class="nature-toggle-btn" :class="{ active: prioritizeNature }"
          @click="prioritizeNature = !prioritizeNature"
        >
          🌸 Prioritize Nature
          <span class="nature-toggle-hint">{{ prioritizeNature ? 'ON' : 'OFF' }}</span>
        </button>
        <Transition name="fade">
          <select v-if="prioritizeNature" v-model="targetNature" class="field nature-select">
            <option value="">— Any nature —</option>
            <option v-for="n in NATURES" :key="n" :value="n">
              {{ n }}{{ NATURE_EFFECT[n] ? ' (' + NATURE_EFFECT[n] + ')' : '' }}
            </option>
          </select>
        </Transition>
      </div>

      <button class="btn btn-red btn-block" :disabled="pairsRunning" @click="runBestPairs">
        <FlaskConical :size="15" /> Generate Best Pairs
      </button>

      <Transition name="fade">
        <div v-if="pairsResult" class="pairs-results">
          <p v-if="pairsResult.error" class="form-error">{{ pairsResult.error }}</p>
          <template v-else>
            <div v-for="(pair, idx) in pairsResult.pairs" :key="idx" class="pair-row">
              <div class="pair-rank" :style="{ background: RANK_COLORS[idx] }">{{ RANK_LABELS[idx] }}</div>
              <div class="pair-info">
                <div class="pair-members">
                  <div class="pair-member">
                    <span class="pair-idx-badge">#{{ pair.a.idx }}</span>
                    <span class="pair-member-info">
                      {{ pair.a.speciesDisplayName }}
                      <span :class="pair.a.gender === 'M' ? 'g-male' : pair.a.gender === 'F' ? 'g-female' : ''">{{ GENDER_ICON[pair.a.gender] ?? '' }}</span>
                      <span v-if="pair.a.nature" class="pair-nature">{{ pair.a.nature }}</span>
                    </span>
                  </div>
                  <div class="pair-member">
                    <span class="pair-idx-badge">#{{ pair.b.idx }}</span>
                    <span class="pair-member-info">
                      {{ pair.b.speciesDisplayName }}
                      <span :class="pair.b.gender === 'M' ? 'g-male' : pair.b.gender === 'F' ? 'g-female' : ''">{{ GENDER_ICON[pair.b.gender] ?? '' }}</span>
                      <span v-if="pair.b.nature" class="pair-nature">{{ pair.b.nature }}</span>
                    </span>
                  </div>
                </div>
                <span class="pair-items">
                  {{ ITEM_LABEL_MAP[pair.item1] || 'No item' }} + {{ ITEM_LABEL_MAP[pair.item2] || 'No item' }}
                </span>
                <span class="pair-avg">{{ avgEggs(pair.prob) }}</span>
              </div>
              <span class="pair-prob">{{ probStr(pair.prob) }}</span>
            </div>
            <p v-if="!pairsResult.pairs.length" class="no-specimens">
              No viable combinations. Add more Pokémon, adjust your target, or relax the nature filter.
            </p>
          </template>
        </div>
      </Transition>
    </div>

  </div>
</template>

<style scoped>
.box-layout { display: flex; flex-direction: column; gap: 14px; }

.view-title { font-size: 1.2rem; font-weight: 900; }

/* ── Add species ─────────────────────────────────────────────── */
.add-species-card { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.species-search-row { display: flex; gap: 8px; align-items: center; }
.species-search-row .field { flex: 1; }
.loading-spinner { font-size: 18px; color: var(--muted); animation: spin .8s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }
.form-error { color: #dc2626; font-size: 13px; font-weight: 700; }

.species-suggestions { display: flex; flex-wrap: wrap; gap: 6px; }
.species-chip {
  padding: 6px 14px; border: 1.5px solid var(--border); border-radius: 20px;
  background: var(--surface); font-size: 13px; font-weight: 700;
  cursor: pointer; font-family: var(--font); color: var(--text);
  transition: all .15s; display: flex; align-items: center; gap: 6px;
}
.species-chip:hover { border-color: var(--red); color: var(--red); }
.species-chip.already-added { border-color: var(--iv-31); color: var(--iv-31); opacity: .7; cursor: default; }
.chip-checkmark { font-size: 11px; }

.empty-box {
  padding: 60px 20px; text-align: center; display: flex;
  flex-direction: column; align-items: center; gap: 14px;
  color: var(--muted); font-size: 15px; font-weight: 600;
}

/* ── Species card ────────────────────────────────────────────── */
.species-card { overflow: hidden; }
.species-header {
  width: 100%; display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; background: none; border: none; cursor: pointer;
  font-family: var(--font); transition: background .15s; text-align: left;
}
.species-header:hover { background: #f8f8fa; }
.species-header-left { display: flex; align-items: center; gap: 12px; }
.species-sprite { width: 52px; height: 52px; image-rendering: pixelated; }
.species-meta   { display: flex; flex-direction: column; }
.species-name   { font-size: 15px; font-weight: 900; }
.species-id     { font-size: 12px; color: var(--muted); font-weight: 700; }
.species-types  { display: flex; gap: 4px; flex-wrap: wrap; }
.species-header-right { display: flex; align-items: center; gap: 10px; }
.specimen-count { font-size: 12px; font-weight: 700; color: var(--muted); }
.chevron { font-size: 20px; color: var(--muted); transition: transform .2s; display: inline-block; }
.chevron.open { transform: rotate(90deg); }
.species-body { border-top: 1px solid var(--border); padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }

/* ── Specimen rows ───────────────────────────────────────────── */
.specimens-list { display: flex; flex-direction: column; gap: 4px; }

.specimen-row {
  display: grid;
  grid-template-columns: 28px 20px 56px 1fr 40px;
  align-items: center; gap: 8px;
  padding: 7px 8px; border-radius: var(--radius-sm); background: #f8f9fa; font-size: 13px;
  transition: background .15s;
}
.specimen-row.editing { background: #eff6ff; outline: 2px solid #2980EF; }

.sp-idx {
  font-size: 10px; font-weight: 900;
  background: #e5e7eb; color: #374151;
  border-radius: 4px; padding: 1px 4px;
  text-align: center; white-space: nowrap;
}
.sp-gender { font-size: 14px; font-weight: 900; text-align: center; }
.sp-gender.male    { color: #2980EF; }
.sp-gender.female  { color: #EF4179; }
.sp-gender.neutral { color: var(--muted); }
.sp-nature { font-size: 10px; font-weight: 800; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.sp-ivs { display: grid; grid-template-columns: repeat(6, 1fr); gap: 3px; }
.sp-iv-cell { text-align: center; font-size: 12px; font-weight: 800; padding: 3px 0; border-radius: 4px; background: #f0f0f0; }
.sp-iv-cell.iv-31   { background: #dcfce7; color: var(--iv-31); }
.sp-iv-cell.iv-high { background: #f0fdf4; color: var(--iv-high); }
.sp-iv-cell.iv-mid  { background: #fefce8; color: var(--iv-mid); }
.sp-iv-cell.iv-low  { background: #fef2f2; color: var(--iv-low); }

.sp-actions { display: flex; gap: 2px; align-items: center; justify-content: flex-end; }
.sp-edit, .sp-delete {
  background: none; border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  padding: 4px; border-radius: 4px; transition: background .15s, color .15s;
}
.sp-edit   { color: #9ca3af; }
.sp-edit:hover   { color: #2980EF; background: #eff6ff; }
.sp-delete { color: #d1d5db; }
.sp-delete:hover { color: #dc2626; background: #fef2f2; }

.sp-labels-row { display: grid; grid-template-columns: 28px 20px 56px 1fr 40px; gap: 8px; padding: 0 8px; }
.sp-iv-labels { display: grid; grid-template-columns: repeat(6, 1fr); gap: 3px; }
.sp-iv-labels span { text-align: center; font-size: 9px; font-weight: 900; color: var(--muted); text-transform: uppercase; }

.no-specimens { font-size: 13px; color: var(--muted); font-weight: 600; padding: 6px 0; }
.add-btn-wrap { display: flex; gap: 8px; flex-wrap: wrap; }
.add-btn-wrap .btn { display: flex; align-items: center; gap: 5px; }
.remove-species-btn { color: #dc2626 !important; border-color: #fca5a5 !important; }
.remove-species-btn:hover { background: #fef2f2 !important; }

/* ── Specimen form ───────────────────────────────────────────── */
.specimen-form { padding: 14px; display: flex; flex-direction: column; gap: 12px; border: 1.5px solid var(--border); box-shadow: none; }
.form-title { font-size: 13px; font-weight: 900; }
.form-row { display: grid; grid-template-columns: auto 1fr; gap: 12px; align-items: start; }
@media (max-width: 500px) { .form-row { grid-template-columns: 1fr; } }
.form-field { display: flex; flex-direction: column; gap: 6px; }
.form-label { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .4px; color: var(--muted); }
.form-actions { display: flex; gap: 8px; }

.gender-toggle { display: flex; border: 1.5px solid var(--border); border-radius: 8px; overflow: hidden; }
.gender-btn {
  flex: 1; padding: 10px 12px; font-size: 16px; font-weight: 900; font-family: var(--font);
  background: var(--surface); border: none; cursor: pointer; color: var(--muted); transition: all .15s; line-height: 1;
}
.gender-btn + .gender-btn { border-left: 1.5px solid var(--border); }
.gender-btn.active.female  { background: #fdf2f8; color: #EF4179; }
.gender-btn.active.male    { background: #eff6ff; color: #2980EF; }
.gender-btn.active.neutral { background: #f3f4f6; color: #6b7280; }

/* ── Best pairs ──────────────────────────────────────────────── */
.pairs-card { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.pairs-header { border-bottom: 1px solid var(--border); padding-bottom: 10px; }

.mode-row { display: flex; border: 1.5px solid var(--border); border-radius: 8px; overflow: hidden; }
.mode-btn {
  flex: 1; padding: 9px 12px; font-size: 13px; font-weight: 800; font-family: var(--font);
  background: var(--surface); border: none; cursor: pointer; color: var(--muted); transition: all .15s;
}
.mode-btn + .mode-btn { border-left: 1.5px solid var(--border); }
.mode-btn.active { background: var(--red); color: #fff; }

.mode-desc { font-size: 12px; color: var(--muted); margin: 0; }
.pairs-target-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
.preset-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.chip { padding: 6px 14px; border: 1.5px solid var(--border); border-radius: 20px; background: var(--surface); font-size: 12px; font-weight: 800; cursor: pointer; color: var(--muted); font-family: var(--font); transition: all .15s; }
.chip:hover { border-color: var(--red); color: var(--red); }
.chip.chip-active { border-color: var(--red); background: var(--red); color: #fff; }

.target-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.target-cell { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.tv-label { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: .4px; color: var(--muted); }
.target-toggle { width: 100%; padding: 8px 4px; font-size: 13px; font-weight: 800; border: 2px solid var(--border); border-radius: 6px; background: #f8f9fa; cursor: pointer; color: var(--muted); font-family: var(--font); transition: all .15s; }
.target-toggle.active { background: var(--iv-31); border-color: var(--iv-31); color: #fff; }

.nature-section { display: flex; flex-direction: column; gap: 8px; }
.nature-toggle-btn {
  display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 14px;
  border: 1.5px solid var(--border); border-radius: 8px; background: var(--surface);
  font-size: 13px; font-weight: 800; font-family: var(--font); cursor: pointer;
  color: var(--muted); transition: all .15s; text-align: left;
}
.nature-toggle-btn:hover { border-color: #d97706; color: #d97706; }
.nature-toggle-btn.active { background: #fef3c7; border-color: #d97706; color: #92400e; }
.nature-toggle-hint { font-size: 11px; font-weight: 700; }
.nature-select { width: 100%; }

.pairs-results { display: flex; flex-direction: column; gap: 10px; }
.pair-row {
  display: grid; grid-template-columns: 44px 1fr auto; align-items: center; gap: 12px;
  padding: 12px 14px; border-radius: var(--radius); background: #f8f9fc; border: 1px solid #e8eaf0;
}
.pair-rank { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
.pair-info { display: flex; flex-direction: column; gap: 4px; min-width: 0; }

.pair-members { display: flex; flex-direction: column; gap: 4px; }
.pair-member  { display: flex; align-items: center; gap: 6px; }

.pair-idx-badge {
  font-size: 11px; font-weight: 900;
  background: #e3e3e3; color: #1a1a1a;
  border-radius: 5px; padding: 2px 6px;
  flex-shrink: 0; white-space: nowrap;
}
.pair-member-info { font-size: 13px; font-weight: 800; }
.g-male   { color: #2980EF; }
.g-female { color: #EF4179; }
.pair-nature { font-size: 10px; font-weight: 700; color: #92400e; background: #fef3c7; padding: 1px 5px; border-radius: 4px; margin-left: 2px; }
.pair-items { font-size: 11px; color: var(--muted); font-weight: 700; }
.pair-avg   { font-size: 11px; color: var(--muted); font-weight: 600; }
.pair-prob  { font-size: 1.15rem; font-weight: 900; color: #1D4ED8; white-space: nowrap; }

.expand-enter-active, .expand-leave-active { transition: opacity .2s, transform .2s; }
.expand-enter-from { opacity: 0; transform: translateY(-8px); }
.expand-leave-to   { opacity: 0; }
</style>
