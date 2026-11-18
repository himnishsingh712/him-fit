// Fake Supabase for tests: in-memory tables, simulated auth.
const db = {days: [], config: []}; let user = null; const listeners = [];
window.__mock = {db, setOnline: v => { window.__online = v; }};
const q = (table) => {
  let rows = () => db[table].filter(r => r.user_id === user?.id); let filt = [];
  const api = {
    select() { return api; }, order() { return api; }, gt(c, v) { filt.push(r => r[c] > v); return api; },
    maybeSingle() { const r = rows()[0]; return Promise.resolve({data: r || null, error: null}); },
    then(res) { return Promise.resolve({data: rows().filter(r => filt.every(f => f(r))), error: null}).then(res); },
    upsert(list) { if (window.__online === false) return Promise.resolve({error: {message: 'offline'}}); list.forEach(r => { const i = db[table].findIndex(x => x.user_id === r.user_id && x.date === r.date); if (i >= 0) db[table][i] = r; else db[table].push(r); }); return Promise.resolve({error: null}); },
  };
  return api;
};
export const sb = {
  from: q,
  auth: {
    onAuthStateChange(cb) { listeners.push(cb); },
    getSession() { return Promise.resolve({data: {session: null}}); },
    signUp({email}) { user = {id: 'u1', email}; return Promise.resolve({data: {user, session: {}}, error: null}); },
    signInWithPassword({email, password}) { if (password !== 'password123') return Promise.resolve({data: {}, error: {message: 'Invalid login credentials'}}); user = {id: 'u1', email}; return Promise.resolve({data: {user}, error: null}); },
    signOut() { user = null; listeners.forEach(l => l('SIGNED_OUT')); return Promise.resolve({}); },
  },
};
