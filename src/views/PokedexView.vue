<script setup>
import { ref, computed } from 'vue'
import { usePokeAPI } from '../composables/usePokeAPI.js'
import TypeBadge from '../components/TypeBadge.vue'

const { fetchPokemon, fetchPokemonList, fetchURL } = usePokeAPI()

const query           = ref('')
const suggestions     = ref([])
const pokemon         = ref(null)
const loading         = ref(false)
const error           = ref('')
const shiny           = ref(false)
const evolutionStages = ref([])
const varieties       = ref([])
const speciesName     = ref('')
const currentVariety  = ref('')

let debounceTimer = null
let abortCtrl = null

// ── Color maps ────────────────────────────────────────────────
const TYPE_COLORS = {
  normal:'#9FA19F', fire:'#E62829',   water:'#2980EF',  electric:'#FAC000',
  grass:'#3FA129',  ice:'#3DCEF3',    fighting:'#FF8000',poison:'#9141CB',
  ground:'#915121', flying:'#81B9EF', psychic:'#EF4179', bug:'#91A119',
  rock:'#AFA981',   ghost:'#704170',  dragon:'#5060E1',  dark:'#624D4E',
  steel:'#60A1B8',  fairy:'#EF70EF',
}
const STAT_LABEL = {
  hp:'HP', attack:'ATK', defense:'DEF',
  'special-attack':'SpA', 'special-defense':'SpD', speed:'SPE',
}
const STAT_COLOR = {
  hp:'#FF5959', attack:'#F5AC78', defense:'#FAE078',
  'special-attack':'#9DB7F5', 'special-defense':'#A7DB8D', speed:'#FA92B2',
}

const cap = s => s.charAt(0).toUpperCase() + s.slice(1)

// ── Type gradient (header bg) ─────────────────────────────────
const typeGradient = computed(() => {
  if (!pokemon.value) return 'linear-gradient(160deg,#f0f0f0,#e0e0e0)'
  const t = pokemon.value.types.map(t => TYPE_COLORS[t.type.name] || '#9FA19F')
  return t.length === 1
    ? `linear-gradient(160deg,${t[0]}22,${t[0]}44)`
    : `linear-gradient(160deg,${t[0]}44,${t[1]}44)`
})

const sprite = computed(() =>
  shiny.value ? pokemon.value?.sprites.front_shiny : pokemon.value?.sprites.front_default
)

// ── Variety label ─────────────────────────────────────────────
function variantLabel(pokemonVariantName) {
  if (pokemonVariantName === speciesName.value) return 'Normal'
  const suffix = pokemonVariantName.slice(speciesName.value.length + 1)
  return suffix.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

// ── Search as-you-type ────────────────────────────────────────
async function onInput() {
  const q = query.value.trim().toLowerCase()
  error.value = ''
  if (!q) { suggestions.value = []; return }
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    try {
      const list = await fetchPokemonList()
      suggestions.value = list.filter(p => p.name.startsWith(q)).slice(0, 20)
    } catch { /* offline */ }
  }, 260)
}

async function selectPokemon(name) {
  query.value = cap(name)
  suggestions.value = []
  shiny.value = false
  await loadPokemon(name)
}

// ── Load Pokémon ──────────────────────────────────────────────
async function loadPokemon(nameOrId) {
  const key = String(nameOrId).trim().toLowerCase()
  if (!key) return

  loading.value = true
  error.value = ''

  if (abortCtrl) abortCtrl.abort()
  abortCtrl = new AbortController()

  try {
    const data = await fetchPokemon(key, abortCtrl.signal)
    pokemon.value     = data
    currentVariety.value = data.name
    // Non-blocking: load species sidebar info
    loadSpeciesData(data)
  } catch (e) {
    if (e.name !== 'AbortError') {
      error.value = 'Pokémon not found.'
      pokemon.value = null
    }
  } finally {
    loading.value = false
  }
}

