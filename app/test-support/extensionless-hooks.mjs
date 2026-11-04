// Solo para tests: Metro resuelve imports sin extensión ('./api'), node no. Se prueba con '.js' agregado.
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (specifier.startsWith('.') && !/\.(m?js|json)$/.test(specifier)) return nextResolve(`${specifier}.js`, context);
    throw error;
  }
}
