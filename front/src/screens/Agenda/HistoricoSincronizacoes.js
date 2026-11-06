import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  DeviceEventEmitter,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  limparHistoricoSincronizacoes,
  obterHistoricoSincronizacoes,
  obterUltimaSincronizacao,
  sincronizarAgenda,
} from '../../services/sincronizacao';
import {
  BACKGROUND_REAL,
  cancelarTarefa,
  estadoDaTarefa,
  forcarTarefaBackgroundParaTeste,
  registrarTarefa,
} from '../../services/tarefaBackground';

function formatarDataHora(valor) {
  if (!valor) return 'Ainda não sincronizada';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return 'Data indisponível';
  return data.toLocaleString('pt-BR');
}

function formatarTempo(valor) {
  const ms = Math.max(0, Number(valor) || 0);
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export default function HistoricoSincronizacoes() {
  const [ultima, setUltima] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [tarefaRegistrada, setTarefaRegistrada] = useState(false);
  const [tarefaDisponivel, setTarefaDisponivel] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    const [ultimaSalva, lista, estadoTarefa] = await Promise.all([
      obterUltimaSincronizacao(),
      obterHistoricoSincronizacoes(),
      estadoDaTarefa(),
    ]);
    setUltima(ultimaSalva);
    setHistorico(lista);
    setTarefaRegistrada(Boolean(estadoTarefa.registrada));
    setTarefaDisponivel(Boolean(estadoTarefa.disponivel));
  }, []);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        await carregar();
      } catch (erroCarregamento) {
        if (ativo) setErro(erroCarregamento?.message || 'Não foi possível carregar o histórico.');
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => { ativo = false; };
  }, [carregar]);

  useEffect(() => {
    const assinatura = DeviceEventEmitter.addListener('duomed:sincronizacao-atualizada', () => {
      carregar().catch((erroCarregamento) => {
        setErro(erroCarregamento?.message || 'Não foi possível atualizar o histórico.');
      });
    });
    return () => assinatura.remove();
  }, [carregar]);

  const sincronizarAgora = async () => {
    setSincronizando(true);
    setErro('');
    setMensagem('');
    try {
      const registro = await sincronizarAgenda('manual');
      await carregar();
      if (registro?.sucesso) {
        setMensagem(`Sincronização concluída: ${registro.totalConflitos} conflito(s) encontrado(s).`);
      } else {
        setErro(registro?.erro || registro?.motivo || 'A sincronização não foi concluída.');
      }
    } catch (erroExecucao) {
      setErro(erroExecucao?.message || 'Não foi possível sincronizar.');
    } finally {
      setSincronizando(false);
    }
  };

  const alternarTarefa = async (ativar) => {
    setErro('');
    setMensagem('');
    try {
      const estado = ativar ? await registrarTarefa() : await cancelarTarefa();
      setTarefaRegistrada(Boolean(estado.registrada));
      setTarefaDisponivel(Boolean(estado.disponivel));
      if (!estado.disponivel) {
        setMensagem(estado.motivo || 'A tarefa periódica não está disponível neste build.');
      } else {
        setMensagem(ativar ? 'Tarefa periódica registrada.' : 'Tarefa periódica cancelada.');
      }
    } catch (erroTarefa) {
      setErro(erroTarefa?.message || 'Não foi possível alterar a tarefa periódica.');
    }
  };

  const forcarTarefa = async () => {
    setErro('');
    setMensagem('');
    try {
      await forcarTarefaBackgroundParaTeste();
      setMensagem('Gatilho de teste enviado ao sistema. Atualize o histórico em instantes.');
    } catch (erroTeste) {
      setErro(erroTeste?.message || 'Não foi possível disparar o teste.');
    }
  };

  const limpar = async () => {
    await limparHistoricoSincronizacoes();
    await carregar();
    setMensagem('Histórico local apagado.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.conteudo}>
      <Text style={styles.titulo}>Sincronização em segundo plano</Text>
      <Text style={styles.descricao}>
        O DuoMed sincroniza ao voltar para o aplicativo, respeitando um intervalo mínimo de 30 minutos.
        Você também pode solicitar uma atualização manual a qualquer momento.
      </Text>

      <View style={styles.cardUltima}>
        <Text style={styles.cardRotulo}>ÚLTIMA SINCRONIZAÇÃO</Text>
        <Text style={styles.cardData}>{formatarDataHora(ultima?.quando)}</Text>
        {ultima ? (
          <>
            <Text style={styles.cardInfo}>Origem: {ultima.origem}</Text>
            <Text style={styles.cardInfo}>
              {ultima.sucesso ? `${ultima.totalConflitos} conflito(s) encontrado(s)` : 'Última tentativa falhou'}
            </Text>
            <Text style={styles.cardInfo}>Duração: {formatarTempo(ultima.duracaoMs)}</Text>
          </>
        ) : <Text style={styles.cardInfo}>Nenhuma execução registrada neste aparelho.</Text>}
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        style={[styles.botaoPrincipal, sincronizando && styles.botaoDesabilitado]}
        onPress={sincronizarAgora}
        disabled={sincronizando}
      >
        {sincronizando ? <ActivityIndicator color="#FFFFFF" /> : null}
        <Text style={styles.textoBotao}>{sincronizando ? 'Sincronizando...' : 'Sincronizar agora'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.botaoOutline} onPress={carregar}>
        <Text style={styles.textoOutline}>Atualizar histórico</Text>
      </TouchableOpacity>

      <View style={styles.cardBackground}>
        <Text style={styles.secaoTitulo}>Tarefa periódica do sistema</Text>
        <View style={styles.linhaSwitch}>
          <View style={styles.switchTexto}>
            <Text style={styles.switchTitulo}>Permitir sincronização periódica</Text>
            <Text style={styles.switchDescricao}>
              {BACKGROUND_REAL
                ? (tarefaDisponivel ? 'O sistema pode executar esta tarefa quando considerar adequado.' : 'O sistema não disponibilizou o agendamento neste aparelho.')
                : 'Desativada no código por padrão. A sincronização ao voltar e a manual continuam funcionando.'}
            </Text>
          </View>
          <Switch
            value={tarefaRegistrada}
            onValueChange={alternarTarefa}
            disabled={!BACKGROUND_REAL || !tarefaDisponivel}
            trackColor={{ false: '#B8C3CC', true: '#7DB69A' }}
            thumbColor={tarefaRegistrada ? '#23845B' : '#F4F4F4'}
          />
        </View>
        {BACKGROUND_REAL && tarefaDisponivel ? (
          <TouchableOpacity style={styles.botaoOutline} onPress={forcarTarefa}>
            <Text style={styles.textoOutline}>Forçar tarefa (somente desenvolvimento)</Text>
          </TouchableOpacity>
        ) : null}
        <Text style={styles.notaBackground}>
          O intervalo de 15 minutos é mínimo, não é um horário garantido. O Android e o iOS decidem quando executar, considerando bateria, rede e políticas do sistema.
        </Text>
      </View>

      {mensagem ? <Text style={styles.mensagem}>{mensagem}</Text> : null}
      {erro ? <Text style={styles.erro}>{erro}</Text> : null}

      <View style={styles.historicoCabecalho}>
        <Text style={styles.secaoTitulo}>Histórico de sincronizações ({historico.length}/20)</Text>
        {historico.length > 0 ? (
          <TouchableOpacity onPress={limpar}>
            <Text style={styles.limpar}>Limpar</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {carregando ? <ActivityIndicator color="#1F3B57" style={{ marginTop: 20 }} /> : null}
      {!carregando && historico.length === 0 ? (
        <Text style={styles.vazio}>Ainda não há registros. Use “Sincronizar agora” para criar o primeiro.</Text>
      ) : null}
      {historico.map((registro) => (
        <View key={registro.id} style={styles.itemHistorico}>
          <View style={styles.linhaHistorico}>
            <Text style={styles.origem}>{registro.origem}</Text>
            <Text style={[styles.status, registro.sucesso ? styles.sucesso : styles.falha]}>
              {registro.sucesso ? 'Concluída' : 'Falhou'}
            </Text>
          </View>
          <Text style={styles.dataHistorico}>{formatarDataHora(registro.quando)}</Text>
          <Text style={styles.detalheHistorico}>
            {registro.sucesso
              ? `${registro.consultasRecebidas} consulta(s) · ${registro.totalConflitos} conflito(s) · ${formatarTempo(registro.duracaoMs)}`
              : (registro.erro || 'Erro não informado')}
          </Text>
        </View>
      ))}

      <Text style={styles.rodape}>
        O aplicativo informa a última execução registrada. Ele não promete que a agenda será atualizada em um intervalo exato.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F9' },
  conteudo: { padding: 18, paddingBottom: 36 },
  titulo: { fontSize: 23, fontWeight: '700', color: '#1F3B57', marginBottom: 7 },
  descricao: { fontSize: 13, lineHeight: 19, color: '#687785', marginBottom: 16 },
  cardUltima: { padding: 15, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#DDE4EA', marginBottom: 12 },
  cardRotulo: { color: '#758391', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 7 },
  cardData: { color: '#1F3B57', fontSize: 17, fontWeight: '700', marginBottom: 6 },
  cardInfo: { color: '#526271', fontSize: 13, marginTop: 3 },
  botaoPrincipal: { backgroundColor: '#1F3B57', padding: 14, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 8 },
  botaoDesabilitado: { opacity: 0.6 },
  textoBotao: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  botaoOutline: { borderWidth: 1, borderColor: '#1F3B57', backgroundColor: '#FFFFFF', borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 8 },
  textoOutline: { color: '#1F3B57', fontWeight: '700', fontSize: 13 },
  cardBackground: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDE4EA', borderRadius: 10, padding: 14, marginTop: 12 },
  secaoTitulo: { fontSize: 16, fontWeight: '700', color: '#1F3B57' },
  linhaSwitch: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  switchTexto: { flex: 1, paddingRight: 8 },
  switchTitulo: { fontSize: 13, color: '#25384A', fontWeight: '700' },
  switchDescricao: { fontSize: 11, color: '#687785', lineHeight: 16, marginTop: 4 },
  notaBackground: { fontSize: 11, color: '#687785', lineHeight: 16, marginTop: 10 },
  mensagem: { color: '#1E6A47', backgroundColor: '#E7F4EC', padding: 10, borderRadius: 7, marginTop: 10, fontSize: 12 },
  erro: { color: '#B42332', backgroundColor: '#FCEBEC', padding: 10, borderRadius: 7, marginTop: 10, fontSize: 12 },
  historicoCabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 8 },
  limpar: { color: '#B42332', fontSize: 12, fontWeight: '700' },
  vazio: { color: '#687785', fontSize: 13, paddingVertical: 18, textAlign: 'center' },
  itemHistorico: { padding: 12, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0E6EB', marginTop: 8 },
  linhaHistorico: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  origem: { color: '#1F3B57', fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
  status: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  sucesso: { color: '#23845B' },
  falha: { color: '#B42332' },
  dataHistorico: { color: '#687785', fontSize: 11, marginTop: 5 },
  detalheHistorico: { color: '#35485B', fontSize: 12, marginTop: 5, lineHeight: 17 },
  rodape: { color: '#7D8994', fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 20 },
});
