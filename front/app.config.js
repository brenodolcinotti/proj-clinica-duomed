/**
 * Configuração dinâmica do Expo.
 * A chave do Google Maps é opcional para o mapa de tiles comunitários usado
 * no exercício. Para usar o provedor nativo Google Maps em um build próprio,
 * defina GOOGLE_MAPS_API_KEY no ambiente de build (nunca commite a chave).
 */
module.exports = ({ config }) => {
  const pluginsExistentes = (config.plugins || []).filter((plugin) => {
    const nome = Array.isArray(plugin) ? plugin[0] : plugin;
    return nome !== 'expo-location' && nome !== 'react-native-maps';
  });

  const plugins = [
    ...pluginsExistentes,
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'A DuoMed usa sua localização enquanto o aplicativo está aberto para mostrar sua posição em relação à clínica.',
      },
    ],
  ];

  const chaveGoogleMaps = process.env.GOOGLE_MAPS_API_KEY;
  if (chaveGoogleMaps && chaveGoogleMaps.trim()) {
    plugins.push([
      'react-native-maps',
      { androidGoogleMapsApiKey: chaveGoogleMaps.trim() },
    ]);
  }

  return { ...config, plugins };
};
