import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { api } from '../../services/api';
import useTarefaPesada from '../../hooks/useTarefaPesada';

const { detectarConflitosEmFatias } = require('../../services/processamento');
const { gerarConsultasTeste } = require('../../services/dadosTesteAgenda');

const TOTAL_CONSULTAS_TESTE = 2000;
const TAMANHO_FATIA_PADRAO = 100;

async function executarVerificacaoAgenda({
  fonte,
  sinalCancelamento,
  onProgress,
  tamanhoFatia = TAMANHO_FATIA_PADRAO,
}) {
  // A espera da API não ocupa a thread de JS. Só o cálculo é fatiado.
  const consultas = fonte === 'teste'
    ? gerarConsultasTeste(TOTAL_CONSULTAS_TESTE)
    : await api.get('/consultas');

  if (sinalCancelamento.cancelado) {
    return {
      cancelado: true,
      conflitos: [],
      consultasRecebidas: Array.isArray(consultas) ? consultas.length : 0,
      consultasProcessadas: 0,
      comparacoes: 0,
      duracaoMs: 0,
    };
  }

  return detectarConflitosEmFatias(consultas, {
    tamanhoFatia,
    sinalCancelamento,
    onProgress,
  });
}

function formatarDataHora(valor) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return 'data inválida';
  return `${data.toLocaleDateString('pt-BR')} às ${data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export default function SincronizarAgenda() {
  const {
    rodando,
    progresso,
    resultado,
    erro,
    cancelando,
    cancelada,
    executar,
    cancelar,
  } = useTarefaPesada(executarVerificacaoAgenda);

  const iniciar = useCallback((fonte) => {
    executar({ fonte, tamanhoFatia: TAMANHO_FATIA_PADRAO });
  }, [executar]);

  const porcentagem = Math.round(progresso * 100);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.conteudo}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.titulo}>Sincronizar agenda</Text>
      <Text style={styles.descricao}>
        O DuoMed verifica horários sobrepostos para o mesmo médico. O cálculo é
        dividido em lotes para que a tela continue respondendo.
      </Text>

      <View style={styles.aviso}>
        <Text style={styles.avisoTitulo}>Como funciona</Text>
        <Text style={styles.avisoTexto}>
          A versão otimizada agrupa por médico, ordena por horário e mantém os
          atendimentos que ainda podem se sobrepor. A cada lote, o app cede a
          vez ao event loop.
        </Text>
      </View>

      <Text style={styles.rotuloSecao}>Escolha os dados para verificar</Text>
      <TouchableOpacity
        accessibilityRole="button"
        style={[styles.botaoPrimario, rodando && styles.botaoDesabilitado]}
        onPress={() => iniciar('api')}
        disabled={rodando}
      >
        <Text style={styles.textoBotao}>Verificar consultas da API</Text>
      </TouchableOpacity>

      <TouchableOpacity
        accessibilityRole="button"
        style={[styles.botaoSecundario, rodando && styles.botaoDesabilitado]}
        onPress={() => iniciar('teste')}
        disabled={rodando}
      >
        <Text style={styles.textoBotaoSecundario}>
          Testar com {TOTAL_CONSULTAS_TESTE.toLocaleString('pt-BR')} consultas fictícias
        </Text>
      </TouchableOpacity>
      <Text style={styles.ajuda}>
        O teste cria dados somente na memória do aparelho. Não grava nem altera
        consultas na API da clínica.
      </Text>

      {(rodando || resultado || erro || cancelada) && (
        <View style={styles.painel}>
          <Text style={styles.rotuloSecao}>Progresso do processamento</Text>
          {rodando ? (
            <View style={styles.linhaCarregando}>
              <ActivityIndicator size="small" color="#1F3B57" />
              <Text style={styles.textoCarregando}>
                {cancelando ? 'Cancelando tarefa...' : 'Verificando conflitos...'}
              </Text>
            </View>
          ) : null}

          <View
            style={styles.barraFundo}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: porcentagem }}
          >
            <View style={[styles.barra, { width: `${porcentagem}%` }]} />
          </View>
          <Text style={styles.progressoTexto}>{porcentagem}% concluído</Text>

          {rodando ? (
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.botaoCancelar}
              onPress={cancelar}
              disabled={cancelando}
            >
              <Text style={styles.textoBotao}> {cancelando ? 'Cancelando...' : 'Cancelar processamento'} </Text>
            </TouchableOpacity>
          ) : null}

          {erro ? <Text style={styles.erro}>{erro}</Text> : null}
          {cancelada ? (
            <Text style={styles.cancelamentoConcluido}>Processamento cancelado. O resultado parcial foi descartado.</Text>
          ) : null}

          {resultado ? (
            <View style={styles.resultado}>
              <Text style={styles.resultadoTitulo}>Verificação concluída</Text>
              <Text style={styles.metrica}>
                Consultas válidas: {resultado.consultasValidas.toLocaleString('pt-BR')}
              </Text>
              <Text style={styles.metrica}>
                Consultas ignoradas: {resultado.consultasIgnoradas.toLocaleString('pt-BR')}
              </Text>
              <Text style={styles.metrica}>
                Comparações de intervalos: {resultado.comparacoes.toLocaleString('pt-BR')}
              </Text>
              <Text style={styles.metrica}>
                Tempo de processamento: {resultado.duracaoMs} ms
              </Text>
              <Text style={[
                styles.resumoConflitos,
                resultado.conflitos.length ? styles.resumoComConflito : styles.resumoSemConflito,
              ]}>
                {resultado.conflitos.length === 0
                  ? 'Nenhum conflito encontrado.'
                  : `${resultado.conflitos.length.toLocaleString('pt-BR')} conflito(s) encontrado(s).`}
              </Text>

              {resultado.conflitos.length > 0 ? (
                <View style={styles.listaConflitos}>
                  <Text style={styles.rotuloSecao}>Primeiros conflitos</Text>
                  {resultado.conflitos.slice(0, 10).map((conflito) => (
                    <View key={conflito.chave} style={styles.conflitoItem}>
                      <Text style={styles.conflitoTitulo}>
                        Médico {conflito.medicoId}: consultas {conflito.consultaAId} e {conflito.consultaBId}
                      </Text>
                      <Text style={styles.conflitoDetalhe}>
                        {formatarDataHora(conflito.inicioA)} – {formatarDataHora(conflito.fimA)}
                      </Text>
                      <Text style={styles.conflitoDetalhe}>
                        {formatarDataHora(conflito.inicioB)} – {formatarDataHora(conflito.fimB)}
                      </Text>
                    </View>
                  ))}
                  {resultado.conflitos.length > 10 ? (
                    <Text style={styles.ajuda}>
                      Exibindo 10 de {resultado.conflitos.length.toLocaleString('pt-BR')} conflitos.
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      )}

      <Text style={styles.rodape}>
        Este recurso usa processamento em fatias na thread de JavaScript; não cria
        uma thread paralela. Para volumes maiores em produção, a validação final
        dos horários também deve ser garantida pelo servidor.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  conteudo: { padding: 20, paddingBottom: 40 },
  titulo: { fontSize: 24, fontWeight: '700', color: '#1F3B57', marginBottom: 8 },
  descricao: { color: '#4D5966', fontSize: 14, lineHeight: 21, marginBottom: 16 },
  aviso: {
    backgroundColor: '#EAF1F7', borderRadius: 8, borderWidth: 1,
    borderColor: '#D5E1EC', padding: 14, marginBottom: 22,
  },
  avisoTitulo: { fontSize: 15, fontWeight: '700', color: '#1F3B57', marginBottom: 5 },
  avisoTexto: { fontSize: 13, lineHeight: 19, color: '#35485B' },
  rotuloSecao: { fontSize: 16, fontWeight: '700', color: '#1F3B57', marginBottom: 10 },
  botaoPrimario: {
    backgroundColor: '#1F3B57', borderRadius: 8, padding: 14,
    alignItems: 'center', marginBottom: 10,
  },
  botaoSecundario: {
    backgroundColor: '#FFFFFF', borderColor: '#1F3B57', borderWidth: 1,
    borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 8,
  },
  textoBotao: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  textoBotaoSecundario: { color: '#1F3B57', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  botaoDesabilitado: { opacity: 0.5 },
  ajuda: { color: '#687785', fontSize: 12, lineHeight: 17, marginBottom: 16 },
  painel: {
    marginTop: 12, padding: 14, backgroundColor: '#FFFFFF', borderRadius: 8,
    borderWidth: 1, borderColor: '#DDE4EA',
  },
  linhaCarregando: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  textoCarregando: { marginLeft: 8, fontSize: 13, color: '#35485B' },
  barraFundo: { height: 12, backgroundColor: '#E3E9EF', borderRadius: 8, overflow: 'hidden' },
  barra: { height: '100%', backgroundColor: '#23845B', borderRadius: 8 },
  progressoTexto: { textAlign: 'right', fontSize: 12, color: '#687785', marginTop: 5, marginBottom: 8 },
  botaoCancelar: { backgroundColor: '#B42332', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 5 },
  erro: { color: '#B42332', marginTop: 10, fontSize: 14 },
  cancelamentoConcluido: { color: '#8A4B0F', marginTop: 10, fontSize: 14, lineHeight: 19 },
  resultado: { marginTop: 14, borderTopWidth: 1, borderTopColor: '#E2E7EC', paddingTop: 14 },
  resultadoTitulo: { fontSize: 17, fontWeight: '700', color: '#1F3B57', marginBottom: 8 },
  metrica: { color: '#35485B', fontSize: 13, marginBottom: 4 },
  resumoConflitos: { fontSize: 15, fontWeight: '700', marginTop: 10, marginBottom: 8 },
  resumoComConflito: { color: '#B42332' },
  resumoSemConflito: { color: '#23845B' },
  listaConflitos: { marginTop: 10 },
  conflitoItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E8EDF1' },
  conflitoTitulo: { fontSize: 13, color: '#25384A', fontWeight: '700', marginBottom: 4 },
  conflitoDetalhe: { fontSize: 12, color: '#596876', marginBottom: 2 },
  rodape: { color: '#687785', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 24 },
});
