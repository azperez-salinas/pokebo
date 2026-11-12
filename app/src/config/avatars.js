// Metro exige rutas estáticas en require(), por eso el mapa es explícito.
// Cambiá la extensión si tus imágenes no son .png.
export const AVATAR_IMAGES = {
  avatar_1: require('../../assets/avatars/avatar_1.png'),
  avatar_2: require('../../assets/avatars/avatar_2.png'),
  avatar_3: require('../../assets/avatars/avatar_3.png'),
  avatar_4: require('../../assets/avatars/avatar_4.png'),
  avatar_5: require('../../assets/avatars/avatar_5.png'),
  avatar_6: require('../../assets/avatars/avatar_6.png'),
};

export const AVATARS = Object.keys(AVATAR_IMAGES);
