
/**
 * Configuração dinâmica do Expo — DuoMed.
 *
 * Configuração migrada do app.json para este arquivo.
 *
 * A chave do Google Maps é opcional.
 * Nunca coloque chaves secretas diretamente neste arquivo.
 * Configure GOOGLE_MAPS_API_KEY nas variáveis de ambiente do build.
 */

const config = {
  name: 'app_clinica',
  slug: 'app_clinica',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,

  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },

  ios: {
    supportsTablet: true,
  },

  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
  },

  web: {
    favicon: './assets/favicon.png',
  },

  plugins: [
    'expo-status-bar',
    'expo-secure-store',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'A DuoMed usa sua localização enquanto o aplicativo está aberto para mostrar sua posição em relação à clínica.',
      },
    ],
  ],
};

// Configuração opcional do Google Maps
const chaveGoogleMaps = process.env.GOOGLE_MAPS_API_KEY;

if (chaveGoogleMaps && chaveGoogleMaps.trim()) {
  config.plugins.push([
    'react-native-maps',
    {
      androidGoogleMapsApiKey: chaveGoogleMaps.trim(),
    },
  ]);
}

module.exports = config;
