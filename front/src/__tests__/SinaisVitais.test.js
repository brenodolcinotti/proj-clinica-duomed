import React from 'react';

import {
  render,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react-native';

import SinaisVitais from '../screens/SinaisVitais/SinaisVitais';
import criarServicoBle from '../services/bluetooth';

jest.mock('../services/bluetooth', () => ({
  __esModule: true,
  default: jest.fn(),
  BLE_MODO_SIMULADO: true,
}));

describe('Tela de Sinais Vitais - Falhas Bluetooth', () => {
  let callbacks;
  let servicoBle;
  let navigation;

  beforeEach(() => {
    jest.clearAllMocks();

    callbacks = {};

    servicoBle = {
      solicitarPermissoes: jest.fn().mockResolvedValue(true),

      procurar: jest.fn((aoEncontrar, aoTerminar, aoErro) => {
        callbacks.aoEncontrar = aoEncontrar;
        callbacks.aoTerminar = aoTerminar;
        callbacks.aoErroBusca = aoErro;
      }),

      pararBusca: jest.fn(),

      conectar: jest.fn().mockResolvedValue(true),

      monitorarFrequencia: jest.fn((aoReceber, aoErrar) => {
        callbacks.aoReceber = aoReceber;
        callbacks.aoErrar = aoErrar;
      }),

      desconectar: jest.fn().mockResolvedValue(undefined),
    };

    criarServicoBle.mockReturnValue(servicoBle);

    navigation = {
      addListener: jest.fn(() => jest.fn()),
      navigate: jest.fn(),
    };
  });

  test('deve informar quando nenhum equipamento Bluetooth for encontrado', async () => {
    const { getByText } = await render(
      <SinaisVitais navigation={navigation} />
    );

    await fireEvent.press(
      getByText('Procurar equipamentos (BLE)')
    );

    await waitFor(() => {
      expect(servicoBle.procurar).toHaveBeenCalled();
    });

    await act(async () => {
      callbacks.aoTerminar();
    });

    expect(
      getByText(
        'Nenhum equipamento encontrado. Verifique o aparelho e o Bluetooth. Você também pode digitar os valores manualmente.'
      )
    ).toBeTruthy();

    expect(
      getByText('Digitar os valores manualmente')
    ).toBeTruthy();
  });

  test('deve exibir mensagem quando ocorrer falha ao conectar ao equipamento', async () => {
    servicoBle.conectar.mockRejectedValue(
      new Error('Falha na conexão Bluetooth.')
    );

    const { getByText, getByLabelText } = await render(
      <SinaisVitais navigation={navigation} />
    );

    await fireEvent.press(
      getByText('Procurar equipamentos (BLE)')
    );

    await waitFor(() => {
      expect(servicoBle.procurar).toHaveBeenCalled();
    });

    await act(async () => {
      callbacks.aoEncontrar({
        id: 'TESTE-001',
        name: 'Oxímetro de teste',
      });

      callbacks.aoTerminar();
    });

    await fireEvent.press(
      getByLabelText('Conectar a Oxímetro de teste')
    );

    await waitFor(() => {
      expect(
        getByText('Falha na conexão Bluetooth.')
      ).toBeTruthy();
    });

    expect(servicoBle.desconectar).toHaveBeenCalled();

    expect(
      getByText('Digitar os valores manualmente')
    ).toBeTruthy();
  });

  test('deve encerrar a conexão e informar quando o Bluetooth for interrompido', async () => {
    const { getByText, getByLabelText } = await render(
      <SinaisVitais navigation={navigation} />
    );

    await fireEvent.press(
      getByText('Procurar equipamentos (BLE)')
    );

    await waitFor(() => {
      expect(servicoBle.procurar).toHaveBeenCalled();
    });

    await act(async () => {
      callbacks.aoEncontrar({
        id: 'TESTE-002',
        name: 'Monitor cardíaco de teste',
      });

      callbacks.aoTerminar();
    });

    await fireEvent.press(
      getByLabelText('Conectar a Monitor cardíaco de teste')
    );

    await waitFor(() => {
      expect(
        servicoBle.monitorarFrequencia
      ).toHaveBeenCalled();
    });

    await act(async () => {
      callbacks.aoErrar(
        new Error('A conexão foi perdida durante a leitura.')
      );
    });

    await waitFor(() => {
      expect(
        getByText('A conexão foi perdida durante a leitura.')
      ).toBeTruthy();
    });

    expect(servicoBle.desconectar).toHaveBeenCalled();

    expect(
      getByText('Digitar os valores manualmente')
    ).toBeTruthy();
  });

  test('deve permitir acessar a digitação manual após uma busca sem dispositivos', async () => {
    const { getByText } = await render(
      <SinaisVitais navigation={navigation} />
    );

    await fireEvent.press(
      getByText('Procurar equipamentos (BLE)')
    );

    await waitFor(() => {
      expect(servicoBle.procurar).toHaveBeenCalled();
    });

    await act(async () => {
      callbacks.aoTerminar();
    });

    await fireEvent.press(
      getByText('Digitar os valores manualmente')
    );

    expect(navigation.navigate).toHaveBeenCalledWith(
      'SinaisVitaisManual'
    );
  });
});
