import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

import MapView, { Marker } from 'react-native-maps';

export default function MapaScreen() {
  return (
    <View style={styles.container}>
      <MapView
        style={styles.mapa}
        initialRegion={{
          latitude: -22.7256,
          longitude: -47.6476,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        <Marker
          coordinate={{
            latitude: -22.7256,
            longitude: -47.6476,
          }}
          title="DuoMed"
          description="Localização da clínica"
        />
      </MapView>

      <View style={styles.info}>
        <Text style={styles.titulo}>DuoMed</Text>

        <Text style={styles.subtitulo}>
          Localização da clínica
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  mapa: {
    flex: 1,
  },

  info: {
    position: 'absolute',
    top: 15,
    left: 15,
    right: 15,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    elevation: 5,
  },

  titulo: {
    fontSize: 20,
    fontWeight: 'bold',
  },

  subtitulo: {
    fontSize: 14,
    color: '#666',
    marginTop: 3,
  },
});