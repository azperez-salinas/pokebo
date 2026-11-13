const GOOGLE_MAPS_PLUGIN = 'react-native-maps';

function pluginName(plugin) {
  return Array.isArray(plugin) ? plugin[0] : plugin;
}

module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  const isAndroidEasBuild =
    process.env.EAS_BUILD === 'true' &&
    process.env.EAS_BUILD_PLATFORM === 'android';

  if (isAndroidEasBuild && !googleMapsApiKey) {
    throw new Error(
      'Falta GOOGLE_MAPS_API_KEY. Configurala en el entorno de EAS antes de compilar Android.',
    );
  }

  const plugins = (config.plugins ?? []).filter(
    (plugin) => pluginName(plugin) !== GOOGLE_MAPS_PLUGIN,
  );

  plugins.push(
    googleMapsApiKey
      ? [
          GOOGLE_MAPS_PLUGIN,
          {
            androidGoogleMapsApiKey: googleMapsApiKey,
          },
        ]
      : GOOGLE_MAPS_PLUGIN,
  );

  return {
    ...config,
    plugins,
  };
};
