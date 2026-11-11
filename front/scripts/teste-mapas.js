'use strict';

const assert = require('node:assert/strict');
const {
  validarCoordenada,
  calcularDistanciaKm,
  criarRegiaoInicial,
  formatarDistanciaKm,
  criarUrlNavegacaoMaps,
  criarUrlFallbackMaps,
} = require('../src/services/mapaUtils.cjs');
const { obterPosicaoAtualComApi } = require('../src/services/localizacaoCore.cjs');

let aprovados = 0;
async function teste(nome, executar) {
  try {
    await executar();
    aprovados += 1;
    console.log(`✓ ${nome}`);
  } catch (erro) {
    console.error(`✗ ${nome}`);
    throw erro;
  }
}

async function executarTestes() {
const CLINICA_TESTE = {
  latitude: -22.7256,
  longitude: -47.6476,
};

await teste('valida coordenada dentro dos limites geográficos', () => {
  assert.deepEqual(validarCoordenada(CLINICA_TESTE), CLINICA_TESTE);
});

await teste('rejeita latitude fora do intervalo -90 a 90', () => {
  assert.throws(() => validarCoordenada({ latitude: 91, longitude: 0 }), RangeError);
});

await teste('rejeita longitude fora do intervalo -180 a 180', () => {
  assert.throws(() => validarCoordenada({ latitude: 0, longitude: -181 }), RangeError);
});

await teste('distância entre o mesmo ponto é zero', () => {
  assert.equal(calcularDistanciaKm(CLINICA_TESTE, CLINICA_TESTE), 0);
});

await teste('distância de um grau de latitude é aproximadamente 111,2 km', () => {
  const distancia = calcularDistanciaKm(
    { latitude: 0, longitude: 0 },
    { latitude: 1, longitude: 0 }
  );
  assert.ok(distancia > 111 && distancia < 112, `distância calculada: ${distancia}`);
});

await teste('região inicial centraliza na clínica com delta 0.01', () => {
  assert.deepEqual(criarRegiaoInicial(CLINICA_TESTE), {
    latitude: -22.7256,
    longitude: -47.6476,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
});

await teste('rejeita delta inválido para a região', () => {
  assert.throws(() => criarRegiaoInicial(CLINICA_TESTE, 0), RangeError);
});

await teste('formata distância inferior a 1 km em metros', () => {
  assert.equal(formatarDistanciaKm(0.45), '450 m em linha reta');
});

await teste('formata distância a partir de 1 km', () => {
  assert.equal(formatarDistanciaKm(2.5), '2,5 km em linha reta');
});

await teste('gera esquema geo: para Android com nome codificado', () => {
  const url = criarUrlNavegacaoMaps('android', CLINICA_TESTE, 'Clínica DuoMed & Saúde');
  assert.equal(
    url,
    'geo:0,0?q=-22.7256,-47.6476(Cl%C3%ADnica%20DuoMed%20%26%20Sa%C3%BAde)'
  );
});

await teste('gera esquema maps: para iOS com nome codificado', () => {
  const url = criarUrlNavegacaoMaps('ios', CLINICA_TESTE, 'Clínica DuoMed');
  assert.equal(
    url,
    'maps:0,0?q=Cl%C3%ADnica%20DuoMed@-22.7256,-47.6476'
  );
});

await teste('gera fallback web para navegação', () => {
  assert.equal(
    criarUrlFallbackMaps(CLINICA_TESTE),
    'https://www.google.com/maps/dir/?api=1&destination=-22.7256%2C-47.6476'
  );
});

await teste('solicita permissão em primeiro plano quando ainda não foi concedida', async () => {
  let solicitou = false;
  const apiFake = {
    Accuracy: { Balanced: 'balanced' },
    getForegroundPermissionsAsync: async () => ({ status: 'denied' }),
    requestForegroundPermissionsAsync: async () => {
      solicitou = true;
      return { status: 'granted' };
    },
    getCurrentPositionAsync: async (opcoes) => {
      assert.equal(opcoes.accuracy, 'balanced');
      return { coords: { latitude: -22, longitude: -47, accuracy: 12 }, timestamp: 123 };
    },
  };
  const posicao = await obterPosicaoAtualComApi(apiFake);
  assert.equal(solicitou, true);
  assert.deepEqual(posicao, { latitude: -22, longitude: -47, accuracy: 12, timestamp: 123 });
});

await teste('não pede permissão novamente quando já está concedida', async () => {
  let solicitou = false;
  const apiFake = {
    Accuracy: { Balanced: 'balanced' },
    getForegroundPermissionsAsync: async () => ({ status: 'granted' }),
    requestForegroundPermissionsAsync: async () => { solicitou = true; return { status: 'granted' }; },
    getCurrentPositionAsync: async () => ({ coords: { latitude: 1, longitude: 2 }, timestamp: 456 }),
  };
  const posicao = await obterPosicaoAtualComApi(apiFake);
  assert.equal(solicitou, false);
  assert.equal(posicao.latitude, 1);
  assert.equal(posicao.longitude, 2);
});

await teste('retorna erro identificável quando a permissão é negada', async () => {
  const apiFake = {
    Accuracy: { Balanced: 'balanced' },
    getForegroundPermissionsAsync: async () => ({ status: 'denied' }),
    requestForegroundPermissionsAsync: async () => ({ status: 'denied', canAskAgain: false }),
    getCurrentPositionAsync: async () => { throw new Error('não deveria obter GPS'); },
  };
  await assert.rejects(
    obterPosicaoAtualComApi(apiFake),
    (erro) => erro.code === 'PERMISSAO_LOCALIZACAO_NEGADA' && erro.canAskAgain === false
  );
});

console.log(`\n${aprovados} testes de mapas/localização aprovados.`);
}

executarTestes().catch((erro) => {
  console.error('Falha na suíte de mapas:', erro);
  process.exitCode = 1;
});
