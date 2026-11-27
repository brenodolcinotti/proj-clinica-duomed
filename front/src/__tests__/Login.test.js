
import React from 'react';

import {
  render,
  fireEvent,
  waitFor,
} from '@testing-library/react-native';

import { Alert } from 'react-native';

import * as LocalAuthentication from 'expo-local-authentication';

import Login from '../screens/Login/Login';

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn().mockResolvedValue(false),
  isEnrolledAsync: jest.fn().mockResolvedValue(false),
  authenticateAsync: jest.fn(),
}));

jest.mock('../services/sessao', () => ({
  salvarToken: jest.fn().mockResolvedValue(undefined),
  obterToken: jest.fn().mockResolvedValue(null),
  salvarPreferenciaBiometria: jest.fn().mockResolvedValue(undefined),
  obterPreferenciaBiometria: jest.fn().mockResolvedValue(false),
}));

describe('Tela de Login - DuoMed', () => {
  const navigation = {
    replace: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    LocalAuthentication.hasHardwareAsync.mockResolvedValue(false);
    LocalAuthentication.isEnrolledAsync.mockResolvedValue(false);
    LocalAuthentication.authenticateAsync.mockResolvedValue({
      success: false,
      error: 'authentication_failed',
    });
  });

  test('deve exibir a tela de login e os campos de acesso', async () => {
    const { getByTestId } = await render(
      <Login navigation={navigation} />
    );

    expect(getByTestId('tela-login')).toBeTruthy();
    expect(getByTestId('campo-email')).toBeTruthy();
    expect(getByTestId('campo-senha')).toBeTruthy();
    expect(getByTestId('botao-entrar')).toBeTruthy();
  });

  test('deve exibir alerta quando os campos estiverem vazios', async () => {
    const alertaSpy = jest.spyOn(Alert, 'alert');

    try {
      const { getByTestId } = await render(
        <Login navigation={navigation} />
      );

      await fireEvent.press(getByTestId('botao-entrar'));

      expect(alertaSpy).toHaveBeenCalledWith(
        'Atenção',
        'Informe o e-mail e a senha.'
      );
    } finally {
      alertaSpy.mockRestore();
    }
  });

  test('deve realizar login com e-mail e senha preenchidos', async () => {
    const { salvarToken } = require('../services/sessao');
    const alertaSpy = jest.spyOn(Alert, 'alert');

    try {
      const { getByTestId } = await render(
        <Login navigation={navigation} />
      );

      await fireEvent.changeText(
        getByTestId('campo-email'),
        'teste@duomed.com'
      );

      await fireEvent.changeText(
        getByTestId('campo-senha'),
        '123456'
      );

      await fireEvent.press(
        getByTestId('botao-entrar')
      );

      await waitFor(() => {
        expect(salvarToken).toHaveBeenCalledWith(
          expect.stringMatching(/^duomed_/)
        );

        expect(alertaSpy).toHaveBeenCalledWith(
          'Login realizado',
          'Você entrou no DuoMed.',
          expect.any(Array)
        );
      });

      const botoes = alertaSpy.mock.calls[0][2];

      botoes[0].onPress();

      expect(navigation.replace).toHaveBeenCalledWith('Menu');
    } finally {
      alertaSpy.mockRestore();
    }
  });

  test('não deve exibir botão de biometria quando o aparelho não possui hardware biométrico', async () => {
    const { queryByTestId } = await render(
      <Login navigation={navigation} />
    );

    await waitFor(() => {
      expect(
        LocalAuthentication.hasHardwareAsync
      ).toHaveBeenCalled();
    });

    expect(queryByTestId('botao-biometria')).toBeNull();
  });

  test('não deve exibir botão de biometria quando não houver biometria cadastrada', async () => {
    LocalAuthentication.hasHardwareAsync.mockResolvedValue(true);
    LocalAuthentication.isEnrolledAsync.mockResolvedValue(false);

    const { queryByTestId } = await render(
      <Login navigation={navigation} />
    );

    await waitFor(() => {
      expect(
        LocalAuthentication.isEnrolledAsync
      ).toHaveBeenCalled();
    });

    expect(queryByTestId('botao-biometria')).toBeNull();
  });

  test('deve exibir botão de biometria quando houver sensor e biometria cadastrada', async () => {
    const { obterPreferenciaBiometria } = require('../services/sessao');

    obterPreferenciaBiometria.mockResolvedValue(true);

    LocalAuthentication.hasHardwareAsync.mockResolvedValue(true);
    LocalAuthentication.isEnrolledAsync.mockResolvedValue(true);

    const { getByTestId } = await render(
      <Login navigation={navigation} />
    );

    expect(
      await waitFor(() => getByTestId('botao-biometria'))
    ).toBeTruthy();
  });

  test('deve exibir mensagem quando a autenticação biométrica falhar', async () => {
    const { obterPreferenciaBiometria } = require('../services/sessao');
    const alertaSpy = jest.spyOn(Alert, 'alert');

    obterPreferenciaBiometria.mockResolvedValue(true);

    LocalAuthentication.hasHardwareAsync.mockResolvedValue(true);
    LocalAuthentication.isEnrolledAsync.mockResolvedValue(true);

    LocalAuthentication.authenticateAsync.mockResolvedValue({
      success: false,
      error: 'authentication_failed',
    });

    try {
      const { getByTestId } = await render(
        <Login navigation={navigation} />
      );

      const botaoBiometria = await waitFor(() =>
        getByTestId('botao-biometria')
      );

      await fireEvent.press(botaoBiometria);

      await waitFor(() => {
        expect(alertaSpy).toHaveBeenCalledWith(
          'Biometria',
          'Não foi possível confirmar sua biometria.'
        );
      });

      expect(navigation.replace).not.toHaveBeenCalled();
    } finally {
      alertaSpy.mockRestore();
    }
  });

  test('não deve exibir alerta quando o usuário cancelar a autenticação biométrica', async () => {
    const { obterPreferenciaBiometria } = require('../services/sessao');
    const alertaSpy = jest.spyOn(Alert, 'alert');

    obterPreferenciaBiometria.mockResolvedValue(true);

    LocalAuthentication.hasHardwareAsync.mockResolvedValue(true);
    LocalAuthentication.isEnrolledAsync.mockResolvedValue(true);

    LocalAuthentication.authenticateAsync.mockResolvedValue({
      success: false,
      error: 'user_cancel',
    });

    try {
      const { getByTestId } = await render(
        <Login navigation={navigation} />
      );

      const botaoBiometria = await waitFor(() =>
        getByTestId('botao-biometria')
      );

      await fireEvent.press(botaoBiometria);

      await waitFor(() => {
        expect(
          LocalAuthentication.authenticateAsync
        ).toHaveBeenCalled();
      });

      expect(alertaSpy).not.toHaveBeenCalled();
      expect(navigation.replace).not.toHaveBeenCalled();
    } finally {
      alertaSpy.mockRestore();
    }
  });
});
