<script setup>
import { RouterView, RouterLink, useRoute } from 'vue-router'
const route = useRoute()

const TABS = [
  { to: '/pokedex',  label: 'Pokédex'  },
  { to: '/breeding', label: 'Breeding' },
  { to: '/mybox',    label: 'My Box'   },
]
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="header-inner">
        <div class="header-brand">
          <img src="/pokeball.jpeg" class="header-logo" alt="Pokéball" />
          <span class="header-title">Pokédex</span>
        </div>
        <nav class="tab-nav" role="tablist">
          <RouterLink
            v-for="tab in TABS"
            :key="tab.to"
            :to="tab.to"
            class="tab-btn"
            active-class="active"
          >{{ tab.label }}</RouterLink>
        </nav>
      </div>
    </header>

    <main class="app-main">
      <RouterView v-slot="{ Component }">
        <Transition name="fade" mode="out-in">
          <component :is="Component" :key="route.path" />
        </Transition>
      </RouterView>
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100dvh;
  display: flex; flex-direction: column;
}

.app-header {
  background: #CC0000;
  position: sticky; top: 0; z-index: 200;
  box-shadow: 0 2px 0 #990000, 0 4px 12px rgba(0,0,0,.2);
}

.header-inner {
  max-width: 980px; margin: 0 auto;
  padding: 0 20px;
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
}

.header-brand {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 0; flex-shrink: 0;
}

.header-logo {
  width: 32px; height: 32px;
  border-radius: 50%; object-fit: cover;
  border: 2px solid rgba(255,255,255,.4);
}

.header-title {
  font-size: 1.25rem; font-weight: 900;
  color: #fff; letter-spacing: .3px;
}

.tab-nav {
  display: flex;
  overflow-x: auto; scrollbar-width: none;
}
.tab-nav::-webkit-scrollbar { display: none; }

.tab-btn {
  background: transparent; border: none;
  color: rgba(255,255,255,.7);
  border-bottom: 3px solid transparent;
  padding: 14px 18px;
  font-size: 14px; font-weight: 800;
  font-family: inherit;
  cursor: pointer; white-space: nowrap; text-decoration: none;
  transition: color .15s, border-color .15s;
}
.tab-btn:hover:not(.active) { color: rgba(255,255,255,.95); }
.tab-btn.active {
  color: #fff;
  border-bottom-color: #fff;
}

.app-main {
  flex: 1; padding: 20px;
  max-width: 980px; margin: 0 auto; width: 100%;
}

@media (max-width: 600px) {
  .header-inner { padding: 0 12px; }
  .app-main { padding: 12px; }
  .tab-btn { padding: 12px 12px; font-size: 13px; }
}
</style>
