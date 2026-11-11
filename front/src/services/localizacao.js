import * as Location from 'expo-location';

const { obterPosicaoAtualComApi } = require('./localizacaoCore.cjs');

/**
 * Obtém a posição atual do aparelho, pedindo permissão em primeiro plano
 * quando necessário. Não solicita rastreamento em background.
 */
export async function obterPosicaoAtual() {
  return obterPosicaoAtualComApi(Location);
}
