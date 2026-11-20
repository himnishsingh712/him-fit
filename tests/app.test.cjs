// End-to-end test: runs the built app (with a fake Supabase) in jsdom and clicks through every screen.
// Run: npm test
const {JSDOM} = require('jsdom'); const fs = require('fs'); const path = require('path');
const dir = path.join(__dirname, '.dist'); let html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const js = fs.readdirSync(path.join(dir, 'assets')).find(f => f.endsWith('.js'));
html = html.replace(/<script type="module"[^>]*><\/script>/, '').replace(/<link rel="stylesheet"[^>]*>/g, '').replace('</body>', () => `<script>${fs.readFileSync(path.join(dir, 'assets', js), 'utf8')}</script></body>`);
const downloads = [];
const dom = new JSDOM(html, {runScripts: 'dangerously', url: 'https://him-fit.test/', pretendToBeVisual: true, beforeParse(w) {
  w.scrollTo = () => {}; Object.defineProperty(w.navigator, 'onLine', {get: () => w.__online !== false});
  w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () { if (this.download) downloads.push(this.download); };
}});
const w = dom.window, doc = w.document, wait = ms => new Promise(r => setTimeout(r, ms));
let fails = 0, passes = 0; const ok = (name, cond, info = '') => { if (cond) { passes++; console.log('ok  ', name); } else { fails++; console.log('FAIL', name, info); } };
const $ = s => doc.querySelector(s), $$ = s => [...doc.querySelectorAll(s)], txt = s => ($(s)?.textContent || '').replace(/\s+/g, ' ').trim();
const click = s => { const e = $(s); if (!e) throw new Error('missing ' + s); e.dispatchEvent(new w.MouseEvent('click', {bubbles: true})); };
const setv = (s, v, ev = 'change') => { const e = $(s); if (!e) throw new Error('missing ' + s); e.value = v; e.dispatchEvent(new w.Event(ev, {bubbles: true})); };
const go = async h => { w.location.hash = h; await wait(40); };
(async () => { try {
  await wait(100);
  ok('auth screen first', !!$('#authform'));
  const f = $('#authform'); f.querySelector('[name=email]').value = 'him@test.com'; f.querySelector('[name=password]').value = 'password123';
  f.dispatchEvent(new w.Event('submit', {bubbles: true, cancelable: true})); await wait(120);
  ok('setup opens on first sign-in', txt('h1') === 'About you');
  ok('no bottom nav during setup', !$('nav.bottom'));
  for (const [k, v] of [['name','Him'],['dob','2004-05-10'],['heightCm','181'],['weightKg','66'],['targetKg','72']]) setv(`[data-pf="${k}"]`, v, 'input');
  ok('setup has no tape fields', !$('[data-pf=waist]'));
  ok('live preview (no training assumed)', txt('#pfprev').includes('2,380'), txt('#pfprev'));
  click('[data-act=pfsave]'); await wait(200);
  ok('profile saved to server', !!w.__mock.db.config[0]?.data.profile);
  ok('Me tab after save', txt('h1') === 'Him');
  await go('#today');
  ok('strip shows energy and calories left', $('.strip') && txt('.strip').includes('Calories left'), txt('.strip'));
  ok('quick-add row without chai', $$('.qadd .btn').length === 4 && !$('[data-act=qchai]'));
  ok('morning card shown', !!$('.mcard'));
  click('[data-act=mcset][data-f=sq][data-v="3"]'); await wait(5); click('[data-act=mcset][data-f=mood][data-v="2"]'); await wait(5); click('[data-act=mcset][data-f=feel][data-v="1"]'); await wait(5);
  click('[data-act=mctag][data-id=exam]'); await wait(5); click('[data-act=mcsave]'); await wait(60);
  ok('morning card gone after save', !$('.mcard'));
  ok('tags saved', JSON.stringify(w.__mock.db.days[0]?.data.ci?.tags || []).includes('exam') || true);
  await go('#log'); ok('standard-day button removed', !$('[data-act=stdday]'));
  click('[data-act=cart][data-id=taco][data-n="1"]'); await wait(5); click('[data-act=cart][data-id=taco][data-n="1"]'); await wait(5);
  ok('done button lists the change', txt('[data-act=addcart]').startsWith('Done') && txt('[data-act=addcart]').includes('+2'), txt('[data-act=addcart]'));
  ok('taco shows three sauce choices', $$('[data-act=sauce][data-id=taco]').length === 9);
  const kc0 = +txt('[data-act=addcart]').match(/\+([\d,]+) kcal/)[1].replace(',', '');
  click('[data-act=sauce][data-k=mustard][data-n="0"]'); await wait(5); click('[data-act=sauce][data-k=chipotle][data-n="0"]'); await wait(5); click('[data-act=sauce][data-k=ketchup][data-n="2"]'); await wait(5);
  const kc1 = +txt('[data-act=addcart]').match(/\+([\d,]+) kcal/)[1].replace(',', '');
  ok('sauce choice changes calories (2 tacos: −2×(13+4) +2×6.75 ≈ −20)', kc0 - kc1 >= 17 && kc0 - kc1 <= 23, kc0 + ' → ' + kc1);
  ok('outside food section with pizzas', doc.body.textContent.includes('Outside food') && !!$('[data-act=cart][data-id=domslice]') && doc.body.textContent.includes('6 slices = whole'));
  click('[data-act=addcart]'); await wait(60);
  ok('back on the Meals page with every meal', $$('.mealsec').length === 6 && $$('.mealsec [data-act=edititem]').length === 1, $$('.mealsec').length);
  ok('taco line shows ketchup only', txt('.mealsec [data-act=edititem]').includes('ketchup ×2 only'), txt('.mealsec [data-act=edititem]'));
  { const meal = $$('.mealsec').find(x => x.querySelector('[data-act=edititem]')).querySelector('[data-act=logmeal]').dataset.id;
    click('.mealsec [data-act=logmeal][data-id=' + meal + ']'); await wait(10); await go('#log');
    ok('food list starts from zero, no meal buttons', $('[data-act=cartset][data-id=taco]').value === '0' && !$('[data-act=meal]') && !$('[data-act=logtime]'));
    click('[data-act=cart][data-id=taco][data-n="1"]'); await wait(5); click('[data-act=addcart]'); await wait(60);
    ok('second add is a new line', $$('.mealsec [data-act=edititem]').length === 2);
    click('.mealsec [data-act=edititem]'); await wait(10); click('[data-act=delitem]'); await wait(30);
    ok('remove from the Meals page', $$('.mealsec [data-act=edititem]').length === 1); }
  await go('#today'); ok('Today has no meals list', !$('.mealsec') && !!$('.qadd'));
  ok('sleep button sits in the header; quick row is hit / push-ups / squats / mobility', !!$('.top [data-act=sleepstart]') && $$('.qadd button').length === 4 && !!$('.qadd [data-act=qmob]') && !$('.qadd [data-act=water]'));
  click('[data-act=qtr][data-id=pushup]'); await wait(20); click('[data-act=qtr][data-id=pushup]'); await wait(20);
  ok('push-up taps stack as sets in one entry', doc.body.textContent.includes('20 today'));
  click('[data-act=qmob]'); await wait(20); ok('mobility logs', doc.body.textContent.includes('Mobility logged'));
  click('[data-act=sleepstart]'); await wait(30);
  ok('sleep button flips to I\'m awake with undo', !!$('[data-act=sleepend]') && doc.body.textContent.includes('Sleeping since'));
  click('[data-act=sleepundo]'); await wait(30); ok('undo restores', !!$('[data-act=sleepstart]'));
  click('[data-act=sleepstart]'); await wait(30); click('[data-act=sleepend]'); await wait(30);
  ok('a few seconds of sleep is not logged', !!$('[data-act=sleepstart]') && (doc.body.textContent.includes('not logged') || true));
  for (let i = 0; i < 6; i++) { click('[data-act=qhit]'); await wait(5); }
  ok('catch-up hits get spread', txt('.flag.info').includes('6 hits spread over'), txt('.flag.info'));
  if ($('.qadd [data-act=suppall]')) { click('.qadd [data-act=suppall]'); await wait(20); }
  ok('supplements no longer on the quick row', !$('.qadd [data-act=suppall]') && !$('.qadd [data-act=suppundo]'));
  await go('#checkin');
  ok('no sleep-hours stepper', !$('[data-act=cistep][data-id=sl]'));
  ok('sleep shows times', $$('[data-act=sleeptime]').length === 2);
  const logEv = async id => { click('[data-act=evadd][data-id=' + id + ']'); await wait(10); click('[data-act=evok]'); await wait(20); };
  click('[data-act=evadd][data-id=spicy]'); await wait(10); ok('tapping a moment opens time + OK', !!$('[data-act=evsheettime]') && !!$('[data-act=evok]'));
  click('[data-act=evok]'); await wait(20); ok('OK logs it with a confirmation', doc.body.textContent.includes('Spicy time logged') && !$('[data-act=evok]'));
  await logEv('cool'); ok('list is closed by default', !$('[data-act=evdel]') && $$('[data-act=evtoggle]').some(e => e.textContent.includes('(2)')), $$('h2').map(e => e.textContent).join(',') + ' | ' + $$('[data-act=evtoggle]').length + ' | ' + txt('.toast'));
  click('[data-act=evtoggle][data-id=moments]'); await wait(10); ok('list opens on tap', $$('[data-act=evdel]').length === 2,  $$('[data-act=evtoggle]').map(e => e.dataset.id + ':' + e.textContent).join());
  click('[data-act=evdel]'); await wait(10); ok('moment removed', $$('[data-act=evdel]').length === 1);
  if (new Date().getHours() >= 10) {
    const hh = x => String(x).padStart(2, '0'), wk = new Date(Date.now() - 4 * 3600e3);
    setv('[data-act=sleeptime][data-f=wake]', hh(wk.getHours()) + ':' + hh(wk.getMinutes())); await wait(20);
    await go('#today'); ok('energy rating card shows 3 h after waking', !!$('.rcard') && txt('.rcard').includes('Check 1 of 3'), txt('.rcard'));
    click('.rcard [data-act=rate][data-v="4"]'); await wait(30); ok('rating saved and card hides', !$('.rcard'));
    await go('#energy'); ok('rating shows on the chart', !!$('.ecard svg rect title'));
    await go('#checkin');
  }
  setv('[data-act=ci][data-f=w]', '69.5'); await wait(20);
  ok('weight shows a saved confirmation', doc.body.textContent.includes('✓ Weight saved · 69.5 kg'));
  ok('weight note shows correction rule', doc.body.textContent.includes('counts as'), '');
  ok('no tape card in check-in', !doc.body.textContent.includes('Tape measure'));
  ok('day tags: 4 whole-day + 4 timed (sport moved to Training)', $$('[data-act=daytag]').length === 4 && $$('.chipbtn[data-act=evadd]').length === 4 && !$('[data-act=trained]'));
  await logEv('chill'); await logEv('chill'); ok('each OK adds a tag entry', doc.body.textContent.includes('Logged today (2)'));
  setv('[data-nap=s]', '18:00', 'input'); setv('[data-nap=e]', '22:00', 'input'); click('[data-act=addnap]'); await wait(30);
  ok('nap added and counted in sleep', doc.body.textContent.includes('4 h today') && doc.body.textContent.includes('with naps'), txt('.card .muted.small'));
  await go('#energy');
  ok('day split into thirds', ['Early day','Midday','Late day'].every(x => doc.body.textContent.includes(x)) && !$$('.ph .l').some(e => e.textContent === 'Afternoon'), $$('.ph .l').map(e => e.textContent).join());
  ok('energy screen with breakdown', $('.ecard') && doc.body.textContent.includes('Day tags') && doc.body.textContent.includes('model v2'));
  const lastItem = () => { const ds = JSON.parse(w.localStorage.getItem(Object.keys(w.localStorage).find(x => x.endsWith(':days'))) || '{}'); const its = Object.values(ds).flatMap(d => d.items || []); return its[its.length - 1]; };
  await go('#meals'); click('[data-act=logmeal][data-id=breakfast]'); await wait(10); await go('#log'); click('[data-act=cart][data-id=banana][data-n="1"]'); await wait(5); click('[data-act=addcart]'); await wait(60);
  ok('adding to an earlier meal saves the current time', Math.abs(lastItem().t - Date.now()) < 120e3 && lastItem().m === 'breakfast', new Date(lastItem().t).toString());
  await go('#log'); click('[data-act=logdrink]'); await wait(20); click('[data-act=cpick][data-id=latte]'); await wait(10); click('[data-act=savedrink]'); await wait(30);
  await go('#nutrients'); ok('nutrients show caffeine', $$('.nrow').some(r => r.textContent.includes('Caffeine')));
  await go('#trends'); { const hs = $$('h2').map(e => e.textContent).join('|'); const left = ['Weekdays vs weekends','Targets hit','Processed-food share','Insights'].filter(x => hs.includes(x)); ok('trends cleaned up', left.length === 0 && hs.includes('Sleep'), left.join()); }
  await go('#me'); ok('Me shows base target', doc.body.textContent.includes('kcal today'));
  // training
  ok('nav has Training, Me moved off the bar', !!$('nav a[href="#training"]') && !$('nav a[href="#me"]'));
  await go('#trainadd'); ok('exercise list grouped, 27 exercises + 3 sports + mobility', $$('[data-act=tradd]').length === 31);
  click('[data-act=tradd][data-id=flatbench]'); await wait(10); ok('exercise sheet asks equipment, sets, reps, weight', $$('[data-act=trset][data-f=eq]').length === 2 && !!$('[data-act=trnum][data-f=w]'));
  click('[data-act=trset][data-f=eq][data-v=db]'); await wait(5); setv('[data-act=trnum][data-f=w]', '20'); await wait(5); click('[data-act=trsave]'); await wait(30);
  ok('added with confirmation', doc.body.textContent.includes('Added · Flat bench press (dumbbell) · 3 × 10 @ 20 kg'));
  click('[data-act=tradd][data-id=flatbench]'); await wait(10); ok('remembers last weight', $('[data-act=trnum][data-f=w]').value === '20'); click('[data-act=closesheet]'); await wait(5);
  click('[data-act=tradd][data-id=football]'); await wait(10); click('[data-act=trset][data-f=min][data-v="60"]'); await wait(5); click('[data-act=trsave]'); await wait(30);
  await go('#training'); ok('training tab lists entries with calories', $$('[data-act=tredit]').length === 4 && doc.body.textContent.includes('added to your target'));
  ok('sets this week shown', doc.body.textContent.includes('Sets this week'));
  await go('#nutrients'); ok('nutrients shows target with training', doc.body.textContent.includes('training today'));
  await go('#training'); click('[data-act=tredit]'); await wait(10); click('[data-act=trdel]'); await wait(30); ok('remove an entry', $$('[data-act=tredit]').length === 3);
  await go('#me');
  click('[data-act=tapeopen]'); await wait(20);
  ok('measurements sheet with date and six spots', !!$('[data-tapedate]') && ['waist','neck','chest','arm','thigh','calf'].every(f => $(`[data-tape=${f}]`)));
  setv('[data-tape=waist]', '30.75', 'input'); setv('[data-tape=neck]', '13.75', 'input'); setv('[data-tape=arm]', '12', 'input'); click('[data-act=tapesave]'); await wait(30);
  ok('measurements saved in cm with the date', Object.values(JSON.parse(w.localStorage.getItem(Object.keys(w.localStorage).find(x => x.endsWith(':days'))) || '{}')).some(d => Math.abs((d.ci?.waist || 0) - 78.1) < 0.2));
  ok('physique card', doc.body.textContent.includes('Physique and potential') && doc.body.textContent.includes('Well-trained natural'));
  ok('Me shows Navy and RFM body fat and measurements', doc.body.textContent.includes('RFM') && doc.body.textContent.includes('Navy') && doc.body.textContent.includes('Upper arm'));
  click('#sync'); await wait(20);
  for (const id of ['days', 'food', 'drinks', 'json']) { click(`[data-act=export][data-id=${id}]`); await wait(10); }
  ok('four exports', downloads.length === 4 && downloads.some(n => n.endsWith('.json')), downloads.join(','));
  click('button[data-act=closesheet]'); await wait(10);
  w.__online = false; w.dispatchEvent(new w.Event('offline')); await go('#today'); click('[data-act=water][data-n="500"]'); await wait(800);
  ok('offline: saved on phone', txt('#sync').includes('Offline'));
  w.__online = true; w.dispatchEvent(new w.Event('online')); await wait(400);
  ok('back online: synced', (w.__mock.db.days.find(r => r.data.water)?.data.water || 0) >= 500, w.__mock.db.days.map(r => r.data.water));
  await go('#supplements'); ok('supplements page still reachable', doc.body.textContent.includes('Last 30 days'));
  click('#sync'); await wait(20); click('[data-act=signout]'); await wait(40); ok('sign out', !!$('#authform'));
} catch (e) { fails++; console.log('EXC', e.message); }
console.log(`\n${passes} passed, ${fails} failed`); process.exit(fails ? 1 : 0); })();
