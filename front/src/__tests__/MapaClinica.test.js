
import React from 'react';

import {
  render,
  fireEvent,
  waitFor,
} from '@testing-library/react-native';

import { Linking } from 'react-native';

import MapaClinica from '../screens/Clinica/MapaClinica';
import { CLINICA } from '../config/clinica';

import { obterPosicaoAtual } from '../services/localizacao';

jest.mock('../services/localizacao', () => ({
  obterPosicaoAtual: jest.fn(),
}));

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');

  const ComponenteMapa = ({ children }) =>
    React.createElement(View, null, children);

  return {
    __esModule: true,
    default: ComponenteMapa,
    Marker: ComponenteMapa,
    Callout: ComponenteMapa,
    UrlTile: ComponenteMapa,
  };
});

describe('Tela do mapa da clínica - DuoMed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('deve manter endereço e telefone da clínica visíveis', async () => {
    const { getAllByText } = await render(<MapaClinica />);

    expect(
      getAllByText(CLINICA.nome).length
    ).toBeGreaterThan(0);

    expect(
      getAllByText(CLINICA.endereco).length
    ).toBeGreaterThan(0);

    expect(
      getAllByText(CLINICA.telefone).length
    ).toBeGreaterThan(0);
  });

  test('deve exibir mensagem quando a permissão de GPS for negada', async () => {
    const erro = new Error('Permissão de localização negada.');
    erro.code = 'PERMISSAO_LOCALIZACAO_NEGADA';

    obterPosicaoAtual.mockRejectedValue(erro);

    const { getByText } = await render(<MapaClinica />);

    await fireEvent.press(getByText('Onde estou?'));

    await waitFor(() => {
      expect(
        getByText(
          'A localização foi negada. Você ainda pode consultar o endereço e abrir a clínica no aplicativo de mapas.'
        )
      ).toBeTruthy();
    });
  });

  test('deve manter endereço e telefone mesmo após a negativa do GPS', async () => {
    const erro = new Error('Permissão negada.');
    erro.code = 'PERMISSAO_LOCALIZACAO_NEGADA';

    obterPosicaoAtual.mockRejectedValue(erro);

    const { getByText, getAllByText } = await render(
      <MapaClinica />
    );

    await fireEvent.press(getByText('Onde estou?'));

    await waitFor(() => {
      expect(
        getAllByText(CLINICA.endereco).length
      ).toBeGreaterThan(0);

      expect(
        getAllByText(CLINICA.telefone).length
      ).toBeGreaterThan(0);
    });
  });

  test('deve disponibilizar o botão para abrir as configurações', async () => {
    const erro = new Error('Permissão negada.');
    erro.code = 'PERMISSAO_LOCALIZACAO_NEGADA';

    obterPosicaoAtual.mockRejectedValue(erro);

    const { getByText, getByLabelText } = await render(
      <MapaClinica />
    );

    await fireEvent.press(getByText('Onde estou?'));

    await waitFor(() => {
      expect(
        getByLabelText(
          'Abrir configurações do aplicativo para permitir localização'
        )
      ).toBeTruthy();
    });
  });

  test('deve abrir as configurações quando o botão for pressionado', async () => {
    const erro = new Error('Permissão negada.');
    erro.code = 'PERMISSAO_LOCALIZACAO_NEGADA';

    obterPosicaoAtual.mockRejectedValue(erro);

    const abrirConfiguracoesSpy = jest
      .spyOn(Linking, 'openSettings')
      .mockResolvedValue();

    try {
      const { getByText, getByLabelText } = await render(
        <MapaClinica />
      );

      await fireEvent.press(getByText('Onde estou?'));

      const botaoConfiguracoes = await waitFor(() =>
        getByLabelText(
          'Abrir configurações do aplicativo para permitir localização'
        )
      );

      await fireEvent.press(botaoConfiguracoes);

      await waitFor(() => {
        expect(abrirConfiguracoesSpy).toHaveBeenCalled();
      });
    } finally {
      abrirConfiguracoesSpy.mockRestore();
    }
  });
});
