import { Platform } from 'react-native';
import config from '../config';
import appConfig from '../../app.json';
import { API_BASE_URL } from './api';
import { getSession } from './session';

// GET /images/:id exige JWT y los headers de versión, y <Image> no pasa por authRequest: se arma el source con ellos.
function imageSource(uri) {
  const token = getSession()?.accessToken;
  return {
    uri,
    headers: {
      'X-App-Version': appConfig.expo.version,
      'X-App-Platform': Platform.OS,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
}

// photoUrl llega del backend como path completo (/api/v1/images/:id)
export const photoSource = (photoUrl) => imageSource(`${config.apiUrl}${photoUrl}`);

// imagesIds de la especie son ids de GridFS
export const speciesImageSource = (imageId) => imageSource(`${API_BASE_URL}/images/${imageId}`);
