const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const GITHUB_API_URL = 'https://api.github.com';
const USERNAME = 'takenet';
const MAX_PER_PAGE = 100; // Limite da API

// Função que busca todos os repositórios
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
        if (error.response) {
            // Tratando erros
            const status = error.response.status;
            if (status === 404) {
                console.error(`Usuário ${username} não encontrado (404).`);
                throw new Error('Usuário não encontrado.');
            } else if (status === 403) {
                console.error('Limite de requisições excedido ou acesso proibido (403).');
                throw new Error('Limite de requisições excedido.');
            } else {
                console.error(`Erro na API do GitHub (status ${status}):`, error.response.data);
                throw new Error('Erro ao buscar repositórios.');
            }
        } else {
            // Erro no cliente (sem resposta do servidor)
            console.error('Erro na requisição:', error.message);
            throw new Error('Erro ao buscar repositórios.');
        }
    }
}

// Função que filtra repos pela lang
function filterReposByLanguage(repos, language) {
    return repos.filter(repo => repo.language === language);
}

// Ordenando repositórios do mais antigo para o mais novo
function sortReposByOldest(repos) {
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
        
        // Verifica se encontrou repositórios com a linguagem C#
        const csharpRepos = filterReposByLanguage(allRepos, 'C#');
        if (csharpRepos.length === 0) {
            return res.status(404).json({ error: 'Nenhum repositório em C# encontrado.' });
        }

        const sortedRepos = sortReposByOldest(csharpRepos);
        const oldestRepos = sortedRepos.slice(0, 5);
        const repoInfo = mapRepoInfo(oldestRepos);

        // Retorna os repositórios encontrados com status 200
        res.status(200).json(repoInfo);
    } catch (error) {
        if (error.message.includes('Usuário não encontrado')) {
            // Caso o usuário não seja encontrado
            res.status(404).json({ error: 'Usuário não encontrado.' });
        } else if (error.message.includes('Limite de requisições excedido')) {
            // Caso o limite de requisições da API for excedido
            res.status(403).json({ error: 'Limite de requisições excedido. Tente novamente mais tarde.' });
        } else {
            // Outros problemas internos
            res.status(500).json({ error: 'Erro ao buscar os repositórios' });
        }
    }
});

// Iniciando o servidor para escutar em todas as interfaces de rede
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
