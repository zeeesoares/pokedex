# Pokédex Web Application

## Description

A Pokédex web app built with **Vue 3 + Vite + Pinia**. It uses the PokéAPI to fetch and display Pokémon data, and includes a full competitive breeding calculator with exact probability math.

## Features

- **Pokédex** — Search any Pokémon by name or ID. View type, base stats, weight, height, shiny sprite, forms/variants, and the full evolution chain.
- **Breeding Calculator** — Select two parents with their items and IVs, then calculate the exact probability of hitting a target — either "at least N perfect IVs" or a specific set of stats. Uses combinatorial math (no Monte Carlo).
- **My Box** — Track your own collection. Add species, log individual specimens with gender, nature and IVs, and run the **Best Breeding Pairs** tool to find the optimal pairings from your box.

## Tech Stack

- [Vue 3](https://vuejs.org/) — Composition API with `<script setup>`
- [Vite 5](https://vitejs.dev/) — build tooling
- [Pinia](https://pinia.vuejs.org/) — global store with localStorage persistence
- [vue-router 4](https://router.vuejs.org/) — hash-based routing (`/pokedex`, `/breeding`, `/mybox`)
- [PokéAPI](https://pokeapi.co/) — Pokémon data source
- [Lucide Vue](https://lucide.dev/) — icons

## Getting Started

Clone the repository:
```bash
git clone https://github.com/zeeesoares/pokedex.git
cd pokedex
```

Install dependencies and start the dev server:
```bash
npm install
npm run dev
```

Build for production:
```bash
npm run build
```

## Acknowledgements

- [PokéAPI](https://pokeapi.co/) for providing all Pokémon data.
- Inspiration from the original Pokémon games and the competitive breeding community.
- **Special thanks to MikedaGaita** — for the ideas, the feedback, and for being the reason half of these features exist. 🎸
