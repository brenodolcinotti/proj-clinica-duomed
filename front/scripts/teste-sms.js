const assert = require('node:assert/strict');
const {
  normalizarNumero,
  contarSegmentos,
  avaliarTexto,
  criarTextoSms,
  TIPOS_SMS,
} = require('../src/services/smsCore');

function executar(nome, fn) {
  fn();
  console.log(`OK: ${nome}`);
}

const consulta = { data: '2026-11-20', horario: '14:30' };

executar('normaliza telefone brasileiro com DDD para E.164', () => {
  assert.equal(normalizarNumero('(16) 99999-8888'), '+5516999998888');
});

executar('preserva telefone internacional válido', () => {
  assert.equal(normalizarNumero('+55 16 99999-8888'), '+5516999998888');
});

executar('recusa telefone inválido', () => {
  assert.equal(normalizarNumero('9999'), null);
  assert.equal(normalizarNumero(''), null);
});

executar('conta segmentos GSM-7 no limite e acima do limite', () => {
  assert.equal(contarSegmentos('a'.repeat(160)).segmentos, 1);
  assert.equal(contarSegmentos('a'.repeat(161)).segmentos, 2);
});

executar('conta caractere da tabela estendida como duas unidades', () => {
  const resultado = contarSegmentos('^'.repeat(81));
  assert.equal(resultado.unidades, 162);
  assert.equal(resultado.segmentos, 2);
});

executar('usa UCS-2 quando há caractere fora de GSM-7', () => {
  const resultado = contarSegmentos('Olá');
  assert.equal(resultado.codificacao, 'UCS-2');
  assert.equal(resultado.segmentos, 1);
});

executar('avisa quando a mensagem ultrapassa um segmento', () => {
  const resultado = avaliarTexto('x'.repeat(161));
  assert.equal(resultado.segmentos, 2);
  assert.match(resultado.alerta, /2 segmentos/);
});

executar('gera três modelos sem dados clínicos e dentro de um segmento', () => {
  assert.deepEqual([...TIPOS_SMS].sort(), ['cancelamento', 'confirmacao', 'lembrete']);
  for (const tipo of TIPOS_SMS) {
    const texto = criarTextoSms(tipo, consulta);
    assert.ok(texto.length > 0);
    assert.ok(contarSegmentos(texto).segmentos === 1, `${tipo} excedeu um segmento`);
    assert.doesNotMatch(texto, /cardiologia|diagnóstico|medicamento|exame|resultado/i);
  }
});

executar('recusa tipo de mensagem desconhecido ou consulta incompleta', () => {
  assert.throws(() => criarTextoSms('resultado_exame', consulta), /Tipo de SMS inválido/);
  assert.throws(() => criarTextoSms('lembrete', { data: '2026-11-20' }), /data e horário/);
});

console.log('Todos os testes do núcleo SMS passaram.');
