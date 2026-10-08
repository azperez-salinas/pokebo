// URL del Edge API por ambiente. El cliente solo habla con el Edge, nunca con el Core.
// TODO: confirmar URLs reales de staging/producción.
const ENV = {
  development: { apiUrl: 'http://localhost:3000' },
  staging: { apiUrl: 'https://staging.example.com' },
  production: { apiUrl: 'https://api.example.com' },
};

const env = __DEV__ ? 'development' : 'production';

export default ENV[env];
