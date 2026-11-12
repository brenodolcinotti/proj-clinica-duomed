import * as ExpoSMS from 'expo-sms';
import { obterToken } from './sessao';
import { BASE_URL } from './api';

const smsCore = require('./smsCore');

// O app fala com a API da clínica (porta 3001), nunca com o gateway (3002).
// A BASE_URL do JSON Server usa a porta 3000; derivamos a URL da API de SMS.
export const SMS_API_URL = BASE_URL.replace(/:3000(?=\/|$)/, ':3001');

export const normalizarNumero = smsCore.normalizarNumero;
export const contarSegmentos = smsCore.contarSegmentos;
export const avaliarTexto = smsCore.avaliarTexto;
export const criarTextoSms = smsCore.criarTextoSms;

export async function verificarDisponibilidadeSms() {
  try {
    return await ExpoSMS.isAvailableAsync();
  } catch {
    return false;
  }
}

// Caminho 1: abre o aplicativo de mensagens nativo. O usuário decide enviar.
// O retorno é repassado sem interpretá-lo como confirmação de entrega.
export async function pedirEnvioPeloAparelho(numeros, texto) {
  const disponivel = await ExpoSMS.isAvailableAsync();
  if (!disponivel) {
    throw new Error('Este aparelho não disponibiliza envio de SMS.');
  }

  const lista = Array.isArray(numeros) ? numeros : [numeros];
  const normalizados = lista.map(normalizarNumero);
  if (normalizados.length === 0 || normalizados.some((n) => !n)) {
    throw new Error('Informe um número válido no formato internacional, por exemplo +5516999998888.');
  }
  if (!String(texto || '').trim()) {
    throw new Error('O texto da mensagem não pode ficar vazio.');
  }

  return ExpoSMS.sendSMSAsync(normalizados, String(texto));
}

// Caminho 2: solicita à API da clínica, que busca a consulta/paciente e chama
// internamente o gateway. Credenciais de gateway nunca chegam ao aplicativo.
export async function pedirEnvioPeloServidor(consultaId, tipo) {
  if (consultaId == null || String(consultaId).trim() === '') {
    throw new Error('Consulta não informada para o envio de SMS.');
  }

  const token = await obterToken();
  let resposta;
  try {
    resposta = await fetch(
      `${SMS_API_URL}/consultas/${encodeURIComponent(String(consultaId))}/sms`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ tipo }),
      }
    );
  } catch (erro) {
    throw new Error(`Não foi possível acessar a API de SMS (${SMS_API_URL}). Confira se o servidor está ligado e se o celular está na mesma rede Wi-Fi.`);
  }

  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    const erro = new Error(dados.erro || dados.message || `Erro na API de SMS: HTTP ${resposta.status}`);
    erro.status = resposta.status;
    erro.codigo = dados.codigo;
    throw erro;
  }

  return dados;
}
