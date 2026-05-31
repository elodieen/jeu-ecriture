import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getSocket } from '../services/socket';
import { navigateTo } from '../services/navigation';
import type { RootStackParamList } from '../data/navigationTypes';

// ── Types ─────────────────────────────────────────────────────────────────

export interface RoueContrainte {
  variantIndex: number;
  texte: string;
  roueNumber: 1 | 2 | 3;
}

export interface RoueNotification {
  type: 'FAILLE' | 'MOTIVATION' | 'SECRET';
  texte: string;
  roueNumber: 1 | 2 | 3;
}

interface GameState {
  sessionCode: string | null;
  playerCount: number;
  myPlayerIndex: number;
  myCharacter: string | null;
  allCharacters: Map<number, string>;
  currentPhase: number;
  timer: number | null;
  roueContrainte: RoueContrainte | null;
  roueNotification: RoueNotification | null;
  disconnectedPlayerIndex: number | null;
  historiqueAssemblages: Record<number, string>;
  historiqueContraintes: Record<number, string>;
}

interface GameContextValue extends GameState {
  isCreator: boolean;
  setSession: (code: string, count: number, index: number) => void;
  setMyCharacter: (character: string) => void;
  setCurrentPhase: (phase: number) => void;
  setTimer: (seconds: number | null) => void;
  addHistorique: (temps: number, histoire: string) => void;
  historiqueContraintes: Record<number, string>;
}

