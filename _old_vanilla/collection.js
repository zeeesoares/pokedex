// ── My Pokémon Collection ─────────────────────────────────────────────────────
// Depends on globals from pixelmon.js: STATS, POWER_STAT, ITEM_LABEL,
//   calculateBreedingProbability, buildTargetGrid, getTargetFromGrid, debounce
// Depends on globals from script.js: apiCache, cachedFetch, cap, TYPE_COLOR

const COL_KEY = 'pokedex_collection_v1';

function loadCollection() {
    try { return JSON.parse(localStorage.getItem(COL_KEY)) || []; }
    catch { return []; }
}
function saveCollection() { localStorage.setItem(COL_KEY, JSON.stringify(myCollection)); }

let myCollection = loadCollection();

// ── IV colour ─────────────────────────────────────────────────────────────────
function ivBg(v) {
    if (v === 31) return '#2e7d32';
    if (v >= 28)  return '#558b2f';
    if (v >= 21)  return '#f57f17';
    if (v >= 10)  return '#e65100';
    return '#c62828';
}

// ── Render collection grid ────────────────────────────────────────────────────
function renderCollection() {
    const grid = document.getElementById('collectionGrid');
    if (!myCollection.length) { grid.innerHTML = ''; return; }

    grid.innerHTML = myCollection.map((poke, idx) => {
        const ivBadges = STATS.map((s, i) =>
            `<div class="iv-badge" style="background:${ivBg(poke.ivs[i])}" title="${s}">${poke.ivs[i]}</div>`
        ).join('');

        const itemLabel = ITEM_LABEL[poke.item] || '—';

        return `
        <div class="col-card">
            <button class="col-delete" data-idx="${idx}" title="Remover">✕</button>
            <img class="col-sprite" src="${poke.sprite || ''}" alt="${poke.name}"
                 onerror="this.style.opacity=.3">
            <span class="col-name">${cap(poke.name)}</span>
            <span class="col-id">#${String(poke.dexId || '???').padStart(4,'0')} ${poke.gender === 'M' ? '♂' : poke.gender === 'F' ? '♀' : '⚲'}</span>
            <span class="col-item">${itemLabel}</span>
            <div class="col-ivs">${ivBadges}</div>
        </div>`;
    }).join('');
}

// ── Add Pokémon form ──────────────────────────────────────────────────────────
// Build the IV grid for the add form
buildIVGrid('addIVGrid', 'add');

// Auto-fetch sprite when typing species
const debouncedSpeciesFetch = debounce(async (val) => {
    const name = val.trim().toLowerCase();
    const spriteEl = document.getElementById('addSprite');
    if (!name) { spriteEl.src = ''; return; }
    try {
        const data = await cachedFetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
        spriteEl.src = data.sprites.front_default;
        spriteEl.dataset.dexId = data.id;
    } catch {
        spriteEl.src = '';
        delete spriteEl.dataset.dexId;
    }
}, 400);

document.getElementById('addSpecies').addEventListener('input', e =>
    debouncedSpeciesFetch(e.target.value));

document.getElementById('addPokemonBtn').addEventListener('click', () => {
    const nameRaw  = document.getElementById('addSpecies').value.trim();
    const spriteEl = document.getElementById('addSprite');
    if (!nameRaw) { alert('Indica a espécie do Pokémon.'); return; }

    const ivs = STATS.map((_, i) => {
        const v = parseInt(document.getElementById(`add_iv_${i}`).value, 10);
        return isNaN(v) ? 31 : Math.min(31, Math.max(0, v));
    });

    myCollection.push({
        id:     Date.now(),
        name:   nameRaw.toLowerCase(),
        dexId:  spriteEl.dataset.dexId || null,
        sprite: spriteEl.src || '',
        gender: document.getElementById('addGender').value,
        item:   document.getElementById('addItem').value,
        ivs
    });

    saveCollection();
    renderCollection();

    // Reset form
    document.getElementById('addSpecies').value = '';
    spriteEl.src = '';
    delete spriteEl.dataset.dexId;
    STATS.forEach((_, i) => { document.getElementById(`add_iv_${i}`).value = 31; });
    document.getElementById('addFormToggle').removeAttribute('open');
});

// Delete
document.getElementById('collectionGrid').addEventListener('click', e => {
    const btn = e.target.closest('.col-delete');
    if (!btn) return;
    const idx = parseInt(btn.dataset.idx, 10);
    myCollection.splice(idx, 1);
    saveCollection();
    renderCollection();
});

