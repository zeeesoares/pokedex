import { createRouter, createWebHashHistory } from 'vue-router'
import PokedexView    from '../views/PokedexView.vue'
import BreedingView   from '../views/BreedingView.vue'
import CollectionView from '../views/CollectionView.vue'

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/',         redirect: '/pokedex' },
    { path: '/pokedex',  component: PokedexView    },
    { path: '/breeding', component: BreedingView   },
    { path: '/mybox',    component: CollectionView  },
  ],
})
