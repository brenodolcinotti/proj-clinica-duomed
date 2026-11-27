
import { api, BASE_URL } from '../services/api';
import { obterToken } from '../services/sessao';

jest.mock('../services/sessao', () => ({
  obterToken: jest.fn(),
}));

describe('Serviço de API - DuoMed', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    global.fetch = jest.fn();

    obterToken.mockResolvedValue('token-teste-123');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('deve realizar uma requisição GET com sucesso', async () => {
    const dados = [
      { id: 1, nome: 'Paciente teste' },
    ];

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(dados),
    });

    const resultado = await api.get('/pacientes');

    expect(resultado).toEqual(dados);

    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/pacientes`,
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-teste-123',
        }),
      })
    );
  });

  test('deve identificar quando o servidor estiver indisponível', async () => {
    global.fetch.mockRejectedValue(
      new TypeError('Network request failed')
    );

    await expect(
      api.get('/pacientes')
    ).rejects.toThrow('Network request failed');

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('deve informar erro quando a API retornar status 500', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    await expect(
      api.get('/pacientes')
    ).rejects.toThrow('Erro na API: 500');
  });

  test('deve identificar sessão expirada quando a API retornar 401', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 401,
    });

    try {
      await api.get('/pacientes');

      throw new Error('Era esperado que a requisição falhasse.');
    } catch (erro) {
      expect(erro.name).toBe('SessaoExpirada');
      expect(erro.message).toBe(
        'Sessão expirada. Faça login novamente.'
      );
    }
  });

  test('deve realizar requisição POST enviando os dados em JSON', async () => {
    const paciente = {
      nome: 'Paciente teste',
      email: 'teste@duomed.com',
    };

    global.fetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: jest.fn().mockResolvedValue({
        id: 10,
        ...paciente,
      }),
    });

    const resultado = await api.post(
      '/pacientes',
      paciente
    );

    expect(resultado).toEqual({
      id: 10,
      ...paciente,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/pacientes`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(paciente),
      })
    );
  });

  test('deve retornar null quando a API responder com status 204', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 204,
    });

    const resultado = await api.remover('/pacientes/10');

    expect(resultado).toBeNull();
  });

  test('deve realizar atualização PUT enviando os dados em JSON', async () => {
    const paciente = {
      nome: 'Paciente atualizado',
    };

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        id: 10,
        ...paciente,
      }),
    });

    const resultado = await api.put(
      '/pacientes/10',
      paciente
    );

    expect(resultado).toEqual({
      id: 10,
      ...paciente,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/pacientes/10`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(paciente),
      })
    );
  });
});
