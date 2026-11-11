import { Platform, PermissionsAndroid } from 'react-native';

const MODO_SIMULADO = true;
const TEMPO_BUSCA_MS = 4000;

const {
  decodificarFrequencia,
  criarBuscaSimulada,
} = require('./bluetoothCore');

// A tela pode exibir um aviso e impedir que valores fictícios sejam
// gravados no prontuário como se fossem medições de um equipamento real.
export const BLE_MODO_SIMULADO = MODO_SIMULADO;

async function solicitarPermissoes() {
  // A busca simulada não usa Bluetooth/GPS e não deve abrir diálogos
  // de permissões. Isso também evita travamentos no Expo Go.
  if (MODO_SIMULADO || Platform.OS !== 'android') {
    return true;
  }

  const versao = Number(Platform.Version);
  const permissoes =
    versao >= 31
      ? [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

  const permissoesDisponiveis = permissoes.filter(Boolean);
  if (permissoesDisponiveis.length !== permissoes.length) {
    throw new Error(
      'As permissões Bluetooth não estão declaradas neste build. Gere um development build com as permissões BLE.'
    );
  }

  const resultados = await PermissionsAndroid.requestMultiple(
    permissoesDisponiveis
  );

  return permissoesDisponiveis.every(
    permissao => resultados[permissao] === PermissionsAndroid.RESULTS.GRANTED
  );
}

function criarServicoBleSimulado() {
  let intervaloLeituras = null;
  let conexaoAtiva = false;

  const aparelhos = [
    { id: 'DUOMED-001', name: 'Oxímetro DuoMed (simulado)' },
    { id: 'DUOMED-002', name: 'Monitor Cardíaco DuoMed (simulado)' },
  ];

  const busca = criarBuscaSimulada({
    aparelhos,
    tempoBuscaMs: TEMPO_BUSCA_MS,
  });

  function pararMonitoramento() {
    if (intervaloLeituras !== null) {
      clearInterval(intervaloLeituras);
      intervaloLeituras = null;
    }
  }

  return {
    solicitarPermissoes,
    procurar: (aoEncontrar, aoTerminar, aoErro) =>
      busca.procurar(aoEncontrar, aoTerminar, aoErro),
    pararBusca: () => busca.pararBusca(),

    async conectar(id) {
      if (!id) throw new Error('Selecione um aparelho para conectar.');
      busca.pararBusca();
      await new Promise(resolve => setTimeout(resolve, 500));
      conexaoAtiva = true;
      return true;
    },

    monitorarFrequencia(aoReceber, aoErrar) {
      if (!conexaoAtiva) {
        aoErrar?.(new Error('Não existe conexão ativa.'));
        return;
      }

      pararMonitoramento();
      intervaloLeituras = setInterval(() => {
        if (!conexaoAtiva) return;
        // Dado fictício: serve somente para validar a interface.
        const leitura = Math.floor(Math.random() * 41) + 60;
        try {
          aoReceber?.(decodificarFrequencia(leitura));
        } catch (erro) {
          aoErrar?.(erro);
        }
      }, 1500);
    },

    pararMonitoramento,

    async desconectar() {
      busca.pararBusca();
      pararMonitoramento();
      conexaoAtiva = false;
    },
  };
}

function criarServicoBleReal() {
  let manager = null;
  let dispositivoConectado = null;
  let assinatura = null;
  let assinaturaConexao = null;
  let timeoutBusca = null;

  // Preencher somente com os UUIDs documentados pelo fabricante.
  const SERVICE_UUID = '';
  const CHARACTERISTIC_UUID = '';

  function carregarBiblioteca() {
    try {
      const { BleManager } = require('react-native-ble-plx');
      if (!manager) manager = new BleManager();
      return manager;
    } catch {
      throw new Error(
        'BLE real indisponível. Instale react-native-ble-plx e use um development build; não funciona no Expo Go padrão.'
      );
    }
  }

  function pararBusca() {
    if (timeoutBusca !== null) {
      clearTimeout(timeoutBusca);
      timeoutBusca = null;
    }
    manager?.stopDeviceScan();
  }

  return {
    solicitarPermissoes,

    procurar(aoEncontrar, aoTerminar, aoErro) {
      const ble = carregarBiblioteca();
      pararBusca();
      let encerrada = false;

      const finalizar = erro => {
        if (encerrada) return;
        encerrada = true;
        if (timeoutBusca !== null) clearTimeout(timeoutBusca);
        timeoutBusca = null;
        ble.stopDeviceScan();
        if (erro) aoErro?.(erro);
        aoTerminar?.();
      };

      try {
        ble.startDeviceScan(null, null, (erro, dispositivo) => {
          if (erro) {
            finalizar(erro);
            return;
          }
          if (dispositivo) {
            aoEncontrar?.({
              id: dispositivo.id,
              name: dispositivo.name || dispositivo.localName || 'Aparelho sem nome',
            });
          }
        });
        timeoutBusca = setTimeout(() => finalizar(), TEMPO_BUSCA_MS);
      } catch (erro) {
        finalizar(erro);
      }
    },

    pararBusca,

    async conectar(id) {
      if (!SERVICE_UUID || !CHARACTERISTIC_UUID) {
        throw new Error(
          'Configure os UUIDs do serviço e da característica fornecidos pelo fabricante do equipamento.'
        );
      }
      const ble = carregarBiblioteca();
      pararBusca();
      dispositivoConectado = await ble.connectToDevice(id);
      await dispositivoConectado.discoverAllServicesAndCharacteristics();
      assinaturaConexao = ble.onDeviceDisconnected(id, erro => {
        assinatura?.remove();
        assinatura = null;
        dispositivoConectado = null;
        // A conexão foi encerrada; a tela recebe falhas de leitura pelo monitoramento.
      });
      return true;
    },

    monitorarFrequencia(aoReceber, aoErrar) {
      if (!dispositivoConectado) {
        aoErrar?.(new Error('Não existe conexão ativa.'));
        return;
      }
      assinatura?.remove();
      assinatura = dispositivoConectado.monitorCharacteristicForService(
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        (erro, caracteristica) => {
          if (erro) {
            assinatura?.remove();
            assinatura = null;
            aoErrar?.(erro);
            return;
          }
          if (caracteristica?.value != null) {
            // O valor BLE é Base64. A conversão precisa seguir o protocolo
            // publicado pelo fabricante; não interpretar Base64 como Number.
            aoErrar?.(
              new Error('Decodificação BLE pendente: consulte o formato de dados do fabricante.')
            );
          }
        }
      );
    },

    pararMonitoramento() {
      assinatura?.remove();
      assinatura = null;
    },

    async desconectar() {
      pararBusca();
      this.pararMonitoramento();
      assinaturaConexao?.remove();
      assinaturaConexao = null;
      if (dispositivoConectado) {
        const dispositivo = dispositivoConectado;
        dispositivoConectado = null;
        try {
          await dispositivo.cancelConnection();
        } catch {
          // Pode já estar desconectado.
        }
      }
    },
  };
}

export default function criarServicoBle() {
  return MODO_SIMULADO
    ? criarServicoBleSimulado()
    : criarServicoBleReal();
}
