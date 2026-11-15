import { authRequest } from './session';

// GET /achievements -> { groups: [{ id, name, achievements: [...] }], summary: { unlocked, total } }
export async function getAchievements() {
  return authRequest('/achievements');
}
