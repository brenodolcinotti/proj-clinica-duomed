import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';

const CANAL_ID = 'lembretes-consulta';
const CHAVE_LEMBRETES = 'duomed_lembretes_consultas';
const ANTECEDENCIA_MINUTOS = 60;

// Configura como as notificações aparecem quando o app está aberto.
export function configurarHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// Configura o canal de notificações no Android.
export async function prepararCanal() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(CANAL_ID, {
    name: 'Lembretes de consulta',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
  });
}

// Solicita permissão para mostrar notificações.
export async function solicitarPermissao() {
  const atual = await Notifications.getPermissionsAsync();

  if (atual.granted) return true;

  const resultado = await Notifications.requestPermissionsAsync();
  return resultado.granted === true;
}

// TESTE 1: solicita uma notificação imediata.
export async function testarNotificacao() {
  const permitido = await solicitarPermissao();

  if (!permitido) {
    throw new Error(
      'Permissão de notificações não concedida no iPhone.'
    );
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'DuoMed — Teste',
      body: 'Funcionou! As notificações do DuoMed estão aparecendo.',
      sound: 'default',
    },
    trigger: null,
  });
}

// TESTE 2: agenda uma notificação para daqui a 10 segundos.
export async function testarLembreteEm10Segundos() {
  const permitido = await solicitarPermissao();

  if (!permitido) {
    throw new Error(
      'Permissão de notificações não concedida.'
    );
  }

  await prepararCanal();

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'DuoMed — Lembrete de consulta',
      body: 'Teste concluído! O lembrete automático está funcionando.',
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 10,
      ...(Platform.OS === 'android'
        ? { channelId: CANAL_ID }
        : {}),
    },
  });
}

// Recupera os identificadores dos lembretes salvos.
async function obterVinculos() {
  const dados = await SecureStore.getItemAsync(CHAVE_LEMBRETES);

  if (!dados) return {};

  try {
    return JSON.parse(dados);
  } catch {
    return {};
  }
}

// Salva os identificadores dos lembretes.
async function salvarVinculos(vinculos) {
  await SecureStore.setItemAsync(
    CHAVE_LEMBRETES,
    JSON.stringify(vinculos)
  );
}

// Monta o conteúdo da notificação.
function criarConteudo(consultaId) {
  return {
    content: {
      title: 'Lembrete de consulta',
      body:
        'Você tem uma consulta agendada para daqui a uma hora. Abra o DuoMed para consultar os detalhes.',
      sound: 'default',
      data: {
        tela: 'Consultas',
        consultaId: String(consultaId),
      },
    },
  };
}

// Converte e valida a data e o horário da consulta.
function obterDataConsulta(consulta) {
  console.log('Dados recebidos pelo lembrete:', {
    dataHora: consulta?.dataHora,
    data: consulta?.data,
    horario: consulta?.horario,
  });

  if (consulta?.dataHora) {
    const data = new Date(consulta.dataHora);

    if (!Number.isNaN(data.getTime())) {
      return data;
    }
  }

  if (!consulta?.data || !consulta?.horario) {
    console.warn(
      'Data ou horário ausente na consulta:',
      consulta
    );
    return null;
  }

  const dataTexto = String(consulta.data).trim();
  const horarioTexto = String(consulta.horario).trim();

  const correspondenciaData = dataTexto.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  const correspondenciaHorario = horarioTexto.match(
    /^(\d{2}):(\d{2})$/
  );

  if (!correspondenciaData || !correspondenciaHorario) {
    console.warn('Formato inválido:', {
      dataTexto,
      horarioTexto,
    });
    return null;
  }

  const [, ano, mes, dia] = correspondenciaData;
  const [, hora, minuto] = correspondenciaHorario;

  const anoNumero = Number(ano);
  const mesNumero = Number(mes);
  const diaNumero = Number(dia);
  const horaNumero = Number(hora);
  const minutoNumero = Number(minuto);

  if (
    mesNumero < 1 ||
    mesNumero > 12 ||
    diaNumero < 1 ||
    diaNumero > 31 ||
    horaNumero < 0 ||
    horaNumero > 23 ||
    minutoNumero < 0 ||
    minutoNumero > 59
  ) {
    console.warn('Data ou horário fora do intervalo válido:', {
      dataTexto,
      horarioTexto,
    });
    return null;
  }

  const data = new Date(
    anoNumero,
    mesNumero - 1,
    diaNumero,
    horaNumero,
    minutoNumero,
    0,
    0
  );

  // Impede que datas inexistentes sejam ajustadas automaticamente.
  if (
    data.getFullYear() !== anoNumero ||
    data.getMonth() !== mesNumero - 1 ||
    data.getDate() !== diaNumero
  ) {
    console.warn('Data inexistente:', dataTexto);
    return null;
  }

  return data;
}

