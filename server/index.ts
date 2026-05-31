import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.server' });
dotenv.config(); // fallback to .env if .env.server is absent

// Contourne la vérification SSL (certificat réseau non reconnu par Node.js sur Windows)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

process.on('uncaughtException', (err) => {
  console.error('[fatal] uncaughtException:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('[fatal] unhandledRejection:', reason);
  process.exit(1);
});

import * as fs from 'fs';
import * as path from 'path';

// Duplicate all console output to server.log (overwrites on each restart)
const logPath = path.join(process.cwd(), 'server.log');
const logStream = fs.createWriteStream(logPath, { flags: 'w' });
function writeLog(...args: unknown[]) {
  const line = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
  logStream.write(line + '\n');
}
const _log = console.log.bind(console);
const _error = console.error.bind(console);
console.log   = (...a) => { _log(...a);   writeLog(...a); };
console.error = (...a) => { _error(...a); writeLog('[ERROR]', ...a); };

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import assembleRouter from './routes/assemble';
import { EV } from './events';
import { derniereSaison } from '../data/scenarios/derniere-saison';

console.log('[boot] variables d\'environnement disponibles :', Object.keys(process.env).sort().join(', '));
console.log('[boot] ANTHROPIC_API_KEY présente :', !!process.env.ANTHROPIC_API_KEY, '| longueur :', process.env.ANTHROPIC_API_KEY?.length ?? 0);
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('[boot] FATAL: ANTHROPIC_API_KEY manquante — définir la variable dans Railway');
  process.exit(1);
}
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TEXTE_FICTIF = `Aliénor traverse la salle sans regarder personne. Ses talons sur le parquet de chêne marquent chaque pas d'une précision froide, comme si elle avait compté les battements à l'avance.\n\nDepuis l'entrée, Edran l'observe. Un verre à la main, il ne bouge pas. Il y a dans son immobilité quelque chose qui ressemble à de la patience — ou à de la résignation, difficile de distinguer les deux à cette distance.\n\nHadrien, lui, cherche sa mère des yeux. Il pivote lentement, balayant les visages. La salle est pleine et pourtant chaque regard qu'il croise glisse ailleurs, comme si personne ne voulait être celui qui lui répond.`;

async function assemblerHistoire(
  contributions: Array<{ name: string; texte: string }>,
  temps: number,
  scenarioTitle: string,
): Promise<string> {
  const contribsText = contributions.map(c => `${c.name} : ${c.texte}`).join('\n');

  const systemPrompt = `Tu es l'IA d'une session de jeu d'écriture collaborative. Ton rôle est strictement défini — tu ne le dépasses jamais.

CE QUE TU FAIS :
Tu reçois les contributions des joueurs écrites séparément. Tu les assembles en un seul texte fluide, cohérent et bien rythmé — en reformulant quand c'est nécessaire.

REFORMULATION — CE QUE ÇA SIGNIFIE :
Tu peux reformuler une phrase pour qu'elle soit plus fluide, mieux rythmée, ou mieux raccordée aux autres récits. Tu peux ajuster le temps verbal, la ponctuation, l'ordre des mots — si ça sert la cohérence globale. Tu ne changes jamais le sens, l'intention ou la voix d'un joueur. Si il écrit brusque, ça reste brusque. Si il écrit lyrique, ça reste lyrique.

RÈGLE ABSOLUE — L'ÉGALITÉ DES VOIX :
Toutes les contributions ont exactement le même poids. Tu ne sacrifies jamais l'une pour servir l'autre. Tu ne résumes pas l'une pendant que tu développes l'autre. Le texte final doit donner l'impression que tous les joueurs ont écrit à parts égales, même si les volumes diffèrent.

COHÉRENCE NARRATIVE :
Si des contributions se contredisent sur un fait, tu choisis la version la plus compatible avec l'ensemble. Si la contradiction est trop grande, tu la gardes comme tension narrative — les deux versions coexistent. Tu ne signales jamais les contradictions aux joueurs.

TRANSITIONS :
Tu ajoutes les transitions nécessaires pour que le texte soit fluide — jamais pour combler un vide narratif ou inventer une action. Maximum 3 transitions par temps. Les transitions que tu ajoutes sont en [crochets]. Une transition est uniquement spatiale ou temporelle — elle indique où ou quand, jamais ce qu'un personnage fait ou ressent.

CE QUE TU NE FAIS JAMAIS :
— Changer le sens ou l'intention d'un joueur
— Inventer des actions ou des dialogues pour les personnages
— Continuer l'histoire au-delà des contributions
— Proposer des pistes pour la suite
— Commenter la qualité de l'écriture`;

  const userMessage = `TEMPS ${temps}/4 — ${scenarioTitle}

${contribsText}

Tu réponds uniquement avec le texte assemblé. Aucun commentaire avant. Aucun commentaire après.`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.log('[assemblerHistoire] clé API présente :', !!apiKey, '| longueur :', apiKey?.length ?? 0);
  console.log('[assemblerHistoire] modèle : claude-sonnet-4-6 | contribs :', contributions.length, '| temps :', temps);

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
    const texte = (msg.content[0] as { type: string; text: string }).text;
    console.log('[assemblerHistoire] réponse brute (100 premiers cars) :', texte.slice(0, 100));
    return texte;
  } catch (err) {
    console.error('[assemblerHistoire] Erreur Anthropic :', err);
    return TEXTE_FICTIF;
  }
}

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// ── Session store ──────────────────────────────────────────────────────────

