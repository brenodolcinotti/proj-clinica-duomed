import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Callout, Marker, UrlTile } from 'react-native-maps';

import { CLINICA, CONFIGURACAO_MAPA } from '../../config/clinica';
import { obterPosicaoAtual } from '../../services/localizacao';

const {
  calcularDistanciaKm,
  criarRegiaoInicial,
  criarUrlNavegacaoMaps,
  criarUrlFallbackMaps,
  formatarDistanciaKm,
} = require('../../services/mapaUtils.cjs');

const PADDING_MAPA = { top: 90, right: 70, bottom: 90, left: 70 };

export default function MapaClinica() {
  const mapaRef = useRef(null);
  const montadoRef = useRef(true);
  const [posicaoUsuario, setPosicaoUsuario] = useState(null);
  const [carregandoLocalizacao, setCarregandoLocalizacao] = useState(false);
  const [erroLocalizacao, setErroLocalizacao] = useState('');
  const [permissaoNegada, setPermissaoNegada] = useState(false);

  // Objetos de coordenadas são memorizados para não criar novas referências
  // a cada renderização e forçar redesenho desnecessário dos marcadores.
  const coordenadaClinica = useMemo(
    () => ({ latitude: CLINICA.latitude, longitude: CLINICA.longitude }),
    []
  );
  const regiaoInicial = useMemo(
    () => criarRegiaoInicial(coordenadaClinica, 0.01),
    [coordenadaClinica]
  );
  const distancia = useMemo(() => {
    if (!posicaoUsuario) return null;
    return calcularDistanciaKm(posicaoUsuario, coordenadaClinica);
  }, [posicaoUsuario, coordenadaClinica]);

  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
    };
  }, []);

  const localizarUsuario = useCallback(async () => {
    if (carregandoLocalizacao) return;

    setErroLocalizacao('');
    setPermissaoNegada(false);
    setCarregandoLocalizacao(true);

    try {
      const atual = await obterPosicaoAtual();
      const pontoUsuario = {
        latitude: atual.latitude,
        longitude: atual.longitude,
      };

      if (!montadoRef.current) return;
      setPosicaoUsuario(pontoUsuario);

      // Enquadra paciente e clínica juntos, com margem para os marcadores.
      mapaRef.current?.fitToCoordinates(
        [pontoUsuario, coordenadaClinica],
        { edgePadding: PADDING_MAPA, animated: true }
      );
    } catch (erro) {
      if (!montadoRef.current) return;
      if (erro.code === 'PERMISSAO_LOCALIZACAO_NEGADA') {
        setPermissaoNegada(true);
        setErroLocalizacao(
          'A localização foi negada. Você ainda pode consultar o endereço e abrir a clínica no aplicativo de mapas.'
        );
      } else {
        setErroLocalizacao(
          'Não foi possível obter sua localização. Confira o GPS do aparelho e tente novamente.'
        );
      }
    } finally {
      if (montadoRef.current) setCarregandoLocalizacao(false);
    }
  }, [carregandoLocalizacao, coordenadaClinica]);

  const voltarParaClinica = useCallback(() => {
    mapaRef.current?.animateToRegion(regiaoInicial, 600);
  }, [regiaoInicial]);

  const abrirConfiguracoes = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch (erro) {
      setErroLocalizacao('Não foi possível abrir as configurações do aparelho.');
    }
  }, []);

  const abrirNoAppDeMapas = useCallback(async () => {
    const url = Platform.select({
      ios: criarUrlNavegacaoMaps('ios', coordenadaClinica, CLINICA.nome),
      android: criarUrlNavegacaoMaps('android', coordenadaClinica, CLINICA.nome),
      default: criarUrlFallbackMaps(coordenadaClinica),
    });
    try {
      await Linking.openURL(url);
    } catch (erro) {
      // Fallback web caso não exista um aplicativo associado ao esquema geo:/maps:.
      try {
        await Linking.openURL(criarUrlFallbackMaps(coordenadaClinica));
      } catch (erroFallback) {
        setErroLocalizacao('Não foi possível abrir um aplicativo de mapas neste aparelho.');
      }
    }
  }, [coordenadaClinica]);

  const usarTilesComunitarios = CONFIGURACAO_MAPA.usarTilesComunitarios;

  return (
    <ScrollView
      style={styles.tela}
      contentContainerStyle={styles.conteudo}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.mapaContainer}>
        <MapView
          ref={mapaRef}
          style={styles.mapa}
          initialRegion={regiaoInicial}
          mapType={usarTilesComunitarios && Platform.OS === 'android' ? 'none' : 'standard'}
          showsUserLocation={false}
          showsMyLocationButton={false}
          accessibilityLabel={`Mapa interativo mostrando a localização configurada da ${CLINICA.nome}. O marcador azul representa a clínica e o marcador laranja representa o paciente.`}
          accessibilityHint="Explore o mapa com gestos. Use os botões abaixo para localizar sua posição ou abrir o aplicativo de mapas."
        >
          {usarTilesComunitarios && (
            <UrlTile
              urlTemplate={CONFIGURACAO_MAPA.urlTiles}
              maximumZ={CONFIGURACAO_MAPA.zoomMaximoTiles}
              shouldReplaceMapContent={Platform.OS === 'ios'}
            />
          )}

          <Marker
            coordinate={coordenadaClinica}
            title={CLINICA.nome}
            description={CLINICA.endereco}
            pinColor="#1F3B57"
          >
            <Callout tooltip={false}>
              <View style={styles.callout}>
                <Text style={styles.calloutTitulo}>{CLINICA.nome}</Text>
                <Text style={styles.calloutTexto}>{CLINICA.endereco}</Text>
                <Text style={styles.calloutTexto}>{CLINICA.telefone}</Text>
              </View>
            </Callout>
          </Marker>

          {posicaoUsuario && (
            <Marker
              coordinate={posicaoUsuario}
              title="Você está aqui"
              description="Sua localização atual"
              pinColor="#E07A1C"
            />
          )}
        </MapView>

        {usarTilesComunitarios && (
          <Text style={styles.creditoMapa}>{CONFIGURACAO_MAPA.atribuicao}</Text>
        )}
      </View>

      <View style={styles.painel}>
        <Text style={styles.titulo}>{CLINICA.nome}</Text>
        <Text style={styles.subtitulo}>Localização da clínica</Text>

        <Text style={styles.rotulo}>Endereço</Text>
        <Text style={styles.valor} selectable accessibilityLabel={`Endereço da clínica: ${CLINICA.endereco}`}>
          {CLINICA.endereco}
        </Text>

        <Text style={styles.rotulo}>Telefone</Text>
        <Text style={styles.valor} selectable accessibilityLabel={`Telefone da clínica: ${CLINICA.telefone}`}>
          {CLINICA.telefone}
        </Text>

        {distancia !== null ? (
          <Text style={styles.distancia} accessibilityLiveRegion="polite">
            Distância aproximada: {formatarDistanciaKm(distancia)}
          </Text>
        ) : (
          <Text style={styles.ajuda}>Toque em “Onde estou?” para calcular a distância em linha reta.</Text>
        )}

        {!CLINICA.coordenadasConfirmadas && (
          <View style={styles.avisoConfiguracao}>
            <Text style={styles.avisoTitulo}>Configuração pendente da squad</Text>
            <Text style={styles.avisoTexto}>
              O marcador usa as coordenadas que já estavam na tela antiga. Confirmem latitude, longitude, endereço e telefone em src/config/clinica.js antes de apresentar como localização real.
            </Text>
          </View>
        )}

        {erroLocalizacao ? (
          <View style={styles.erroBox} accessibilityRole="alert">
            <Text style={styles.erroTexto}>{erroLocalizacao}</Text>
            {permissaoNegada && (
              <TouchableOpacity
                style={styles.botaoAjustes}
                onPress={abrirConfiguracoes}
                accessibilityRole="button"
                accessibilityLabel="Abrir configurações do aplicativo para permitir localização"
              >
                <Text style={styles.textoBotaoSecundario}>Abrir configurações</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        <View style={styles.acoes}>
          <TouchableOpacity
            style={[styles.botao, styles.botaoPrimario]}
            onPress={localizarUsuario}
            disabled={carregandoLocalizacao}
            accessibilityRole="button"
            accessibilityLabel="Mostrar minha localização e enquadrar paciente e clínica no mapa"
            accessibilityHint="Solicita permissão de localização enquanto o aplicativo está em uso."
          >
            {carregandoLocalizacao ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.textoBotao}>Onde estou?</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.botao, styles.botaoSecundario]}
            onPress={voltarParaClinica}
            accessibilityRole="button"
            accessibilityLabel="Centralizar o mapa novamente na clínica"
          >
            <Text style={styles.textoBotaoSecundario}>Ver a clínica</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.botao, styles.botaoTerciario]}
            onPress={abrirNoAppDeMapas}
            accessibilityRole="button"
            accessibilityLabel={`Abrir rota até ${CLINICA.nome} no aplicativo de mapas do aparelho`}
          >
            <Text style={styles.textoBotao}>Como chegar</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.notaMapa}>
          O mapa depende de conexão com a internet. Endereço e telefone permanecem disponíveis em texto. {CONFIGURACAO_MAPA.observacaoTiles}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#F4F6F8' },
  conteudo: { paddingBottom: 24 },
  mapaContainer: { height: 340, width: '100%', backgroundColor: '#E5E7EB' },
  mapa: { flex: 1 },
  creditoMapa: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    backgroundColor: 'rgba(255,255,255,0.88)',
    color: '#263238',
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  painel: {
    backgroundColor: '#FFFFFF',
    margin: 14,
    marginTop: 12,
    padding: 18,
    borderRadius: 14,
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  titulo: { fontSize: 22, fontWeight: '700', color: '#1F3B57' },
  subtitulo: { fontSize: 14, color: '#667085', marginTop: 3, marginBottom: 16 },
  rotulo: { fontSize: 12, fontWeight: '700', color: '#667085', marginTop: 10, marginBottom: 4, textTransform: 'uppercase' },
  valor: { fontSize: 15, color: '#202A34', lineHeight: 22 },
  distancia: { marginTop: 14, fontSize: 15, color: '#1F3B57', fontWeight: '700' },
  ajuda: { marginTop: 14, color: '#667085', fontSize: 13, lineHeight: 19 },
  avisoConfiguracao: { marginTop: 14, backgroundColor: '#FFF7E6', borderColor: '#F2D28A', borderWidth: 1, borderRadius: 8, padding: 11 },
  avisoTitulo: { color: '#815B12', fontWeight: '700', marginBottom: 4 },
  avisoTexto: { color: '#684B16', fontSize: 12, lineHeight: 18 },
  erroBox: { marginTop: 12, backgroundColor: '#FDECEC', padding: 12, borderRadius: 8 },
  erroTexto: { color: '#922B21', fontSize: 13, lineHeight: 19 },
  acoes: { marginTop: 18, gap: 9 },
  botao: { minHeight: 46, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 11 },
  botaoPrimario: { backgroundColor: '#1F3B57' },
  botaoSecundario: { backgroundColor: '#E8EEF3' },
  botaoTerciario: { backgroundColor: '#E07A1C' },
  textoBotao: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  textoBotaoSecundario: { color: '#1F3B57', fontWeight: '700', fontSize: 14 },
  botaoAjustes: { marginTop: 9, alignSelf: 'flex-start', backgroundColor: '#FFFFFF', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 7 },
  notaMapa: { marginTop: 14, color: '#667085', fontSize: 11, lineHeight: 17 },
  callout: { width: 230, padding: 11 },
  calloutTitulo: { color: '#1F3B57', fontWeight: '700', fontSize: 15, marginBottom: 5 },
  calloutTexto: { color: '#333333', fontSize: 12, lineHeight: 18 },
});