// ── Species data (varieties + evolution chain) ────────────────
async function loadSpeciesData(poke) {
  // Clear previous secondary data only when the base species changes
  // (not when just switching varieties of the same species)
  try {
    const species = await fetchURL(poke.species.url)
    speciesName.value = species.name

    // Only update varieties/chain when the species actually changes
    if (species.varieties.length > 1)
      varieties.value = species.varieties
    else
      varieties.value = []

    const chain = await fetchURL(species.evolution_chain.url)
    evolutionStages.value = parseStages(chain.chain)
  } catch {
    varieties.value = []
    evolutionStages.value = []
  }
}

// ── Parse evolution chain into stages ────────────────────────
function parseStages(node, depth = 0, result = []) {
  if (!result[depth]) result[depth] = []
  const id = parseInt(node.species.url.split('/').filter(Boolean).pop())
  result[depth].push({ name: node.species.name, id })
  for (const evo of node.evolves_to) parseStages(evo, depth + 1, result)
  return result
}

// ── Switch variety (dropdown) ─────────────────────────────────
async function onVarietyChange() {
  if (currentVariety.value === pokemon.value?.name) return
  shiny.value = false
  loading.value = true
  try {
    const data = await fetchPokemon(currentVariety.value)
    pokemon.value = data
    // Varieties & chain stay — same species, no need to reload
  } catch {
    error.value = 'Variant not found.'
  } finally {
    loading.value = false
  }
}

function onSearch() { selectPokemon(query.value) }
</script>

<template>
  <div class="dex-layout">

    <!-- ── Search column ─────────────────────────────────── -->
    <aside class="search-col">
      <div class="card search-card">
        <div class="search-row">
          <input
            v-model="query"
            class="field"
            placeholder="Nome ou ID…"
            autocomplete="off"
            @input="onInput"
            @keydown.enter="onSearch"
          />
          <button class="btn btn-red" @click="onSearch">Search</button>
        </div>

        <p v-if="error" class="dex-error">{{ error }}</p>

        <div v-if="suggestions.length" class="suggestions">
          <button
            v-for="s in suggestions"
            :key="s.name"
            class="suggest-item"
            @click="selectPokemon(s.name)"
          >{{ cap(s.name) }}</button>
        </div>
      </div>
    </aside>

    <!-- ── Detail column ─────────────────────────────────── -->
    <section class="detail-col">

      <!-- Empty state -->
      <div v-if="!pokemon && !loading" class="card empty-card">
        <span class="empty-icon">🔍</span>
        <p>Search a Pokémon by name or Pokédex number</p>
      </div>

      <!-- Skeleton (only on first load) -->
      <div v-else-if="loading && !pokemon" class="card skeleton-card">
        <div class="skel skel-circle"></div>
        <div class="skel skel-line" style="width:140px"></div>
        <div class="skel skel-line" style="width:90px"></div>
        <div class="skel skel-line"></div>
        <div class="skel skel-line"></div>
      </div>

      <!-- Pokémon card — no key/Transition, Vue patches in-place -->
      <div v-if="pokemon" class="card poke-card" :class="{ 'poke-loading': loading }">

        <!-- Type gradient header -->
        <div class="poke-header" :style="{ background: typeGradient }">
          <img :src="sprite" :alt="pokemon.name" class="poke-sprite" />
          <div class="poke-id">#{{ String(pokemon.id).padStart(4,'0') }}</div>
        </div>

        <!-- Info body -->
        <div class="poke-body">

          <div class="poke-name-row">
            <h2 class="poke-name">{{ cap(pokemon.name.replace(/-/g, ' ')) }}</h2>
          </div>

          <!-- Variety dropdown (megas, regionals, gmax…) -->
          <div v-if="varieties.length > 1" class="variety-row">
            <span class="variety-label">Variant</span>
            <select
              v-model="currentVariety"
              class="variety-select"
              @change="onVarietyChange"
            >
              <option
                v-for="v in varieties"
                :key="v.pokemon.name"
                :value="v.pokemon.name"
              >{{ variantLabel(v.pokemon.name) }}</option>
            </select>
          </div>

          <div class="poke-types">
            <TypeBadge v-for="t in pokemon.types" :key="t.type.name" :type="t.type.name" />
          </div>

          <div class="poke-meta">
            <span>⚖️ {{ (pokemon.weight / 10).toFixed(1) }} kg</span>
            <span>📏 {{ (pokemon.height / 10).toFixed(1) }} m</span>
          </div>

          <div class="stats-block">
            <div v-for="s in pokemon.stats" :key="s.stat.name" class="stat-row">
              <span class="stat-label">{{ STAT_LABEL[s.stat.name] ?? s.stat.name }}</span>
              <div class="stat-track">
                <div
                  class="stat-fill"
                  :style="{
                    width: `${Math.min(s.base_stat / 255 * 100, 100)}%`,
                    background: STAT_COLOR[s.stat.name] ?? '#aaa',
                  }"
                ></div>
              </div>
              <span class="stat-val">{{ s.base_stat }}</span>
            </div>
          </div>

          <button class="btn btn-ghost shiny-btn" @click="shiny = !shiny">
            {{ shiny ? '✨ Normal' : '✨ Shiny' }}
          </button>

          <!-- Evolution chain -->
          <div v-if="evolutionStages.length > 1" class="evo-section">
            <span class="evo-title">Evolution Chain</span>
            <div class="evo-chain">
              <template v-for="(stage, si) in evolutionStages" :key="si">
                <span v-if="si > 0" class="evo-arrow">▶</span>
                <div class="evo-stage">
                  <button
                    v-for="poke in stage"
                    :key="poke.name"
                    class="evo-btn"
                    :class="{ 'evo-current': speciesName === poke.name }"
                    :disabled="speciesName === poke.name"
                    @click="selectPokemon(poke.name)"
                  >
                    <img
                      :src="`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${poke.id}.png`"
                      :alt="cap(poke.name)"
                    />
                    <span>{{ cap(poke.name) }}</span>
                  </button>
                </div>
              </template>
            </div>
          </div>

        </div>
      </div>

    </section>
  </div>
