// ── Pixelmon Breeding — shared constants & core logic ────────────────────────
// These globals are used by both the 1v1 calculator and collection.js.

const STATS = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'];

const POWER_STAT = {
    power_hp: 0, power_atk: 1, power_def: 2,
    power_spa: 3, power_spd: 4, power_spe: 5
};

const ITEM_LABEL = {
    '': '—', destiny_knot: 'Destiny Knot', everstone: 'Everstone',
    power_hp: 'Power Weight', power_atk: 'Power Bracer', power_def: 'Power Belt',
    power_spa: 'Power Lens',  power_spd: 'Power Band',   power_spe: 'Power Anklet'
};

// Fisher-Yates on a copy (n ≤ 6, always cheap)
function shuffled(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
}

function simulateOneEgg(p1, p2, item1, item2) {
    const hasDK   = item1 === 'destiny_knot' || item2 === 'destiny_knot';
    const pw1     = POWER_STAT[item1] ?? -1;
    const pw2     = POWER_STAT[item2] ?? -1;
    const egg     = new Int8Array(6).fill(-1);
    const locked  = new Set();

    if (pw1 >= 0) { egg[pw1] = p1[pw1]; locked.add(pw1); }
    if (pw2 >= 0) {
        if (locked.has(pw2)) {
            egg[pw2] = Math.random() < 0.5 ? p1[pw2] : p2[pw2];
        } else {
            egg[pw2] = p2[pw2];
            locked.add(pw2);
        }
    }

    const nInherited = hasDK ? 5 : 3;
    const freeSlots  = shuffled([0,1,2,3,4,5].filter(i => !locked.has(i)));
    const remaining  = Math.min(nInherited - locked.size, freeSlots.length);

    for (let k = 0; k < remaining; k++) {
        const s = freeSlots[k];
        egg[s] = Math.random() < 0.5 ? p1[s] : p2[s];
        locked.add(s);
    }

    for (let i = 0; i < 6; i++) {
        if (egg[i] === -1) egg[i] = (Math.random() * 32) | 0;
    }
    return egg;
}

/**
 * Returns [0,1] probability that one egg matches every non-null target IV.
 * Monte Carlo — 100 000 samples → error ≈ ±0.03 %.
 */
function calculateBreedingProbability(p1, p2, target, item1, item2, iterations = 100000) {
    const targetIdx = target.reduce((a, t, i) => { if (t !== null) a.push(i); return a; }, []);
    if (targetIdx.length === 0) return 1;

    let hits = 0;
    for (let s = 0; s < iterations; s++) {
        const egg = simulateOneEgg(p1, p2, item1, item2);
        let ok = true;
        for (const i of targetIdx) { if (egg[i] !== target[i]) { ok = false; break; } }
        if (ok) hits++;
    }
    return hits / iterations;
}

// ── Tip generator ─────────────────────────────────────────────────────────────
function generateTip(target, item1, item2) {
    const n    = target.filter(t => t === 31).length;
    const hasDK = item1 === 'destiny_knot' || item2 === 'destiny_knot';

    if (n === 0) return 'Nenhum stat alvo selecionado — qualquer ovo é válido.';
    if (n >= 5 && !hasDK) return 'Equipa Destiny Knot num dos pais para herdar 5 IVs em vez de 3. Essencial para 5+ IVs perfeitos.';
    if (n === 6 && hasDK) return 'Para 6 IVs perfeitos com DK, certifica-te que os dois pais cobrem os 6 stats a 31.';
    if (n === 1) {
        const si = target.findIndex(t => t === 31);
        const key = Object.keys(POWER_STAT).find(k => POWER_STAT[k] === si);
        if (key && item1 !== key && item2 !== key)
            return `Equipa ${ITEM_LABEL[key]} num dos pais para garantir herança de ${STATS[si]}.`;
    }
    if (hasDK) return 'Bom setup com Destiny Knot! Melhora os IVs dos pais para aumentar a probabilidade.';
    return 'Melhora os IVs dos pais para aumentar a probabilidade de sucesso.';
}

// ── Build IV grid (parents) ───────────────────────────────────────────────────
function buildIVGrid(containerId, pid) {
    document.getElementById(containerId).innerHTML = STATS.map((s, i) => `
        <div class="iv-cell">
            <span class="iv-label">${s}</span>
            <input id="${pid}_iv_${i}" class="iv-input" type="number" min="0" max="31" value="31">
            <button class="iv-max-btn" data-pid="${pid}" data-i="${i}">MAX</button>
        </div>`).join('');
}

function buildTargetGrid(containerId) {
    document.getElementById(containerId).innerHTML = STATS.map((s, i) => `
        <div class="iv-cell">
            <span class="iv-label">${s}</span>
            <button class="target-toggle ${i < 5 ? 'active' : ''}" data-i="${i}">
                ${i < 5 ? '31' : 'any'}
            </button>
        </div>`).join('');

    document.querySelectorAll(`#${containerId} .target-toggle`).forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
            btn.textContent = btn.classList.contains('active') ? '31' : 'any';
        });
    });
}

function getIVs(pid) {
    return STATS.map((_, i) => {
        const v = parseInt(document.getElementById(`${pid}_iv_${i}`).value, 10);
        return isNaN(v) ? 31 : Math.min(31, Math.max(0, v));
    });
}

function getTargetFromGrid(containerId) {
    return STATS.map((_, i) => {
        const btn = document.querySelector(`#${containerId} .target-toggle[data-i="${i}"]`);
        return btn && btn.classList.contains('active') ? 31 : null;
    });
}

// ── Init 1v1 calculator ───────────────────────────────────────────────────────
buildIVGrid('ivGrid1', 'p1');
buildIVGrid('ivGrid2', 'p2');
buildTargetGrid('targetGrid');

// Max-IV delegation
document.addEventListener('click', e => {
    const btn = e.target.closest('.iv-max-btn');
    if (!btn || !btn.dataset.pid) return;
    document.getElementById(`${btn.dataset.pid}_iv_${btn.dataset.i}`).value = 31;
});

// Preset chips (breeding tab)
document.querySelectorAll('[data-target]').forEach(btn => {
    btn.addEventListener('click', () => {
        const n = parseInt(btn.dataset.target, 10);
        document.querySelectorAll('#targetGrid .target-toggle').forEach((tb, i) => {
            const on = i < n;
            tb.classList.toggle('active', on);
            tb.textContent = on ? '31' : 'any';
        });
    });
});

document.getElementById('calculateBtn').addEventListener('click', () => {
    const p1    = getIVs('p1');
    const p2    = getIVs('p2');
    const tgt   = getTargetFromGrid('targetGrid');
    const item1 = document.getElementById('item1').value;
    const item2 = document.getElementById('item2').value;

    const resEl = document.getElementById('breedingResults');
    resEl.classList.remove('hidden');
    document.getElementById('resultProb').textContent = 'A calcular…';
    document.getElementById('resultEggs').textContent  = '—';
    document.getElementById('resultTip').textContent   = '—';

    setTimeout(() => {
        const prob = calculateBreedingProbability(p1, p2, tgt, item1, item2);
        const avg  = prob > 0 ? Math.round(1 / prob) : Infinity;

        document.getElementById('resultProb').textContent = prob === 1 ? '100%' : `${(prob * 100).toFixed(3)}%`;
        document.getElementById('resultEggs').textContent = avg === Infinity ? '∞' : avg.toLocaleString('pt-PT');
        document.getElementById('resultTip').textContent  = generateTip(tgt, item1, item2);
    }, 12);
});
