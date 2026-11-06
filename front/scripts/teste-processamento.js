const assert = require('node:assert/strict');
const {
  conflita,
  detectarConflitosIngenuo,
  detectarConflitosOtimizado,
  detectarConflitosEmFatias,
  criarSinalDeCancelamento,
} = require('../src/services/processamento');
const { gerarConsultasTeste } = require('../src/services/dadosTesteAgenda');

function chavesDeConflitos(resultado) {
  return resultado.conflitos.map((item) => item.chave).sort();
}

async function main() {
  const quantidade = Number.parseInt(process.argv[2] || '2000', 10);
  if (!Number.isInteger(quantidade) || quantidade < 2000 || quantidade > 5000) {
    throw new Error('Informe uma quantidade entre 2000 e 5000 consultas.');
  }

  const consulta = (id, medicoId, data, horario, duracaoMinutos = 30) => ({
    id,
    medicoId,
    data,
    horario,
    duracaoMinutos,
    status: 'Agendada',
  });

  assert.equal(
    conflita(consulta('a', '1', '2026-10-29', '09:00', 60), consulta('b', '1', '2026-10-29', '09:30', 30)),
    true,
    'Consultas do mesmo médico com horários sobrepostos devem conflitar.'
  );
  assert.equal(
    conflita(consulta('a', '1', '2026-10-29', '09:00', 60), consulta('b', '2', '2026-10-29', '09:30', 30)),
    false,
    'Consultas de médicos diferentes não devem conflitar.'
  );
  assert.equal(
    conflita(consulta('a', '1', '2026-10-29', '09:00', 60), consulta('b', '1', '2026-10-29', '10:00', 30)),
    false,
    'Consultas que só se encostam no horário final/inicial não se sobrepõem.'
  );

  // Caso aninhado: a consulta A sobrepõe B e C, embora B e C não se sobreponham.
  // Isso protege contra falsos negativos ao comparar apenas vizinhos.
  const aninhadas = [
    consulta('A', '1', '2026-10-29', '09:00', 120),
    consulta('B', '1', '2026-10-29', '09:30', 30),
    consulta('C', '1', '2026-10-29', '10:15', 30),
  ];
  const aninhadasIngenuo = detectarConflitosIngenuo(aninhadas);
  const aninhadasOtimizado = detectarConflitosOtimizado(aninhadas);
  assert.deepEqual(chavesDeConflitos(aninhadasOtimizado), chavesDeConflitos(aninhadasIngenuo));
  assert.equal(aninhadasOtimizado.conflitos.length, 2);

  const consultas = gerarConsultasTeste(quantidade);
  assert.equal(consultas.length, quantidade, `A massa de teste deve conter ${quantidade} consultas.`);

  const inicioIngenuo = Date.now();
  const ingenuo = detectarConflitosIngenuo(consultas);
  const tempoIngenuoExterno = Date.now() - inicioIngenuo;

  const inicioOtimizado = Date.now();
  const otimizado = detectarConflitosOtimizado(consultas);
  const tempoOtimizadoExterno = Date.now() - inicioOtimizado;

  assert.deepEqual(
    chavesDeConflitos(otimizado),
    chavesDeConflitos(ingenuo),
    'As versões ingênua e otimizada precisam encontrar exatamente os mesmos pares.'
  );
  assert.equal(ingenuo.comparacoes, quantidade * (quantidade - 1) / 2);
  assert.ok(otimizado.comparacoes < ingenuo.comparacoes, 'A versão otimizada deve comparar menos pares.');
  assert.ok(otimizado.conflitos.length > 0, 'A massa de teste deve conter conflitos intencionais.');

  const medidasFatias = [];
  let quantidadeAtualizacoesProgresso = 0;
  let progressoAnterior = 0;
  const fatiado100 = await detectarConflitosEmFatias(consultas, {
    tamanhoFatia: 100,
    onProgress: ({ progresso }) => {
      assert.ok(progresso >= progressoAnterior, 'O progresso não pode retroceder.');
      progressoAnterior = progresso;
      quantidadeAtualizacoesProgresso += 1;
    },
  });
  assert.equal(fatiado100.cancelado, false);
  assert.deepEqual(chavesDeConflitos(fatiado100), chavesDeConflitos(ingenuo));
  assert.ok(quantidadeAtualizacoesProgresso >= Math.ceil(quantidade / 100), 'O progresso precisa atualizar ao longo dos lotes de 100.');
  medidasFatias.push({ tamanho: 100, duracaoMs: fatiado100.duracaoMs, atualizacoesProgresso: quantidadeAtualizacoesProgresso });

  for (const tamanhoFatia of [500, 5000]) {
    const resultado = await detectarConflitosEmFatias(consultas, { tamanhoFatia });
    assert.equal(resultado.cancelado, false);
    assert.deepEqual(chavesDeConflitos(resultado), chavesDeConflitos(ingenuo));
    medidasFatias.push({ tamanho: tamanhoFatia, duracaoMs: resultado.duracaoMs });
  }

  const sinal = criarSinalDeCancelamento();
  const resultadoCancelamento = await detectarConflitosEmFatias(consultas, {
    tamanhoFatia: 100,
    sinalCancelamento: sinal,
    onProgress: ({ processados }) => {
      if (processados >= 100) sinal.cancelar();
    },
  });
  assert.equal(resultadoCancelamento.cancelado, true, 'A execução deve sinalizar o cancelamento.');
  assert.ok(resultadoCancelamento.consultasProcessadas < consultas.length, 'O laço deve parar antes de processar tudo.');

  const relatorio = {
    node: process.version,
    quantidadeConsultas: consultas.length,
    conflitosEncontrados: ingenuo.conflitos.length,
    comparacoesIngenuo: ingenuo.comparacoes,
    tempoIngenuoMs: tempoIngenuoExterno,
    comparacoesOtimizado: otimizado.comparacoes,
    tempoOtimizadoMs: tempoOtimizadoExterno,
    reducaoComparacoesPercentual: Number((100 * (1 - otimizado.comparacoes / ingenuo.comparacoes)).toFixed(2)),
    fatias: medidasFatias,
    progressoAtualizado: quantidadeAtualizacoesProgresso,
    cancelamento: {
      cancelado: resultadoCancelamento.cancelado,
      processadosAntesDeParar: resultadoCancelamento.consultasProcessadas,
    },
    resultado: 'TODOS OS TESTES PASSARAM',
  };

  console.log(JSON.stringify(relatorio, null, 2));
}

main().catch((erro) => {
  console.error(erro);
  process.exitCode = 1;
});
