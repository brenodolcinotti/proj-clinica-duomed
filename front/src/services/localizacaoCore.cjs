'use strict';

async function obterPosicaoAtualComApi(locationApi) {
  let permissao = await locationApi.getForegroundPermissionsAsync();

  if (permissao.status !== 'granted') {
    permissao = await locationApi.requestForegroundPermissionsAsync();
  }

  if (permissao.status !== 'granted') {
    const erro = new Error(
      'A permissão de localização não foi concedida. O mapa da clínica continua disponível.'
    );
    erro.code = 'PERMISSAO_LOCALIZACAO_NEGADA';
    erro.canAskAgain = permissao.canAskAgain !== false;
    throw erro;
  }

  const atual = await locationApi.getCurrentPositionAsync({
    accuracy: locationApi.Accuracy.Balanced,
  });

  return {
    latitude: atual.coords.latitude,
    longitude: atual.coords.longitude,
    accuracy: atual.coords.accuracy ?? null,
    timestamp: atual.timestamp,
  };
}

module.exports = { obterPosicaoAtualComApi };
