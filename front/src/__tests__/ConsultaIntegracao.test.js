
import React from 'react';

import {
  render,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react-native';

import { Alert } from 'react-native';

import CadastroEdicaoConsultaScreen from '../screens/Consulta/CadastroEdicaoConsultaScreen';
import Consulta from '../screens/Consulta/Consulta';

import { api } from '../services/api';

import {
  agendarLembrete,
  cancelarLembrete,
} from '../services/lembretes';

jest.mock('../services/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    remover: jest.fn(),
  },
}));

jest.mock('../services/lembretes', () => ({
  agendarLembrete: jest.fn(),
  cancelarLembrete: jest.fn(),
  testarNotificacao: jest.fn(),
  testarLembreteEm10Segundos: jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
  const React = require('react');

  return {
    useFocusEffect: callback => {
      React.useEffect(() => {
        const cleanup = callback();

        return () => {
          if (typeof cleanup === 'function') {
            cleanup();
          }
        };
      }, [callback]);
    },
  };
});

jest.mock('@react-native-picker/picker', () => {
  const React = require('react');

  const {
    TouchableOpacity,
    Text,
    View,
  } = require('react-native');

  const Picker = ({
    children,
    onValueChange,
    selectedValue,
  }) => (
    <View>
      <Text testID={`valor-selecionado-${String(selectedValue ?? '')}`}>
        {String(selectedValue ?? '')}
      </Text>

      {React.Children.map(children, child => {
        if (!child) return null;

        return (
          <TouchableOpacity
            testID={`opcao-${String(child.props.value)}`}
            onPress={() => onValueChange(child.props.value)}
          >
            <Text>{child.props.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  Picker.Item = () => null;

  return { Picker };
});

describe('Integração - Consultas DuoMed', () => {
  const navigation = {
    goBack: jest.fn(),
    navigate: jest.fn(),
    replace: jest.fn(),
    reset: jest.fn(),
  };

  const pacientes = [
    { id: 1, nome: 'Maria Silva' },
  ];

  const medicos = [
    {
      id: 2,
      nome: 'Dr. João Silva',
      especialidade: 'Cardiologia',
    },
  ];

  const consulta = {
    id: 10,
    pacienteId: 1,
    medicoId: 2,
    data: '2026-12-10',
    horario: '14:30',
    status: 'Agendada',
  };

  let alertaSpy;

  beforeEach(() => {
    jest.clearAllMocks();

    api.get.mockImplementation(async rota => {
      if (rota === '/pacientes') return pacientes;
      if (rota === '/medicos') return medicos;
      if (rota === '/consultas') return [consulta];

      return [];
    });

    api.post.mockResolvedValue({
      id: 20,
      pacienteId: '1',
      medicoId: '2',
      data: '2026-12-10',
      horario: '14:30',
      status: 'Agendada',
    });

    api.put.mockResolvedValue(undefined);
    api.remover.mockResolvedValue(undefined);

    agendarLembrete.mockResolvedValue({
      agendado: true,
      identificador: 'lembrete-20',
    });

    cancelarLembrete.mockResolvedValue(undefined);

    alertaSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alertaSpy.mockRestore();
  });

  test('deve impedir o agendamento quando os campos estiverem vazios', async () => {
    const { getByText } = await render(
      <CadastroEdicaoConsultaScreen
        route={{ params: {} }}
        navigation={navigation}
      />
    );

    await waitFor(() => {
      expect(getByText('Salvar consulta')).toBeTruthy();
    });

    await fireEvent.press(getByText('Salvar consulta'));

    expect(alertaSpy).toHaveBeenCalledWith(
      'Atenção',
      'Preencha paciente, médico, data e horário.'
    );

    expect(api.post).not.toHaveBeenCalled();
  });

  test('deve cadastrar uma consulta e configurar o lembrete', async () => {
    const {
      getByText,
      getByPlaceholderText,
      getByTestId,
    } = await render(
      <CadastroEdicaoConsultaScreen
        route={{ params: {} }}
        navigation={navigation}
      />
    );

    await waitFor(() => {
      expect(getByText('Salvar consulta')).toBeTruthy();
    });

    await fireEvent.press(getByTestId('opcao-1'));
    await fireEvent.press(getByTestId('opcao-2'));

    await fireEvent.changeText(
      getByPlaceholderText('AAAA-MM-DD'),
      '2026-12-10'
    );

    await fireEvent.changeText(
      getByPlaceholderText('HH:MM'),
      '14:30'
    );

    await fireEvent.press(getByText('Salvar consulta'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/consultas',
        expect.objectContaining({
          pacienteId: '1',
          medicoId: '2',
          data: '2026-12-10',
          horario: '14:30',
          status: 'Agendada',
        })
      );

      expect(agendarLembrete).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 20,
        })
      );
    });

    expect(alertaSpy).toHaveBeenCalledWith(
      'Consulta salva',
      expect.stringContaining('cadastrada'),
      expect.any(Array)
    );
  });

  test('deve informar erro quando a API falhar ao cadastrar', async () => {
    api.post.mockRejectedValue(
      new Error('Servidor indisponível')
    );

    const {
      getByText,
      getByPlaceholderText,
      getByTestId,
    } = await render(
      <CadastroEdicaoConsultaScreen
        route={{ params: {} }}
        navigation={navigation}
      />
    );

    await waitFor(() => {
      expect(getByText('Salvar consulta')).toBeTruthy();
    });

    await fireEvent.press(getByTestId('opcao-1'));
    await fireEvent.press(getByTestId('opcao-2'));

    await fireEvent.changeText(
      getByPlaceholderText('AAAA-MM-DD'),
      '2026-12-10'
    );

    await fireEvent.changeText(
      getByPlaceholderText('HH:MM'),
      '14:30'
    );

    await fireEvent.press(getByText('Salvar consulta'));

    await waitFor(() => {
      expect(alertaSpy).toHaveBeenCalledWith(
        'Erro',
        'Servidor indisponível'
      );
    });

    expect(agendarLembrete).not.toHaveBeenCalled();
  });

  test('deve cancelar uma consulta e remover seu lembrete', async () => {
    const tela = await render(
      <Consulta navigation={navigation} />
    );

    await waitFor(() => {
      expect(tela.getByText('Maria Silva')).toBeTruthy();
      expect(tela.queryByTestId('consulta-carregando')).toBeNull();
    });

    await fireEvent.press(tela.getByText('Cancelar'));

    const chamadaAlerta = alertaSpy.mock.calls.find(
      chamada => chamada[0] === 'Cancelar consulta'
    );

    expect(chamadaAlerta).toBeTruthy();

    const confirmar = chamadaAlerta[2].find(
      botao => botao.text === 'Cancelar consulta'
    );

    await act(async () => {
      await confirmar.onPress();
    });

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/consultas/10',
        expect.objectContaining({
          status: 'Cancelada',
        })
      );

      expect(cancelarLembrete).toHaveBeenCalledWith(10);
    });

    expect(alertaSpy).toHaveBeenCalledWith(
      'Consulta cancelada',
      expect.any(String),
      expect.any(Array)
    );

    await tela.unmount();
  });

  test('deve informar erro quando a API falhar ao cancelar', async () => {
    api.put.mockRejectedValue(
      new Error('Falha ao atualizar consulta')
    );

    const tela = await render(
      <Consulta navigation={navigation} />
    );

    await waitFor(() => {
      expect(tela.getByText('Maria Silva')).toBeTruthy();
      expect(tela.queryByTestId('consulta-carregando')).toBeNull();
    });

    await fireEvent.press(tela.getByText('Cancelar'));

    const chamadaAlerta = alertaSpy.mock.calls.find(
      chamada => chamada[0] === 'Cancelar consulta'
    );

    expect(chamadaAlerta).toBeTruthy();

    const confirmar = chamadaAlerta[2].find(
      botao => botao.text === 'Cancelar consulta'
    );

    await act(async () => {
      await confirmar.onPress();
    });

    await waitFor(() => {
      expect(alertaSpy).toHaveBeenCalledWith(
        'Erro',
        'Falha ao atualizar consulta'
      );
    });

    expect(cancelarLembrete).not.toHaveBeenCalled();

    await tela.unmount();
  });

  test('deve iniciar com os campos vazios ao abrir um novo cadastro', async () => {
    const primeiraTela = await render(
      <CadastroEdicaoConsultaScreen
        route={{ params: {} }}
        navigation={navigation}
      />
    );

    await waitFor(() => {
      expect(
        primeiraTela.getByText('Salvar consulta')
      ).toBeTruthy();
    });

    await fireEvent.press(
      primeiraTela.getByTestId('opcao-1')
    );

    await fireEvent.press(
      primeiraTela.getByTestId('opcao-2')
    );

    await fireEvent.changeText(
      primeiraTela.getByPlaceholderText('AAAA-MM-DD'),
      '2026-12-10'
    );

    await fireEvent.changeText(
      primeiraTela.getByPlaceholderText('HH:MM'),
      '14:30'
    );

    expect(
      primeiraTela.getByPlaceholderText('AAAA-MM-DD').props.value
    ).toBe('2026-12-10');

    expect(
      primeiraTela.getByPlaceholderText('HH:MM').props.value
    ).toBe('14:30');

    await primeiraTela.unmount();

    const segundaTela = await render(
      <CadastroEdicaoConsultaScreen
        route={{ params: {} }}
        navigation={navigation}
      />
    );

    await waitFor(() => {
      expect(
        segundaTela.getByText('Salvar consulta')
      ).toBeTruthy();
    });

    expect(
      segundaTela.getByPlaceholderText('AAAA-MM-DD').props.value
    ).toBe('');

    expect(
      segundaTela.getByPlaceholderText('HH:MM').props.value
    ).toBe('');

    expect(
      segundaTela.getAllByTestId('valor-selecionado-')
    ).toHaveLength(2);

    expect(
      segundaTela.queryByTestId('valor-selecionado-1')
    ).toBeNull();

    expect(
      segundaTela.queryByTestId('valor-selecionado-2')
    ).toBeNull();

    await segundaTela.unmount();
  });

  test('deve permitir tentar novamente quando a API voltar a funcionar', async () => {
    let quantidadeFalhas = 0;

    api.get.mockImplementation(async rota => {
      if (rota === '/consultas' && quantidadeFalhas === 0) {
        quantidadeFalhas += 1;
        throw new Error('API offline');
      }

      if (rota === '/pacientes') return pacientes;
      if (rota === '/medicos') return medicos;
      if (rota === '/consultas') return [consulta];

      return [];
    });

    const tela = await render(
      <Consulta navigation={navigation} />
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
      expect(quantidadeFalhas).toBe(1);
      expect(tela.getByTestId('consulta-erro')).toBeTruthy();
    });

    expect(tela.getByText('API offline')).toBeTruthy();

    await fireEvent.press(
      tela.getByTestId('botao-tentar-novamente')
    );

    await waitFor(() => {
      expect(tela.getByText('Maria Silva')).toBeTruthy();

      expect(
        tela.getByText(/Médico: Dr\. João Silva/)
      ).toBeTruthy();

      expect(
        tela.queryByTestId('consulta-erro')
      ).toBeNull();
    });

    expect(quantidadeFalhas).toBe(1);
    expect(api.get).toHaveBeenCalledWith('/consultas');

    await tela.unmount();
  });
});
