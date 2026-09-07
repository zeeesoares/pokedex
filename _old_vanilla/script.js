// ── Cache & helpers ───────────────────────────────────────────────────────────
const apiCache = new Map();
let pokemonListCache = null;
let activeController = null;

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

function debounce(fn, ms) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

async function cachedFetch(url, signal) {
    if (apiCache.has(url)) return apiCache.get(url);
    const res = await fetch(url, { signal });
    if (!res.ok) throw Object.assign(new Error('Not found'), { status: res.status });
    const data = await res.json();
    apiCache.set(url, data);
    return data;
}

// ── Pokémon list (once, cached) ───────────────────────────────────────────────
async function getPokemonList() {
    if (pokemonListCache) return pokemonListCache;
    const data = await cachedFetch('https://pokeapi.co/api/v2/pokemon?limit=1302');
    pokemonListCache = data.results;
    return pokemonListCache;
}

// ── UI refs ───────────────────────────────────────────────────────────────────
const $suggest = () => document.getElementById('suggestList');
const $detail  = () => document.getElementById('pokemonContainer');
const $error   = () => document.getElementById('errorMessage');

function showError(msg) {
    $error().textContent = msg;
    $error().classList.remove('hidden');
    $suggest().innerHTML = '';
    $detail().innerHTML = '';
}
function clearError() { $error().classList.add('hidden'); }

function showLoadingSkeleton() {
    $detail().innerHTML = `
        <div class="skeleton-wrap">
            <div class="skel skel-img"></div>
            <div class="skel skel-line" style="width:120px"></div>
            <div class="skel skel-line" style="width:80px"></div>
        </div>`;
}

// ── Type colours ──────────────────────────────────────────────────────────────
const TYPE_COLOR = {
    fire:'#F08030', grass:'#78C850', water:'#6890F0', electric:'#F8D030',
    psychic:'#F85888', ice:'#98D8D8', dragon:'#7038F8', dark:'#705848',
    fairy:'#EE99AC', normal:'#A8A878', fighting:'#C03028', flying:'#A890F0',
    poison:'#A040A0', ground:'#E0C068', rock:'#B8A038', bug:'#A8B820',
    ghost:'#705898', steel:'#B8B8D0'
};

const STAT_LABEL = {
    hp:'HP', attack:'Atk', defense:'Def',
    'special-attack':'SpA', 'special-defense':'SpD', speed:'Spe'
};

function statBarColor(val) {
    if (val >= 100) return '#43a047';
    if (val >= 60)  return '#ff9800';
    return '#f44336';
}

// ── Fetch & display a Pokémon ─────────────────────────────────────────────────
async function fetchPokemon(query) {
    query = query.trim().toLowerCase();
    if (!query) return;
    clearError();
    $suggest().innerHTML = '';
    showLoadingSkeleton();

    if (activeController) activeController.abort();
    activeController = new AbortController();

    try {
        const data = await cachedFetch(
            `https://pokeapi.co/api/v2/pokemon/${query}`,
            activeController.signal
        );
        displayPokemon(data);
    } catch (err) {
        if (err.name === 'AbortError') return;
        showError('Pokémon não encontrado. Verifica o nome ou ID.');
        $detail().innerHTML = '';
    }
}

function displayPokemon(p) {
    const types = p.types.map(t =>
        `<span class="type-badge" style="background:${TYPE_COLOR[t.type.name] || '#aaa'}">${cap(t.type.name)}</span>`
    ).join('');

    const stats = p.stats.map(s => {
        const pct = Math.min((s.base_stat / 255) * 100, 100).toFixed(1);
        return `
            <div class="stat-row">
                <span class="stat-name">${STAT_LABEL[s.stat.name] ?? s.stat.name}</span>
                <div class="stat-bar-wrap">
                    <div class="stat-bar" style="width:${pct}%;background:${statBarColor(s.base_stat)}"></div>
                </div>
                <span class="stat-val">${s.base_stat}</span>
            </div>`;
    }).join('');

    $detail().innerHTML = `
        <img id="pokeSprite" class="poke-sprite" src="${p.sprites.front_default}" alt="${p.name}">
        <h2 class="poke-name">${cap(p.name)}<small>#${String(p.id).padStart(4,'0')}</small></h2>
        <div class="types">${types}</div>
        <div class="poke-meta">
            <span>⚖️ ${(p.weight/10).toFixed(1)} kg</span>
            <span>📏 ${(p.height/10).toFixed(1)} m</span>
        </div>
        <div class="stats-panel">${stats}</div>
        <div class="action-row">
            <button class="btn-shiny" id="shinyBtn">✨ Shiny</button>
        </div>`;

    let shiny = false;
    document.getElementById('shinyBtn').addEventListener('click', () => {
        shiny = !shiny;
        document.getElementById('pokeSprite').src = shiny
            ? p.sprites.front_shiny
            : p.sprites.front_default;
    });
}

// ── Search-as-you-type ────────────────────────────────────────────────────────
async function searchList(query) {
    query = query.trim().toLowerCase();
    if (!query) { $suggest().innerHTML = ''; clearError(); $detail().innerHTML = ''; return; }
    clearError();

    try {
        const list = await getPokemonList();
        const matches = list.filter(p => p.name.startsWith(query)).slice(0, 25);

        if (!matches.length) {
            $suggest().innerHTML = '<div style="padding:10px;color:#888;font-size:13px">Sem resultados</div>';
            return;
        }

        const frag = document.createDocumentFragment();
        matches.forEach(p => {
            const el = document.createElement('div');
            el.className = 'suggest-item';
            el.textContent = cap(p.name);
            el.addEventListener('click', () => {
                document.getElementById('searchBar').value = p.name;
                $suggest().innerHTML = '';
                fetchPokemon(p.name);
            });
            frag.appendChild(el);
        });
        $suggest().innerHTML = '';
        $suggest().appendChild(frag);
    } catch {
        showError('Erro ao carregar lista. Verifica a tua ligação.');
    }
}

// ── Tab switching ─────────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
});

// ── Pokédex listeners ─────────────────────────────────────────────────────────
const debouncedSearch = debounce(searchList, 280);

document.getElementById('searchBar').addEventListener('input', e => debouncedSearch(e.target.value));
document.getElementById('searchButton').addEventListener('click', () =>
    fetchPokemon(document.getElementById('searchBar').value));
document.getElementById('searchBar').addEventListener('keydown', e => {
    if (e.key === 'Enter') fetchPokemon(e.target.value);
});

$detail().innerHTML = '<div class="dex-empty">🔍 Pesquisa um Pokémon pelo nome ou ID</div>';
