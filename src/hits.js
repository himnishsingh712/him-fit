// Bong-hit timing. Taps less than 3 minutes apart form a chain.
// A chain of 1–2 taps is one session at the moment you tapped; 3–4 quick taps are spread over up to the last hour.
// A chain of 5+ is a catch-up entry: spread evenly back from now at your average pace
// (6 an hour), never before your previous logged hit or wake time, and never denser than 10 an hour.
const MIN = 60e3, H = 3600e3;
export const CHAIN_GAP = 3 * MIN, CATCHUP = 5, AVG_RATE = 6, MAX_RATE = 10;
export function chainLen(taps) {
  let n = taps.length ? 1 : 0; for (let i = taps.length - 1; i > 0; i--) { if (taps[i] - taps[i-1] < CHAIN_GAP) n++; else break; } return n;
}
export function spread(n, start, end) { const span = Math.max(1, end - start); return Array.from({length: n}, (_, i) => Math.round(start + (i + 0.5) * span / n)); }
// returns {times, chain} where times are the effective hit times for the whole day
export function placeHits(taps, wake, mode) {
  const n = chainLen(taps); const before = taps.slice(0, taps.length - n);
  if (n < 3 && !mode) return {times: taps.slice(), chain: null};
  if (n < CATCHUP && !mode) { const end = taps[taps.length - 1], prev = before.length ? before[before.length - 1] : null; const start = Math.max(prev ?? wake, wake, end - H); return {times: [...before, ...spread(n, start, end)], chain: {n, start, end, mode: 'auto'}}; }
  const end = taps[taps.length - 1];
  let start;
  if (mode === '1h') start = end - H; else if (mode === '3h') start = end - 3 * H; else if (mode === 'wake') start = wake;
  else { const prev = before.length ? before[before.length - 1] : null; start = Math.max(prev ?? wake, wake, end - n / AVG_RATE * H); if (end - start < n / MAX_RATE * H) start = end - n / MAX_RATE * H; }
  return {times: [...before, ...spread(n, start, end)], chain: {n, start, end, mode: mode || 'auto'}};
}
