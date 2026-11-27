
import React from 'react';

import {
  render,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react-native';

import { Alert } from 'react-native';

import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import Login from '../screens/Login/Login';
import MenuScreen from '../screens/Menu/MenuScreen';
import Consulta from '../screens/Consulta/Consulta';
import CadastroEdicaoConsultaScreen from '../screens/Consulta/CadastroEdicaoConsultaScreen';

import { api } from '../services/api';

import {
  salvarToken,
  obterPreferenciaBiometria,
} from '../services/sessao';

import {
  agendarLembrete,
  cancelarLembrete,
} from '../services/lembretes';

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    GestureHandlerRootView: ({ children, ...props }) =>
      React.createElement(View, props, children),

    PanGestureHandler: ({ children }) =>
      React.createElement(View, null, children),

    TapGestureHandler: ({ children }) =>
      React.createElement(View, null, children),

    State: {
      UNDETERMINED: 0,
      FAILED: 1,
      BEGAN: 2,
      CANCELLED: 3,
      ACTIVE: 4,
      END: 5,
    },

    Directions: {
      RIGHT: 1,
      LEFT: 2,
      UP: 4,
      DOWN: 8,
    },

    gestureHandlerRootHOC: Component => Component,
  };
});

jest.mock('../services/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    remover: jest.fn(),
  },
}));

jest.mock('../services/sessao', () => ({
  salvarToken: jest.fn().mockResolvedValue(undefined),
  obterToken: jest.fn().mockResolvedValue(null),
  salvarPreferenciaBiometria: jest.fn().mockResolvedValue(undefined),
  obterPreferenciaBiometria: jest.fn().mockResolvedValue(false),
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn().mockResolvedValue(false),
  isEnrolledAsync: jest.fn().mockResolvedValue(false),
  authenticateAsync: jest.fn(),
}));

jest.mock('../services/lembretes', () => ({
  agendarLembrete: jest.fn(),
  cancelarLembrete: jest.fn(),
  testarNotificacao: jest.fn(),
  testarLembreteEm10Segundos: jest.fn(),
}));

