import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

const KEY = 'pokedex_box_v3'

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || [] }
  catch { return [] }
}

export const useCollectionStore = defineStore('collection', () => {
  const box = ref(load())

  // Persist on every mutation
  watch(box, v => localStorage.setItem(KEY, JSON.stringify(v)), { deep: true })

  function hasSpecies(name) {
    return box.value.some(s => s.name === name)
  }

  function addSpecies(data) {
    if (!hasSpecies(data.name))
      box.value.push({ ...data, specimens: [] })
  }

  function removeSpecies(name) {
    const i = box.value.findIndex(s => s.name === name)
    if (i !== -1) box.value.splice(i, 1)
  }

  function addSpecimen(speciesName, specimen) {
    const sp = box.value.find(s => s.name === speciesName)
    if (sp) sp.specimens.push({ id: `${Date.now()}-${Math.random()}`, ...specimen })
  }

  function removeSpecimen(speciesName, specimenId) {
    const sp = box.value.find(s => s.name === speciesName)
    if (!sp) return
    const i = sp.specimens.findIndex(s => s.id === specimenId)
    if (i !== -1) sp.specimens.splice(i, 1)
  }

  function updateSpecimen(speciesName, specimenId, data) {
    const sp = box.value.find(s => s.name === speciesName)
    if (!sp) return
    const i = sp.specimens.findIndex(s => s.id === specimenId)
    if (i !== -1) sp.specimens[i] = { ...sp.specimens[i], ...data }
  }

  // Flat list with global index for identification in pair results
  const allSpecimens = computed(() => {
    let idx = 1
    return box.value.flatMap(sp =>
      sp.specimens.map(s => ({
        ...s,
        idx: idx++,
        speciesDisplayName: sp.displayName,
        speciesName: sp.name,
        sprite: sp.sprite,
        types: sp.types,
      }))
    )
  })

  return { box, hasSpecies, addSpecies, removeSpecies, addSpecimen, removeSpecimen, updateSpecimen, allSpecimens }
})
