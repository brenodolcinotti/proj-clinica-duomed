
import React from 'react';

import {
  render,
  fireEvent,
  waitFor,
} from '@testing-library/react-native';

import { Alert } from 'react-native';

import * as ImagePicker from 'expo-image-picker';

import MedicoForm from '../components/MedicoForm';

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

describe('Formulário de médico - DuoMed', () => {
  const navigation = {
    goBack: jest.fn(),
  };

  const onSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
      granted: true,
    });

    ImagePicker.launchCameraAsync.mockResolvedValue({
      canceled: true,
      assets: [],
    });

    onSave.mockResolvedValue(undefined);
  });

  test('deve abrir a câmera após receber permissão', async () => {
    const { getByText } = await render(
      <MedicoForm
        onSave={onSave}
        navigation={navigation}
      />
    );

    await fireEvent.press(getByText('Tirar foto'));

    await waitFor(() => {
      expect(
        ImagePicker.requestCameraPermissionsAsync
      ).toHaveBeenCalled();

      expect(
        ImagePicker.launchCameraAsync
      ).toHaveBeenCalled();
    });
  });

  test('deve manter o formulário sem foto quando a câmera for cancelada', async () => {
    const { getByText, getByPlaceholderText } = await render(
      <MedicoForm
        onSave={onSave}
        navigation={navigation}
      />
    );

    await fireEvent.press(getByText('Tirar foto'));

    await waitFor(() => {
      expect(
        ImagePicker.launchCameraAsync
      ).toHaveBeenCalled();
    });

    await fireEvent.changeText(
      getByPlaceholderText('Nome do médico'),
      'Dr. João Silva'
    );

    await fireEvent.changeText(
      getByPlaceholderText('Ex: Cardiologista'),
      'Cardiologia'
    );

    await fireEvent.changeText(
      getByPlaceholderText('Ex: 12345/MG'),
      '12345/SP'
    );

    await fireEvent.press(getByText('Salvar'));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          nome: 'Dr. João Silva',
          especialidade: 'Cardiologia',
          crm: '12345/SP',
          fotoUri: null,
        })
      );
    });

    expect(navigation.goBack).toHaveBeenCalled();
  });

  test('não deve abrir a câmera quando a permissão for negada', async () => {
    ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({
      granted: false,
    });

    const alertaSpy = jest.spyOn(Alert, 'alert');

    try {
      const { getByText } = await render(
        <MedicoForm
          onSave={onSave}
          navigation={navigation}
        />
      );

      await fireEvent.press(getByText('Tirar foto'));

      await waitFor(() => {
        expect(alertaSpy).toHaveBeenCalledWith(
          'Permissão necessária',
          'Precisamos da permissão da câmera para tirar a foto do médico.'
        );
      });

      expect(
        ImagePicker.launchCameraAsync
      ).not.toHaveBeenCalled();

      expect(onSave).not.toHaveBeenCalled();
    } finally {
      alertaSpy.mockRestore();
    }
  });
});
