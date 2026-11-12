// Funcoes puras compartilhadas entre o app React Native e o servidor Node.
// Mantido em CommonJS para que os testes Node e o Metro consumam o mesmo codigo.

const TIPOS_SMS = Object.freeze(['lembrete', 'confirmacao', 'cancelamento']);

const GSM_BASIC = new Set(Array.from(
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?'
  + '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'
));
const GSM_EXTENDED = new Set(['^', '{', '}', '\\', '[', '~', ']', '|', '€']);

function normalizarNumero(numero, codigoPaisPadrao = '55') {
  if (numero == null) return null;
  let original = String(numero).trim();
  if (!original) return null;

  const tinhaMais = original.startsWith('+');
  let digitos = original.replace(/\D/g, '');
  if (digitos.startsWith('00')) digitos = digitos.slice(2);

  // Números brasileiros locais (DDD + número) recebem +55.
  if (!tinhaMais && (digitos.length === 10 || digitos.length === 11)) {
    digitos = `${codigoPaisPadrao}${digitos}`;
  }

  if (!/^\d{10,15}$/.test(digitos) || digitos.startsWith('0')) return null;
  return `+${digitos}`;
}

function contarUnidadesGsm(texto) {
  let total = 0;
  for (const caractere of texto) {
    if (GSM_BASIC.has(caractere)) total += 1;
    else if (GSM_EXTENDED.has(caractere)) total += 2;
    else return null;
  }
  return total;
}

function contarSegmentos(texto) {
  const conteudo = String(texto ?? '');
  const unidadesGsm = contarUnidadesGsm(conteudo);

  if (unidadesGsm !== null) {
    const segmentos = unidadesGsm <= 160 ? 1 : Math.ceil(unidadesGsm / 153);
    return {
      caracteres: conteudo.length,
      unidades: unidadesGsm,
      codificacao: 'GSM-7',
      limiteSegmento: segmentos === 1 ? 160 : 153,
      segmentos,
    };
  }

  // SMS UCS-2 usa unidades UTF-16: emojis podem ocupar duas unidades.
  const unidadesUcs2 = conteudo.length;
  const segmentos = unidadesUcs2 <= 70 ? 1 : Math.ceil(unidadesUcs2 / 67);
  return {
    caracteres: conteudo.length,
    unidades: unidadesUcs2,
    codificacao: 'UCS-2',
    limiteSegmento: segmentos === 1 ? 70 : 67,
    segmentos,
  };
}

function avaliarTexto(texto) {
  const resultado = contarSegmentos(texto);
  return {
    ...resultado,
    alerta: resultado.segmentos > 1
      ? `Esta mensagem será enviada em ${resultado.segmentos} segmentos de SMS.`
      : null,
  };
}

function formatarDataSms(data) {
  const valor = String(data ?? '').trim();
  const iso = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return valor || 'data a confirmar';
}

function criarTextoSms(tipo, consulta) {
  if (!TIPOS_SMS.includes(tipo)) {
    throw new Error('Tipo de SMS inválido. Use lembrete, confirmacao ou cancelamento.');
  }
  if (!consulta || !consulta.data || !consulta.horario) {
    throw new Error('A consulta precisa ter data e horário para gerar o SMS.');
  }

  const data = formatarDataSms(consulta.data);
  const horario = String(consulta.horario).trim();

  const modelos = {
    lembrete: `DuoMed: voce tem uma consulta em ${data} as ${horario}. Entre em contato com a clinica se precisar.`,
    confirmacao: `DuoMed: sua consulta foi confirmada para ${data} as ${horario}. Em caso de duvida, fale com a clinica.`,
    cancelamento: `DuoMed: sua consulta de ${data} as ${horario} foi cancelada. Entre em contato com a clinica para remarcar.`,
  };

  return modelos[tipo];
}

module.exports = {
  TIPOS_SMS,
  normalizarNumero,
  contarSegmentos,
  avaliarTexto,
  criarTextoSms,
};
