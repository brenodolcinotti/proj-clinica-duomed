const assert = require('node:assert/strict');
const {
  criarServicoSincronizacao,
  CHAVE_ULTIMA,
  CHAVE_HISTORICO,
} = require('../src/services/sincronizacaoCore');
const { detectarConflitosEmFatias } = require('../src/services/processamento');

class ArmazenamentoMemoria {
  constructor() { this.dados = new Map(); }
  async getItem(chave) { return this.dados.has(chave) ? this.dados.get(chave) : null; }
  async setItem(chave, valor) { this.dados.set(chave, String(valor)); }
}

function criarConsulta(id, medicoId, horario, duracaoMinutos = 30) {
  return { id: String(id), medicoId: String(medicoId), data: '2026-11-05', horario, duracaoMinutos, status: 'Agendada' };
}

async function executar() {
  let agoraMs = Date.parse('2026-11-05T12:00:00.000Z');
  const storage = new ArmazenamentoMemoria();
  const consultas = [
    criarConsulta(1, 7, '09:00', 60),
    criarConsulta(2, 7, '09:30', 30), // conflito com a primeira
    criarConsulta(3, 8, '09:00', 30), // outro médico: sem conflito
    criarConsulta(4, 7, '10:00', 30), // sequência exata: sem conflito
  ];
  const api = { async get(endpoint) { assert.equal(endpoint, '/consultas'); return consultas; } };
  const servico = criarServicoSincronizacao({
    api,
    storage,
    detectarConflitosEmFatias,
    agora: () => agoraMs,
    tempoLimiteMs: 1000,
    tamanhoFatia: 1,
  });

  // 1. Sincronização completa e integração real com o algoritmo da Aula 10.
  const sucesso = await servico.sincronizarAgenda('manual');
  assert.equal(sucesso.sucesso, true);
  assert.equal(sucesso.origem, 'manual');
  assert.equal(sucesso.consultasRecebidas, 4);
  assert.equal(sucesso.totalConflitos, 1);
  assert.ok(sucesso.comparacoes >= 1);

  const ultimaSalva = JSON.parse(await storage.getItem(CHAVE_ULTIMA));
  const historicoSalvo = JSON.parse(await storage.getItem(CHAVE_HISTORICO));
  assert.equal(ultimaSalva.id, sucesso.id);
  assert.equal(historicoSalvo[0].origem, 'manual');
  assert.equal(await servico.precisaSincronizar(30), false);

  // 2. Intervalo mínimo: torna-se elegível somente depois do intervalo.
  agoraMs += 31 * 60 * 1000;
  assert.equal(await servico.precisaSincronizar(30), true);

  // 3. Erro da API é tratado e também registrado em disco.
  const storageErro = new ArmazenamentoMemoria();
  const servicoErro = criarServicoSincronizacao({
    api: { async get() { throw new Error('API indisponível no teste'); } },
    storage: storageErro,
    detectarConflitosEmFatias,
    agora: () => agoraMs,
  });
  const falha = await servicoErro.sincronizarAgenda('background');
  assert.equal(falha.sucesso, false);
  assert.match(falha.erro, /API indisponível no teste/);
  assert.equal(JSON.parse(await storageErro.getItem(CHAVE_HISTORICO))[0].origem, 'background');

  // 4. Timeout cancela a requisição via AbortSignal e gera registro de falha.
  const storageTimeout = new ArmazenamentoMemoria();
  let abortado = false;
  const apiLenta = {
    get(_endpoint, opcoes) {
      return new Promise((_, reject) => {
        opcoes.signal.addEventListener('abort', () => {
          abortado = true;
          const erro = new Error('aborted');
          erro.name = 'AbortError';
          reject(erro);
        });
      });
    },
  };
  const servicoTimeout = criarServicoSincronizacao({
    api: apiLenta,
    storage: storageTimeout,
    detectarConflitosEmFatias,
    agora: () => agoraMs,
    tempoLimiteMs: 15,
  });
  const timeout = await servicoTimeout.sincronizarAgenda('background');
  assert.equal(timeout.sucesso, false);
  assert.equal(timeout.tempoEsgotado, true);
  assert.equal(abortado, true);
  assert.match(timeout.erro, /limite de 1 segundo/);

  // 5. Histórico sempre fica limitado às 20 entradas mais recentes.
  const storageLimite = new ArmazenamentoMemoria();
  const registrosAntigos = Array.from({ length: 25 }, (_, i) => ({
    id: `antigo-${i}`, quando: new Date(agoraMs - i * 1000).toISOString(), origem: 'manual', sucesso: true,
  }));
  await storageLimite.setItem(CHAVE_HISTORICO, JSON.stringify(registrosAntigos));
  const servicoLimite = criarServicoSincronizacao({
    api,
    storage: storageLimite,
    detectarConflitosEmFatias,
    agora: () => agoraMs,
  });
  await servicoLimite.sincronizarAgenda('voltou ao app');
  assert.equal((await servicoLimite.obterHistoricoSincronizacoes()).length, 20);
  assert.equal((await servicoLimite.obterHistoricoSincronizacoes())[0].origem, 'voltou ao app');

  console.log('OK — sincronização manual: 1 conflito encontrado com o algoritmo da Aula 10.');
  console.log('OK — última execução e histórico gravados no armazenamento simulado.');
  console.log('OK — intervalo mínimo de 30 minutos respeitado.');
  console.log('OK — falha da API persistida com origem background.');
  console.log('OK — timeout cancelou a requisição e persistiu falha.');
  console.log('OK — histórico limitado às 20 entradas mais recentes.');
}

executar().catch((erro) => {
  console.error('FALHA NOS TESTES:', erro);
  process.exitCode = 1;
});
