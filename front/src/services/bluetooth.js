import { Platform, PermissionsAndroid } from 'react-native';

const MODO_SIMULADO = true;
const TEMPO_BUSCA_MS = 8000;

// Decodificação pura: recebe um valor numérico já decodificado
// e retorna a frequência válida. Não gera dados aleatórios.
export function decodificarFrequencia(valor) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    throw new Error('Valor de frequência inválido.');
  }

  return Math.round(numero);
}

async function solicitarPermissoes() {
  if (Platform.OS !== 'android') {
    return true;
  }

  const versao = Number(Platform.Version);

  const permissoes =
    versao >= 31
      ? [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]
      : [
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ];

  const resultados = await PermissionsAndroid.requestMultiple(
    permissoes
  );

  return permissoes.every(
    permissao =>
      resultados[permissao] ===
      PermissionsAndroid.RESULTS.GRANTED
  );
}

function criarServicoBleSimulado() {
  let timeoutBusca = null;
  let intervaloLeituras = null;
  let buscaAtiva = false;
  let conexaoAtiva = false;

  const aparelhos = [
    {
      id: 'DUOMED-001',
      name: 'Oxímetro DuoMed 1',
    },
    {
      id: 'DUOMED-002',
      name: 'Monitor Cardíaco 2',
    },
  ];

  return {
    solicitarPermissoes,

    procurar(aoEncontrar, aoTerminar) {
      this.pararBusca();
      buscaAtiva = true;

      timeoutBusca = setTimeout(() => {
        if (buscaAtiva) {
          aparelhos.forEach(aparelho => {
            aoEncontrar(aparelho);
          });
        }

        this.pararBusca();

        if (aoTerminar) {
          aoTerminar();
        }
      }, TEMPO_BUSCA_MS);
    },

    pararBusca() {
      buscaAtiva = false;

      if (timeoutBusca) {
        clearTimeout(timeoutBusca);
        timeoutBusca = null;
      }
    },

    async conectar(id) {
      if (!id) {
        throw new Error('Selecione um aparelho para conectar.');
      }

      this.pararBusca();

      await new Promise(resolve => setTimeout(resolve, 1000));

      conexaoAtiva = true;
      return true;
    },

    monitorarFrequencia(aoReceber, aoErrar) {
      if (!conexaoAtiva) {
        aoErrar?.(new Error('Não existe conexão ativa.'));
        return;
      }

      this.pararMonitoramento();

      intervaloLeituras = setInterval(() => {
        if (!conexaoAtiva) {
          return;
        }

        // Valor fictício exclusivamente para testes da interface.
        const leitura =
          Math.floor(Math.random() * 41) + 60;

        aoReceber(decodificarFrequencia(leitura));
      }, 1500);
    },

    pararMonitoramento() {
      if (intervaloLeituras) {
        clearInterval(intervaloLeituras);
        intervaloLeituras = null;
      }
    },

    async desconectar() {
      this.pararBusca();
      this.pararMonitoramento();
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

  // Configure este UUID com o serviço e a característica
  // documentados pelo fabricante do equipamento.
  const SERVICE_UUID = '';
  const CHARACTERISTIC_UUID = '';

  function carregarBiblioteca() {
    try {
      const { BleManager } = require('react-native-ble-plx');

      if (!manager) {
        manager = new BleManager();
      }

      return manager;
    } catch {
      throw new Error(
        'BLE real indisponível. Use um development build com react-native-ble-plx.'
      );
    }
  }

  return {
    solicitarPermissoes,

    procurar(aoEncontrar, aoTerminar) {
      const ble = carregarBiblioteca();

      this.pararBusca();

      let encerrada = false;

      const finalizar = () => {
        if (encerrada) return;

        encerrada = true;
        clearTimeout(timeoutBusca);
        ble.stopDeviceScan();

        if (aoTerminar) {
          aoTerminar();
        }
      };

      ble.startDeviceScan(null, null, (erro, dispositivo) => {
        if (erro) {
          finalizar();
          return;
        }

        if (dispositivo) {
          aoEncontrar({
            id: dispositivo.id,
            name: dispositivo.name || dispositivo.localName || 'Aparelho sem nome',
          });
        }
      });

      timeoutBusca = setTimeout(finalizar, TEMPO_BUSCA_MS);
    },

    pararBusca() {
      if (timeoutBusca) {
        clearTimeout(timeoutBusca);
        timeoutBusca = null;
      }

      if (manager) {
        manager.stopDeviceScan();
      }
    },

    async conectar(id) {
      if (!SERVICE_UUID || !CHARACTERISTIC_UUID) {
        throw new Error(
          'Configure os UUIDs do serviço e da característica do equipamento.'
        );
      }

      const ble = carregarBiblioteca();

      this.pararBusca();

      dispositivoConectado = await ble.connectToDevice(id);

      // Obrigatório: descobrir serviços e características após conectar.
      await dispositivoConectado.discoverAllServicesAndCharacteristics();

      assinaturaConexao = ble.onDeviceDisconnected(
        id,
        erro => {
          assinatura?.remove();
          assinatura = null;
          dispositivoConectado = null;

          if (erro) {
            // Não registrar sinais vitais nem dados sensíveis.
          }
        }
      );

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
            aoErrar(erro);
            return;
          }

          if (caracteristica?.value != null) {
            try {
              // A conversão BLE/base64 deve ser implementada de acordo
              // com o formato documentado pelo fabricante.
              const valor = decodificarFrequencia(
                Number(caracteristica.value)
              );

              aoReceber(valor);
            } catch {
              aoErrar(
                new Error('Não foi possível interpretar a leitura recebida.')
              );
            }
          }
        }
      );
    },

    pararMonitoramento() {
      assinatura?.remove();
      assinatura = null;
    },

    async desconectar() {
      this.pararBusca();
      this.pararMonitoramento();

      assinaturaConexao?.remove();
      assinaturaConexao = null;

      if (dispositivoConectado) {
        const dispositivo = dispositivoConectado;
        dispositivoConectado = null;

        try {
          await dispositivo.cancelConnection();
        } catch {
          // O aparelho pode já estar desconectado.
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
