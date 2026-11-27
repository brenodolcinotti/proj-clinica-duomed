
const {
  obterPosicaoAtualComApi,
} = require('../services/localizacaoCore.cjs');

describe('Serviço de localização - DuoMed', () => {
  let locationApi;

  beforeEach(() => {
    locationApi = {
      Accuracy: {
        Balanced: 3,
      },

      getForegroundPermissionsAsync: jest.fn(),
      requestForegroundPermissionsAsync: jest.fn(),
      getCurrentPositionAsync: jest.fn(),
    };
  });

  test('deve obter a localização quando a permissão já foi concedida', async () => {
    locationApi.getForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
    });

    locationApi.getCurrentPositionAsync.mockResolvedValue({
      coords: {
        latitude: -22.01,
        longitude: -47.89,
        accuracy: 10,
      },
      timestamp: 123456,
    });

    const resultado = await obterPosicaoAtualComApi(locationApi);

    expect(resultado.latitude).toBe(-22.01);
    expect(resultado.longitude).toBe(-47.89);

    expect(
      locationApi.requestForegroundPermissionsAsync
    ).not.toHaveBeenCalled();

    expect(
      locationApi.getCurrentPositionAsync
    ).toHaveBeenCalled();
  });

  test('deve retornar erro quando o paciente negar a permissão de GPS', async () => {
    locationApi.getForegroundPermissionsAsync.mockResolvedValue({
      status: 'denied',
    });

    locationApi.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'denied',
      canAskAgain: true,
    });

    await expect(
      obterPosicaoAtualComApi(locationApi)
    ).rejects.toMatchObject({
      code: 'PERMISSAO_LOCALIZACAO_NEGADA',
      canAskAgain: true,
    });

    expect(
      locationApi.requestForegroundPermissionsAsync
    ).toHaveBeenCalled();

    expect(
      locationApi.getCurrentPositionAsync
    ).not.toHaveBeenCalled();
  });

  test('deve identificar quando a permissão não pode mais ser solicitada', async () => {
    locationApi.getForegroundPermissionsAsync.mockResolvedValue({
      status: 'denied',
    });

    locationApi.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'denied',
      canAskAgain: false,
    });

    await expect(
      obterPosicaoAtualComApi(locationApi)
    ).rejects.toMatchObject({
      code: 'PERMISSAO_LOCALIZACAO_NEGADA',
      canAskAgain: false,
    });

    expect(
      locationApi.getCurrentPositionAsync
    ).not.toHaveBeenCalled();
  });
});
