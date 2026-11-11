/**
 * Núcleo testável da sincronização da agenda.
 * Não importa React, AsyncStorage ou módulos nativos: as dependências são injetadas.
 */
const CHAVE_ULTIMA = '@duomed/sincronizacao/ultima';
const CHAVE_HISTORICO = '@duomed/sincronizacao/historico';
const LIMITE_HISTORICO = 20;
const TEMPO_LIMITE_PADRAO_MS = 25_000;
const TAMANHO_FATIA_BACKGROUND = 100;

function criarSinalDeCancelamento() {
  let cancelado = false;
  return {
    cancelar() { cancelado = true; },
    get cancelado() { return cancelado; },
  };
}

function extrairConsultas(resposta) {
  if (Array.isArray(resposta)) return resposta;
  if (Array.isArray(resposta?.consultas)) return resposta.consultas;
  if (Array.isArray(resposta?.data)) return resposta.data;
  throw new TypeError('A API não retornou uma lista válida de consultas.');
}

function mensagemErro(erro) {
  if (erro?.name === 'AbortError') return 'A requisição foi interrompida por limite de tempo.';
  return erro?.message || 'Não foi possível sincronizar a agenda.';
}

function criarServicoSincronizacao({
  api,
  storage,
  detectarConflitosEmFatias,
  agora = () => Date.now(),
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  tempoLimiteMs = TEMPO_LIMITE_PADRAO_MS,
  tamanhoFatia = TAMANHO_FATIA_BACKGROUND,
}) {
  if (!api || typeof api.get !== 'function') throw new TypeError('api.get é obrigatório.');
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    throw new TypeError('storage precisa implementar getItem e setItem.');
  }
  if (typeof detectarConflitosEmFatias !== 'function') {
    throw new TypeError('detectarConflitosEmFatias é obrigatório.');
  }

  let sincronizacaoEmAndamento = false;

  async function lerHistorico() {
    try {
      const bruto = await storage.getItem(CHAVE_HISTORICO);
      const valor = bruto ? JSON.parse(bruto) : [];
      return Array.isArray(valor) ? valor : [];
    } catch (_) {
      return [];
    }
  }

  async function obterUltimaSincronizacao() {
    try {
      const bruto = await storage.getItem(CHAVE_ULTIMA);
      return bruto ? JSON.parse(bruto) : null;
    } catch (_) {
      return null;
    }
  }

  async function obterHistoricoSincronizacoes() {
    return (await lerHistorico()).slice(0, LIMITE_HISTORICO);
  }

  async function persistirRegistro(registro) {
    const historicoAnterior = await lerHistorico();
    const historico = [registro, ...historicoAnterior]
      .filter((item, indice, lista) => indice === 0 || item.id !== registro.id)
      .slice(0, LIMITE_HISTORICO);
    await storage.setItem(CHAVE_ULTIMA, JSON.stringify(registro));
    await storage.setItem(CHAVE_HISTORICO, JSON.stringify(historico));
  }

  async function precisaSincronizar(intervaloMinutos = 30) {
    const intervalo = Number(intervaloMinutos);
    if (!Number.isFinite(intervalo) || intervalo < 0) {
      throw new TypeError('O intervalo precisa ser um número maior ou igual a zero.');
    }
    const ultima = await obterUltimaSincronizacao();
    if (!ultima?.quando) return true;
    const instante = new Date(ultima.quando).getTime();
    if (!Number.isFinite(instante)) return true;
    const minutosPassados = (agora() - instante) / 60_000;
    return minutosPassados >= intervalo;
  }

  async function sincronizarAgenda(origem = 'manual', opcoes = {}) {
    const origemValida = ['manual', 'voltou ao app', 'background'].includes(origem)
      ? origem
      : 'manual';

    if (sincronizacaoEmAndamento) {
      return {
        id: `ignorada-${agora()}`,
        quando: new Date(agora()).toISOString(),
        origem: origemValida,
        sucesso: false,
        ignorada: true,
        motivo: 'Já existe uma sincronização em andamento.',
        totalConflitos: 0,
        conflitos: [],
        duracaoMs: 0,
      };
    }

    sincronizacaoEmAndamento = true;
    const inicio = agora();
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const sinalCancelamento = criarSinalDeCancelamento();
    const limiteMsInformado = Number(opcoes.tempoLimiteMs ?? tempoLimiteMs);
    const limiteMs = Number.isFinite(limiteMsInformado) && limiteMsInformado > 0
      ? limiteMsInformado
      : TEMPO_LIMITE_PADRAO_MS;
    let temporizador;
    let estourouTempo = false;

    const tarefa = (async () => {
      const resposta = await api.get('/consultas', controller ? { signal: controller.signal } : {});
      if (sinalCancelamento.cancelado) {
        throw new Error('Sincronização interrompida antes do processamento.');
      }
      const consultas = extrairConsultas(resposta);
      const resultado = await detectarConflitosEmFatias(consultas, {
        tamanhoFatia: opcoes.tamanhoFatia ?? tamanhoFatia,
        sinalCancelamento,
      });
      if (resultado?.cancelado || sinalCancelamento.cancelado) {
        throw new Error('Sincronização interrompida antes da conclusão.');
      }
      return {
        id: `${inicio}-${Math.random().toString(36).slice(2, 8)}`,
        quando: new Date(agora()).toISOString(),
        origem: origemValida,
        sucesso: true,
        consultasRecebidas: resultado.consultasRecebidas ?? consultas.length,
        consultasValidas: resultado.consultasValidas ?? consultas.length,
        totalConflitos: Array.isArray(resultado.conflitos) ? resultado.conflitos.length : 0,
        conflitos: Array.isArray(resultado.conflitos) ? resultado.conflitos : [],
        comparacoes: resultado.comparacoes ?? 0,
        duracaoMs: Math.max(0, agora() - inicio),
        erro: null,
      };
    })();

    const limite = new Promise((_, reject) => {
      temporizador = setTimer(() => {
        estourouTempo = true;
        sinalCancelamento.cancelar();
        if (controller) controller.abort();
        const segundosLimite = Math.ceil(limiteMs / 1000);
        const unidadeTempo = segundosLimite === 1 ? 'segundo' : 'segundos';
        const erro = new Error(`A sincronização ultrapassou o limite de ${segundosLimite} ${unidadeTempo}.`);
        erro.name = 'TimeoutError';
        reject(erro);
      }, limiteMs);
    });

    try {
      const registro = await Promise.race([tarefa, limite]);
      await persistirRegistro(registro);
      return registro;
    } catch (erro) {
      const registroFalha = {
        id: `${inicio}-falha-${Math.random().toString(36).slice(2, 8)}`,
        quando: new Date(agora()).toISOString(),
        origem: origemValida,
        sucesso: false,
        tempoEsgotado: estourouTempo || erro?.name === 'TimeoutError',
        consultasRecebidas: 0,
        consultasValidas: 0,
        totalConflitos: 0,
        conflitos: [],
        comparacoes: 0,
        duracaoMs: Math.max(0, agora() - inicio),
        erro: mensagemErro(erro),
      };
      await persistirRegistro(registroFalha);
      return registroFalha;
    } finally {
      if (temporizador) clearTimer(temporizador);
      sincronizacaoEmAndamento = false;
    }
  }

  async function limparHistoricoSincronizacoes() {
    await storage.setItem(CHAVE_ULTIMA, 'null');
    await storage.setItem(CHAVE_HISTORICO, '[]');
  }

  return {
    sincronizarAgenda,
    precisaSincronizar,
    obterUltimaSincronizacao,
    obterHistoricoSincronizacoes,
    limparHistoricoSincronizacoes,
  };
}

module.exports = {
  CHAVE_ULTIMA,
  CHAVE_HISTORICO,
  LIMITE_HISTORICO,
  TEMPO_LIMITE_PADRAO_MS,
  criarServicoSincronizacao,
};