type Player = { socketId: string; index: number };

type PendingInvite = {
  fromSocketId: string;
  fromCharId: string;
  toSocketId: string;
  timeout: ReturnType<typeof setTimeout>;
};

type DialogueReplique = { characterId: string; text: string };

type Dialogue = {
  id: string;
  socketA: string; // inviter
  socketB: string; // invitee
  charA: string;
  charB: string;
  situationText: string;
  situationReadySet: Set<string>;
  repliques: DialogueReplique[];
  currentTurn: string; // socket ID
  terminerSet: Set<string>;
  phase: 'situation' | 'chat' | 'done';
  situationTimer: ReturnType<typeof setTimeout> | null;
  chatTimer: ReturnType<typeof setTimeout> | null;
};

type Session = {
  code: string;
  maxPlayers: number;
  players: Player[];
  selectedScenarioId: string | null;
  /** characterId → playerIndex */
  characters: Map<string, number>;
  readyPlayers: Set<string>;
  ficheLuPlayers: Set<string>;
  notifLuPlayers: Set<string>;
  ecriturePretPlayers: Set<string>;
  histoireLuPlayers: Set<string>;
  roueSpirated: Set<number>;
  timerInterval: ReturnType<typeof setInterval> | null;
  secondsLeft: number;
  /** characterId → contribution text */
  contributions: Map<string, string>;
  currentTemps: number;
  dialogueUsed: Set<string>;
  dialogueBusy: Set<string>;
  pendingInvites: Map<string, PendingInvite>;
  activeDialogues: Map<string, Dialogue>;
  histoirePretPlayers: Set<string>;
  currentScreen: string;
  currentScreenParams: Record<string, unknown>;
  disconnectTimers: Map<number, ReturnType<typeof setTimeout>>;
};

const sessions = new Map<string, Session>();

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
function makeCode(): string {
  let code: string;
  do {
    code = Array.from({ length: 4 }, () =>
      CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
    ).join('');
  } while (sessions.has(code));
  return code;
}

// ── HTTP ───────────────────────────────────────────────────────────────────

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ ok: true });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now(), sessions: sessions.size });
});

app.use('/assemble', assembleRouter);

const httpServer = createServer(app);

// ── Socket.io ──────────────────────────────────────────────────────────────

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const TIMER_DURATION = 900; // 15 min
const ALERT_TYPES: Record<number, '5min' | '2min' | '1min'> = {
  300: '5min', 120: '2min', 60: '1min',
};

function findDialogue(session: Session, socketId: string): Dialogue | undefined {
  for (const d of session.activeDialogues.values()) {
    if (d.socketA === socketId || d.socketB === socketId) return d;
  }
}

function startChatPhase(session: Session, sessionCode: string, dialogue: Dialogue): void {
  dialogue.phase = 'chat';
  io.to(dialogue.socketA).emit(EV.DIALOGUE_CHAT_START, { myTurn: dialogue.currentTurn === dialogue.socketA });
  io.to(dialogue.socketB).emit(EV.DIALOGUE_CHAT_START, { myTurn: dialogue.currentTurn === dialogue.socketB });
  dialogue.chatTimer = setTimeout(() => {
    if (dialogue.phase === 'chat') finishDialogue(session, sessionCode, dialogue);
  }, 120_000);
  console.log(`[dialogue] ${sessionCode} — phase chat démarrée`);
}

function finishDialogue(session: Session, sessionCode: string, dialogue: Dialogue): void {
  dialogue.phase = 'done';
  if (dialogue.chatTimer) { clearTimeout(dialogue.chatTimer); dialogue.chatTimer = null; }
  const payload = { situation: dialogue.situationText, repliques: dialogue.repliques };
  io.to(dialogue.socketA).emit(EV.DIALOGUE_DONE, payload);
  io.to(dialogue.socketB).emit(EV.DIALOGUE_DONE, payload);
  session.dialogueUsed.add(dialogue.socketA);
  session.dialogueUsed.add(dialogue.socketB);
  session.dialogueBusy.delete(dialogue.socketA);
  session.dialogueBusy.delete(dialogue.socketB);
  session.activeDialogues.delete(dialogue.id);
  console.log(`[dialogue] ${sessionCode} — terminé (${dialogue.repliques.length} répliques)`);
}

