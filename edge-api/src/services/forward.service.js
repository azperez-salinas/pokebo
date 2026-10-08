// Reenvía una request al Core API.
async function reenviarACore(path, metodo, body) {
  // TODO: hacer la request a config.coreApiUrl + path con el método indicado,
  // firmarla con HMAC usando config.serviceSharedSecret, propagar el usuario
  // autenticado y devolver la respuesta del Core.
  throw new Error('not implemented');
}

module.exports = { reenviarACore };
