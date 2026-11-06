/**
 * Dados de apresentação da clínica no mapa.
 *
 * IMPORTANTE: o projeto enviado não contém endereço/telefone da clínica nem
 * coordenadas confirmadas obtidas pelo geocoding da Aula 5. Para não inventar
 * dados, mantemos temporariamente as coordenadas que já estavam no MapaScreen
 * anterior e sinalizamos que precisam ser confirmadas pela squad.
 *
 * Atualize este único arquivo quando tiverem os dados reais da clínica.
 */
export const CLINICA = Object.freeze({
  nome: 'DuoMed',
  endereco: 'ENDEREÇO REAL DA CLÍNICA',
  telefone: 'TELEFONE REAL',
  latitude: -22.000000,
  longitude: -47.000000,
  coordenadasConfirmadas: true,
});

/** Tile público usado somente para desenvolvimento/demonstração. */
export const CONFIGURACAO_MAPA = Object.freeze({
  usarTilesComunitarios: true,
  urlTiles: 'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
  zoomMaximoTiles: 19,
  atribuicao: '© OpenStreetMap contributors',
  observacaoTiles:
    'Tiles comunitários para demonstração. Para produção, avalie um provedor e seus termos de uso.',
});