jest.mock('../hooks/useSincronizacao', () => ({
  __esModule: true,
  default: jest.fn(),
}));

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
      <Text>
        {String(selectedValue ?? '')}
      </Text>

      {React.Children.map(children, child => {
        if (!child) {
          return null;
        }

        return (
          <TouchableOpacity
            testID={`opcao-${String(child.props.value)}`}
            onPress={() => onValueChange(child.props.value)}
          >
            <Text>
              {child.props.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  Picker.Item = () => null;

  return { Picker };
});

const Stack = createStackNavigator();

function NavegacaoTeste() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          animation: 'none',
          gestureEnabled: false,
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="Login"
          component={Login}
        />

        <Stack.Screen
          name="Menu"
          component={MenuScreen}
        />

        <Stack.Screen
          name="Consultas"
          component={Consulta}
        />

        <Stack.Screen
          name="CadastroEdicaoConsultaScreen"
          component={CadastroEdicaoConsultaScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

describe('Jornada integrada - DuoMed', () => {
  const pacientes = [
    {
      id: 1,
      nome: 'Maria Silva',
    },
  ];

  const medicos = [
    {
      id: 2,
      nome: 'Dr. João Silva',
      especialidade: 'Cardiologia',
    },
  ];

  let consultas;
  let alertaSpy;
  let resultadoRenderizacao;

  beforeEach(() => {
    jest.clearAllMocks();

    consultas = [];

    resultadoRenderizacao = null;

    obterPreferenciaBiometria.mockResolvedValue(false);

    api.get.mockImplementation(async rota => {
      if (rota === '/pacientes') {
        return pacientes;
      }

      if (rota === '/medicos') {
        return medicos;
      }

      if (rota === '/consultas') {
        return [...consultas];
      }

      return [];
    });

    api.post.mockImplementation(async (rota, dados) => {
      if (rota === '/consultas') {
        const novaConsulta = {
          id: 20,
          ...dados,
        };

        consultas.push(novaConsulta);

        return novaConsulta;
      }

      return {};
    });

    api.put.mockResolvedValue(undefined);
    api.remover.mockResolvedValue(undefined);

    agendarLembrete.mockResolvedValue({
      agendado: true,
      identificador: 'lembrete-20',
    });

    cancelarLembrete.mockResolvedValue(undefined);

    alertaSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    if (resultadoRenderizacao) {
      resultadoRenderizacao.unmount();
      resultadoRenderizacao = null;
    }

    if (alertaSpy) {
      alertaSpy.mockRestore();
    }
  });

  test(
    'deve realizar login, acessar consultas, cadastrar e confirmar um agendamento',
    async () => {
      // 1. Abrir a aplicação na tela de login.
      resultadoRenderizacao = await render(
        <NavegacaoTeste />
      );

      const tela = resultadoRenderizacao;

      expect(
        tela.getByTestId('tela-login')
      ).toBeTruthy();

      // 2. Preencher os dados de acesso.
      await fireEvent.changeText(
        tela.getByTestId('campo-email'),
        'teste@duomed.com'
      );

      await fireEvent.changeText(
        tela.getByTestId('campo-senha'),
        '123456'
      );

      // 3. Realizar login.
      await fireEvent.press(
        tela.getByTestId('botao-entrar')
      );

      await waitFor(() => {
        expect(salvarToken).toHaveBeenCalledWith(
          expect.stringMatching(/^duomed_/)
        );

        expect(alertaSpy).toHaveBeenCalledWith(
          'Login realizado',
          expect.any(String),
          expect.any(Array)
        );
      });

      // Confirmar o alerta de login.
      const alertaLogin = alertaSpy.mock.calls.find(
        chamada => chamada[0] === 'Login realizado'
      );

      expect(alertaLogin).toBeTruthy();

      await act(async () => {
        alertaLogin[2][0].onPress();
      });

      // 4. Verificar o acesso ao menu.
      await waitFor(() => {
        expect(
          tela.getByText(/Gerenciando sua/)
        ).toBeTruthy();

        expect(
          tela.getByText('Consultas')
        ).toBeTruthy();
      });

      // 5. Entrar na seção de consultas.
      await fireEvent.press(
        tela.getByText('Consultas')
      );

      await waitFor(() => {
        expect(
          tela.getByTestId('tela-consultas')
        ).toBeTruthy();
      });

      // 6. Abrir o cadastro de uma nova consulta.
      await fireEvent.press(
        tela.getByTestId('botao-nova-consulta')
      );

      await waitFor(() => {
        expect(
          tela.getByText('Nova Consulta')
        ).toBeTruthy();

        expect(
          tela.getByText('Salvar consulta')
        ).toBeTruthy();
      });

      // 7. Escolher paciente e médico.
      await fireEvent.press(
        tela.getByTestId('opcao-1')
      );

      await fireEvent.press(
        tela.getByTestId('opcao-2')
      );

      // 8. Informar data e horário.
      await fireEvent.changeText(
        tela.getByPlaceholderText('AAAA-MM-DD'),
        '2026-12-10'
      );

      await fireEvent.changeText(
        tela.getByPlaceholderText('HH:MM'),
        '14:30'
      );

      // 9. Salvar o agendamento.
      await fireEvent.press(
        tela.getByText('Salvar consulta')
      );

      // 10. Verificar o envio à API e o agendamento do lembrete.
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
            pacienteId: '1',
            medicoId: '2',
          })
        );
      });

      // 11. Verificar a confirmação do cadastro.
      await waitFor(() => {
        expect(alertaSpy).toHaveBeenCalledWith(
          'Consulta salva',
          expect.stringContaining(
            'A consulta foi cadastrada.'
          ),
          expect.any(Array)
        );
      });

      const alertaConfirmacao = alertaSpy.mock.calls.find(
        chamada =>
          chamada[0] === 'Consulta salva' &&
          chamada[1].includes('cadastrada')
      );

      expect(alertaConfirmacao).toBeTruthy();

      // Escolher "Agora não" para retornar à lista.
      await act(async () => {
        alertaConfirmacao[2][0].onPress();
      });

      // 12. Verificar se a consulta aparece na listagem.
      await waitFor(() => {
        expect(
          tela.getByText('Maria Silva')
        ).toBeTruthy();

        expect(
          tela.getByText(/Dr\. João Silva/)
        ).toBeTruthy();

        expect(
          tela.getByText(/2026-12-10/)
        ).toBeTruthy();

        expect(
          tela.getByText(/14:30/)
        ).toBeTruthy();

        expect(
          tela.getByText(/Agendada/)
        ).toBeTruthy();
      });

      expect(consultas).toHaveLength(1);
    }
  );
});