function startTimer(session: Session, sessionCode: string) {
  if (session.timerInterval) {
    clearInterval(session.timerInterval);
    session.timerInterval = null;
  }
  session.secondsLeft = TIMER_DURATION;
  io.to(sessionCode).emit(EV.WRITING_START, { secondsLeft: TIMER_DURATION });
  session.timerInterval = setInterval(() => {
    session.secondsLeft--;
    io.to(sessionCode).emit(EV.TIMER_TICK, { secondsLeft: session.secondsLeft });
    const alertType = ALERT_TYPES[session.secondsLeft];
    if (alertType) io.to(sessionCode).emit(EV.TIMER_ALERT, { type: alertType });
    if (session.secondsLeft <= 0) {
      clearInterval(session.timerInterval!);
      session.timerInterval = null;
      io.to(sessionCode).emit(EV.TIMER_EXPIRED);
      console.log(`[timer] ${sessionCode} — expiré`);
    }
  }, 1000);
  console.log(`[timer] ${sessionCode} — démarré (${TIMER_DURATION}s)`);
}

io.on('connection', (socket) => {
  console.log(`[socket] connected  ${socket.id}`);

  // ── ping ──
  socket.on(EV.PING, () => socket.emit(EV.PONG));

  // ── session:create ──
  socket.on(EV.SESSION_CREATE, ({ playerCount }: { playerCount: number }) => {
    const count = Math.min(Math.max(playerCount, 2), 6);
    const code = makeCode();
    const session: Session = {
      code,
      maxPlayers: count,
      players: [{ socketId: socket.id, index: 0 }],
      selectedScenarioId: null,
      characters: new Map(),
      readyPlayers: new Set(),
      ficheLuPlayers: new Set(),
      notifLuPlayers: new Set(),
      ecriturePretPlayers: new Set(),
      histoireLuPlayers: new Set(),
      roueSpirated: new Set(),
      timerInterval: null,
      secondsLeft: 0,
      contributions: new Map(),
      currentTemps: 1,
      dialogueUsed: new Set(),
      dialogueBusy: new Set(),
      pendingInvites: new Map(),
      activeDialogues: new Map(),
      histoirePretPlayers: new Set(),
      currentScreen: 'ChoisirScenario',
      currentScreenParams: {},
      disconnectTimers: new Map(),
    };
    sessions.set(code, session);
    socket.join(code);
    socket.emit(EV.SESSION_CREATED, { code, playerCount: count, totalConnected: 1 });
    console.log(`[session] created ${code} (${count} joueurs)`);
  });

  // ── session:join ──
  socket.on(EV.SESSION_JOIN, ({ code }: { code: string }) => {
    const key = (code ?? '').toUpperCase().trim();
    const session = sessions.get(key);

    if (!session) {
      socket.emit(EV.SESSION_ERROR, { message: 'Code invalide' });
      return;
    }
    if (session.players.length >= session.maxPlayers) {
      socket.emit(EV.SESSION_ERROR, { message: 'La session est complète' });
      return;
    }
    // Prevent double-join
    if (session.players.some(p => p.socketId === socket.id)) {
      socket.emit(EV.SESSION_ERROR, { message: 'Déjà connecté à cette session' });
      return;
    }

    const playerIndex = session.players.length;
    session.players.push({ socketId: socket.id, index: playerIndex });
    socket.join(key);

    const totalConnected = session.players.length;

    // Broadcast updated count to everyone in room (incl. new joiner)
    io.to(key).emit(EV.SESSION_PLAYER_JOINED, {
      totalConnected,
      playerCount: session.maxPlayers,
    });

    // Confirm join to the new player (navigation data)
    socket.emit(EV.SESSION_JOINED, {
      code: key,
      playerIndex,
      playerCount: session.maxPlayers,
      totalConnected,
    });

    // When room is full: broadcast ready then drive all clients to the next screen
    if (totalConnected >= session.maxPlayers) {
      io.to(key).emit(EV.SESSION_READY, { code: key });
      // Small delay so clients show "Tout le monde est là !" before leaving the lobby
      setTimeout(() => {
        io.to(key).emit(EV.GAME_NAVIGATE_TO, { screen: 'ChoisirScenario', params: {} });
      }, 800);
    }

    console.log(`[session] ${key} — ${totalConnected}/${session.maxPlayers}`);
  });

  // ── scenario:select ──
  socket.on(EV.SCENARIO_SELECT, ({ scenarioId }: { scenarioId: string }) => {
    let session: Session | undefined; let sessionCode = '';
    for (const [code, s] of sessions.entries()) {
      if (s.players.some(p => p.socketId === socket.id)) { session = s; sessionCode = code; break; }
    }
    if (!session) return;
    if (session.selectedScenarioId) return; // first click wins
    session.selectedScenarioId = scenarioId;
    io.to(sessionCode).emit(EV.SCENARIO_SELECTED, { scenarioId });
    session.currentScreen = 'ChoisirPersonnage';
    session.currentScreenParams = {};
    setTimeout(() => {
      io.to(sessionCode).emit(EV.GAME_NAVIGATE_TO, { screen: 'ChoisirPersonnage', params: {} });
    }, 600);
    console.log(`[scenario] ${sessionCode} — sélectionné : ${scenarioId}`);
  });

  // ── character:back ──
  socket.on(EV.CHARACTER_BACK, () => {
    let session: Session | undefined; let sessionCode = '';
    for (const [code, s] of sessions.entries()) {
      if (s.players.some(p => p.socketId === socket.id)) { session = s; sessionCode = code; break; }
    }
    if (!session) return;
    session.selectedScenarioId = null;
    session.characters.clear();
    session.readyPlayers.clear();
    session.currentScreen = 'ChoisirScenario';
    session.currentScreenParams = {};
    io.to(sessionCode).emit(EV.GAME_NAVIGATE_TO, { screen: 'ChoisirScenario', params: {} });
    console.log(`[character] ${sessionCode} — retour scénario, personnages réinitialisés`);
  });

  // ── character:choose ──
  socket.on(EV.CHARACTER_CHOOSE, ({ characterId }: { characterId: string }) => {
    // Find the session this socket belongs to
    let session: Session | undefined;
    let playerIndex = -1;
    let sessionCode = '';

    for (const [code, s] of sessions.entries()) {
      const player = s.players.find(p => p.socketId === socket.id);
      if (player) {
        session = s; playerIndex = player.index; sessionCode = code;
        break;
      }
    }

    if (!session || playerIndex === -1) {
      socket.emit(EV.SESSION_ERROR, { message: 'Session introuvable' });
      return;
    }

    // Reject if already taken by a different player
    const currentOwner = session.characters.get(characterId);
    if (currentOwner !== undefined && currentOwner !== playerIndex) {
      socket.emit(EV.CHARACTER_ALREADY_TAKEN, { characterId });
      return;
    }

    // Release any character this player previously held
    for (const [cId, pIdx] of session.characters.entries()) {
      if (pIdx === playerIndex) { session.characters.delete(cId); break; }
    }

    // Assign the new character
    session.characters.set(characterId, playerIndex);
    io.to(sessionCode).emit(EV.CHARACTER_TAKEN, { characterId, playerIndex });
    console.log(`[character] ${sessionCode} — joueur ${playerIndex} → ${characterId}`);

    // When all players have a character, navigate each to their own FichePersonnage
    if (session.characters.size >= session.maxPlayers) {
      io.to(sessionCode).emit(EV.CHARACTER_ALL_CHOSEN);
      console.log(`[character] ${sessionCode} — tous choisis`);

      const snap = new Map(session.characters); // snapshot before async
      const players = [...session.players];

      setTimeout(() => {
        for (const player of players) {
          const charId = [...snap.entries()].find(([, idx]) => idx === player.index)?.[0];
          if (charId) {
            io.to(player.socketId).emit(EV.GAME_NAVIGATE_TO, {
              screen: 'FichePersonnage',
              params: { characterId: charId },
            });
          }
        }
      }, 500);
    }
  });

  // ── ecriture:pret (initial — depuis FichePersonnage) ──

  // ── notif:lu — après Roue, tous ont lu → Ecriture T+1 + timer ──
  socket.on(EV.NOTIF_LU, () => {
    let session: Session | undefined; let sessionCode = '';
    for (const [code, s] of sessions.entries()) {
      if (s.players.some(p => p.socketId === socket.id)) { session = s; sessionCode = code; break; }
    }
    if (!session) return;
    session.notifLuPlayers.add(socket.id);
    console.log(`[notif:lu] ${sessionCode} — ${session.notifLuPlayers.size}/${session.maxPlayers}`);
    if (session.notifLuPlayers.size < session.maxPlayers) return;
    session.notifLuPlayers.clear();

    const nextTemps = (session.currentTemps + 1) as 2 | 3 | 4;
    session.currentScreen = 'Ecriture';
    session.currentScreenParams = { temps: nextTemps };
    io.to(sessionCode).emit(EV.GAME_NAVIGATE_TO, { screen: 'Ecriture', params: { temps: nextTemps } });
    startTimer(session, sessionCode);
    console.log(`[notif:lu] ${sessionCode} — → Ecriture (temps ${nextTemps})`);
  });

  // ── ecriture:pret — initial depuis FichePersonnage → Ecriture T1 + timer ──
  socket.on(EV.ECRITURE_PRET, () => {
    let session: Session | undefined; let sessionCode = '';
    for (const [code, s] of sessions.entries()) {
      if (s.players.some(p => p.socketId === socket.id)) { session = s; sessionCode = code; break; }
    }
    if (!session) return;
    session.ecriturePretPlayers.add(socket.id);
    console.log(`[ecriture:pret] ${sessionCode} — ${session.ecriturePretPlayers.size}/${session.maxPlayers}`);
    if (session.ecriturePretPlayers.size < session.maxPlayers) return;
    session.ecriturePretPlayers.clear();

    session.currentScreen = 'Ecriture';
    session.currentScreenParams = { temps: 1 };
    io.to(sessionCode).emit(EV.GAME_NAVIGATE_TO, { screen: 'Ecriture', params: { temps: 1 } });
    startTimer(session, sessionCode);
    console.log(`[ecriture:pret] ${sessionCode} — → Ecriture (temps 1)`);
  });

  // ── ecriture:submit ──
  socket.on(EV.ECRITURE_SUBMIT, async ({ contribution, temps }: { contribution: string; temps: number }) => {
    let session: Session | undefined;
    let playerIndex = -1;
    let sessionCode = '';

    for (const [code, s] of sessions.entries()) {
      const player = s.players.find(p => p.socketId === socket.id);
      if (player) { session = s; playerIndex = player.index; sessionCode = code; break; }
    }
    if (!session || playerIndex === -1) return;

    // Find the characterId for this player
    const characterId = [...session.characters.entries()].find(([, idx]) => idx === playerIndex)?.[0];
    if (!characterId) return;

    session.contributions.set(characterId, contribution);
    session.currentTemps = temps;
    console.log(`[ecriture] ${sessionCode} — ${session.contributions.size}/${session.maxPlayers} contributions`);

    io.to(sessionCode).emit(EV.ECRITURE_RECEIVED, {
      count: session.contributions.size,
      total: session.maxPlayers,
    });

    if (session.contributions.size < session.maxPlayers) return;

    // Stop the running timer and reset ready-sets for the next round
    if (session.timerInterval) {
      clearInterval(session.timerInterval);
      session.timerInterval = null;
    }
    session.ecriturePretPlayers.clear();
    session.histoireLuPlayers.clear();
    session.ficheLuPlayers.clear();
    session.notifLuPlayers.clear();
    // Reset dialogue state for next round
    session.dialogueUsed.clear();
    session.dialogueBusy.clear();
    for (const [, invite] of session.pendingInvites) clearTimeout(invite.timeout);
    session.pendingInvites.clear();
    for (const d of session.activeDialogues.values()) {
      if (d.situationTimer) clearTimeout(d.situationTimer);
      if (d.chatTimer) clearTimeout(d.chatTimer);
    }
    session.activeDialogues.clear();

    // All contributions in — assemble
    const contribs = [...session.contributions.entries()].map(([cId, texte]) => {
      const name = derniereSaison.characters.find(c => c.id === cId)?.name ?? cId;
      return { name, texte };
    });
    session.contributions.clear();

    console.log(`[assemble] ${sessionCode} — appel Anthropic (temps ${temps})...`);
    const histoire = await assemblerHistoire(contribs, temps, derniereSaison.title);
    console.log(`[assemble] ${sessionCode} — terminé`);

    console.log(`[ai:done] ${sessionCode} — émission temps=${temps}`);
    io.to(sessionCode).emit(EV.AI_DONE, { histoire, temps });
    session.currentScreen = 'HistoireAssemblee';
    session.currentScreenParams = { histoire, temps };
    io.to(sessionCode).emit(EV.GAME_NAVIGATE_TO, { screen: 'HistoireAssemblee', params: { histoire, temps } });
  });

  // ── roue:spin ──
  socket.on(EV.ROUE_SPIN, ({ roueNumber }: { roueNumber: 1 | 2 | 3 }) => {
    let session: Session | undefined; let sessionCode = '';
    for (const [code, s] of sessions.entries()) {
      if (s.players.some(p => p.socketId === socket.id)) { session = s; sessionCode = code; break; }
    }
    if (!session) return;
    if (session.roueSpirated.has(roueNumber)) return; // déjà tournée par un autre joueur
    session.roueSpirated.add(roueNumber);

    const roue = derniereSaison.roues.find(r => r.number === roueNumber);
    if (!roue) return;

    const variantIndex = Math.floor(Math.random() * roue.variants.length);
    const texte = roue.variants[variantIndex].text;

    io.to(sessionCode).emit(EV.ROUE_CONTRAINTE, { variantIndex, texte, roueNumber });
    console.log(`[roue] ${sessionCode} — roue ${roueNumber}, variant ${variantIndex}`);

    // Send private notifications
    for (const player of session.players) {
      const charId = [...session.characters.entries()].find(([, idx]) => idx === player.index)?.[0];
      if (!charId) continue;
      const notif = derniereSaison.notifications.find(
        n => n.characterId === charId && n.roue === roueNumber,
      );
      if (notif) {
        io.to(player.socketId).emit(EV.ROUE_NOTIFICATION, {
          type: notif.type,
          texte: notif.text,
          roueNumber,
        });
        console.log(`[roue] ${sessionCode} — notification → joueur ${player.index} (${charId})`);
      }
    }
  });

  // ── dialogue:invite ──
  socket.on(EV.DIALOGUE_INVITE, ({ targetPlayerIndex }: { targetPlayerIndex: number }) => {
    let session: Session | undefined; let sessionCode = ''; let inviterIndex = -1;
    for (const [code, s] of sessions.entries()) {
      const p = s.players.find(pl => pl.socketId === socket.id);
      if (p) { session = s; sessionCode = code; inviterIndex = p.index; break; }
    }
    if (!session || inviterIndex === -1) return;

    const inviterCharId = [...session.characters.entries()].find(([, i]) => i === inviterIndex)?.[0];
    if (!inviterCharId) return;
    if (session.dialogueUsed.has(socket.id) || session.dialogueBusy.has(socket.id)) return;

    const target = session.players.find(p => p.index === targetPlayerIndex);
    if (!target) return;

    if (session.dialogueBusy.has(target.socketId) || session.pendingInvites.has(target.socketId)) {
      socket.emit(EV.DIALOGUE_REFUSED, { reason: 'busy' });
      return;
    }

    session.dialogueBusy.add(socket.id);
    const inviterChar = derniereSaison.characters.find(c => c.id === inviterCharId);

    const timeout = setTimeout(() => {
      session!.pendingInvites.delete(target.socketId);
      session!.dialogueBusy.delete(socket.id);
      socket.emit(EV.DIALOGUE_REFUSED, { reason: 'timeout' });
    }, 35_000);

    session.pendingInvites.set(target.socketId, { fromSocketId: socket.id, fromCharId: inviterCharId, toSocketId: target.socketId, timeout });
    io.to(target.socketId).emit(EV.DIALOGUE_INVITATION, {
      fromCharacterId: inviterCharId,
      fromCharacterName: inviterChar?.name ?? inviterCharId,
    });
    console.log(`[dialogue] ${sessionCode} — joueur ${inviterIndex} invite joueur ${targetPlayerIndex}`);
  });

  // ── dialogue:respond ──
  socket.on(EV.DIALOGUE_RESPOND, ({ accept }: { accept: boolean }) => {
    let session: Session | undefined; let sessionCode = ''; let inviteeIndex = -1;
    for (const [code, s] of sessions.entries()) {
      const p = s.players.find(pl => pl.socketId === socket.id);
      if (p) { session = s; sessionCode = code; inviteeIndex = p.index; break; }
    }
    if (!session || inviteeIndex === -1) return;

    const invite = session.pendingInvites.get(socket.id);
    if (!invite) return;
    clearTimeout(invite.timeout);
    session.pendingInvites.delete(socket.id);

    if (!accept) {
      session.dialogueBusy.delete(invite.fromSocketId);
      io.to(invite.fromSocketId).emit(EV.DIALOGUE_REFUSED, { reason: 'declined' });
      return;
    }

    const inviteeCharId = [...session.characters.entries()].find(([, i]) => i === inviteeIndex)?.[0];
    if (!inviteeCharId) return;
    session.dialogueBusy.add(socket.id);

    const dialogueId = `${invite.fromSocketId}_${socket.id}`;
    const dialogue: Dialogue = {
      id: dialogueId, socketA: invite.fromSocketId, socketB: socket.id,
      charA: invite.fromCharId, charB: inviteeCharId,
      situationText: '', situationReadySet: new Set(),
      repliques: [], currentTurn: invite.fromSocketId,
      terminerSet: new Set(), phase: 'situation',
      situationTimer: null, chatTimer: null,
    };
    session.activeDialogues.set(dialogueId, dialogue);

    io.to(invite.fromSocketId).emit(EV.DIALOGUE_ACCEPTED, { otherCharacterId: inviteeCharId, myTurn: true });
    io.to(socket.id).emit(EV.DIALOGUE_ACCEPTED, { otherCharacterId: invite.fromCharId, myTurn: false });

    dialogue.situationTimer = setTimeout(() => {
      if (dialogue.phase === 'situation') startChatPhase(session!, sessionCode, dialogue);
    }, 60_000);
    console.log(`[dialogue] ${sessionCode} — dialogue démarré`);
  });

  // ── dialogue:situation:update ──
  socket.on(EV.DIALOGUE_SITUATION_UPDATE, ({ text }: { text: string }) => {
    let session: Session | undefined;
    for (const [, s] of sessions.entries()) {
      if (s.players.some(p => p.socketId === socket.id)) { session = s; break; }
    }
    if (!session) return;
    const d = findDialogue(session, socket.id);
    if (!d || d.phase !== 'situation') return;
    d.situationText = text;
    const other = d.socketA === socket.id ? d.socketB : d.socketA;
    io.to(other).emit(EV.DIALOGUE_SITUATION_SYNC, { text });
  });

  // ── dialogue:situation:ready ──
  socket.on(EV.DIALOGUE_SITUATION_READY, () => {
    let session: Session | undefined; let sessionCode = '';
    for (const [code, s] of sessions.entries()) {
      if (s.players.some(p => p.socketId === socket.id)) { session = s; sessionCode = code; break; }
    }
    if (!session) return;
    const d = findDialogue(session, socket.id);
    if (!d || d.phase !== 'situation') return;
    d.situationReadySet.add(socket.id);
    if (d.situationReadySet.size >= 2) {
      if (d.situationTimer) { clearTimeout(d.situationTimer); d.situationTimer = null; }
      startChatPhase(session, sessionCode, d);
    }
  });

  // ── dialogue:replique ──
  socket.on(EV.DIALOGUE_REPLIQUE, ({ text }: { text: string }) => {
    let session: Session | undefined; let sessionCode = '';
    for (const [code, s] of sessions.entries()) {
      if (s.players.some(p => p.socketId === socket.id)) { session = s; sessionCode = code; break; }
    }
    if (!session) return;
    const d = findDialogue(session, socket.id);
    if (!d || d.phase !== 'chat' || d.currentTurn !== socket.id) return;
    const charId = d.socketA === socket.id ? d.charA : d.charB;
    const replique: DialogueReplique = { characterId: charId, text };
    d.repliques.push(replique);
    d.currentTurn = d.socketA === socket.id ? d.socketB : d.socketA;
    io.to(d.socketA).emit(EV.DIALOGUE_REPLIQUE_RECEIVED, replique);
    io.to(d.socketB).emit(EV.DIALOGUE_REPLIQUE_RECEIVED, replique);
    console.log(`[dialogue] ${sessionCode} — réplique (${d.repliques.length} total)`);
  });

  // ── dialogue:terminer ──
  socket.on(EV.DIALOGUE_TERMINER, () => {
    let session: Session | undefined; let sessionCode = '';
    for (const [code, s] of sessions.entries()) {
      if (s.players.some(p => p.socketId === socket.id)) { session = s; sessionCode = code; break; }
    }
    if (!session) return;
    const d = findDialogue(session, socket.id);
    if (!d || d.phase !== 'chat') return;
    d.terminerSet.add(socket.id);
    if (d.terminerSet.size >= 2) {
      if (d.chatTimer) { clearTimeout(d.chatTimer); d.chatTimer = null; }
      finishDialogue(session, sessionCode, d);
    }
  });

  // ── histoire:lu ──
  socket.on(EV.HISTOIRE_LU, () => {
    let session: Session | undefined; let sessionCode = '';
    for (const [code, s] of sessions.entries()) {
      if (s.players.some(p => p.socketId === socket.id)) { session = s; sessionCode = code; break; }
    }
    if (!session) return;
    session.histoireLuPlayers.add(socket.id);
    console.log(`[histoire:lu] ${sessionCode} — ${session.histoireLuPlayers.size}/${session.maxPlayers}`);
    if (session.histoireLuPlayers.size < session.maxPlayers) return;
    session.histoireLuPlayers.clear();

    if (session.currentTemps < 4) {
      const roueNumber = session.currentTemps as 1 | 2 | 3;
      session.currentScreen = 'Roue';
      session.currentScreenParams = { roueNumber };
      io.to(sessionCode).emit(EV.GAME_NAVIGATE_TO, { screen: 'Roue', params: { roueNumber } });
      console.log(`[histoire:lu] ${sessionCode} — → Roue ${roueNumber}`);
    } else {
      session.currentScreen = 'Cloture';
      session.currentScreenParams = {};
      io.to(sessionCode).emit(EV.GAME_NAVIGATE_TO, { screen: 'Cloture', params: {} });
      console.log(`[histoire:lu] ${sessionCode} — → Cloture`);
    }
  });

  // ── cloture:titre ──
  socket.on(EV.CLOTURE_TITRE, ({ title }: { title: string }) => {
    let session: Session | undefined; let sessionCode = ''; let playerIndex = -1;
    for (const [code, s] of sessions.entries()) {
      const p = s.players.find(pl => pl.socketId === socket.id);
      if (p) { session = s; sessionCode = code; playerIndex = p.index; break; }
    }
    if (!session || playerIndex !== 0) return; // créateur uniquement
    session.currentScreen = 'TheEnd';
    session.currentScreenParams = { titre: title };
    io.to(sessionCode).emit(EV.GAME_NAVIGATE_TO, { screen: 'TheEnd', params: { titre: title } });
    console.log(`[cloture] ${sessionCode} — titre choisi : "${title}"`);
  });

  // ── session:rejoin ──
  socket.on(EV.SESSION_REJOIN, ({ code, playerIndex }: { code: string; playerIndex: number }) => {
    const session = sessions.get(code.toUpperCase());
    if (!session) { socket.emit(EV.SESSION_ERROR, { message: 'Session introuvable' }); return; }

    // Cancel disconnect timer if pending
    const existingTimer = session.disconnectTimers.get(playerIndex);
    if (existingTimer) {
      clearTimeout(existingTimer);
      session.disconnectTimers.delete(playerIndex);
    }

    // Re-assign socket ID
    const player = session.players.find(p => p.index === playerIndex);
    if (!player) { socket.emit(EV.SESSION_ERROR, { message: 'Session expirée' }); return; }
    player.socketId = socket.id;
    socket.join(code.toUpperCase());

    const charId = [...session.characters.entries()].find(([, idx]) => idx === playerIndex)?.[0] ?? null;
    const allChars = [...session.characters.entries()].map(([cId, idx]) => ({ playerIndex: idx, characterId: cId }));

    // FichePersonnage needs characterId injected per-player (server broadcasts individually)
    const screenParams: Record<string, unknown> = { ...session.currentScreenParams };
    if (session.currentScreen === 'FichePersonnage' && charId) {
      screenParams['characterId'] = charId;
    }

    socket.emit(EV.GAME_STATE_SYNC, {
      currentScreen: session.currentScreen,
      params: screenParams,
      secondsLeft: session.secondsLeft,
      sessionCode: code.toUpperCase(),
      playerCount: session.maxPlayers,
      myCharacterId: charId,
      allCharacters: allChars,
      currentTemps: session.currentTemps,
    });
    console.log(`[rejoin] ${code} — joueur ${playerIndex} reconnecté (→ ${session.currentScreen})`);
  });

  // ── disconnect cleanup ──
  socket.on('disconnect', (reason) => {
    console.log(`[socket] disconnected ${socket.id} — ${reason}`);
    for (const [code, session] of sessions.entries()) {
      const player = session.players.find(p => p.socketId === socket.id);
      if (!player) continue;

      const { index: playerIndex } = player;

      // 60s grace window — player may reconnect via session:rejoin
      const timer = setTimeout(() => {
        session.players = session.players.filter(p => p.index !== playerIndex);
        session.disconnectTimers.delete(playerIndex);

        if (session.players.length === 0) {
          if (session.timerInterval) clearInterval(session.timerInterval);
          for (const d of session.activeDialogues.values()) {
            if (d.situationTimer) clearTimeout(d.situationTimer);
            if (d.chatTimer) clearTimeout(d.chatTimer);
          }
          sessions.delete(code);
          console.log(`[session] ${code} — supprimée (vide)`);
        } else {
          io.to(code).emit(EV.SESSION_PLAYER_DISCONNECTED, { playerIndex });
          console.log(`[session] ${code} — joueur ${playerIndex} retiré après 60s`);
        }
      }, 60_000);

      session.disconnectTimers.set(playerIndex, timer);
      console.log(`[session] ${code} — joueur ${playerIndex} déconnecté, timer 60s`);
      break;
    }
  });
});

// ── Start ──────────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`\n✓ Serveur démarré sur http://localhost:${PORT}`);
  console.log(`  GET  /health`);
  console.log(`  POST /assemble`);
  console.log(`  Socket.io prêt\n`);
});
