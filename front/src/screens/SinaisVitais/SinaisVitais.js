import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { api } from '../../services/api';
import criarServicoBle, {
  BLE_MODO_SIMULADO,
} from '../../services/bluetooth';

const TEMPO_MAXIMO_BUSCA_MS = 10000;

export default function SinaisVitais({ navigation }) {
  const servicoBle = useRef(null);
  if (!servicoBle.current) servicoBle.current = criarServicoBle();

  const [dispositivos, setDispositivos] = useState([]);
  const [estado, setEstado] = useState('inicio');
  const [leituras, setLeituras] = useState([]);
  const [dispositivoAtual, setDispositivoAtual] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [buscaConcluida, setBuscaConcluida] = useState(false);
  const [importando, setImportando] = useState(false);

  const estadoRef = useRef('inicio');
  const telaAtiva = useRef(true);
  const buscaAtiva = useRef(false);
  const dispositivosRef = useRef([]);
  const temporizadorBusca = useRef(null);

  const limparTemporizadorBusca = useCallback(() => {
    if (temporizadorBusca.current !== null) {
      clearTimeout(temporizadorBusca.current);
      temporizadorBusca.current = null;
    }
  }, []);

  const mudarEstado = useCallback(novoEstado => {
    estadoRef.current = novoEstado;
    if (telaAtiva.current) setEstado(novoEstado);
  }, []);

  const finalizarBusca = useCallback((mensagemVazia) => {
    if (!buscaAtiva.current) return;
    buscaAtiva.current = false;
    limparTemporizadorBusca();

    if (!telaAtiva.current) return;

    servicoBle.current?.pararBusca();
    setBuscaConcluida(true);
    mudarEstado('inicio');
    if (dispositivosRef.current.length === 0) {
      setMensagem(
        mensagemVazia ||
        'Nenhum equipamento encontrado. Verifique o aparelho e o Bluetooth. Você também pode digitar os valores manualmente.'
      );
    }
  }, [limparTemporizadorBusca, mudarEstado]);

  const cancelarBusca = useCallback(() => {
    if (!buscaAtiva.current) return;
    buscaAtiva.current = false;
    limparTemporizadorBusca();
    servicoBle.current?.pararBusca();
    setBuscaConcluida(false);
    setMensagem('Busca cancelada. Você pode tentar novamente.');
    mudarEstado('inicio');
  }, [limparTemporizadorBusca, mudarEstado]);

  const desconectar = useCallback(async () => {
    try {
      await servicoBle.current?.desconectar();
    } catch {
      // A interface será limpa mesmo se a conexão já tiver caído.
    }
    if (telaAtiva.current) {
      setDispositivoAtual(null);
      setLeituras([]);
      setMensagem('');
      mudarEstado('inicio');
    }
  }, [mudarEstado]);

  useEffect(() => {
    telaAtiva.current = true;

    const removerFocus = navigation.addListener('focus', () => {
      // Uma tela mantida na pilha pode receber foco novamente depois de blur.
      telaAtiva.current = true;
      if (estadoRef.current === 'procurando') {
        buscaAtiva.current = false;
        limparTemporizadorBusca();
        servicoBle.current?.pararBusca();
        mudarEstado('inicio');
      }
    });

    const removerBlur = navigation.addListener('blur', () => {
      telaAtiva.current = false;
      buscaAtiva.current = false;
      limparTemporizadorBusca();
      servicoBle.current?.pararBusca();
      servicoBle.current?.desconectar();
      estadoRef.current = 'inicio';
    });

    return () => {
      telaAtiva.current = false;
      buscaAtiva.current = false;
      limparTemporizadorBusca();
      removerFocus();
      removerBlur();
      servicoBle.current?.pararBusca();
      servicoBle.current?.desconectar();
    };
  }, [navigation, limparTemporizadorBusca, mudarEstado]);

  const iniciarBusca = async () => {
    if (['procurando', 'conectando', 'conectado'].includes(estadoRef.current)) {
      return;
    }

    buscaAtiva.current = true;
    dispositivosRef.current = [];
    setDispositivos([]);
    setBuscaConcluida(false);
    setMensagem('');
    mudarEstado('procurando');

    try {
      const permissao = await servicoBle.current.solicitarPermissoes();
      if (!telaAtiva.current || !buscaAtiva.current) return;

      if (!permissao) {
        buscaAtiva.current = false;
        setMensagem('Permissão Bluetooth negada. Autorize o acesso nas configurações e tente novamente.');
        setBuscaConcluida(true);
        mudarEstado('inicio');
        return;
      }

      // Proteção adicional: mesmo que o serviço BLE não chame seu callback,
      // a tela sai do estado de carregamento após este prazo.
      temporizadorBusca.current = setTimeout(() => {
        servicoBle.current?.pararBusca();
        finalizarBusca('A busca excedeu o tempo limite. Tente novamente ou use a digitação manual.');
      }, TEMPO_MAXIMO_BUSCA_MS);

      servicoBle.current.procurar(
        aparelho => {
          if (!telaAtiva.current || !buscaAtiva.current) return;
          if (dispositivosRef.current.some(item => item.id === aparelho.id)) return;
          dispositivosRef.current = [...dispositivosRef.current, aparelho];
          setDispositivos(dispositivosRef.current);
        },
        () => finalizarBusca(),
        erro => {
          if (!telaAtiva.current || !buscaAtiva.current) return;
          setMensagem(erro?.message || 'Ocorreu um erro durante a busca Bluetooth.');
        }
      );
    } catch (erro) {
      if (!telaAtiva.current || !buscaAtiva.current) return;
      buscaAtiva.current = false;
      limparTemporizadorBusca();
      setMensagem(erro?.message || 'Não foi possível iniciar a busca Bluetooth.');
      setBuscaConcluida(true);
      mudarEstado('inicio');
    }
  };

  const conectarDispositivo = async aparelho => {
    buscaAtiva.current = false;
    limparTemporizadorBusca();
    servicoBle.current.pararBusca();
    setLeituras([]);
    setMensagem('');
    setDispositivoAtual(null);
    mudarEstado('conectando');

    try {
      await servicoBle.current.conectar(aparelho.id);
      if (!telaAtiva.current) {
        await servicoBle.current.desconectar();
        return;
      }
      setDispositivoAtual(aparelho);
      mudarEstado('conectado');

      servicoBle.current.monitorarFrequencia(
        valor => {
          if (!telaAtiva.current || estadoRef.current !== 'conectado') return;
          const numero = Number(valor);
          if (!Number.isFinite(numero) || numero < 30 || numero > 250) return;
          setLeituras(anteriores => [...anteriores, Math.round(numero)]);
        },
        erro => {
          if (!telaAtiva.current) return;
          servicoBle.current.desconectar();
          setDispositivoAtual(null);
          setLeituras([]);
          setMensagem(erro?.message || 'A conexão foi perdida. Tente novamente ou digite os valores manualmente.');
          mudarEstado('inicio');
        }
      );
    } catch (erro) {
      if (!telaAtiva.current) return;
      await servicoBle.current.desconectar();
      setDispositivoAtual(null);
      setLeituras([]);
      setMensagem(erro?.message || 'Não foi possível conectar ao equipamento.');
      mudarEstado('inicio');
    }
  };

  const importarParaProntuario = async () => {
    if (BLE_MODO_SIMULADO) {
      Alert.alert(
        'Modo de demonstração',
        'As leituras exibidas são fictícias e não podem ser gravadas no prontuário como medições reais. Use um equipamento BLE configurado ou a digitação manual.'
      );
      return;
    }

    if (leituras.length === 0) {
      Alert.alert('Sem leituras', 'Aguarde pelo menos uma leitura antes de continuar.');
      return;
    }
    if (importando) return;

    const mediaCalculada = Math.round(
      leituras.reduce((total, valor) => total + valor, 0) / leituras.length
    );
    setImportando(true);

    try {
      await api.post('/sinaisVitais', {
        frequenciaCardiaca: mediaCalculada,
        quantidadeLeituras: leituras.length,
        origem: 'bluetooth',
        dispositivo: dispositivoAtual?.name || 'Aparelho BLE',
        dataHora: new Date().toISOString(),
      });
      Alert.alert('Importação concluída', `Registro enviado à API. Média: ${mediaCalculada} BPM.`);
    } catch (erro) {
      Alert.alert('Falha na importação', erro?.message || 'Não foi possível gravar os sinais vitais.');
    } finally {
      setImportando(false);
    }
  };

  const abrirDigitacaoManual = () => navigation.navigate('SinaisVitaisManual');
  const media = leituras.length
    ? Math.round(leituras.reduce((soma, valor) => soma + valor, 0) / leituras.length)
    : null;

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Importação de Sinais Vitais</Text>

      {BLE_MODO_SIMULADO && (
        <Text style={styles.avisoDemo}>
          Modo demonstração: os equipamentos e valores são simulados. Nenhum dispositivo físico está sendo medido.
        </Text>
      )}

      {dispositivoAtual && (
        <Text style={styles.dispositivo}>Equipamento: {dispositivoAtual.name || 'Aparelho BLE'}</Text>
      )}

      {(estado === 'inicio' || estado === 'procurando') && (
        <View style={styles.secao}>
          <Button
            title={estado === 'procurando' ? 'Cancelar busca' : 'Procurar equipamentos (BLE)'}
            onPress={estado === 'procurando' ? cancelarBusca : iniciarBusca}
            color={estado === 'procurando' ? '#DC3545' : undefined}
          />

          {estado === 'procurando' && (
            <View style={styles.carregando}>
              <ActivityIndicator size="large" color="#007BFF" />
              <Text style={styles.info}>Procurando por até 4 segundos...</Text>
            </View>
          )}

          {mensagem !== '' && <Text style={styles.aviso}>{mensagem}</Text>}

          {buscaConcluida && dispositivos.length === 0 && (
            <Text style={styles.info}>Nenhum equipamento disponível. Você também pode digitar os valores manualmente.</Text>
          )}
        </View>
      )}

      {estado === 'conectando' && (
        <View style={styles.carregando}>
          <ActivityIndicator size="large" color="#007BFF" />
          <Text style={styles.info}>Conectando ao equipamento...</Text>
        </View>
      )}

      {(estado === 'inicio' || estado === 'procurando') && (
        <FlatList
          style={styles.lista}
          data={dispositivos}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() => conectarDispositivo(item)}
              disabled={estado !== 'inicio'}
              accessibilityRole="button"
              accessibilityLabel={`Conectar a ${item.name || 'aparelho sem nome'}`}
            >
              <Text style={styles.nomeAparelho}>{item.name || 'Aparelho sem nome'}</Text>
              <Text style={styles.acao}>Toque para conectar</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {estado === 'conectado' && (
        <View style={styles.leituraContainer}>
          <Text style={styles.rotulo}>Última leitura</Text>
          <Text style={styles.bpm}>{leituras.length ? `${leituras[leituras.length - 1]} BPM` : '-- BPM'}</Text>
          <Text style={styles.info}>Leituras recebidas: {leituras.length}</Text>
          <Text style={styles.info}>Média das leituras: {media === null ? '--' : `${media} BPM`}</Text>

          <View style={styles.botao}>
            <Button
              title={BLE_MODO_SIMULADO ? 'Importação desativada (demonstração)' : importando ? 'Importando...' : 'Importar para o prontuário'}
              onPress={importarParaProntuario}
              disabled={BLE_MODO_SIMULADO || importando || leituras.length === 0}
            />
          </View>
          <View style={styles.botao}>
            <Button title="Desconectar" color="#DC3545" onPress={desconectar} disabled={importando} />
          </View>
        </View>
      )}

      <View style={styles.manualContainer}>
        <Button title="Digitar os valores manualmente" color="#666666" onPress={abrirDigitacaoManual} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#FFFFFF' },
  titulo: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#222222' },
  secao: { marginBottom: 10 },
  carregando: { alignItems: 'center', marginVertical: 20 },
  info: { marginVertical: 8, color: '#555555', textAlign: 'center' },
  aviso: { marginTop: 12, padding: 12, color: '#8A2C0D', backgroundColor: '#FFF0E8', borderRadius: 6 },
  avisoDemo: { marginBottom: 14, padding: 12, color: '#704B00', backgroundColor: '#FFF4D6', borderRadius: 6, lineHeight: 19 },
  lista: { flexGrow: 0, maxHeight: 250 },
  item: { padding: 15, backgroundColor: '#E8F1FA', marginVertical: 5, borderRadius: 8 },
  nomeAparelho: { fontSize: 16, fontWeight: 'bold' },
  acao: { color: '#444444', marginTop: 4 },
  dispositivo: { marginBottom: 10, color: '#444444' },
  leituraContainer: { alignItems: 'center', marginVertical: 20 },
  rotulo: { fontSize: 16, color: '#555555' },
  bpm: { fontSize: 42, fontWeight: 'bold', color: '#C62828', marginVertical: 10 },
  botao: { width: '100%', marginTop: 15 },
  manualContainer: { marginTop: 'auto', paddingTop: 20, borderTopWidth: 1, borderColor: '#CCCCCC' },
});
