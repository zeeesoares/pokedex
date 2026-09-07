<script setup>
defineProps({ type: { type: String, required: true } })

const TYPE_COLORS = {
  normal: '#9FA19F',   fire: '#E62829',    water: '#2980EF',
  electric: '#FAC000', grass: '#3FA129',   ice: '#3DCEF3',
  fighting: '#FF8000', poison: '#9141CB',  ground: '#915121',
  flying: '#81B9EF',   psychic: '#EF4179', bug: '#91A119',
  rock: '#AFA981',     ghost: '#704170',   dragon: '#5060E1',
  dark: '#624D4E',     steel: '#60A1B8',   fairy: '#EF70EF',
}
</script>

<template>
  <span
    class="badge-type"
    :style="{ background: TYPE_COLORS[type] ?? '#9FA19F' }"
  >{{ type }}</span>
</template>