</template>

<style scoped>
.dex-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 16px; align-items: start;
}
@media (max-width: 680px) { .dex-layout { grid-template-columns: 1fr; } }

/* ── Search ──────────────────────────────────────────────────── */
.search-card { padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.search-row  { display: flex; gap: 8px; }
.search-row .field { flex: 1; }
.dex-error { color: #dc2626; font-size: 13px; font-weight: 700; }

.suggestions { display: flex; flex-direction: column; gap: 1px; max-height: 380px; overflow-y: auto; }
.suggest-item {
  text-align: left; background: none; border: none;
  padding: 9px 10px; border-radius: var(--radius-sm);
  font-size: 14px; font-weight: 700; cursor: pointer;
  color: var(--text); transition: background .12s;
}
.suggest-item:hover { background: var(--red-light); color: var(--red); }

/* ── Empty / Skeleton ────────────────────────────────────────── */
.empty-card {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 14px; padding: 60px 20px;
  text-align: center; color: var(--muted); font-size: 15px; font-weight: 600;
}
.empty-icon { font-size: 48px; }

.skeleton-card {
  display: flex; flex-direction: column; align-items: center;
  gap: 14px; padding: 40px 24px;
}
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
}
.skel {
  border-radius: var(--radius-sm);
  background: linear-gradient(90deg,#eee 25%,#f6f6f6 50%,#eee 75%);
  background-size: 800px; animation: shimmer 1.3s infinite;
}
.skel-circle { width: 120px; height: 120px; border-radius: 50%; }
.skel-line   { width: 200px; height: 14px; }

/* ── Pokémon card ────────────────────────────────────────────── */
.poke-card { overflow: hidden; }
/* Subtle opacity pulse while variety is loading (loading=true but pokemon exists) */
.poke-card.poke-loading { opacity: .75; pointer-events: none; transition: opacity .15s; }

.poke-header {
  position: relative; padding: 32px 20px 20px;
  display: flex; justify-content: center;
  transition: background .3s;
}
.poke-sprite {
  width: 160px; height: 160px;
  image-rendering: pixelated;
  filter: drop-shadow(0 6px 12px rgba(0,0,0,.18));
  transition: opacity .2s;
}
.poke-id {
  position: absolute; top: 12px; right: 16px;
  font-size: 13px; font-weight: 900; color: rgba(0,0,0,.3);
}

.poke-body { padding: 16px 20px 20px; display: flex; flex-direction: column; gap: 12px; }

.poke-name-row { display: flex; align-items: baseline; gap: 10px; }
.poke-name { font-size: 1.5rem; font-weight: 900; text-transform: capitalize; }

/* ── Variety dropdown ────────────────────────────────────────── */
.variety-row {
  display: flex; align-items: center; gap: 8px;
}
.variety-label {
  font-size: 11px; font-weight: 900; text-transform: uppercase;
  letter-spacing: .5px; color: var(--muted); flex-shrink: 0;
}
.variety-select {
  padding: 6px 10px; border: 1.5px solid var(--border);
  border-radius: var(--radius-sm); font-size: 13px; font-weight: 700;
  font-family: var(--font); color: var(--text); background: var(--bg);
  cursor: pointer; outline: none; transition: border-color .15s;
  flex: 1; max-width: 220px;
}
.variety-select:focus { border-color: var(--red); }

/* ── Types / meta ────────────────────────────────────────────── */
.poke-types { display: flex; gap: 6px; flex-wrap: wrap; }
.poke-meta  { display: flex; gap: 20px; font-size: 13px; font-weight: 700; color: var(--muted); }

/* ── Stats ───────────────────────────────────────────────────── */
.stats-block { display: flex; flex-direction: column; gap: 8px; }
.stat-row    { display: flex; align-items: center; gap: 10px; }
.stat-label  { width: 36px; font-size: 11px; font-weight: 900; color: var(--muted); text-transform: uppercase; }
.stat-track  { flex: 1; height: 10px; background: #eee; border-radius: 5px; overflow: hidden; }
.stat-fill   { height: 100%; border-radius: 5px; transition: width .5s cubic-bezier(.4,0,.2,1); }
.stat-val    { width: 32px; text-align: right; font-size: 13px; font-weight: 800; }

.shiny-btn { align-self: flex-start; margin-top: 4px; }

/* ── Evolution chain ─────────────────────────────────────────── */
.evo-section {
  display: flex; flex-direction: column; gap: 10px;
  padding-top: 14px; border-top: 1px solid var(--border);
}
.evo-title {
  font-size: 10px; font-weight: 900; text-transform: uppercase;
  letter-spacing: .6px; color: var(--muted);
}
.evo-chain { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
.evo-stage { display: flex; flex-wrap: wrap; gap: 6px; }
.evo-arrow { font-size: 12px; color: var(--muted); font-weight: 900; padding: 0 2px; }

.evo-btn {
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 8px 10px; min-width: 64px;
  border: 2px solid var(--border); border-radius: var(--radius-sm);
  background: var(--bg); cursor: pointer; font-family: var(--font);
  transition: border-color .15s, background .15s, transform .12s;
}
.evo-btn:not(:disabled):hover {
  border-color: var(--red); background: var(--red-light);
  transform: translateY(-2px);
}
.evo-btn.evo-current {
  border-color: var(--red); background: var(--red-light); cursor: default;
}
.evo-btn:disabled { opacity: .9; }
.evo-btn img  { width: 54px; height: 54px; image-rendering: pixelated; }
.evo-btn span { font-size: 11px; font-weight: 800; color: var(--text); white-space: nowrap; }
.evo-btn.evo-current span { color: var(--red); }
</style>
