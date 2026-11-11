/** Gera consultas fictícias apenas em memória, sem gravar na API ou no banco. */
function criarGerador(seed) {
  let estado = seed >>> 0;
  return function aleatorio() {
    estado = (1664525 * estado + 1013904223) >>> 0;
    return estado / 0x100000000;
  };
}

function formatarDataLocal(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function gerarConsultasTeste(quantidade = 2000) {
  const total = Math.max(0, Math.floor(Number(quantidade) || 0));
  const aleatorio = criarGerador(20261029);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const consultas = [];

  for (let i = 0; i < total; i += 1) {
    const data = new Date(hoje);
    data.setDate(data.getDate() + Math.floor(aleatorio() * 30));
    const hora = 8 + Math.floor(aleatorio() * 10);
    const minuto = [0, 15, 30, 45][Math.floor(aleatorio() * 4)];

    consultas.push({
      id: `teste-${String(i + 1).padStart(5, '0')}`,
      pacienteId: `paciente-teste-${(i % 300) + 1}`,
      medicoId: String(1 + Math.floor(aleatorio() * 10)),
      data: formatarDataLocal(data),
      horario: `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`,
      duracaoMinutos: aleatorio() < 0.5 ? 30 : 60,
      status: 'Agendada',
    });
  }

  // Injeta conflitos intencionais: grupos de cinco consultas com o mesmo
  // médico, data e horário, para que o teste valide conflitos reais.
  const gruposDeConflito = Math.min(20, Math.floor(total / 5));
  for (let grupo = 0; grupo < gruposDeConflito; grupo += 1) {
    const data = new Date(hoje);
    data.setDate(data.getDate() + grupo);
    const inicio = grupo * 5;
    for (let deslocamento = 0; deslocamento < 5; deslocamento += 1) {
      const indice = inicio + deslocamento;
      consultas[indice] = {
        ...consultas[indice],
        medicoId: String((grupo % 10) + 1),
        data: formatarDataLocal(data),
        horario: '09:00',
        duracaoMinutos: deslocamento % 2 === 0 ? 60 : 30,
      };
    }
  }

  return consultas;
}

module.exports = { gerarConsultasTeste };
