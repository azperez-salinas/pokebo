// URL del Edge API por ambiente. El cliente solo habla con el Edge, nunca con el Core.
// TODO: confirmar URLs reales de staging/producción.
const ENV = {
  development: { apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000' },
  // En las compilaciones de EAS (staging/producción) la URL sale de EXPO_PUBLIC_API_URL, que Expo incorpora al bundle.
  staging: { apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://staging.example.com' },
  production: { apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.example.com' },
};

const env = __DEV__ ? 'development' : 'production';

export default ENV[env];
