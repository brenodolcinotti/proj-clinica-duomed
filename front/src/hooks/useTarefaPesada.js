import { useCallback, useEffect, useRef, useState } from 'react';

const { criarSinalDeCancelamento } = require('../services/processamento');

/** Hook para executar uma tarefa longa com progresso e cancelamento seguro. */
export default function useTarefaPesada(tarefa) {
  const [rodando, setRodando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);
  const [cancelando, setCancelando] = useState(false);
  const [cancelada, setCancelada] = useState(false);
  const montadoRef = useRef(false);
  const sinalRef = useRef(null);

  useEffect(() => {
    montadoRef.current = true;

    return () => {
      montadoRef.current = false;
      if (sinalRef.current) sinalRef.current.cancelar();
    };
  }, []);

  const cancelar = useCallback(() => {
    if (sinalRef.current && !sinalRef.current.cancelado) {
      sinalRef.current.cancelar();
      if (montadoRef.current) setCancelando(true);
    }
  }, []);

  const executar = useCallback(async (parametros = {}) => {
    if (sinalRef.current) sinalRef.current.cancelar();
    const sinalCancelamento = criarSinalDeCancelamento();
    sinalRef.current = sinalCancelamento;

    if (montadoRef.current) {
      setRodando(true);
      setCancelando(false);
      setCancelada(false);
      setProgresso(0);
      setResultado(null);
      setErro(null);
    }

    try {
      const retorno = await tarefa({
        ...parametros,
        sinalCancelamento,
        onProgress: ({ progresso: valor }) => {
          if (montadoRef.current && !sinalCancelamento.cancelado) {
            setProgresso(Math.max(0, Math.min(1, valor)));
          }
        },
      });

      if (montadoRef.current) {
        if (!retorno?.cancelado) setProgresso(1);
        setCancelada(Boolean(retorno?.cancelado));
        setResultado(retorno?.cancelado ? null : retorno);
      }
      return retorno;
    } catch (erroCapturado) {
      if (montadoRef.current && !sinalCancelamento.cancelado) {
        setErro(erroCapturado?.message || 'Não foi possível processar a agenda.');
      }
      return null;
    } finally {
      if (montadoRef.current) {
        setRodando(false);
        setCancelando(false);
      }
      if (sinalRef.current === sinalCancelamento) sinalRef.current = null;
    }
  }, [tarefa]);

  return { rodando, progresso, resultado, erro, cancelando, cancelada, executar, cancelar };
}
