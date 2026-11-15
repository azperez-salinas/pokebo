const test = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../src/utils/timeAgo.js');
const NOW = new Date('2026-11-05T12:00:00Z').getTime();
const ago = (ms) => new Date(NOW - ms).toISOString();

test('timeAgo en español rioplatense', async () => {
  const { timeAgo } = await load();
  assert.equal(timeAgo(ago(20 * 1000), NOW), 'ahora');
  assert.equal(timeAgo(ago(5 * 60 * 1000), NOW), 'hace 5 min');
  assert.equal(timeAgo(ago(3 * 60 * 60 * 1000), NOW), 'hace 3 h');
  assert.equal(timeAgo(ago(30 * 60 * 60 * 1000), NOW), 'ayer');
  assert.equal(timeAgo(ago(4 * 24 * 60 * 60 * 1000), NOW), 'hace 4 días');
  assert.equal(timeAgo(new Date(NOW + 5000).toISOString(), NOW), 'ahora'); // reloj adelantado
});
