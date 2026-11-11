/**
 * Processamento da agenda do DuoMed.
 *
 * JavaScript continua sendo executado em uma thread de JS. O processamento em
 * fatias usa setTimeout(0) para devolver o controle ao event loop entre lotes,
 * permitindo que a interface repinte e aceite interações.
 */

const STATUS_CANCELADOS = new Set([
  'cancelada',
  'cancelado',
  'canceled',
  'cancelled',
  'excluida',
  'excluido',
]);

function criarSinalDeCancelamento() {
  let cancelado = false;

  return {
    cancelar() {
      cancelado = true;
    },
    get cancelado() {
      return cancelado;
    },
  };
}

function cederAVez() {
  // Usamos uma macrotarefa. Promise.resolve() só cederia para microtarefas e
  // pode impedir a renderização de acontecer entre os lotes.
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function obterInicioMs(consulta) {
  if (consulta?.dataHora != null && String(consulta.dataHora).trim() !== '') {
    const timestamp = new Date(consulta.dataHora).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  if (consulta?.data == null || consulta?.horario == null) {
    return null;
  }

  const data = String(consulta.data).trim();
  const horario = String(consulta.horario).trim();
  const horarioCompleto = /^\d{2}:\d{2}$/.test(horario)
    ? `${horario}:00`
    : horario;
  const timestamp = new Date(`${data}T${horarioCompleto}`).getTime();

  return Number.isFinite(timestamp) ? timestamp : null;
}

function normalizarConsulta(consulta, indiceOriginal) {
  if (!consulta || typeof consulta !== 'object') {
    return null;
  }

  const medicoId = consulta.medicoId == null
    ? ''
    : String(consulta.medicoId).trim();
  const status = String(consulta.status || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const inicioMs = obterInicioMs(consulta);
  const duracaoMinutos = Number(
    consulta.duracaoMinutos ?? consulta.duracao ?? 30
  );

  if (
    medicoId === '' ||
    STATUS_CANCELADOS.has(status) ||
    inicioMs == null ||
    !Number.isFinite(duracaoMinutos) ||
    duracaoMinutos <= 0
  ) {
    return null;
  }

  return {
    original: consulta,
    indiceOriginal,
    id: consulta.id == null ? `sem-id-${indiceOriginal}` : String(consulta.id),
    medicoId,
    inicioMs,
    fimMs: inicioMs + duracaoMinutos * 60 * 1000,
  };
}

function conflitaNormalizadas(a, b) {
  return Boolean(
    a &&
    b &&
    a.medicoId === b.medicoId &&
    a.inicioMs < b.fimMs &&
    b.inicioMs < a.fimMs
  );
}

/** Retorna true se duas consultas válidas forem do mesmo médico e se sobrepuserem. */
function conflita(a, b) {
  return conflitaNormalizadas(
    normalizarConsulta(a, 0),
    normalizarConsulta(b, 1)
  );
}

function criarConflito(a, b) {
  const primeiro = a.indiceOriginal <= b.indiceOriginal ? a : b;
  const segundo = primeiro === a ? b : a;

  return {
    chave: `${primeiro.indiceOriginal}:${segundo.indiceOriginal}`,
    indiceA: primeiro.indiceOriginal,
    indiceB: segundo.indiceOriginal,
    consultaAId: primeiro.id,
    consultaBId: segundo.id,
    medicoId: primeiro.medicoId,
    inicioA: new Date(primeiro.inicioMs).toISOString(),
    fimA: new Date(primeiro.fimMs).toISOString(),
    inicioB: new Date(segundo.inicioMs).toISOString(),
    fimB: new Date(segundo.fimMs).toISOString(),
  };
}

function prepararConsultas(consultas) {
  if (!Array.isArray(consultas)) {
    throw new TypeError('A lista de consultas precisa ser um array.');
  }

  const normalizadas = [];
  for (let indice = 0; indice < consultas.length; indice += 1) {
    const normalizada = normalizarConsulta(consultas[indice], indice);
    if (normalizada) normalizadas.push(normalizada);
  }
  return normalizadas;
}

function ordenarConflitos(conflitos) {
  conflitos.sort((a, b) => a.indiceA - b.indiceA || a.indiceB - b.indiceB);
  return conflitos;
}

function montarResultado({
  conflitos,
  comparacoes,
  consultasRecebidas,
  consultasValidas,
  inicioRelogio,
  cancelado = false,
  consultasProcessadas,
}) {
  return {
    cancelado,
    conflitos: ordenarConflitos(conflitos),
    comparacoes,
    consultasRecebidas,
    consultasValidas,
    consultasIgnoradas: consultasRecebidas - consultasValidas,
    consultasProcessadas: consultasProcessadas ?? consultasValidas,
    duracaoMs: Date.now() - inicioRelogio,
  };
}

/**
 * Versão ingênua de referência: testa todos os pares (n × (n - 1) / 2).
 * Deve ser usada em testes/medições, não na interface com listas grandes.
 */
function detectarConflitosIngenuo(consultas) {
  const inicioRelogio = Date.now();
  const consultasRecebidas = Array.isArray(consultas) ? consultas.length : 0;
  const normalizadas = prepararConsultas(consultas);
  const conflitos = [];
  let comparacoes = 0;

  for (let i = 0; i < normalizadas.length; i += 1) {
    for (let j = i + 1; j < normalizadas.length; j += 1) {
      comparacoes += 1;
      if (conflitaNormalizadas(normalizadas[i], normalizadas[j])) {
        conflitos.push(criarConflito(normalizadas[i], normalizadas[j]));
      }
    }
  }

  return montarResultado({
    conflitos,
    comparacoes,
    consultasRecebidas,
    consultasValidas: normalizadas.length,
    inicioRelogio,
  });
}

function compararAgenda(a, b) {
  if (a.medicoId !== b.medicoId) {
    const medicoANumero = Number(a.medicoId);
    const medicoBNumero = Number(b.medicoId);
    if (Number.isFinite(medicoANumero) && Number.isFinite(medicoBNumero)) {
      return medicoANumero - medicoBNumero;
    }
    return a.medicoId < b.medicoId ? -1 : 1;
  }

  return (
    a.inicioMs - b.inicioMs ||
    a.fimMs - b.fimMs ||
    a.indiceOriginal - b.indiceOriginal
  );
}

/**
 * Versão otimizada síncrona para benchmark. Agrupa implicitamente por médico
 * ao ordenar e mantém apenas intervalos que ainda não terminaram. Assim também
 * encontra todos os pares em conflito quando uma consulta longa sobrepõe mais
 * de uma consulta curta (caso que comparar só a consulta imediatamente seguinte
 * pode deixar passar).
 */
function detectarConflitosOtimizado(consultas) {
  const inicioRelogio = Date.now();
  const consultasRecebidas = Array.isArray(consultas) ? consultas.length : 0;
  const ordenadas = prepararConsultas(consultas).sort(compararAgenda);
  const conflitos = [];
  let comparacoes = 0;
  let medicoAtual = null;
  let ativos = [];

  for (const atual of ordenadas) {
    if (atual.medicoId !== medicoAtual) {
      medicoAtual = atual.medicoId;
      ativos = [];
    }

    ativos = ativos.filter((consulta) => consulta.fimMs > atual.inicioMs);
    for (const anterior of ativos) {
      comparacoes += 1;
      if (conflitaNormalizadas(anterior, atual)) {
        conflitos.push(criarConflito(anterior, atual));
      }
    }
    ativos.push(atual);
  }

  return montarResultado({
    conflitos,
    comparacoes,
    consultasRecebidas,
    consultasValidas: ordenadas.length,
    inicioRelogio,
  });
}

/**
 * Processa uma coleção em lotes, cedendo a vez entre lotes.
 * onProgress recebe { total, processados, progresso } com progresso de 0 a 1.
 */
async function processarEmFatias(itens, processarItem, opcoes = {}) {
  if (!Array.isArray(itens)) {
    throw new TypeError('Os itens precisam ser um array.');
  }
  if (typeof processarItem !== 'function') {
    throw new TypeError('processarItem precisa ser uma função.');
  }

  const tamanhoSolicitado = Number(opcoes.tamanhoFatia ?? 100);
  const tamanhoFatia = Number.isFinite(tamanhoSolicitado)
    ? Math.max(1, Math.floor(tamanhoSolicitado))
    : 100;
  const sinalCancelamento = opcoes.sinalCancelamento;
  const onProgress = typeof opcoes.onProgress === 'function'
    ? opcoes.onProgress
    : () => {};
  const total = itens.length;
  let processados = 0;

  if (sinalCancelamento?.cancelado) {
    return { cancelado: true, processados, total };
  }

  if (total === 0) {
    onProgress({ total: 0, processados: 0, progresso: 1 });
    return { cancelado: false, processados: 0, total: 0 };
  }

  for (let inicio = 0; inicio < total; inicio += tamanhoFatia) {
    if (sinalCancelamento?.cancelado) {
      return { cancelado: true, processados, total };
    }

    const fim = Math.min(inicio + tamanhoFatia, total);
    for (let indice = inicio; indice < fim; indice += 1) {
      if (sinalCancelamento?.cancelado) {
        return { cancelado: true, processados, total };
      }
      processarItem(itens[indice], indice);
      processados += 1;
    }

    onProgress({
      total,
      processados,
      progresso: processados / total,
    });

    if (sinalCancelamento?.cancelado) {
      return { cancelado: true, processados, total };
    }

    if (fim < total) {
      await cederAVez();
    }
  }

  return { cancelado: false, processados, total };
}

/** Detecção otimizada com progresso, cessão da vez e cancelamento. */
async function detectarConflitosEmFatias(consultas, opcoes = {}) {
  const inicioRelogio = Date.now();
  const consultasRecebidas = Array.isArray(consultas) ? consultas.length : 0;
  const ordenadas = prepararConsultas(consultas).sort(compararAgenda);
  const conflitos = [];
  let comparacoes = 0;
  let medicoAtual = null;
  let ativos = [];

  const processamento = await processarEmFatias(
    ordenadas,
    (atual) => {
      if (atual.medicoId !== medicoAtual) {
        medicoAtual = atual.medicoId;
        ativos = [];
      }

      ativos = ativos.filter((consulta) => consulta.fimMs > atual.inicioMs);
      for (const anterior of ativos) {
        comparacoes += 1;
        if (conflitaNormalizadas(anterior, atual)) {
          conflitos.push(criarConflito(anterior, atual));
        }
      }
      ativos.push(atual);
    },
    {
      tamanhoFatia: opcoes.tamanhoFatia ?? 100,
      sinalCancelamento: opcoes.sinalCancelamento,
      onProgress: opcoes.onProgress,
    }
  );

  return montarResultado({
    conflitos,
    comparacoes,
    consultasRecebidas,
    consultasValidas: ordenadas.length,
    inicioRelogio,
    cancelado: processamento.cancelado,
    consultasProcessadas: processamento.processados,
  });
}

module.exports = {
  criarSinalDeCancelamento,
  cederAVez,
  conflita,
  detectarConflitosIngenuo,
  detectarConflitosOtimizado,
  detectarConflitosEmFatias,
  processarEmFatias,
};
