'use strict';

const RAIO_TERRA_KM = 6371.0088;

function validarCoordenada(coordenada, nome = 'coordenada') {
  if (!coordenada || typeof coordenada !== 'object') {
    throw new TypeError(`${nome} deve conter latitude e longitude.`);
  }

  const { latitude, longitude } = coordenada;
  const latitudeValida = Number.isFinite(latitude) && latitude >= -90 && latitude <= 90;
  const longitudeValida = Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;

  if (!latitudeValida || !longitudeValida) {
    throw new RangeError(`${nome} possui latitude ou longitude inválida.`);
  }

  return { latitude, longitude };
}

function calcularDistanciaKm(origem, destino) {
  const a = validarCoordenada(origem, 'origem');
  const b = validarCoordenada(destino, 'destino');
  const radianos = (graus) => (graus * Math.PI) / 180;
  const deltaLatitude = radianos(b.latitude - a.latitude);
  const deltaLongitude = radianos(b.longitude - a.longitude);
  const latitudeA = radianos(a.latitude);
  const latitudeB = radianos(b.latitude);

  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(deltaLongitude / 2) ** 2;
  const arco = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return RAIO_TERRA_KM * arco;
}

function criarRegiaoInicial(clinica, delta = 0.01) {
  const coordenada = validarCoordenada(clinica, 'clínica');
  if (!Number.isFinite(delta) || delta <= 0) {
    throw new RangeError('O delta do mapa deve ser um número positivo.');
  }

  return {
    latitude: coordenada.latitude,
    longitude: coordenada.longitude,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}

function formatarDistanciaKm(distanciaKm) {
  if (!Number.isFinite(distanciaKm) || distanciaKm < 0) return 'Distância indisponível';
  if (distanciaKm < 1) return `${Math.round(distanciaKm * 1000)} m em linha reta`;
  return `${distanciaKm.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km em linha reta`;
}

function criarUrlNavegacaoMaps(plataforma, coordenada, nomeClinica) {
  const ponto = validarCoordenada(coordenada, 'clínica');
  const nome = encodeURIComponent(String(nomeClinica || 'Clínica'));

  if (plataforma === 'ios') {
    return `maps:0,0?q=${nome}@${ponto.latitude},${ponto.longitude}`;
  }

  return `geo:0,0?q=${ponto.latitude},${ponto.longitude}(${nome})`;
}

function criarUrlFallbackMaps(coordenada) {
  const ponto = validarCoordenada(coordenada, 'clínica');
  const destino = encodeURIComponent(`${ponto.latitude},${ponto.longitude}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${destino}`;
}

module.exports = {
  validarCoordenada,
  calcularDistanciaKm,
  criarRegiaoInicial,
  formatarDistanciaKm,
  criarUrlNavegacaoMaps,
  criarUrlFallbackMaps,
};
