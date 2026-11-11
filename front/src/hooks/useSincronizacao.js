import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, DeviceEventEmitter } from 'react-native';
import {
  obterHistoricoSincronizacoes,
  obterUltimaSincronizacao,
  precisaSincronizar,
  sincronizarAgenda,
} from '../services/sincronizacao';

/** Mantém a sincronização ao retornar ao app, respeitando intervalo mínimo. */
export default function useSincronizacao({ intervaloMinutos = 30, habilitado = true } = {}) {
  const [ultimaSincronizacao, setUltimaSincronizacao] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [sincronizando, setSincronizando] = useState(false);
  const [erro, setErro] = useState(null);
  const montadoRef = useRef(false);
  const estadoAnteriorRef = useRef(AppState.currentState || 'active');
  const execucaoRef = useRef(false);

  const carregarDados = useCallback(async () => {
    const [ultima, lista] = await Promise.all([
      obterUltimaSincronizacao(),
      obterHistoricoSincronizacoes(),
    ]);
    if (montadoRef.current) {
      setUltimaSincronizacao(ultima);
      setHistorico(lista);
    }
    return { ultima, historico: lista };
  }, []);

  const executar = useCallback(async (origem) => {
    if (execucaoRef.current) return null;
    execucaoRef.current = true;
    if (montadoRef.current) {
      setSincronizando(true);
      setErro(null);
    }
    try {
      const registro = await sincronizarAgenda(origem);
      await carregarDados();
      DeviceEventEmitter.emit('duomed:sincronizacao-atualizada');
      if (montadoRef.current && registro && !registro.sucesso) {
        setErro(registro.erro || registro.motivo || 'A sincronização não foi concluída.');
      }
      return registro;
    } catch (erroCapturado) {
      if (montadoRef.current) setErro(erroCapturado?.message || 'Erro ao sincronizar a agenda.');
      return null;
    } finally {
      execucaoRef.current = false;
      if (montadoRef.current) setSincronizando(false);
    }
  }, [carregarDados]);

  const sincronizarAgora = useCallback(() => executar('manual'), [executar]);

  useEffect(() => {
    montadoRef.current = true;
    carregarDados().catch((erroCapturado) => {
      if (montadoRef.current) setErro(erroCapturado?.message || 'Não foi possível ler o histórico.');
    });

    const assinatura = AppState.addEventListener('change', (proximoEstado) => {
      const voltouParaFrente =
        ['inactive', 'background'].includes(estadoAnteriorRef.current) &&
        proximoEstado === 'active';
      estadoAnteriorRef.current = proximoEstado;

      if (habilitado && voltouParaFrente) {
        (async () => {
          if (await precisaSincronizar(intervaloMinutos)) {
            await executar('voltou ao app');
          } else {
            await carregarDados();
          }
        })().catch((erroCapturado) => {
          if (montadoRef.current) setErro(erroCapturado?.message || 'Erro ao retomar a sincronização.');
        });
      }
    });

    return () => {
      montadoRef.current = false;
      assinatura.remove();
    };
  }, [carregarDados, executar, habilitado, intervaloMinutos]);

  return {
    ultimaSincronizacao,
    historico,
    sincronizando,
    erro,
    carregarDados,
    sincronizarAgora,
  };
}
