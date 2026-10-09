import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';

import {
  View,
  Text,
  Button,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';

import criarServicoBle from '../../services/bluetooth';
import { api } from '../../services/api';

export default function SinaisVitais({ navigation }) {
  const servicoBle = useRef(null);

  if (!servicoBle.current) {
    servicoBle.current = criarServicoBle();
  }

  const [dispositivos, setDispositivos] = useState([]);
  const [estado, setEstado] = useState('inicio');
  const [leituras, setLeituras] = useState([]);
  const [dispositivoAtual, setDispositivoAtual] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [buscaConcluida, setBuscaConcluida] = useState(false);
  const [importando, setImportando] = useState(false);

  const estadoRef = useRef('inicio');
  const telaAtiva = useRef(true);

  const mudarEstado = useCallback((novoEstado) => {
    estadoRef.current = novoEstado;

    if (telaAtiva.current) {
      setEstado(novoEstado);
    }
  }, []);

  const desconectar = useCallback(async () => {
    try {
      await servicoBle.current?.desconectar();
    } catch {
      // A tela será limpa mesmo se o aparelho já estiver desconectado.
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

    const unsubscribe = navigation.addListener('blur', () => {
      telaAtiva.current = false;
      servicoBle.current?.pararBusca();
      servicoBle.current?.desconectar();
      estadoRef.current = 'inicio';
    });

    return () => {
      telaAtiva.current = false;
      unsubscribe();
      servicoBle.current?.pararBusca();
      servicoBle.current?.desconectar();
    };
  }, [navigation]);

  const iniciarBusca = async () => {
    if (
      estadoRef.current === 'procurando' ||
      estadoRef.current === 'conectando' ||
      estadoRef.current === 'conectado'
    ) {
      return;
    }

    setDispositivos([]);
    setBuscaConcluida(false);
    setMensagem('');
    mudarEstado('procurando');

    try {
      const permissao =
        await servicoBle.current.solicitarPermissoes();

      if (!permissao) {
        setMensagem(
          'Permissão Bluetooth negada. Autorize o acesso nas configurações do aparelho e tente novamente.'
        );
        setBuscaConcluida(true);
        mudarEstado('inicio');
        return;
      }

      servicoBle.current.procurar(
        (aparelho) => {
          if (!telaAtiva.current) return;

          setDispositivos((anteriores) => {
            if (
              anteriores.some((item) => item.id === aparelho.id)
            ) {
              return anteriores;
            }

            return [...anteriores, aparelho];
          });
        },
        () => {
          if (!telaAtiva.current) return;

          setBuscaConcluida(true);
          mudarEstado('inicio');

          setDispositivos((lista) => {
            if (lista.length === 0) {
              setMensagem(
                'Nenhum aparelho encontrado. Verifique se está ligado, próximo e com Bluetooth ativo. Você também pode digitar os valores manualmente.'
              );
            }

            return lista;
          });
        }
      );
    } catch (erro) {
      if (!telaAtiva.current) return;

      setMensagem(
        erro?.message ||
          'Não foi possível iniciar a busca Bluetooth. Verifique as permissões e tente novamente.'
      );

      setBuscaConcluida(true);
      mudarEstado('inicio');
    }
  };

  const conectarDispositivo = async (aparelho) => {
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
        (valor) => {
          if (
            !telaAtiva.current ||
            estadoRef.current !== 'conectado'
          ) {
            return;
          }

          const numero = Number(valor);

          if (
            !Number.isFinite(numero) ||
            numero < 30 ||
            numero > 250
          ) {
            return;
          }

          setLeituras((anteriores) => [
            ...anteriores,
            Math.round(numero),
          ]);
        },
        (erro) => {
          if (!telaAtiva.current) return;

          servicoBle.current.desconectar();
          setDispositivoAtual(null);
          setLeituras([]);

          setMensagem(
            erro?.message ||
              'A conexão foi perdida. Verifique o aparelho e tente conectar novamente ou digite os valores manualmente.'
          );

          mudarEstado('inicio');
        }
      );
    } catch (erro) {
      if (!telaAtiva.current) return;

      await servicoBle.current.desconectar();
      setDispositivoAtual(null);
      setLeituras([]);

      setMensagem(
        erro?.message ||
          'Não foi possível conectar. Confira se o equipamento está ligado, próximo e não conectado a outro dispositivo.'
      );

      mudarEstado('inicio');
    }
  };

  const importarParaProntuario = async () => {
    if (leituras.length === 0) {
      Alert.alert(
        'Sem leituras',
        'Aguarde a chegada de pelo menos uma leitura antes de continuar.'
      );
      return;
    }

    if (importando) return;

    const soma = leituras.reduce(
      (total, valor) => total + valor,
      0
    );

    const mediaCalculada = Math.round(
      soma / leituras.length
    );

    setImportando(true);

    try {
      await api.post('/sinaisVitais', {
        frequenciaCardiaca: mediaCalculada,
        quantidadeLeituras: leituras.length,
        origem: 'bluetooth',
        dispositivo:
          dispositivoAtual?.name || 'Aparelho BLE',
        dataHora: new Date().toISOString(),
      });

      Alert.alert(
        'Importação concluída',
        `Registro enviado à API.\n\nMédia: ${mediaCalculada} BPM\nLeituras recebidas: ${leituras.length}`
      );
    } catch (erro) {
      Alert.alert(
        'Falha na importação',
        erro?.message ||
          'Não foi possível gravar os sinais vitais na API.'
      );
    } finally {
      setImportando(false);
    }
  };

  const abrirDigitacaoManual = () => {
    navigation.navigate('SinaisVitaisManual');
  };

  const media =
    leituras.length > 0
      ? Math.round(
          leituras.reduce((soma, valor) => soma + valor, 0) /
            leituras.length
        )
      : null;

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>
        Importação de Sinais Vitais
      </Text>

      {dispositivoAtual && (
        <Text style={styles.dispositivo}>
          Equipamento: {dispositivoAtual.name || 'Aparelho BLE'}
        </Text>
      )}

      {(estado === 'inicio' || estado === 'procurando') && (
        <View style={styles.secao}>
          <Button
            title={
              estado === 'procurando'
                ? 'Procurando equipamentos...'
                : 'Procurar equipamentos (BLE)'
            }
            onPress={iniciarBusca}
            disabled={estado === 'procurando'}
          />

          {estado === 'procurando' && (
            <View style={styles.carregando}>
              <ActivityIndicator size="large" color="#007BFF" />
              <Text style={styles.info}>
                Procurando aparelhos por até 8 segundos...
              </Text>
            </View>
          )}

          {mensagem !== '' && (
            <Text style={styles.aviso}>{mensagem}</Text>
          )}

          {buscaConcluida && dispositivos.length === 0 && (
            <Text style={styles.info}>
              Nenhum equipamento disponível na lista.
            </Text>
          )}
        </View>
      )}

      {estado === 'conectando' && (
        <View style={styles.carregando}>
          <ActivityIndicator size="large" color="#007BFF" />
          <Text style={styles.info}>
            Conectando ao equipamento...
          </Text>
        </View>
      )}

      {(estado === 'inicio' || estado === 'procurando') && (
        <FlatList
          style={styles.lista}
          data={dispositivos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() => conectarDispositivo(item)}
              disabled={estado !== 'inicio'}
            >
              <Text style={styles.nomeAparelho}>
                {item.name || 'Aparelho sem nome'}
              </Text>

              <Text style={styles.acao}>
                Toque para conectar
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {estado === 'conectado' && (
        <View style={styles.leituraContainer}>
          <Text style={styles.rotulo}>Última leitura</Text>

          <Text style={styles.bpm}>
            {leituras.length > 0
              ? `${leituras[leituras.length - 1]} BPM`
              : '-- BPM'}
          </Text>

          <Text style={styles.info}>
            Leituras recebidas: {leituras.length}
          </Text>

          <Text style={styles.info}>
            Média das leituras:{' '}
            {media === null ? '--' : `${media} BPM`}
          </Text>

          <View style={styles.botao}>
            <Button
              title={
                importando
                  ? 'Importando...'
                  : 'Importar para o prontuário'
              }
              onPress={importarParaProntuario}
              disabled={importando || leituras.length === 0}
            />
          </View>

          <View style={styles.botao}>
            <Button
              title="Desconectar"
              color="#DC3545"
              onPress={desconectar}
              disabled={importando}
            />
          </View>
        </View>
      )}

      <View style={styles.manualContainer}>
        <Button
          title="Digitar os valores manualmente"
          color="#666666"
          onPress={abrirDigitacaoManual}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#222222',
  },
  secao: {
    marginBottom: 10,
  },
  carregando: {
    alignItems: 'center',
    marginVertical: 20,
  },
  info: {
    marginVertical: 8,
    color: '#555555',
    textAlign: 'center',
  },
  aviso: {
    marginTop: 12,
    padding: 12,
    color: '#8A2C0D',
    backgroundColor: '#FFF0E8',
    borderRadius: 6,
  },
  lista: {
    flexGrow: 0,
    maxHeight: 250,
  },
  item: {
    padding: 15,
    backgroundColor: '#E8F1FA',
    marginVertical: 5,
    borderRadius: 8,
  },
  nomeAparelho: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  acao: {
    color: '#444444',
    marginTop: 4,
  },
  dispositivo: {
    marginBottom: 10,
    color: '#444444',
  },
  leituraContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  rotulo: {
    fontSize: 16,
    color: '#555555',
  },
  bpm: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#C62828',
    marginVertical: 10,
  },
  botao: {
    width: '100%',
    marginTop: 15,
  },
  manualContainer: {
    marginTop: 'auto',
    paddingTop: 20,
    borderTopWidth: 1,
    borderColor: '#CCCCCC',
  },
});
