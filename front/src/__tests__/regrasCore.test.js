
const {
  conflita,
  detectarConflitosIngenuo,
} = require('../services/processamento');

const {
  normalizarNumero,
  contarSegmentos,
} = require('../services/smsCore');

const {
  calcularDistanciaKm,
  formatarDistanciaKm,
} = require('../services/mapaUtils.cjs');

describe('Regras de negócio - Agenda', () => {
  const consulta = (id, medicoId, inicio, duracaoMinutos = 30, status = 'agendada') => ({
    id,
    medicoId,
    dataHora: inicio,
    duracaoMinutos,
    status,
  });

  test('deve identificar consultas sobrepostas do mesmo médico', () => {
    const a = consulta(1, 10, '2026-11-27T10:00:00.000Z');
    const b = consulta(2, 10, '2026-11-27T10:15:00.000Z');

    expect(conflita(a, b)).toBe(true);
  });

  test('não deve considerar conflito quando uma consulta termina exatamente quando a outra começa', () => {
    const a = consulta(1, 10, '2026-11-27T10:00:00.000Z');
    const b = consulta(2, 10, '2026-11-27T10:30:00.000Z');

    expect(conflita(a, b)).toBe(false);
  });

  test('não deve identificar conflito entre médicos diferentes', () => {
    const a = consulta(1, 10, '2026-11-27T10:00:00.000Z');
    const b = consulta(2, 20, '2026-11-27T10:15:00.000Z');

    expect(conflita(a, b)).toBe(false);
  });

  test('não deve identificar conflito com consulta cancelada', () => {
    const a = consulta(1, 10, '2026-11-27T10:00:00.000Z');
    const b = consulta(
      2,
      10,
      '2026-11-27T10:15:00.000Z',
      30,
      'cancelada'
    );

    expect(conflita(a, b)).toBe(false);
  });

  test('deve encontrar conflitos na lista de consultas', () => {
    const consultas = [
      consulta(1, 10, '2026-11-27T10:00:00.000Z'),
      consulta(2, 10, '2026-11-27T10:15:00.000Z'),
      consulta(3, 20, '2026-11-27T10:00:00.000Z'),
    ];

    const resultado = detectarConflitosIngenuo(consultas);

    expect(resultado.conflitos).toHaveLength(1);
    expect(resultado.conflitos[0].consultaAId).toBe('1');
    expect(resultado.conflitos[0].consultaBId).toBe('2');
  });
});

describe('Regras de negócio - SMS', () => {
  test('deve normalizar telefone brasileiro com DDD', () => {
    expect(normalizarNumero('(11) 98765-4321')).toBe(
      '+5511987654321'
    );
  });

  test('deve preservar o código internacional informado', () => {
    expect(normalizarNumero('+55 (11) 98765-4321')).toBe(
      '+5511987654321'
    );
  });

  test('deve retornar null para telefone inválido', () => {
    expect(normalizarNumero('123')).toBeNull();
  });

  test('deve contar 160 caracteres GSM-7 como um segmento', () => {
    const resultado = contarSegmentos('A'.repeat(160));

    expect(resultado.codificacao).toBe('GSM-7');
    expect(resultado.caracteres).toBe(160);
    expect(resultado.segmentos).toBe(1);
  });

  test('deve contar 161 caracteres GSM-7 como dois segmentos', () => {
    const resultado = contarSegmentos('A'.repeat(161));

    expect(resultado.codificacao).toBe('GSM-7');
    expect(resultado.caracteres).toBe(161);
    expect(resultado.segmentos).toBe(2);
  });
});

describe('Regras de negócio - Mapa e distância', () => {
  test('deve calcular distância entre duas coordenadas', () => {
    const origem = {
      latitude: 0,
      longitude: 0,
    };

    const destino = {
      latitude: 0,
      longitude: 1,
    };

    const distancia = calcularDistanciaKm(origem, destino);

    expect(distancia).toBeCloseTo(111.195, 2);
  });

  test('deve retornar distância zero para coordenadas iguais', () => {
    const ponto = {
      latitude: -22.0,
      longitude: -47.0,
    };

    expect(calcularDistanciaKm(ponto, ponto)).toBe(0);
  });

  test('deve formatar distâncias menores que um quilômetro em metros', () => {
    expect(formatarDistanciaKm(0.5)).toBe(
      '500 m em linha reta'
    );
  });

  test('deve tratar distância não disponível', () => {
    expect(formatarDistanciaKm(null)).toBe(
      'Distância indisponível'
    );
  });

  test('deve rejeitar coordenadas inválidas', () => {
    expect(() =>
      calcularDistanciaKm(
        { latitude: 100, longitude: 0 },
        { latitude: 0, longitude: 0 }
      )
    ).toThrow(RangeError);
  });
});
