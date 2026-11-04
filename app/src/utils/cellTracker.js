// Decide qué hacer cada vez que la ubicación en segundo plano cae en una celda H3.
//
// Estado guardado: { current, previous, changedAt } (celda actual, la anterior y cuándo se cambió).
// El GPS oscila unas decenas de metros: parado cerca del borde de un hexágono la celda puede ir A, B, A, B.
// Por eso, volver a la celda anterior dentro del tiempo de espera se ignora (no hay pedido ni aviso).

export const REENTRY_COOLDOWN_MS = 5 * 60 * 1000;

// Devuelve { action, next }:
//   'report': hay que avisar al servidor (primera lectura o cambio de celda); next es el estado a guardar si sale bien.
//   'none':   sigue en la misma celda.
//   'ignore': volvió a la celda anterior hace poco (rebote del GPS).
export function decideCellChange(state, cell, now, cooldownMs = REENTRY_COOLDOWN_MS) {
  if (!state || !state.current) {
    return { action: 'report', next: { current: cell, previous: null, changedAt: now } };
  }
  if (cell === state.current) return { action: 'none', next: state };
  if (cell === state.previous && now - state.changedAt < cooldownMs) return { action: 'ignore', next: state };
  return { action: 'report', next: { current: cell, previous: state.current, changedAt: now } };
}
