// Test étape 6 : ecriture:submit → ai:done + HistoireAssemblee + roue:spin → roue:contrainte + roue:notification
import { io } from 'socket.io-client';

const URL = 'http://localhost:3001';

function connect() {
  return new Promise(resolve => {
    const s = io(URL, { autoConnect: false });
    s.connect();
    s.once('connect', () => resolve(s));
  });
}
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
function on(s, ev) { return new Promise(r => s.once(ev, r)); }

async function run() {
  const p0 = await connect();
  const p1 = await connect();

  // Session
  let code;
  p0.emit('session:create', { playerCount: 2 });
  await new Promise(r => p0.once('session:created', d => { code = d.code; r(); }));
  console.log('session:', code);

  p1.emit('session:join', { code });
  await on(p0, 'game:navigateTo'); // ChoisirScenario

  // Characters
  p0.emit('character:choose', { characterId: 'alienor' });
  p1.emit('character:choose', { characterId: 'edran' });
  await Promise.all([on(p0, 'game:navigateTo'), on(p1, 'game:navigateTo')]); // FichePersonnage

  // Ready → writing start + navigate to Ecriture
  p0.emit('player:ready');
  await wait(100);
  p1.emit('player:ready');
  await Promise.all([on(p0, 'game:navigateTo'), on(p1, 'game:navigateTo')]); // Ecriture
  console.log('both on Ecriture');

  // ── Test: ecriture:submit ──
  const events = [];
  p0.on('ecriture:received', d => events.push(`p0 received ${d.count}/${d.total}`));
  p1.on('ecriture:received', d => events.push(`p1 received ${d.count}/${d.total}`));
  p0.on('ai:done',           d => events.push(`p0 ai:done temps=${d.temps} histoire=${d.histoire.slice(0,30)}…`));
  p1.on('ai:done',           d => events.push(`p1 ai:done`));
  p0.on('game:navigateTo',   d => events.push(`p0 nav→${d.screen}`));
  p1.on('game:navigateTo',   d => events.push(`p1 nav→${d.screen}`));

  p0.emit('ecriture:submit', { contribution: 'Je traverse la grande salle.', temps: 1 });
  await wait(300); // p0 submit received
  p1.emit('ecriture:submit', { contribution: "Je l'observe depuis l'entrée.", temps: 1 });

  // Wait for Anthropic (can take up to 15s)
  console.log('waiting for ai:done (Anthropic call)...');
  await new Promise(r => { p0.once('ai:done', r); });
  await wait(500);

  // ── Test: roue:spin ──
  p0.on('roue:contrainte',   d => events.push(`p0 contrainte roue${d.roueNumber} variant${d.variantIndex}`));
  p1.on('roue:contrainte',   d => events.push(`p1 contrainte roue${d.roueNumber} variant${d.variantIndex}`));
  p0.on('roue:notification', d => events.push(`p0 notif type=${d.type}`));
  p1.on('roue:notification', d => events.push(`p1 notif type=${d.type}`));

  p0.emit('roue:spin', { roueNumber: 1 });
  await wait(500);

  console.log('\nEvents:');
  events.forEach(e => console.log(' ', e));

  const ok = (
    events.some(e => e.includes('received 1/2')) &&
    events.some(e => e.includes('ai:done')) &&
    events.some(e => e.includes('nav→HistoireAssemblee')) &&
    events.some(e => e.includes('contrainte roue1')) &&
    events.some(e => e.includes('p0 notif')) &&
    events.some(e => e.includes('p1 notif'))
  );

  console.log(ok ? '\nAll tests passed ✓' : '\nSome tests FAILED ✗');
  p0.disconnect(); p1.disconnect();
  process.exit(ok ? 0 : 1);
}

run().catch(e => { console.error(e); process.exit(1); });