const GameContext = createContext<GameContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [myPlayerIndex, setMyPlayerIndex] = useState(0);
  const [myCharacter, setMyCharacter] = useState<string | null>(null);
  const [allCharacters, setAllCharacters] = useState<Map<number, string>>(new Map());
  const [currentPhase, setCurrentPhase] = useState(0);
  const [timer, setTimer] = useState<number | null>(null);
  const [roueContrainte, setRoueContrainte] = useState<RoueContrainte | null>(null);
  const [roueNotification, setRoueNotification] = useState<RoueNotification | null>(null);
  const [disconnectedPlayerIndex, setDisconnectedPlayerIndex] = useState<number | null>(null);
  const [historiqueAssemblages, setHistoriqueAssemblages] = useState<Record<number, string>>({});
  const [historiqueContraintes, setHistoriqueContraintes] = useState<Record<number, string>>({});

  // Stable refs so socket handlers never capture stale state
  const myPlayerIndexRef = useRef(0);
  const sessionCodeRef = useRef<string | null>(null);
  useEffect(() => {
    myPlayerIndexRef.current = myPlayerIndex;
  }, [myPlayerIndex]);
  useEffect(() => {
    sessionCodeRef.current = sessionCode;
  }, [sessionCode]);

  function setSession(code: string, count: number, index: number) {
    setSessionCode(code);
    setPlayerCount(count);
    setMyPlayerIndex(index);
    myPlayerIndexRef.current = index; // sync immediately
  }

  // Listen to server-driven events for the lifetime of the app
  useEffect(() => {
    const socket = getSocket();

    function onNavigateTo({
      screen,
      params = {},
    }: {
      screen: string;
      params?: Record<string, unknown>;
    }) {
      // Reset timer state when entering a new writing phase so stale data
      // from the previous round doesn't trigger the expired popup on mount.
      if (screen === 'Ecriture') {
        setTimer(null);
      }
      // Always inject isCreator so screens don't need it in event payload
      const enriched = { isCreator: myPlayerIndexRef.current === 0, ...params };
      navigateTo(screen as keyof RootStackParamList, enriched as never);
    }

    function onCharacterTaken({ characterId, playerIndex }: { characterId: string; playerIndex: number }) {
      setAllCharacters(prev => { const m = new Map(prev); m.set(playerIndex, characterId); return m; });
      if (playerIndex === myPlayerIndexRef.current) setMyCharacter(characterId);
    }

    function onWritingStart({ secondsLeft }: { secondsLeft: number }) {
      console.log('[GameContext] writing:start', secondsLeft);
      setTimer(secondsLeft);
    }
    function onTimerTick({ secondsLeft }: { secondsLeft: number }) {
      console.log('[GameContext] timer:tick', secondsLeft);
      setTimer(secondsLeft);
    }
    function onTimerExpired() {
      console.log('[GameContext] timer:expired');
      setTimer(0);
    }
    function onRoueContrainte(data: RoueContrainte) {
      console.log('[GameContext] roue:contrainte roue', data.roueNumber, 'variant', data.variantIndex);
      setRoueContrainte(data);
      // roue N précède le temps N+1
      setHistoriqueContraintes(prev => ({ ...prev, [data.roueNumber + 1]: data.texte }));
    }
    function onRoueNotification(data: RoueNotification) {
      console.log('[GameContext] roue:notification', data.type, 'roue', data.roueNumber);
      setRoueNotification(data);
    }

    function onPlayerDisconnected({ playerIndex }: { playerIndex: number }) {
      console.log('[GameContext] session:player_disconnected', playerIndex);
      setDisconnectedPlayerIndex(playerIndex);
    }

    function onAiDone({ histoire, temps }: { histoire: string; temps: number }) {
      console.log('[GameContext] ai:done — temps=', temps, '| début histoire:', histoire.slice(0, 60));
      setHistoriqueAssemblages(prev => ({ ...prev, [temps]: histoire }));
    }

    function onGameStateSync({
      currentScreen, params, secondsLeft, sessionCode: code, playerCount,
      myCharacterId, allCharacters: allCharsArr, currentTemps,
    }: {
      currentScreen: string;
      params: Record<string, unknown>;
      secondsLeft: number;
      sessionCode: string;
      playerCount: number;
      myCharacterId: string | null;
      allCharacters: Array<{ playerIndex: number; characterId: string }>;
      currentTemps: number;
    }) {
      console.log('[GameContext] game:state_sync →', currentScreen);
      setSessionCode(code);
      setPlayerCount(playerCount);
      if (myCharacterId) setMyCharacter(myCharacterId);
      const newMap = new Map<number, string>();
      for (const { playerIndex: idx, characterId } of allCharsArr) newMap.set(idx, characterId);
      setAllCharacters(newMap);
      setCurrentPhase(currentTemps);
      if (secondsLeft > 0) setTimer(secondsLeft);
      const enriched = { isCreator: myPlayerIndexRef.current === 0, ...params };
      navigateTo(currentScreen as keyof RootStackParamList, enriched as never);
    }

    function onConnect() {
      const code = sessionCodeRef.current;
      if (!code) return;
      console.log('[GameContext] reconnecté — session:rejoin', code, myPlayerIndexRef.current);
      socket.emit('session:rejoin', { code, playerIndex: myPlayerIndexRef.current });
    }

    socket.on('game:navigateTo', onNavigateTo);
    socket.on('character:taken', onCharacterTaken);
    socket.on('writing:start', onWritingStart);
    socket.on('timer:tick', onTimerTick);
    socket.on('timer:expired', onTimerExpired);
    socket.on('roue:contrainte', onRoueContrainte);
    socket.on('roue:notification', onRoueNotification);
    socket.on('session:player_disconnected', onPlayerDisconnected);
    socket.on('ai:done', onAiDone);
    socket.on('game:state_sync', onGameStateSync);
    socket.on('connect', onConnect);
    return () => {
      socket.off('game:navigateTo', onNavigateTo);
      socket.off('character:taken', onCharacterTaken);
      socket.off('writing:start', onWritingStart);
      socket.off('timer:tick', onTimerTick);
      socket.off('timer:expired', onTimerExpired);
      socket.off('roue:contrainte', onRoueContrainte);
      socket.off('roue:notification', onRoueNotification);
      socket.off('session:player_disconnected', onPlayerDisconnected);
      socket.off('ai:done', onAiDone);
      socket.off('game:state_sync', onGameStateSync);
      socket.off('connect', onConnect);
    };
  }, []);

  const value: GameContextValue = {
    sessionCode,
    playerCount,
    myPlayerIndex,
    isCreator: myPlayerIndex === 0,
    myCharacter,
    allCharacters,
    currentPhase,
    timer,
    roueContrainte,
    roueNotification,
    disconnectedPlayerIndex,
    historiqueAssemblages,
    historiqueContraintes,
    setSession,
    setMyCharacter: (c) => setMyCharacter(c),
    setCurrentPhase: (p) => setCurrentPhase(p),
    setTimer: (t) => setTimer(t),
    addHistorique: (temps, histoire) =>
      setHistoriqueAssemblages(prev => ({ ...prev, [temps]: histoire })),
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>');
  return ctx;
}
