/**
 * Fachada usada pelo aplicativo. A sincronização não depende de telas,
 * hooks, Alert ou navegação e pode ser chamada pelo TaskManager.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

const { detectarConflitosEmFatias } = require('./processamento');
const { criarServicoSincronizacao } = require('./sincronizacaoCore');

const servico = criarServicoSincronizacao({
  api,
  storage: AsyncStorage,
  detectarConflitosEmFatias,
  tempoLimiteMs: 25_000,
  tamanhoFatia: 100,
});

export const sincronizarAgenda = servico.sincronizarAgenda;
export const precisaSincronizar = servico.precisaSincronizar;
export const obterUltimaSincronizacao = servico.obterUltimaSincronizacao;
export const obterHistoricoSincronizacoes = servico.obterHistoricoSincronizacoes;
export const limparHistoricoSincronizacoes = servico.limparHistoricoSincronizacoes;
