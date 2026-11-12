import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { api } from '../../services/api';
import {
  normalizarNumero,
  avaliarTexto,
  criarTextoSms,
  verificarDisponibilidadeSms,
  pedirEnvioPeloAparelho,
  pedirEnvioPeloServidor,
} from '../../services/sms';

const TIPOS = [
  { id: 'confirmacao', titulo: 'Confirmacao' },
  { id: 'lembrete', titulo: 'Lembrete' },
  { id: 'cancelamento', titulo: 'Cancelamento' },
];

export default function EnviarSms({ route, navigation }) {
  const consultaInicial = route.params?.consulta || null;
  const [consulta, setConsulta] = useState(consultaInicial);
  const [paciente, setPaciente] = useState(route.params?.paciente || null);
  const [tipo, setTipo] = useState(route.params?.tipo || 'confirmacao');
  const [telefone, setTelefone] = useState('');
  const [textoAparelho, setTextoAparelho] = useState('');
  const [disponivelNoAparelho, setDisponivelNoAparelho] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [enviandoAparelho, setEnviandoAparelho] = useState(false);
  const [enviandoServidor, setEnviandoServidor] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregando(true);
      setErro('');
      try {
        const consultaId = consultaInicial?.id || route.params?.consultaId;
        const dadosConsulta = consultaId
          ? await api.get(`/consultas/${encodeURIComponent(String(consultaId))}`)
          : consultaInicial;

        if (!dadosConsulta?.id) {
          throw new Error('Não foi possível identificar a consulta para enviar o SMS.');
        }

        const dadosPaciente = paciente || await api.get(
          `/pacientes/${encodeURIComponent(String(dadosConsulta.pacienteId))}`
        );
        const numero = normalizarNumero(dadosPaciente?.telefone);
        if (!numero) {
          throw new Error('O paciente não possui telefone válido. Atualize o cadastro antes de enviar o SMS.');
        }
        const podeEnviarNoAparelho = await verificarDisponibilidadeSms();

        if (ativo) {
          setConsulta(dadosConsulta);
          setPaciente(dadosPaciente);
          setTelefone(numero);
          setDisponivelNoAparelho(podeEnviarNoAparelho);
        }
      } catch (error) {
        if (ativo) {
          setErro(error?.message || 'Não foi possível carregar os dados do paciente.');
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregar();
    return () => { ativo = false; };
  }, [consultaInicial?.id, route.params?.consultaId]);

  // O texto do aparelho pode ser editado pela recepção. O caminho do servidor
  // continua usando o modelo gerado na API, sem aceitar texto livre do cliente.
  const textoModeloServidor = useMemo(() => {
    if (!consulta) return '';
    try { return criarTextoSms(tipo, consulta); }
    catch { return ''; }
  }, [consulta, tipo]);

  useEffect(() => {
    setTextoAparelho(textoModeloServidor);
  }, [textoModeloServidor]);

  const avaliacaoAparelho = useMemo(() => avaliarTexto(textoAparelho), [textoAparelho]);
  const avaliacaoServidor = useMemo(() => avaliarTexto(textoModeloServidor), [textoModeloServidor]);

  const enviarPeloAparelho = async () => {
    setErro('');
    setEnviandoAparelho(true);
    try {
      const retorno = await pedirEnvioPeloAparelho([telefone], textoAparelho);
      const resultado = retorno?.result || 'unknown';
      let mensagem;
      if (resultado === 'cancelled') {
        mensagem = 'A composição da mensagem foi cancelada. Nenhum envio foi confirmado.';
      } else if (resultado === 'sent') {
        mensagem = 'O app de mensagens informou que a ação foi iniciada. Confira no próprio app; o DuoMed não confirma a entrega.';
      } else {
        mensagem = 'O sistema não informou o resultado do envio. Confira manualmente no app de mensagens; não registre o paciente como avisado.';
      }
      Alert.alert('Resultado do aparelho', mensagem);
    } catch (error) {
      Alert.alert('Não foi possível abrir o SMS', error?.message || 'Verifique se este aparelho possui serviço de SMS.');
    } finally {
      setEnviandoAparelho(false);
    }
  };

  const confirmarEnvioServidor = () => {
    const quantidade = avaliacaoServidor.segmentos;
    Alert.alert(
      'Confirmar envio pelo servidor',
      `O gateway da clínica enviará uma mensagem para ${telefone}. Serão usados ${quantidade} segmento(s) de SMS. O envio pode gerar cobrança para a clínica. A aceitação não significa entrega. Deseja continuar?`,
      [
        { text: 'Voltar', style: 'cancel' },
        { text: 'Confirmar envio', onPress: enviarPeloServidor },
      ]
    );
  };

  const enviarPeloServidor = async () => {
    setErro('');
    setEnviandoServidor(true);
    try {
      const resposta = await pedirEnvioPeloServidor(consulta.id, tipo);
      Alert.alert(
        'SMS enfileirado',
        `A API aceitou a solicitação. Status: ${resposta.status || 'enfileirada'}. Isso ainda não confirma que a mensagem chegou ao celular do paciente.\n\nIdentificador: ${resposta.id || 'não informado'}`
      );
    } catch (error) {
      const detalhe = error?.codigo ? `\nCódigo Twilio: ${error.codigo}` : '';
      Alert.alert('Falha no envio', `${error?.message || 'Não foi possível solicitar o SMS.'}${detalhe}`);
    } finally {
      setEnviandoServidor(false);
    }
  };

  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color="#1F3B57" />
        <Text style={styles.textoAuxiliar}>Carregando dados da consulta...</Text>
      </View>
    );
  }

  if (erro && !consulta) {
    return (
      <View style={styles.centro}>
        <Text style={styles.erro}>{erro}</Text>
        <TouchableOpacity style={styles.botaoSecundario} onPress={() => navigation.goBack()}>
          <Text style={styles.botaoTexto}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.conteudo}>
      <Text style={styles.titulo}>Avisar paciente por SMS</Text>
      <Text style={styles.subtitulo}>Consulta #{consulta?.id}</Text>

      <View style={styles.card}>
        <Text style={styles.rotulo}>Paciente</Text>
        <Text style={styles.valor}>{paciente?.nome || 'Paciente'}</Text>
        <Text style={styles.rotulo}>Telefone normalizado</Text>
        <Text style={styles.valor}>{telefone}</Text>
        <Text style={styles.rotulo}>Consulta</Text>
        <Text style={styles.valor}>{consulta?.data} às {consulta?.horario}</Text>
        <Text style={styles.rotulo}>Status</Text>
        <Text style={styles.valor}>{consulta?.status}</Text>
      </View>

      <Text style={styles.secao}>Tipo de mensagem</Text>
      <View style={styles.tipos}>
        {TIPOS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.tipoBotao, tipo === item.id && styles.tipoSelecionado]}
            onPress={() => setTipo(item.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: tipo === item.id }}
          >
            <Text style={[styles.tipoTexto, tipo === item.id && styles.tipoTextoSelecionado]}>
              {item.titulo}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.secao}>Prévia da mensagem</Text>
      <View style={styles.mensagem}>
        <TextInput
          value={textoAparelho}
          onChangeText={setTextoAparelho}
          multiline
          textAlignVertical="top"
          style={styles.campoMensagem}
          accessibilityLabel="Texto editável para abrir no aplicativo de mensagens do aparelho"
          placeholder="Digite uma mensagem sem dados clínicos"
        />
      </View>
      <View style={styles.contadorLinha}>
        <Text style={[styles.contador, avaliacaoAparelho.segmentos > 1 && styles.contadorAlerta]}>
          Aparelho: {avaliacaoAparelho.caracteres} caracteres · {avaliacaoAparelho.segmentos} segmento(s) · {avaliacaoAparelho.codificacao}
        </Text>
      </View>
      {avaliacaoAparelho.alerta ? <Text style={styles.alertaSegmento}>{avaliacaoAparelho.alerta}</Text> : null}
      <Text style={styles.textoModeloServidor}>
        Pelo servidor será usado o modelo protegido: {textoModeloServidor}
      </Text>
      <Text style={styles.contadorServidor}>
        Servidor: {avaliacaoServidor.caracteres} caracteres · {avaliacaoServidor.segmentos} segmento(s)
      </Text>

      <View style={styles.avisoPrivacidade}>
        <Text style={styles.avisoTitulo}>Cuidado com dados pessoais e de saúde</Text>
        <Text style={styles.avisoTexto}>
          Não inclua diagnóstico, especialidade, medicamentos ou resultados de exames. O SMS pode aparecer na tela bloqueada do telefone.
        </Text>
      </View>

      <Text style={styles.secao}>1. Pelo aparelho</Text>
      <Text style={styles.textoAuxiliar}>
        Abre o app de mensagens com número e texto preenchidos. O usuário decide se toca em enviar; a mensagem sai do número e do plano da pessoa que está usando o celular.
      </Text>
      <Text style={styles.disponibilidade}>
        Disponível neste aparelho: {disponivelNoAparelho ? 'sim' : 'não'}
      </Text>
      <TouchableOpacity
        style={[styles.botao, (!disponivelNoAparelho || enviandoAparelho || enviandoServidor) && styles.botaoDesativado]}
        onPress={enviarPeloAparelho}
        disabled={!disponivelNoAparelho || !textoAparelho.trim() || enviandoAparelho || enviandoServidor}
        accessibilityRole="button"
        accessibilityLabel="Abrir o aplicativo de mensagens deste aparelho com o texto preenchido"
      >
        <Text style={styles.botaoTexto}>{enviandoAparelho ? 'Abrindo mensagens...' : 'Abrir app de mensagens'}</Text>
      </TouchableOpacity>

      <Text style={styles.secao}>2. Pelo servidor da clínica</Text>
      <Text style={styles.textoAuxiliar}>
        A DuoMed solicita à API da clínica. O servidor encaminha ao gateway e usa o número remetente da clínica. Pode gerar cobrança por segmento. O app não acessa diretamente o Twilio.
      </Text>
      <TouchableOpacity
        style={[styles.botao, styles.botaoServidor, (enviandoServidor || enviandoAparelho) && styles.botaoDesativado]}
        onPress={confirmarEnvioServidor}
        disabled={enviandoServidor || enviandoAparelho}
        accessibilityRole="button"
        accessibilityLabel={`Solicitar envio de ${avaliacaoServidor.segmentos} segmento(s) pelo servidor da clínica`}
      >
        <Text style={styles.botaoTexto}>{enviandoServidor ? 'Solicitando envio...' : 'Enviar pelo servidor'}</Text>
      </TouchableOpacity>
      {enviandoServidor ? <ActivityIndicator style={styles.indicador} color="#1F3B57" /> : null}

      <TouchableOpacity style={styles.voltar} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Voltar para consultas">
        <Text style={styles.voltarTexto}>Voltar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  conteudo: { padding: 18, paddingBottom: 36 },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  titulo: { color: '#1F3B57', fontSize: 23, fontWeight: 'bold' },
  subtitulo: { color: '#667085', marginTop: 4, marginBottom: 14 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E1E7ED' },
  rotulo: { color: '#667085', fontSize: 12, marginTop: 6 },
  valor: { color: '#1F2937', fontSize: 15, fontWeight: '600' },
  secao: { color: '#1F3B57', fontSize: 17, fontWeight: 'bold', marginTop: 22, marginBottom: 8 },
  tipos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tipoBotao: { borderWidth: 1, borderColor: '#1F3B57', borderRadius: 20, paddingVertical: 9, paddingHorizontal: 13, backgroundColor: '#FFFFFF' },
  tipoSelecionado: { backgroundColor: '#1F3B57' },
  tipoTexto: { color: '#1F3B57', fontWeight: '600' },
  tipoTextoSelecionado: { color: '#FFFFFF' },
  mensagem: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D7E0E8', borderRadius: 8, padding: 14 },
  mensagemTexto: { color: '#263746', fontSize: 15, lineHeight: 22 },
  campoMensagem: { color: '#263746', fontSize: 15, lineHeight: 22, minHeight: 96, padding: 0 },
  textoModeloServidor: { color: '#667085', fontSize: 12, lineHeight: 18, marginTop: 10 },
  contadorServidor: { color: '#667085', fontSize: 12, textAlign: 'right', marginTop: 4 },
  contadorLinha: { alignItems: 'flex-end', marginTop: 6 },
  contador: { color: '#667085', fontSize: 12 },
  contadorAlerta: { color: '#B42318', fontWeight: 'bold' },
  alertaSegmento: { color: '#B42318', fontSize: 13, marginTop: 6, fontWeight: '600' },
  avisoPrivacidade: { backgroundColor: '#FFF4E5', borderColor: '#F5C27A', borderWidth: 1, padding: 12, borderRadius: 8, marginTop: 18 },
  avisoTitulo: { color: '#8A4B08', fontWeight: 'bold', marginBottom: 4 },
  avisoTexto: { color: '#7A4A12', fontSize: 13, lineHeight: 19 },
  textoAuxiliar: { color: '#667085', fontSize: 13, lineHeight: 19 },
  disponibilidade: { color: '#344054', fontWeight: '600', marginTop: 8 },
  botao: { backgroundColor: '#1F3B57', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  botaoServidor: { backgroundColor: '#D97706' },
  botaoDesativado: { opacity: 0.45 },
  botaoTexto: { color: '#FFFFFF', fontWeight: 'bold' },
  indicador: { marginTop: 12 },
  voltar: { padding: 14, alignItems: 'center', marginTop: 16 },
  voltarTexto: { color: '#1F3B57', fontWeight: 'bold' },
  erro: { color: '#B42318', textAlign: 'center', marginBottom: 12 },
  botaoSecundario: { backgroundColor: '#1F3B57', padding: 12, borderRadius: 8 },
});
