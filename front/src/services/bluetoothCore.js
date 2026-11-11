'use strict';

/**
 * Núcleo sem dependências nativas para a busca BLE simulada.
 * Mantido separado para permitir testes com Node.js.
 */
function decodificarFrequencia(valor) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    throw new Error('Valor de frequência inválido.');
  }

  const arredondado = Math.round(numero);
  if (arredondado < 30 || arredondado > 250) {
    throw new Error('Frequência fora do intervalo esperado (30 a 250 BPM).');
  }

  return arredondado;
}

function criarBuscaSimulada({
  aparelhos,
  tempoBuscaMs = 4000,
  agendar = setTimeout,
  cancelar = clearTimeout,
}) {
  let temporizador = null;
  let ativa = false;

  function pararBusca() {
    ativa = false;
    if (temporizador !== null) {
      cancelar(temporizador);
      temporizador = null;
    }
  }

  function procurar(aoEncontrar, aoTerminar, aoErro) {
    pararBusca();
    ativa = true;

    temporizador = agendar(() => {
      if (!ativa) return;

      try {
        for (const aparelho of aparelhos) {
          if (!ativa) break;
          aoEncontrar?.({ ...aparelho });
        }
      } catch (erro) {
        aoErro?.(erro);
      } finally {
        const deveNotificar = ativa;
        ativa = false;
        temporizador = null;
        if (deveNotificar) aoTerminar?.();
      }
    }, tempoBuscaMs);
  }

  return { procurar, pararBusca };
}

module.exports = {
  decodificarFrequencia,
  criarBuscaSimulada,
};
