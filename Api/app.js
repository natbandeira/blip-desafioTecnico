const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000; 
const GITHUB_API_URL = 'https://api.github.com';
const USERNAME = 'takenet';
const MAX_PER_PAGE = 100; // Limite da API

// Buscando todos os repositórios
async function fetchAllRepos(username) {
    let repos = [];
    let page = 1;
    let keepFetching = true;

    while (keepFetching) {
        const repoPage = await fetchReposByPage(username, page);
        if (repoPage.length > 0) {
            repos = repos.concat(repoPage);
            page++;
        } else {
            keepFetching = false;
        }
    }

    return repos;
}

// Função que busca repositórios de uma página específica
async function fetchReposByPage(username, page) {
    try {
        const response = await axios.get(`${GITHUB_API_URL}/users/${username}/repos`, {
            params: {
                per_page: MAX_PER_PAGE,
                page: page
            }
        });
        return response.data;
    } catch (error) {
        console.error(`Erro ao buscar repositórios da página ${page}:`, error);
        throw new Error('Erro ao buscar os repositórios');
    }
}

// Filtrando repos por linguagem
function filterReposByLanguage(repos, language) {
    return repos.filter(repo => repo.language === language);
}

// Ordenando repositórios do mais antigo para o mais novo
function sortReposByCreationDate(repos) {
    return repos.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

// Mapeando as propriedades que serão retornadas
function mapRepoInfo(repos) {
    return repos.map(repo => ({
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        created_at: repo.created_at,
        url: repo.html_url,
        avatar: repo.owner.avatar_url
    }));
}

// Rota para buscar os 5 repositórios mais antigos em C#
app.get('/repos', async (req, res) => {
    try {
        const allRepos = await fetchAllRepos(USERNAME);
        const csharpRepos = filterReposByLanguage(allRepos, 'C#');
        const sortedRepos = sortReposByCreationDate(csharpRepos);
        const oldestRepos = sortedRepos.slice(0, 5);
        const repoInfo = mapRepoInfo(oldestRepos);

        res.json(repoInfo);
    } catch (error) {
        console.error('Erro ao processar a requisição:', error);
        res.status(500).json({ error: 'Erro ao buscar os repositórios' });
    }
});

// Iniciando o servidor para escutar em todas as interfaces de rede
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
