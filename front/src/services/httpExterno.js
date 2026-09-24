export class ServicoExternoIndisponivel extends Error {
  constructor(nomeServico, mensagem) {
    super(mensagem);
    this.name = 'ServicoExternoIndisponivel';
    this.nomeServico = nomeServico;
  }
}

export async function buscarExterno(nomeServico, url, opcoes = {}) {
  const controller = new AbortController();

  const timeoutMs = opcoes.timeoutMs || 8000;

  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const headers = {
      'User-Agent': 'Duomed-App/1.0',
      ...(opcoes.headers || {}),
    };

    const resposta = await fetch(url, {
      ...opcoes,
      headers,
      signal: controller.signal,
    });

    if (!resposta.ok) {
      if (resposta.status === 429) {
        throw new ServicoExternoIndisponivel(
          nomeServico,
          'Limite de requisições atingido. Tente novamente mais tarde.'
        );
      }

      throw new ServicoExternoIndisponivel(
        nomeServico,
        `O serviço respondeu com erro HTTP ${resposta.status}.`
      );
    }

    return resposta;

  } catch (error) {

    if (error.name === 'AbortError') {
      throw new ServicoExternoIndisponivel(
        nomeServico,
        'O serviço demorou demais para responder.'
      );
    }

    if (error instanceof ServicoExternoIndisponivel) {
      throw error;
    }

    throw new ServicoExternoIndisponivel(
      nomeServico,
      'Não foi possível acessar o serviço externo.'
    );

  } finally {
    clearTimeout(timeout);
  }
}