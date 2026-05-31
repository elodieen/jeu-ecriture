import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, TextInput,
  SafeAreaView, ScrollView, KeyboardAvoidingView, Platform,
  Modal, Pressable, Animated, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../data/navigationTypes';
import { derniereSaison } from '../data/scenarios/derniere-saison';
import { useGame } from '../contexts/GameContext';
import { getSocket } from '../services/socket';
import { EV } from '../shared/events';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Ecriture'>;
type Route = RouteProp<RootStackParamList, 'Ecriture'>;
type Tab = 'fiche' | 'relire' | 'notif';
type DialogueState = 'idle' | 'selecting' | 'waiting_sent' | 'waiting' | 'phase1' | 'phase2';

function formatTime(s: number): string {
  const sec = Math.max(0, s);
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}

export default function EcritureScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { temps, isCreator } = route.params;
  const { timer, myCharacter: myCharId, myPlayerIndex, allCharacters, roueNotification, disconnectedPlayerIndex, historiqueAssemblages } = useGame();

  const myChar = derniereSaison.characters.find(c => c.id === (myCharId ?? ''))
    ?? derniereSaison.characters[0]!;

  const notifRoue = temps > 1 ? (temps - 1) as 1 | 2 | 3 : null;
  const rouePrecedente = notifRoue
    ? derniereSaison.roues.find(r => r.number === notifRoue) ?? null
    : null;

  // ── Writing ──
  const [tab, setTab]         = useState<Tab>(temps === 1 ? 'fiche' : 'notif');
  const [texte, setTexte]     = useState('');
  // localBonus: +5 min granted locally (server-side +5 min is a future feature)
  const [localBonus, setLocalBonus] = useState(0);
  const secondes = timer !== null ? timer + localBonus : null;
  const inputRef = useRef<TextInput>(null);

  // ── Dictation ──
  const [dictating, setDictating]     = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<unknown>(null);
  const [interimText, setInterimText] = useState('');

  // ── +5 min ──
  const [plusMinUsed, setPlusMinUsed]       = useState(false);
  const [plusMinConfirm, setPlusMinConfirm] = useState(false);

  // ── Toast ──
  type Toast = { message: string; urgent: boolean } | null;
  const [toast, setToast] = useState<Toast>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Popups ──
  const [popupCharId, setPopupCharId]               = useState<string | null>(null);
  const [expiredPopupVisible, setExpiredPopupVisible] = useState(false);

  // ── Dialogue ──
  const [dialogueUsed, setDialogueUsed]   = useState(false);
  const [dialogueState, setDialogueState] = useState<DialogueState>('idle');
  const [dialogueTarget, setDialogueTarget] = useState<string | null>(null);
  const [dialogueOtherCharId, setDialogueOtherCharId] = useState<string | null>(null);
  const [pendingFromCharName, setPendingFromCharName] = useState('');
  const [invitSecondes, setInvitSecondes] = useState(30);
  const [phase1Sec, setPhase1Sec]         = useState(60);
  const [phase2Sec, setPhase2Sec]         = useState(120);
  const [situationText, setSituationText] = useState('');
  const [repliques, setRepliques]         = useState<{ qui: 'moi' | 'autre'; texte: string }[]>([]);
  const [replicueInput, setReplicueInput] = useState('');
  const [tourAMoi, setTourAMoi]           = useState(true);

  const chatScrollRef = useRef<ScrollView>(null);
  const pulseAnim     = useRef(new Animated.Value(1)).current;

  // Debounce situation text sync to server
  const situationDebounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function handleSituationChange(text: string) {
    setSituationText(text);
    clearTimeout(situationDebounce.current);
    situationDebounce.current = setTimeout(() => {
      getSocket().emit('dialogue:situation:update', { text });
    }, 300);
  }

  // Stable refs for use inside effects
  const repliquesRef       = useRef(repliques);
  const dialogueTargetRef  = useRef(dialogueTarget);
  const situationTextRef   = useRef(situationText);
  useEffect(() => { repliquesRef.current = repliques; }, [repliques]);
  useEffect(() => { dialogueTargetRef.current = dialogueTarget; }, [dialogueTarget]);
  useEffect(() => { situationTextRef.current = situationText; }, [situationText]);

  // ── Derived ──
  // secondes is null until writing:start arrives — keeps expired popup from
  // firing on mount due to stale timer:expired from the previous round.
  const expired             = secondes !== null && secondes <= 0;
  const timerColor          = secondes !== null && secondes <= 120 ? '#FF4444' : secondes !== null && secondes <= 300 ? '#FF9900' : '#FFFFFF';
  const dialogueWindowOpen  = secondes !== null && secondes > 0;
  const dialogueBtnActive   = dialogueWindowOpen && !dialogueUsed && dialogueState === 'idle';
  const dialogueTargetName  = derniereSaison.characters.find(c => c.id === (dialogueOtherCharId ?? dialogueTarget ?? ''))?.name ?? '';

  useEffect(() => {
    if (secondes === null) return; // timer not started yet — ignore stale state
    if (secondes === 300) showToast('Plus que 5 minutes !', false);
    else if (secondes === 120) showToast('Plus que 2 minutes !', true);
    else if (secondes === 60)  showToast("Plus qu'une minute !", true);
    else if (secondes === 0)   setExpiredPopupVisible(true);
  }, [secondes]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // ── Pulse when dialogue window open ──
  useEffect(() => {
    if (!dialogueBtnActive) { pulseAnim.setValue(1); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.45, duration: 700, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [dialogueBtnActive]);

  // ── Invitation countdown ──
  useEffect(() => {
    if (dialogueState !== 'waiting' && dialogueState !== 'waiting_sent') return;
    if (invitSecondes <= 0) {
      if (dialogueState === 'waiting') {
        // Invitee didn't respond in time — auto-refuse
        handleRefuseDialogue();
      } else {
        // Inviter timed out locally — server will send dialogue:refused
        setDialogueState('idle');
        setDialogueTarget(null);
      }
      return;
    }
    const id = setInterval(() => setInvitSecondes(s => s - 1), 1000);
    return () => clearInterval(id);
  }, [invitSecondes, dialogueState]);

  // ── Phase 1 timer ──
  useEffect(() => {
    if (dialogueState !== 'phase1') return;
    if (phase1Sec <= 0) {
      setDialogueState('phase2');
      setPhase2Sec(120);
      return;
    }
    const id = setInterval(() => setPhase1Sec(s => s - 1), 1000);
    return () => clearInterval(id);
  }, [phase1Sec, dialogueState]);

  // ── Phase 2 timer ──
  useEffect(() => {
    if (dialogueState !== 'phase2') return;
    if (phase2Sec <= 0) { handleTerminerDialogue(); return; }
    const id = setInterval(() => setPhase2Sec(s => s - 1), 1000);
    return () => clearInterval(id);
  }, [phase2Sec, dialogueState]);

  // ── Socket listeners — dialogue temps réel ──
  useEffect(() => {
    const socket = getSocket();

    socket.on('dialogue:invitation', ({ fromCharacterId, fromCharacterName }: { fromCharacterId: string; fromCharacterName: string }) => {
      setPendingFromCharName(fromCharacterName);
      setDialogueTarget(fromCharacterId);
      setInvitSecondes(30);
      setDialogueState('waiting');
    });

    socket.on('dialogue:accepted', ({ otherCharacterId, myTurn }: { otherCharacterId: string; myTurn: boolean }) => {
      setDialogueOtherCharId(otherCharacterId);
      setTourAMoi(myTurn);
      setSituationText('');
      setRepliques([]);
      setReplicueInput('');
      setPhase1Sec(60);
      setDialogueState('phase1');
    });

    socket.on('dialogue:refused', ({ reason }: { reason: string }) => {
      const name = derniereSaison.characters.find(c => c.id === dialogueTargetRef.current)?.name ?? '';
      showToast(reason === 'declined' ? `${name} a refusé l'invitation.` : reason === 'busy' ? `${name} est déjà en dialogue.` : `${name} n'a pas répondu.`, false);
      setDialogueState('idle');
      setDialogueTarget(null);
    });

    socket.on('dialogue:situation:sync', ({ text }: { text: string }) => {
      setSituationText(text);
    });

    socket.on('dialogue:chat:start', ({ myTurn }: { myTurn: boolean }) => {
      setTourAMoi(myTurn);
      setPhase2Sec(120);
      setDialogueState('phase2');
    });

    socket.on('dialogue:replique:received', ({ text, characterId }: { text: string; characterId: string }) => {
      const qui: 'moi' | 'autre' = characterId === myCharId ? 'moi' : 'autre';
      setRepliques(prev => [...prev, { qui, texte: text }]);
      setTourAMoi(qui === 'autre');
    });

    socket.on('dialogue:done', ({ situation, repliques: reps }: { situation: string; repliques: Array<{ characterId: string; text: string }> }) => {
      const otherCharId = dialogueOtherCharId ?? dialogueTargetRef.current ?? '';
      const otherName = derniereSaison.characters.find(c => c.id === otherCharId)?.name ?? 'Autre';
      const parts: string[] = [];
      if (situation) parts.push(`[Situation : ${situation}]`);
      if (reps.length > 0) {
        parts.push(reps.map(r => {
          const n = r.characterId === myCharId ? myChar.name : otherName;
          return `— ${n} : ${r.text}`;
        }).join('\n'));
      }
      if (parts.length > 0) {
        const insert = parts.join('\n');
        setTexte(prev => prev + (prev.length > 0 && !prev.endsWith('\n') ? '\n\n' : '') + insert);
      }
      setDialogueUsed(true);
      setDialogueState('idle');
      setDialogueTarget(null);
      setDialogueOtherCharId(null);
    });

    return () => {
      socket.off('dialogue:invitation');
      socket.off('dialogue:accepted');
      socket.off('dialogue:refused');
      socket.off('dialogue:situation:sync');
      socket.off('dialogue:chat:start');
      socket.off('dialogue:replique:received');
      socket.off('dialogue:done');
    };
  }, [myCharId, myChar.name]);

  // ── Auto-scroll chat ──
  useEffect(() => {
    if (dialogueState === 'phase2')
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [repliques, dialogueState]);

  // ── Helpers ──
  function showToast(message: string, urgent: boolean) {
    clearTimeout(toastTimer.current);
    setToast({ message, urgent });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

  function handleTerminerDialogue() {
    getSocket().emit('dialogue:terminer');
  }

  // ── Handlers: timer ──
  function handlePlusMin() { if (!plusMinUsed) setPlusMinConfirm(true); }
  function handleConfirmPlusMin() {
    setPlusMinConfirm(false); setPlusMinUsed(true);
    setLocalBonus(b => b + 5 * 60); setTab('notif');
  }
  function handleExpiredPlusMin() {
    setPlusMinUsed(true); setLocalBonus(b => b + 5 * 60);
    setExpiredPopupVisible(false); setTab('notif');
  }
  function handleExpiredEnvoyer() {
    setExpiredPopupVisible(false);
    navigation.navigate('ChargementIA', { contribution: texte.trim(), temps, isCreator });
  }

  // ── Handlers: dialogue ──
  function handleOpenDialogue() { if (dialogueBtnActive) setDialogueState('selecting'); }
  function handleInvite(charId: string, targetPlayerIndex: number) {
    setDialogueTarget(charId);
    setInvitSecondes(30);
    setDialogueState('waiting_sent');
    getSocket().emit('dialogue:invite', { targetPlayerIndex });
  }
  function handleAcceptDialogue() {
    getSocket().emit('dialogue:respond', { accept: true });
    setDialogueState('phase1'); // optimistic — server confirms via dialogue:accepted
  }
  function handleRefuseDialogue() {
    getSocket().emit('dialogue:respond', { accept: false });
    setDialogueState('idle');
    setDialogueTarget(null);
  }
  function handlePhase1Ready() { getSocket().emit('dialogue:situation:ready'); }
  function handleSendReplique() {
    const text = replicueInput.trim(); if (!text) return;
    getSocket().emit('dialogue:replique', { text });
    setReplicueInput('');
  }

  // ── Dictation ──
  function toggleDictation() {
    const SR = Platform.OS === 'web' && typeof window !== 'undefined'
      ? ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition)
      : null;
    if (!SR) {
      setSpeechError('Dictée non disponible sur ce navigateur.');
      setTimeout(() => setSpeechError(null), 3000); return;
    }
    if (dictating) { (recognitionRef.current as any)?.stop(); return; }
    const recognition = new SR();
    recognition.lang = 'fr-FR'; recognition.continuous = true; recognition.interimResults = true;
    recognition.onresult = (e: any) => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t; else interim += t;
      }
      if (final) {
        setTexte(prev => {
          const sep = prev && !prev.endsWith(' ') && !prev.endsWith('\n') ? ' ' : '';
          return prev + sep + final.trim();
        });
        setInterimText('');
      } else { setInterimText(interim); }
    };
    recognition.onerror = (e: any) => {
      if (e.error === 'not-allowed') {
        setSpeechError('Accès au microphone refusé.');
        setTimeout(() => setSpeechError(null), 3000);
      }
      setInterimText(''); setDictating(false);
    };
    recognition.onend = () => { setInterimText(''); setDictating(false); };
    recognitionRef.current = recognition; recognition.start(); setDictating(true);
  }

  const popupChar     = popupCharId ? derniereSaison.characters.find(c => c.id === popupCharId) ?? null : null;
  const popupRelation = popupCharId ? myChar.relations.find(r => r.character === popupCharId) ?? null : null;

  const notifHasContent = !!(roueNotification || plusMinUsed);

  return (
    <SafeAreaView style={styles.safe}>
      {disconnectedPlayerIndex !== null && (
        <View style={styles.disconnectBanner}>
          <Text style={styles.disconnectBannerText}>
            Joueur {disconnectedPlayerIndex + 1} déconnecté
          </Text>
        </View>
      )}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.container}>

          {/* ── Header ── */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTuJoues}>Tu joues</Text>
              <Text style={styles.headerCharacterName}>{myChar.name}</Text>
              <Text style={styles.headerTempsLabel}>Temps {temps}/4</Text>
              {rouePrecedente
                ? <Text style={styles.headerContrainte} numberOfLines={1}>{rouePrecedente.subtitle}</Text>
                : null}
            </View>
            <View style={styles.timerBlock}>
              {secondes === null ? (
                <Text style={[styles.timerText, { color: '#333333' }]}>15:00</Text>
              ) : expired ? (
                <Text style={styles.timerExpiredLabel}>⏰ Temps{'\n'}écoulé</Text>
              ) : (
                <>
                  <Text style={[styles.timerText, { color: timerColor }]}>{formatTime(secondes)}</Text>
                  <Text style={[styles.timerStatus, secondes <= 300 && { color: timerColor }]}>
                    {secondes <= 120 ? 'urgent' : secondes <= 300 ? 'bientôt' : 'en cours'}
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* ── Bannière attente démarrage ── */}
          {secondes === null && (
            <View style={styles.waitingBanner}>
              <ActivityIndicator color="#555555" size="small" />
              <Text style={styles.waitingBannerText}>En attente des autres joueurs…</Text>
            </View>
          )}

          {/* ── Toast ── */}
          {toast && (
            <View style={[styles.toastBanner, toast.urgent && styles.toastBannerUrgent]}>
              <Text style={[styles.toastText, toast.urgent && styles.toastTextUrgent]}>{toast.message}</Text>
            </View>
          )}

          {/* ── Tabs ── */}
          <View style={styles.tabs}>
            {(['fiche', 'relire', 'notif'] as Tab[]).map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.tab, tab === t && styles.tabActive]}
                onPress={() => setTab(t)}
              >
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t === 'fiche' ? 'Ma fiche' : t === 'relire' ? 'Relire' : 'Notif'}
                </Text>
                {t === 'notif' && <View style={styles.notifBadge} />}
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Tab: Fiche ── */}
          {tab === 'fiche' && (
            <View style={styles.fichePanel}>
              <Text style={styles.ficheName}>{myChar.name}</Text>
              <Text style={styles.ficheObjectif} numberOfLines={2}>{myChar.objectif}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {myChar.relations.map((rel, i) => {
                  const other = derniereSaison.characters.find(c => c.id === rel.character);
                  return (
                    <TouchableOpacity key={i} style={styles.ficheTag} onPress={() => setPopupCharId(rel.character)}>
                      <Text style={styles.ficheTagText}>{other?.name ?? rel.character}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ── Tab: Relire ── */}
          {tab === 'relire' && (() => {
            const prevTemps = ([1, 2, 3] as const).filter(t => t < temps && !!historiqueAssemblages[t]);
            if (prevTemps.length === 0) {
              return (
                <View style={styles.relirePanel}>
                  <Text style={styles.relirePlaceholder}>
                    C'est le début de l'histoire — rien à relire encore.
                  </Text>
                </View>
              );
            }
            return (
              <ScrollView
                style={styles.relireScroll}
                contentContainerStyle={styles.relireContent}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                {prevTemps.map(t => (
                  <View key={t}>
                    <Text style={styles.relireTempsTitle}>— Temps {t} —</Text>
                    <Text style={styles.relireTexte}>{historiqueAssemblages[t]}</Text>
                  </View>
                ))}
              </ScrollView>
            );
          })()}

          {/* ── Tab: Notif ── */}
          {tab === 'notif' && (
            <ScrollView style={styles.notifScroll} contentContainerStyle={styles.notifContent}>
              {roueNotification && (
                <View style={styles.notifCard}>
                  <Text style={styles.notifType}>Temps {roueNotification.roueNumber} · {roueNotification.type}</Text>
                  <Text style={styles.notifText}>{roueNotification.texte}</Text>
                </View>
              )}

              {plusMinUsed && (
                <View style={styles.notifCardPlus}>
                  <Text style={styles.notifTypePlus}>+5 min accordées</Text>
                  <Text style={styles.notifTextApplied}>✓ 5 minutes supplémentaires ajoutées au timer.</Text>
                </View>
              )}

              {!notifHasContent && (
                <View style={styles.relirePanel}>
                  <Text style={styles.relirePlaceholder}>Aucune notification pour ce temps.</Text>
                </View>
              )}
            </ScrollView>
          )}

          {/* ── Zone d'écriture ── */}
          <View style={styles.writeArea}>
            <TextInput
              ref={inputRef}
              style={styles.writeInput}
              value={texte}
              onChangeText={setTexte}
              multiline
              textAlignVertical="top"
              placeholder="Écris ici les actions et dialogues de ton personnage..."
              placeholderTextColor="#333333"
              autoCorrect
              scrollEnabled
            />
            {interimText !== '' && <Text style={styles.interimText}>{interimText}</Text>}
          </View>

          {/* ── Toolbar ── */}
          <View style={styles.toolbar}>
            <View style={styles.toolbarRow1}>

              <TouchableOpacity
                style={[styles.toolBtn, dictating && styles.toolBtnDictating]}
                onPress={toggleDictation}
              >
                <Text style={[styles.toolBtnText, dictating && styles.toolBtnTextDictating]}>
                  {dictating ? '⏹ En écoute...' : '🎙 Dicter'}
                </Text>
              </TouchableOpacity>

              <Animated.View style={{ flex: 1, opacity: pulseAnim }}>
                <TouchableOpacity
                  style={[
                    styles.toolBtn,
                    dialogueBtnActive && styles.toolBtnDialogueActive,
                    dialogueUsed   && styles.toolBtnDialogueDone,
                  ]}
                  onPress={handleOpenDialogue}
                  disabled={!dialogueBtnActive}
                  activeOpacity={0.75}
                >
                  <Text style={[
                    styles.toolBtnText,
                    dialogueBtnActive && styles.toolBtnTextDialogueActive,
                    dialogueUsed   && styles.toolBtnTextDialogueDone,
                  ]}>
                    {dialogueUsed        ? '✓ Dialogue utilisé' :
                     dialogueState !== 'idle' ? '💬 En cours...' :
                     '💬 Dialogue'}
                  </Text>
                </TouchableOpacity>
              </Animated.View>

            </View>

            {speechError !== null && <Text style={styles.speechErrorText}>{speechError}</Text>}

            <View style={styles.toolbarRow2}>
              <TouchableOpacity
                style={[styles.btnPlus, plusMinUsed && styles.btnPlusDone]}
                onPress={handlePlusMin}
                disabled={plusMinUsed}
                activeOpacity={0.75}
              >
                <Text style={[styles.btnPlusText, plusMinUsed && styles.btnPlusTextDone]}>
                  {plusMinUsed ? '✓ +5 min\nenvoyé' : '+5 min'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnEnvoyer, texte.trim().length === 0 && styles.btnEnvoyerDisabled]}
                onPress={() => navigation.navigate('ChargementIA', { contribution: texte.trim(), temps, isCreator })}
                disabled={texte.trim().length === 0}
              >
                <Text style={styles.btnEnvoyerText}>Envoyer →</Text>
              </TouchableOpacity>
            </View>
          </View>

        </View>
      </KeyboardAvoidingView>

      {/* ══════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════ */}

      {/* Temps écoulé */}
      <Modal visible={expiredPopupVisible} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.expiredIcon}>⏰</Text>
            <Text style={styles.expiredTitle}>Temps écoulé !</Text>
            <Text style={styles.expiredSubtitle}>Que veux-tu faire ?</Text>
            <TouchableOpacity
              style={[styles.expiredBtnPlusMin, plusMinUsed && styles.expiredBtnPlusMinUsed]}
              onPress={!plusMinUsed ? handleExpiredPlusMin : undefined}
              disabled={plusMinUsed}
              activeOpacity={0.75}
            >
              {plusMinUsed
                ? <Text style={styles.expiredBtnPlusMinTextUsed}>Déjà utilisé — une seule fois par partie</Text>
                : <Text style={styles.expiredBtnPlusMinText}>+5 min — utilisable une seule fois</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.expiredBtnEnvoyer} onPress={handleExpiredEnvoyer} activeOpacity={0.75}>
              <Text style={styles.expiredBtnEnvoyerText}>Envoyer quand même →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Confirmation +5 min */}
      <Modal visible={plusMinConfirm} transparent animationType="fade" onRequestClose={() => setPlusMinConfirm(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPlusMinConfirm(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.confirmTitle}>Demander +5 minutes ?</Text>
            <View style={styles.confirmWarningBox}>
              <Text style={styles.confirmWarningText}>Attention : tu ne peux utiliser cette option qu'une seule fois.</Text>
            </View>
            <Text style={styles.confirmBody}>
              5 minutes s'ajoutent immédiatement à ton timer et une notification est envoyée aux autres joueurs.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setPlusMinConfirm(false)}>
                <Text style={styles.confirmCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmSend} onPress={handleConfirmPlusMin}>
                <Text style={styles.confirmSendText}>Confirmer +5 min</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Popup personnage */}
      <Modal visible={popupCharId !== null} transparent animationType="fade" onRequestClose={() => setPopupCharId(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPopupCharId(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {popupChar && (
              <>
                <Text style={styles.popupName}>{popupChar.name}</Text>
                <Text style={styles.popupTagline}>{popupChar.tagline}</Text>
                <View style={styles.popupDivider} />
                <Text style={styles.popupSectionLabel}>Ce que tu sais</Text>
                <Text style={styles.popupPublic}>{popupChar.facePublique}</Text>
                {popupRelation && (
                  <>
                    <View style={styles.popupDivider} />
                    <Text style={styles.popupSectionLabel}>Ta relation</Text>
                    <Text style={styles.popupRelLabel}>{popupRelation.label}</Text>
                    <Text style={styles.popupRelDesc}>{popupRelation.description}</Text>
                  </>
                )}
                <TouchableOpacity style={styles.popupCloseBtn} onPress={() => setPopupCharId(null)}>
                  <Text style={styles.popupCloseBtnText}>Fermer</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Invitation dialogue (bloquant, plein écran) */}
      <Modal
        visible={dialogueState === 'waiting'}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.invitModalBackdrop}>
          <View style={styles.invitModalCard}>
            <Text style={styles.invitEyebrow}>Dialogue · invitation</Text>
            <Text style={styles.invitModalTitle}>
              {pendingFromCharName || myChar.name} vous invite{'\n'}à un dialogue
            </Text>
            <View style={styles.invitCountdownCircle}>
              <Text style={styles.invitCountdownNum}>{invitSecondes}</Text>
            </View>
            <Text style={styles.invitSubtitle}>
              {invitSecondes} seconde{invitSecondes !== 1 ? 's' : ''} pour répondre
            </Text>
            <View style={styles.invitActions}>
              <TouchableOpacity style={styles.invitBtnRefuse} onPress={handleRefuseDialogue}>
                <Text style={styles.invitBtnRefuseText}>Refuser ✗</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.invitBtnAccept} onPress={handleAcceptDialogue}>
                <Text style={styles.invitBtnAcceptText}>Accepter ✓</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Inviteur — en attente de réponse */}
      <Modal visible={dialogueState === 'waiting_sent'} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.invitModalBackdrop}>
          <View style={styles.invitModalCard}>
            <Text style={styles.invitEyebrow}>Dialogue · invitation envoyée</Text>
            <Text style={styles.invitModalTitle}>
              En attente de{'\n'}{dialogueTargetName || '…'}
            </Text>
            <View style={styles.invitCountdownCircle}>
              <Text style={styles.invitCountdownNum}>{invitSecondes}</Text>
            </View>
            <Text style={styles.invitSubtitle}>{invitSecondes} seconde{invitSecondes !== 1 ? 's' : ''} restante{invitSecondes !== 1 ? 's' : ''}</Text>
          </View>
        </View>
      </Modal>

      {/* Sélection joueur */}
      <Modal
        visible={dialogueState === 'selecting'}
        transparent
        animationType="fade"
        onRequestClose={() => setDialogueState('idle')}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setDialogueState('idle')}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.selectTitle}>Choisir un joueur</Text>
            <Text style={styles.selectSubtitle}>Le dialogue dure 3 minutes au total.</Text>
            <View style={styles.selectDivider} />
            {[...allCharacters.entries()]
              .filter(([idx]) => idx !== myPlayerIndex)
              .map(([idx, charId], i, arr) => {
                const charData = derniereSaison.characters.find(c => c.id === charId);
                return (
                  <View key={charId}>
                    <View style={styles.selectPlayerRow}>
                      <Text style={styles.selectPlayerName}>{charData?.name ?? charId}</Text>
                      <TouchableOpacity
                        style={styles.selectInviteBtn}
                        onPress={() => handleInvite(charId, idx)}
                      >
                        <Text style={styles.selectInviteBtnText}>Inviter</Text>
                      </TouchableOpacity>
                    </View>
                    {i < arr.length - 1 && <View style={styles.selectLineSep} />}
                  </View>
                );
              })}
            <View style={styles.selectDivider} />
            <TouchableOpacity style={styles.selectCancelBtn} onPress={() => setDialogueState('idle')}>
              <Text style={styles.selectCancelText}>Annuler</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ══ Overlay dialogue (phase 1 + 2) ══ */}
      <Modal
        visible={dialogueState === 'phase1' || dialogueState === 'phase2'}
        transparent={false}
        animationType="slide"
        onRequestClose={() => {}}
      >
        <SafeAreaView style={styles.dialogueSafe}>

          {/* ─── Phase 1 ─── */}
          {dialogueState === 'phase1' && (
            <>
              <View style={styles.dialogueHeader}>
                <Text style={styles.dialoguePhaseLabel}>PHASE 1 · 1 MINUTE</Text>
                <Text style={styles.dialogueTitle}>Définissez la situation</Text>
                <Text style={styles.dialogueSubtitle}>{myChar.name} + {dialogueTargetName}</Text>
                <Text style={styles.dialogueTimer}>{formatTime(phase1Sec)}</Text>
              </View>
              <View style={styles.situationArea}>
                <TextInput
                  style={styles.situationInput}
                  value={situationText}
                  onChangeText={handleSituationChange}
                  multiline
                  textAlignVertical="top"
                  placeholder="Où êtes-vous ? Que s'est-il passé juste avant ? Décrivez la situation ensemble..."
                  placeholderTextColor="#444444"
                  autoFocus
                />
              </View>
              <View style={styles.dialogueFooter}>
                <TouchableOpacity style={styles.dialogueReadyBtn} onPress={handlePhase1Ready}>
                  <Text style={styles.dialogueReadyBtnText}>On est prêts →</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ─── Phase 2 ─── */}
          {dialogueState === 'phase2' && (
            <>
              <View style={styles.dialogueHeader}>
                <Text style={styles.dialoguePhaseLabel}>PHASE 2 · 2 MINUTES</Text>
                <Text style={[styles.dialogueTourLabel, !tourAMoi && styles.dialogueTourLabelOther]}>
                  {tourAMoi ? `${myChar.name} parle` : `${dialogueTargetName} parle`}
                </Text>
                <Text style={styles.dialogueTimer}>{formatTime(phase2Sec)}</Text>
              </View>

              <ScrollView
                ref={chatScrollRef}
                style={styles.chatScroll}
                contentContainerStyle={styles.chatContent}
              >
                {repliques.map((r, i) => (
                  <View key={i} style={[styles.chatLine, r.qui === 'moi' ? styles.chatLineMe : styles.chatLineOther]}>
                    <Text style={[styles.chatWho, r.qui === 'moi' ? styles.chatWhoMe : styles.chatWhoOther]}>
                      {r.qui === 'moi' ? myChar.name : dialogueTargetName}
                    </Text>
                    <Text style={styles.chatText}>{r.texte}</Text>
                  </View>
                ))}
                {!tourAMoi && (
                  <View style={styles.chatTyping}>
                    <Text style={styles.chatTypingText}>{dialogueTargetName} écrit...</Text>
                  </View>
                )}
              </ScrollView>

              <View style={styles.chatInputArea}>
                {tourAMoi ? (
                  <View style={styles.chatInputRow}>
                    <TextInput
                      style={styles.chatInput}
                      value={replicueInput}
                      onChangeText={setReplicueInput}
                      placeholder="Votre réplique..."
                      placeholderTextColor="#444444"
                      returnKeyType="send"
                      onSubmitEditing={handleSendReplique}
                      blurOnSubmit={false}
                    />
                    <TouchableOpacity
                      style={[styles.chatSendBtn, !replicueInput.trim() && styles.chatSendBtnDisabled]}
                      onPress={handleSendReplique}
                      disabled={!replicueInput.trim()}
                    >
                      <Text style={styles.chatSendBtnText}>Envoyer</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.chatWaitingRow}>
                    <Text style={styles.chatWaitingText}>En attente de {dialogueTargetName}...</Text>
                  </View>
                )}
                {repliques.length >= 2 && (
                  <TouchableOpacity style={styles.chatTerminerBtn} onPress={handleTerminerDialogue}>
                    <Text style={styles.chatTerminerText}>Terminer le dialogue →</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#111111' },
  disconnectBanner: { backgroundColor: '#7C2020', paddingVertical: 6, paddingHorizontal: 16 },
  disconnectBannerText: { color: '#FFAAAA', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  waitingBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 10, paddingHorizontal: 20,
    backgroundColor: '#161616', borderBottomWidth: 1, borderBottomColor: '#1E1E1E',
  },
  waitingBannerText: { fontSize: 14, color: '#555555' },
  flex: { flex: 1 },
  container: { flex: 1, paddingTop: 52 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 24, marginBottom: 10,
  },
  headerLeft: { flex: 1, marginRight: 16 },
  headerTuJoues: { fontSize: 11, color: '#444444', letterSpacing: 0.5, marginBottom: 2 },
  headerCharacterName: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5, marginBottom: 10 },
  headerTempsLabel: { fontSize: 11, fontWeight: '600', color: '#444444', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 5 },
  headerContrainte: { fontSize: 14, color: '#888888', fontStyle: 'italic', lineHeight: 20 },
  timerBlock: { alignItems: 'flex-end' },
  timerText: { fontSize: 28, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: 1 },
  timerExpiredLabel: { fontSize: 13, fontWeight: '700', color: '#FF4444', textAlign: 'right', lineHeight: 18 },
  timerStatus: { fontSize: 11, color: '#4ADE80', fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', textAlign: 'right' },

  // Toast
  toastBanner: {
    marginHorizontal: 24, marginBottom: 8, backgroundColor: '#2A1A00',
    borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16,
    borderWidth: 1, borderColor: '#FF9900', alignItems: 'center',
  },
  toastBannerUrgent: { backgroundColor: '#2A0000', borderColor: '#FF4444' },
  toastText: { fontSize: 14, fontWeight: '700', color: '#FF9900' },
  toastTextUrgent: { color: '#FF4444' },

  // Tabs
  tabs: { flexDirection: 'row', paddingHorizontal: 24, marginBottom: 10, gap: 4 },
  tab: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  tabActive: { backgroundColor: '#1E1E1E' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#444444' },
  tabTextActive: { color: '#FFFFFF' },
  notifBadge: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6366F1' },
  notifBadgeDialogue: { backgroundColor: '#FF9900' },

  // Fiche panel
  fichePanel: {
    marginHorizontal: 24, marginBottom: 10,
    backgroundColor: '#161616', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#1E1E1E',
  },
  ficheName: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  ficheObjectif: { fontSize: 14, color: '#666666', lineHeight: 20, marginBottom: 10 },
  ficheTag: { backgroundColor: '#222222', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 10, marginRight: 6 },
  ficheTagText: { fontSize: 11, color: '#888888', fontWeight: '600' },

  // Relire panel
  relirePanel: {
    marginHorizontal: 24, marginBottom: 10,
    backgroundColor: '#161616', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#1E1E1E',
  },
  relirePlaceholder: { fontSize: 14, color: '#444444', fontStyle: 'italic' },
  relireScroll: { maxHeight: 260, marginHorizontal: 24, marginBottom: 10 },
  relireContent: { gap: 20 },
  relireTempsTitle: {
    fontSize: 11, fontWeight: '700', color: '#444444',
    letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center',
    marginBottom: 10,
  },
  relireTexte: { fontSize: 14, color: '#BBBBBB', lineHeight: 22 },

  // Notif panel
  notifScroll: { maxHeight: 160, marginHorizontal: 24, marginBottom: 10 },
  notifContent: { gap: 8 },
  notifCard: {
    backgroundColor: '#130F1A', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#2A1E3A', borderLeftWidth: 3, borderLeftColor: '#6366F1',
  },
  notifCardPlus: {
    backgroundColor: '#0F1A13', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#1E3A22', borderLeftWidth: 3, borderLeftColor: '#4ADE80', gap: 8,
  },
  notifType: { fontSize: 11, fontWeight: '700', color: '#6366F1', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 },
  notifTypePlus: { fontSize: 11, fontWeight: '700', color: '#4ADE80', letterSpacing: 1.5, textTransform: 'uppercase' },
  notifText: { fontSize: 14, color: '#BBBBCC', lineHeight: 21 },
  notifTextApplied: { fontSize: 14, color: '#4ADE80', lineHeight: 21 },

  // Invitation popup (plein écran, bloquant)
  invitModalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center', alignItems: 'center', padding: 28,
  },
  invitModalCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: 28, width: '100%', maxWidth: 380, alignItems: 'center', gap: 12,
  },
  invitModalTitle: {
    fontSize: 22, fontWeight: '800', color: '#111111',
    textAlign: 'center', lineHeight: 30,
  },

  // Invitation card (blanche)
  invitCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#E8E8E8',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8,
  },
  invitEyebrow: { fontSize: 11, fontWeight: '700', color: '#CC4444', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },
  invitTitle: { fontSize: 16, fontWeight: '800', color: '#111111', marginBottom: 2 },
  invitSubtitle: { fontSize: 13, color: '#777777', marginBottom: 14 },
  invitCountdownCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#FFF5F5', alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 16, borderWidth: 2, borderColor: '#CC4444',
  },
  invitCountdownNum: { fontSize: 22, fontWeight: '800', color: '#CC4444' },
  invitActions: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  invitBtnRefuse: {
    flex: 1, backgroundColor: '#F5F5F5', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0',
  },
  invitBtnRefuseText: { fontSize: 14, fontWeight: '700', color: '#999999' },
  invitBtnAccept: { flex: 1, backgroundColor: '#111111', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  invitBtnAcceptText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // Write area
  writeArea: {
    flex: 1, marginHorizontal: 24, marginBottom: 10,
    backgroundColor: '#161616', borderRadius: 12,
    borderWidth: 1, borderColor: '#222222', padding: 14,
  },
  writeInput: { flex: 1, fontSize: 16, color: '#FFFFFF', lineHeight: 26, textAlignVertical: 'top', padding: 0 },
  interimText: { fontSize: 16, color: '#484848', fontStyle: 'italic', lineHeight: 26, paddingTop: 4 },

  // Toolbar
  toolbar: { paddingHorizontal: 24, paddingBottom: 28, gap: 10 },
  toolbarRow1: { flexDirection: 'row', gap: 10 },
  toolBtn: {
    flex: 1, backgroundColor: '#1A1A1A', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#252525',
  },
  toolBtnText: { fontSize: 14, color: '#666666', fontWeight: '600' },
  toolBtnDictating: { backgroundColor: '#2A0A0A', borderColor: '#6A1A1A' },
  toolBtnTextDictating: { color: '#FF4444' },
  toolBtnDialogueActive: { backgroundColor: '#0F1535', borderColor: '#3A3D8A' },
  toolBtnTextDialogueActive: { color: '#8385F5' },
  toolBtnDialogueDone: { backgroundColor: '#141414', borderColor: '#1E1E1E' },
  toolBtnTextDialogueDone: { fontSize: 11, color: '#333333' },
  toolbarRow2: { flexDirection: 'row', gap: 10 },
  btnPlus: {
    backgroundColor: '#1A1A1A', borderRadius: 10,
    paddingVertical: 14, paddingHorizontal: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#252525', minWidth: 80,
  },
  btnPlusDone: { backgroundColor: '#141414', borderColor: '#1E1E1E' },
  btnPlusText: { fontSize: 14, color: '#888888', fontWeight: '600', textAlign: 'center' },
  btnPlusTextDone: { fontSize: 11, color: '#2A4A2E', textAlign: 'center' },
  btnEnvoyer: { flex: 1, backgroundColor: '#6366F1', borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  btnEnvoyerDisabled: { opacity: 0.35 },
  btnEnvoyerText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  speechErrorText: { fontSize: 12, color: '#FF6666', textAlign: 'center', paddingVertical: 2 },

  // Modal shared
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, borderWidth: 1, borderColor: '#2A2A2A' },

  // Expired popup
  expiredIcon: { fontSize: 36, textAlign: 'center', marginBottom: 10 },
  expiredTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 4 },
  expiredSubtitle: { fontSize: 15, color: '#666666', textAlign: 'center', marginBottom: 24 },
  expiredBtnPlusMin: { backgroundColor: '#1E2A1E', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#2A4A2A' },
  expiredBtnPlusMinUsed: { backgroundColor: '#161616', borderColor: '#222222' },
  expiredBtnPlusMinText: { fontSize: 15, fontWeight: '700', color: '#4ADE80' },
  expiredBtnPlusMinTextUsed: { fontSize: 13, color: '#333333', textAlign: 'center' },
  expiredBtnEnvoyer: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  expiredBtnEnvoyerText: { fontSize: 16, fontWeight: '700', color: '#111111' },

  // Confirm +5 min
  confirmTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 14 },
  confirmWarningBox: { backgroundColor: '#1A1000', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 14, borderWidth: 1, borderColor: '#3A2800' },
  confirmWarningText: { fontSize: 13, color: '#FF9900', fontWeight: '600', lineHeight: 20 },
  confirmBody: { fontSize: 14, color: '#666666', lineHeight: 22, marginBottom: 24 },
  confirmActions: { flexDirection: 'row', gap: 10 },
  confirmCancel: { flex: 1, backgroundColor: '#222222', borderRadius: 10, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#333333' },
  confirmCancelText: { fontSize: 14, fontWeight: '600', color: '#888888' },
  confirmSend: { flex: 2, backgroundColor: '#1E2A1E', borderRadius: 10, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2A4A2A' },
  confirmSendText: { fontSize: 14, fontWeight: '700', color: '#4ADE80' },

  // Character popup
  popupName: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  popupTagline: { fontSize: 13, color: '#666666', fontStyle: 'italic', marginBottom: 16 },
  popupDivider: { height: 1, backgroundColor: '#222222', marginVertical: 14 },
  popupSectionLabel: { fontSize: 11, fontWeight: '700', color: '#444444', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  popupPublic: { fontSize: 14, color: '#AAAAAA', lineHeight: 22 },
  popupRelLabel: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', fontStyle: 'italic', marginBottom: 4 },
  popupRelDesc: { fontSize: 13, color: '#666666', lineHeight: 20 },
  popupCloseBtn: { marginTop: 20, backgroundColor: '#252525', borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333333' },
  popupCloseBtnText: { fontSize: 14, fontWeight: '600', color: '#AAAAAA' },

  // Select player popup
  selectTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  selectSubtitle: { fontSize: 13, color: '#444444', marginBottom: 4 },
  selectDivider: { height: 1, backgroundColor: '#222222', marginVertical: 12 },
  selectPlayerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  selectPlayerName: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  selectInviteBtn: { backgroundColor: '#1A2240', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1, borderColor: '#2A3A5A' },
  selectInviteBtnText: { fontSize: 13, fontWeight: '700', color: '#6366F1' },
  selectInviteBtnBusy: { backgroundColor: '#1A1A1A', borderColor: '#222222' },
  selectInviteBtnTextBusy: { color: '#333333' },
  selectLineSep: { height: 1, backgroundColor: '#1A1A1A', marginVertical: 8 },
  selectCancelBtn: { backgroundColor: '#1A1A1A', borderRadius: 10, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A2A' },
  selectCancelText: { fontSize: 14, fontWeight: '600', color: '#555555' },

  // Dialogue overlay
  dialogueSafe: { flex: 1, backgroundColor: '#111111' },
  dialogueHeader: { paddingHorizontal: 28, paddingTop: 40, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  dialoguePhaseLabel: { fontSize: 11, fontWeight: '600', color: '#555555', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  dialogueTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  dialogueSubtitle: { fontSize: 14, color: '#444444', marginBottom: 10 },
  dialogueTourLabel: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 6 },
  dialogueTourLabelOther: { color: '#6366F1' },
  dialogueTimer: { fontSize: 34, fontWeight: '700', color: '#FFFFFF', fontVariant: ['tabular-nums'], letterSpacing: 1 },

  // Phase 1
  situationArea: { flex: 1, margin: 24, backgroundColor: '#161616', borderRadius: 12, borderWidth: 1, borderColor: '#222222', padding: 14 },
  situationInput: { flex: 1, fontSize: 15, color: '#FFFFFF', lineHeight: 24, textAlignVertical: 'top', padding: 0 },
  dialogueFooter: { paddingHorizontal: 28, paddingBottom: 40, paddingTop: 12 },
  dialogueReadyBtn: { backgroundColor: '#FFFFFF', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  dialogueReadyBtnText: { fontSize: 16, fontWeight: '700', color: '#111111' },

  // Phase 2 — chat
  chatScroll: { flex: 1 },
  chatContent: { padding: 20, gap: 10 },
  chatLine: { maxWidth: '82%', borderRadius: 12, padding: 12, gap: 3 },
  chatLineMe: { alignSelf: 'flex-end', backgroundColor: '#1A2240', borderWidth: 1, borderColor: '#2A3560' },
  chatLineOther: { alignSelf: 'flex-start', backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A' },
  chatWho: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  chatWhoMe: { color: '#6366F1' },
  chatWhoOther: { color: '#555555' },
  chatText: { fontSize: 14, color: '#EEEEEE', lineHeight: 22 },
  chatTyping: { alignSelf: 'flex-start', paddingHorizontal: 4 },
  chatTypingText: { fontSize: 13, color: '#333333', fontStyle: 'italic' },
  chatInputArea: { paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12, gap: 10, borderTopWidth: 1, borderTopColor: '#1A1A1A' },
  chatInputRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  chatInput: { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 10, padding: 12, fontSize: 14, color: '#FFFFFF', lineHeight: 22, borderWidth: 1, borderColor: '#2A2A2A' },
  chatSendBtn: { backgroundColor: '#6366F1', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  chatSendBtnDisabled: { opacity: 0.35 },
  chatSendBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  chatWaitingRow: { backgroundColor: '#161616', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' },
  chatWaitingText: { fontSize: 14, color: '#444444', fontStyle: 'italic' },
  chatTerminerBtn: { backgroundColor: '#1A1A1A', borderRadius: 10, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A2A' },
  chatTerminerText: { fontSize: 14, fontWeight: '700', color: '#AAAAAA' },
});
