document.getElementById('searchButton').addEventListener('click', function() {
    const query = document.getElementById('searchBar').value.toLowerCase();
    fetchPokemon(query);
});

document.getElementById('searchBar').addEventListener('input', function() {
    const query = document.getElementById('searchBar').value.toLowerCase();
    if (query) {
        fetchPokemonList(query);
    } else {
        clearPokemonContainer();
    }
});

function fetchPokemon(query) {
    const url = `https://pokeapi.co/api/v2/pokemon/${query}`;
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Pokémon não encontrado');
            }
            return response.json();
        })
        .then(data => displayPokemon(data))
        .catch(error => alert(error.message));
}


function fetchPokemonList(query) {
    const url = 'https://pokeapi.co/api/v2/pokemon?limit=1000'; // Obtém até 1000 Pokémon

    fetch(url)
        .then(response => response.json())
        .then(data => {
            const filteredPokemon = data.results.filter(pokemon => pokemon.name.startsWith(query));
            displayPokemonList(filteredPokemon);
        })
        .catch(error => alert('Erro ao buscar Pokémon'));
}

function displayPokemonList(pokemonList) {
    const pokemonContainer = document.getElementById('pokemonContainer');
    clearPokemonContainer();

    if (pokemonList.length === 0) {
        pokemonContainer.innerHTML = '<p>Nenhum Pokémon encontrado</p>';
        return;
    }

    pokemonList.forEach(pokemon => {
        const pokemonElement = document.createElement('div');
        pokemonElement.classList.add('pokemon-item');
        pokemonElement.textContent = capitalizeFirstLetter(pokemon.name);
        pokemonElement.addEventListener('click', () => fetchPokemon(pokemon.name));
        pokemonContainer.appendChild(pokemonElement);
    });
}

function clearPokemonContainer() {
    const pokemonContainer = document.getElementById('pokemonContainer');
    pokemonContainer.innerHTML = '';
}


function displayPokemon(pokemon) {
    const pokemonContainer = document.getElementById('pokemonContainer');
    pokemonContainer.innerHTML = `
        <img src="${pokemon.sprites.front_default}" alt="${pokemon.name}">
        <h2>${capitalizeFirstLetter(pokemon.name)} (#${pokemon.id})</h2>
        <p>Tipo: ${pokemon.types.map(typeInfo => capitalizeFirstLetter(typeInfo.type.name)).join(', ')}</p>
        <p>Peso: ${(pokemon.weight / 10).toFixed(1)} kg</p>
        <p>Altura: ${(pokemon.height / 10).toFixed(1)} m</p>
    `;
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