// ── Collection target grid ────────────────────────────────────────────────────
buildTargetGrid('colTargetGrid');

// Preset chips (collection tab)
document.querySelectorAll('[data-coltarget]').forEach(btn => {
    btn.addEventListener('click', () => {
        const n = parseInt(btn.dataset.coltarget, 10);
        document.querySelectorAll('#colTargetGrid .target-toggle').forEach((tb, i) => {
            const on = i < n;
            tb.classList.toggle('active', on);
            tb.textContent = on ? '31' : 'any';
        });
    });
});

// ── Best pairs finder ─────────────────────────────────────────────────────────
document.getElementById('findPairsBtn').addEventListener('click', () => {
    const resEl = document.getElementById('pairsResults');

    if (myCollection.length < 2) {
        resEl.classList.remove('hidden');
        resEl.innerHTML = '<div class="pairs-empty">Precisas de pelo menos 2 Pokémon na coleção.</div>';
        return;
    }

    const target = getTargetFromGrid('colTargetGrid');
    const nTarget = target.filter(t => t !== null).length;
    if (nTarget === 0) {
        resEl.classList.remove('hidden');
        resEl.innerHTML = '<div class="pairs-empty">Seleciona pelo menos 1 stat alvo.</div>';
        return;
    }

    resEl.classList.remove('hidden');
    resEl.innerHTML = '<div class="pairs-empty">A calcular combinações…</div>';

    setTimeout(() => {
        const candidates = [];

        for (let i = 0; i < myCollection.length; i++) {
            for (let j = i + 1; j < myCollection.length; j++) {
                const a = myCollection[i];
                const b = myCollection[j];

                // Test: current items, DK on a, DK on b
                const configs = [
                    [a.item, b.item],
                    ['destiny_knot', b.item],
                    [a.item, 'destiny_knot'],
                ];

                let bestProb = -1, bestI1 = a.item, bestI2 = b.item;
                for (const [i1, i2] of configs) {
                    const p = calculateBreedingProbability(a.ivs, b.ivs, target, i1, i2, 8000);
                    if (p > bestProb) { bestProb = p; bestI1 = i1; bestI2 = i2; }
                }
                candidates.push({ a, b, prob: bestProb, item1: bestI1, item2: bestI2 });
            }
        }

        candidates.sort((x, y) => y.prob - x.prob);
        const top5 = candidates.slice(0, 5);

        // Full precision for display
        top5.forEach(c => {
            c.prob = calculateBreedingProbability(c.a.ivs, c.b.ivs, target, c.item1, c.item2, 100000);
        });

        if (!top5.length || top5[0].prob === 0) {
            resEl.innerHTML = '<div class="pairs-empty">Nenhuma combinação viável com o objetivo selecionado. Tenta reduzir o número de IVs alvo ou melhora os Pokémon da coleção.</div>';
            return;
        }

        const rankClass = ['gold', 'silver', 'bronze', '', ''];
        resEl.innerHTML = top5.map((c, idx) => {
            const probStr = c.prob === 0 ? '<1%' : c.prob === 1 ? '100%' : `${(c.prob * 100).toFixed(3)}%`;
            const avgEggs = c.prob > 0 ? Math.round(1 / c.prob) : '∞';

            const itemNote = (c.item1 !== c.a.item || c.item2 !== c.b.item)
                ? `<span style="color:#cc5500">⚡ Recomendado: ${ITEM_LABEL[c.item1] || '—'} + ${ITEM_LABEL[c.item2] || '—'}</span>`
                : `${ITEM_LABEL[c.item1] || '—'} + ${ITEM_LABEL[c.item2] || '—'}`;

            return `
            <div class="pair-row">
                <div class="pair-rank ${rankClass[idx]}">${idx + 1}</div>
                <div class="pair-info">
                    <span class="pair-names">${cap(c.a.name)} × ${cap(c.b.name)}</span>
                    <span class="pair-items">${itemNote}</span>
                    <span class="pair-items" style="color:#888">Média: ~${typeof avgEggs === 'number' ? avgEggs.toLocaleString('pt-PT') : avgEggs} ovos</span>
                </div>
                <span class="pair-prob">${probStr}</span>
            </div>`;
        }).join('');
    }, 12);
});

// ── Initial render ────────────────────────────────────────────────────────────
renderCollection();
