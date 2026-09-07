// Singleton cache — survives across component instances
const cache = new Map()
let listCache = null

async function apiFetch(url, signal) {
  if (cache.has(url)) return cache.get(url)
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`${res.status}`)
  const data = await res.json()
  cache.set(url, data)
  return data
}

export function usePokeAPI() {
  async function fetchPokemon(nameOrId, signal) {
    const key = String(nameOrId).toLowerCase().trim()
    return apiFetch(`https://pokeapi.co/api/v2/pokemon/${key}`, signal)
  }

  async function fetchPokemonList() {
    if (listCache) return listCache
    const data = await apiFetch('https://pokeapi.co/api/v2/pokemon?limit=1302')
    listCache = data.results
    return listCache
  }

  async function fetchSpecies(nameOrId) {
    return apiFetch(`https://pokeapi.co/api/v2/pokemon-species/${String(nameOrId).toLowerCase()}`)
  }

  async function fetchURL(url) {
    return apiFetch(url)
  }

  return { fetchPokemon, fetchPokemonList, fetchSpecies, fetchURL }
}
