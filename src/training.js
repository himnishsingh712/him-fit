// Training: exercises, sports, calories, weekly sets and lift progress. Pure functions (no app state).
// equipment: db dumbbell · bb barbell · mc machine · cb cable · bw bodyweight
export const EQN = {db: 'Dumbbell', bb: 'Barbell', mc: 'Machine', cb: 'Cable', bw: 'Bodyweight'};
export const GROUPS = [['bw', 'Bodyweight'], ['chest', 'Chest'], ['back', 'Back'], ['shoulders', 'Shoulders'], ['biceps', 'Biceps'], ['triceps', 'Triceps'], ['glutes', 'Glutes'], ['legs', 'Legs'], ['sport', 'Sports']];
// m: muscle groups it trains (for weekly sets). bw-only exercises have eq ['bw'].
export const EXERCISES = [
  {id: 'pushup', n: 'Push-ups', g: 'bw', eq: ['bw'], m: ['chest', 'triceps']},
  {id: 'kneepushup', n: 'Knee push-ups', g: 'bw', eq: ['bw'], m: ['chest', 'triceps']},
  {id: 'bwsquat', n: 'Bodyweight squats', g: 'bw', eq: ['bw'], m: ['legs']},
  {id: 'glutebridge', n: 'Glute bridge', g: 'bw', eq: ['bw'], m: ['glutes']},
  {id: 'benchdip', n: 'Bench dips', g: 'bw', eq: ['bw'], m: ['triceps']},
  {id: 'flatbench', n: 'Flat bench press', g: 'chest', eq: ['db', 'bb'], m: ['chest', 'triceps']},
  {id: 'inclinebench', n: 'Incline bench press', g: 'chest', eq: ['db', 'bb'], m: ['chest', 'shoulders']},
  {id: 'declinebench', n: 'Decline bench press', g: 'chest', eq: ['db', 'bb'], m: ['chest', 'triceps']},
  {id: 'chestfly', n: 'Chest fly (on the bench)', g: 'chest', eq: ['db'], m: ['chest']},
  {id: 'chestpress', n: 'Chest press machine', g: 'chest', eq: ['mc'], m: ['chest', 'triceps']},
  {id: 'pulldown', n: 'Lat pulldown', g: 'back', eq: ['cb'], m: ['back', 'biceps']},
  {id: 'cablerow', n: 'Seated cable row', g: 'back', eq: ['cb'], m: ['back', 'biceps']},
  {id: 'rdl', n: 'Romanian deadlift', g: 'back', eq: ['db', 'bb'], m: ['back', 'legs', 'glutes']},
  {id: 'deadlift', n: 'Deadlift', g: 'back', eq: ['bb', 'db'], m: ['back', 'legs', 'glutes']},
  {id: 'frontraise', n: 'Front raise', g: 'shoulders', eq: ['db'], m: ['shoulders']},
  {id: 'lateralraise', n: 'Lateral raise', g: 'shoulders', eq: ['db'], m: ['shoulders']},
  {id: 'ohp', n: 'Overhead press', g: 'shoulders', eq: ['db', 'bb'], m: ['shoulders', 'triceps']},
  {id: 'uprightrow', n: 'Upright row', g: 'shoulders', eq: ['db', 'bb', 'cb'], m: ['shoulders', 'back']},
  {id: 'curl', n: 'Dumbbell curl', g: 'biceps', eq: ['db'], m: ['biceps']},
  {id: 'hammer', n: 'Hammer curl', g: 'biceps', eq: ['db'], m: ['biceps']},
  {id: 'ohext', n: 'Overhead extension', g: 'triceps', eq: ['db'], m: ['triceps']},
  {id: 'hipthrust', n: 'Hip thrust', g: 'glutes', eq: ['bb', 'db', 'bw'], m: ['glutes', 'legs']},
  {id: 'squat', n: 'Squat', g: 'legs', eq: ['bb', 'db'], m: ['legs', 'glutes']},
  {id: 'legpress', n: 'Leg press', g: 'legs', eq: ['mc'], m: ['legs', 'glutes']},
  {id: 'legext', n: 'Leg extension (quads)', g: 'legs', eq: ['mc'], m: ['legs']},
  {id: 'legcurl', n: 'Leg curl (hamstrings)', g: 'legs', eq: ['mc'], m: ['legs']},
  {id: 'calfraise', n: 'Calf raise', g: 'legs', eq: ['bw', 'db', 'mc'], m: ['calves']},
];
// net kcal per hour per kg above sitting (MET − 1): football 7, badminton 5.3, pickleball 3.5
export const SPORTS = [{id: 'football', n: 'Football', met: 7, ml: 750}, {id: 'badminton', n: 'Badminton', met: 5.3, ml: 500}, {id: 'pickleball', n: 'Pickleball', met: 3.5, ml: 250}];
export const DURS = [15, 30, 45, 60, 90, 120];
export const XMAP = Object.fromEntries(EXERCISES.map(x => [x.id, x])), SMAP = Object.fromEntries(SPORTS.map(x => [x.id, x]));
export const MUSCLES = [['chest', 'Chest'], ['back', 'Back'], ['shoulders', 'Shoulders'], ['biceps', 'Biceps'], ['triceps', 'Triceps'], ['legs', 'Legs'], ['glutes', 'Glutes'], ['calves', 'Calves']];
// a set ≈ 2.5 min of moderate work incl. rest at net MET 4 (bodyweight 3.2)
const SET_MIN = 2.5;
export function entryKcal(e, kg) {
  if (e.sport) { const s = SMAP[e.sport]; return s ? s.met * kg * (e.min || 0) / 60 : 0; }
  const n = (e.sets || []).length; const met = e.eq === 'bw' ? 3.2 : 4; return met * kg * n * SET_MIN / 60;
}
export const entryMin = e => e.sport ? (e.min || 0) : (e.sets || []).length * SET_MIN;
export const dayTrainKcal = (entries, kg) => (entries || []).reduce((s, e) => s + entryKcal(e, kg), 0);
// best set as an estimated 1-rep max (Epley); bodyweight → best reps
export const e1rm = (w, r) => w * (1 + r / 30);
export function bestSet(e) { const ss = e.sets || []; if (!ss.length) return null; if (e.eq === 'bw' || !ss.some(s => s.w)) return {reps: Math.max(...ss.map(s => s.r || 0))}; return {e1: Math.max(...ss.map(s => e1rm(s.w || 0, s.r || 0)))}; }
// hard sets per muscle (a set counts fully for the first muscle listed, half for the others)
export function weeklySets(entries) { const out = {}; (entries || []).forEach(e => { const x = XMAP[e.x]; if (!x) return; const n = (e.sets || []).length; x.m.forEach((m, i) => { out[m] = (out[m] || 0) + n * (i === 0 ? 1 : 0.5); }); }); return out; }
// group lifting entries within 90 min of each other into sessions (for the energy model)
export function sessions(entries) { const xs = (entries || []).filter(e => !e.sport).sort((a, b) => a.t - b.t); const out = []; xs.forEach(e => { const l = out[out.length - 1]; const m = entryMin(e); if (l && e.t - l.end <= 90 * 60e3) { l.min += m; l.end = Math.max(l.end, e.t); } else out.push({t: e.t, end: e.t, min: m}); }); return out; }
export const fmtSets = e => { const ss = e.sets || []; if (!ss.length) return ''; const same = ss.every(s => s.r === ss[0].r && (s.w || 0) === (ss[0].w || 0)); const one = s => `${s.r}${s.w ? ` @ ${s.w} kg` : ''}`; return same ? `${ss.length} × ${one(ss[0])}` : ss.map(one).join(', '); };
