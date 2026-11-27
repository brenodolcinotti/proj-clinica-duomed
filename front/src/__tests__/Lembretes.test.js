
import {
  solicitarPermissao,
  agendarLembrete,
} from '../services/lembretes';

import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  AndroidImportance: {
    HIGH: 4,
  },
  SchedulableTriggerInputTypes: {
    TIME_INTERVAL: 'timeInterval',
  },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe('Serviço de Lembretes - DuoMed', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    Notifications.getPermissionsAsync.mockResolvedValue({
      granted: false,
    });

    Notifications.requestPermissionsAsync.mockResolvedValue({
      granted: false,
    });

    Notifications.scheduleNotificationAsync.mockResolvedValue(
      'notificacao-teste-123'
    );

    Notifications.getAllScheduledNotificationsAsync.mockResolvedValue(
      []
    );

    Notifications.cancelScheduledNotificationAsync.mockResolvedValue(
      undefined
    );

    SecureStore.getItemAsync.mockResolvedValue(null);
    SecureStore.setItemAsync.mockResolvedValue(undefined);
  });

  test('deve reconhecer quando a permissão já foi concedida', async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({
      granted: true,
    });

    const resultado = await solicitarPermissao();

    expect(resultado).toBe(true);

    expect(
      Notifications.getPermissionsAsync
    ).toHaveBeenCalled();

    expect(
      Notifications.requestPermissionsAsync
    ).not.toHaveBeenCalled();
  });

  test('deve solicitar permissão e reconhecer quando o usuário aceitar', async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({
      granted: false,
    });

    Notifications.requestPermissionsAsync.mockResolvedValue({
      granted: true,
    });

    const resultado = await solicitarPermissao();

    expect(resultado).toBe(true);

    expect(
      Notifications.requestPermissionsAsync
    ).toHaveBeenCalled();
  });

  test('não deve agendar notificação quando o usuário negar a permissão', async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({
      granted: false,
    });

    Notifications.requestPermissionsAsync.mockResolvedValue({
      granted: false,
    });

    const consulta = {
      id: 100,
      dataHora: new Date(
        Date.now() + 3 * 60 * 60 * 1000
      ).toISOString(),
      status: 'Agendada',
    };

    const resultado = await agendarLembrete(consulta);

    expect(resultado.agendado).toBe(false);

    expect(resultado.motivo).toBe(
      'Permissão de notificações não concedida.'
    );

    expect(
      Notifications.scheduleNotificationAsync
    ).not.toHaveBeenCalled();
  });

  test('deve agendar notificação quando a permissão for concedida', async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({
      granted: true,
    });

    const consulta = {
      id: 200,
      dataHora: new Date(
        Date.now() + 3 * 60 * 60 * 1000
      ).toISOString(),
      status: 'Agendada',
    };

    const resultado = await agendarLembrete(consulta);

    expect(resultado.agendado).toBe(true);

    expect(resultado.identificador).toBe(
      'notificacao-teste-123'
    );

    expect(
      Notifications.scheduleNotificationAsync
    ).toHaveBeenCalledTimes(1);

    expect(
      Notifications.scheduleNotificationAsync
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: 'Lembrete de consulta',
          data: expect.objectContaining({
            tela: 'Consultas',
            consultaId: '200',
          }),
        }),
        trigger: expect.objectContaining({
          type: 'timeInterval',
          seconds: expect.any(Number),
        }),
      })
    );

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'duomed_lembretes_consultas',
      JSON.stringify({
        200: 'notificacao-teste-123',
      })
    );
  });
});
