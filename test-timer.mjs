// Test: player:ready (both) → server auto-starts timer → timer:tick × N → timer:expired
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

async function run() {
  const p0 = await connect();
  const p1 = await connect();

  // Create session (2 players)
  let code;
  p0.emit('session:create', { playerCount: 2 });
  await new Promise(r => p0.once('session:created', ({ code: c }) => { code = c; r(); }));
  console.log('session:', code);

  // Join
  p1.emit('session:join', { code });
  await new Promise(r => p0.once('game:navigateTo', r)); // ChoisirScenario
  console.log('both navigated to ChoisirScenario');

  // Character picks
  p0.emit('character:choose', { characterId: 'alienor' });
  p1.emit('character:choose', { characterId: 'edran' });

  // Wait for FichePersonnage nav on both
  await Promise.all([
    new Promise(r => p0.once('game:navigateTo', r)),
    new Promise(r => p1.once('game:navigateTo', r)),
  ]);
  console.log('both on FichePersonnage');

  // Collect events
  const events = [];
  for (const [label, s] of [['p0', p0], ['p1', p1]]) {
    s.on('game:navigateTo', ({ screen }) => events.push(`${label} nav→${screen}`));
    s.on('writing:start',   ({ secondsLeft }) => events.push(`${label} writing:start ${secondsLeft}`));
    s.on('timer:tick',      ({ secondsLeft }) => events.push(`${label} tick ${secondsLeft}`));
    s.on('timer:expired',   ()               => events.push(`${label} expired`));
  }

  // Both players press "Je suis prêt·e" — server should auto-start timer
  p0.emit('player:ready');
  await wait(200);
  p1.emit('player:ready');

  // Wait enough to see writing:start + a few ticks (server uses 14:20 normally,
  // but we just check the first few seconds of ticks)
  await wait(5000);

  console.log('\nEvents received:');
  events.forEach(e => console.log(' ', e));

  const ok = (
    events.some(e => e.includes('nav→Ecriture')) &&
    events.some(e => e.includes('writing:start')) &&
    events.some(e => e.includes('tick'))
  );

  console.log(ok ? '\nAll tests passed ✓' : '\nSome tests FAILED ✗');
  p0.disconnect(); p1.disconnect();
  process.exit(ok ? 0 : 1);
}

run().catch(e => { console.error(e); process.exit(1); });
