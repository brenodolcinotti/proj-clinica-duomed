const BASE_URL = 'http://10.110.12.58:3000';

async function requisicao(endpoint, opcoes = {}) {
  const resposta = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(opcoes.headers || {}),
    },
    ...opcoes,
  });

  if (!resposta.ok) {
    throw new Error(`Erro na API: ${resposta.status}`);
  }

  if (resposta.status === 204) {
    return null;
  }

  return resposta.json();
}

const api = {
  get: (endpoint) => requisicao(endpoint),

  post: (endpoint, dados) =>
    requisicao(endpoint, {
      method: 'POST',
      body: JSON.stringify(dados),
    }),

  put: (endpoint, dados) =>
    requisicao(endpoint, {
      method: 'PUT',
      body: JSON.stringify(dados),
    }),

  remover: (endpoint) =>
    requisicao(endpoint, {
      method: 'DELETE',
    }),
};

export { api };