// Agenda o lembrete definitivo para uma hora antes da consulta.
export async function agendarLembrete(consulta) {
  const consultaId = consulta?.id ?? consulta?.consultaId;

  if (
    consultaId === undefined ||
    consultaId === null ||
    consultaId === ''
  ) {
    throw new Error('Consulta sem identificador válido.');
  }

  const dataConsulta = obterDataConsulta(consulta);

  if (!dataConsulta) {
    throw new Error('Data ou horário da consulta inválido.');
  }

  if (consulta.status === 'Cancelada') {
    await cancelarLembrete(consultaId);

    return {
      agendado: false,
      motivo: 'Consulta cancelada.',
    };
  }

  // Evita duplicar lembretes ao editar uma consulta.
  await cancelarLembrete(consultaId);

  const horarioLembrete =
    dataConsulta.getTime() -
    ANTECEDENCIA_MINUTOS * 60 * 1000;

  if (horarioLembrete <= Date.now() + 5000) {
    return {
      agendado: false,
      motivo:
        'O horário do lembrete já passou ou a consulta está próxima demais. Escolha uma consulta com pelo menos uma hora de antecedência.',
    };
  }

  const permitido = await solicitarPermissao();

  if (!permitido) {
    return {
      agendado: false,
      motivo: 'Permissão de notificações não concedida.',
    };
  }

  await prepararCanal();

  const segundosAteLembrete = Math.floor(
    (horarioLembrete - Date.now()) / 1000
  );

  const identificador =
    await Notifications.scheduleNotificationAsync({
      ...criarConteudo(consultaId),
      trigger: {
        type:
          Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: segundosAteLembrete,
        ...(Platform.OS === 'android'
          ? { channelId: CANAL_ID }
          : {}),
      },
    });

  const vinculos = await obterVinculos();
  vinculos[String(consultaId)] = identificador;
  await salvarVinculos(vinculos);

  console.log('Lembrete agendado com sucesso:', {
    consultaId,
    identificador,
    horarioLembrete: new Date(
      horarioLembrete
    ).toLocaleString(),
  });

  return {
    agendado: true,
    identificador,
  };
}

// Cancela o lembrete de uma consulta específica.
export async function cancelarLembrete(consultaId) {
  const chave = String(consultaId);
  const vinculos = await obterVinculos();
  const identificador = vinculos[chave];

  if (identificador) {
    await Notifications
      .cancelScheduledNotificationAsync(identificador)
      .catch(() => {});
  }

  const agendadas =
    await Notifications.getAllScheduledNotificationsAsync();

  const correspondentes = agendadas.filter(
    notificacao =>
      String(notificacao.content?.data?.consultaId) === chave
  );

  await Promise.all(
    correspondentes.map(notificacao =>
      Notifications.cancelScheduledNotificationAsync(
        notificacao.identifier
      )
    )
  );

  delete vinculos[chave];
  await salvarVinculos(vinculos);
}

// Cancela todos os lembretes agendados.
export async function cancelarTodosLembretes() {
  const agendadas =
    await Notifications.getAllScheduledNotificationsAsync();

  await Promise.all(
    agendadas.map(notificacao =>
      Notifications.cancelScheduledNotificationAsync(
        notificacao.identifier
      )
    )
  );

  await SecureStore.deleteItemAsync(CHAVE_LEMBRETES);
}

// Lista os lembretes atualmente agendados.
export async function listarLembretesAgendados() {
  return Notifications.getAllScheduledNotificationsAsync();
}
