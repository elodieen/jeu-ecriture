import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, ScrollView, ActivityIndicator, Animated,
} from 'react-native';
import { derniereSaison } from '../data/scenarios/derniere-saison';
import { getSocket } from '../services/socket';
import { useGame } from '../contexts/GameContext';
import { EV } from '../shared/events';

export default function ChoisirPersonnageScreen() {
  const { myPlayerIndex, setMyCharacter } = useGame();
  const socket = getSocket();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  // characterId → playerIndex (server-confirmed assignments)
  const [takenMap, setTakenMap] = useState<Record<string, number>>({});
  const [pending, setPending] = useState(false);
  const [errorId, setErrorId] = useState<string | null>(null);
  const errorAnim = useRef(new Animated.Value(0)).current;

  const { characters } = derniereSaison;

  useEffect(() => {
    function onCharacterTaken({ characterId, playerIndex }: { characterId: string; playerIndex: number }) {
      setTakenMap(prev => {
        const next = { ...prev };
        // Release any character this player previously held
        for (const cId of Object.keys(next)) {
          if (next[cId] === playerIndex) delete next[cId];
        }
        next[characterId] = playerIndex;
        return next;
      });
      if (playerIndex === myPlayerIndex) {
        setMyCharacter(characterId);
        setPending(false);
      }
    }

    function onAlreadyTaken({ characterId }: { characterId: string }) {
      setPending(false);
      setErrorId(characterId);
      // Shake animation
      Animated.sequence([
        Animated.timing(errorAnim, { toValue: 6,  duration: 60, useNativeDriver: true }),
        Animated.timing(errorAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
        Animated.timing(errorAnim, { toValue: 4,  duration: 60, useNativeDriver: true }),
        Animated.timing(errorAnim, { toValue: 0,  duration: 60, useNativeDriver: true }),
      ]).start();
      setTimeout(() => setErrorId(null), 2000);
    }

    socket.on('character:taken', onCharacterTaken);
    socket.on('character:already_taken', onAlreadyTaken);
    return () => {
      socket.off('character:taken', onCharacterTaken);
      socket.off('character:already_taken', onAlreadyTaken);
    };
  }, [myPlayerIndex]);

  function handleConfirm() {
    if (!selectedId || pending) return;
    const takenByOther =
      takenMap[selectedId] !== undefined && takenMap[selectedId] !== myPlayerIndex;
    if (takenByOther) return;
    setPending(true);
    socket.emit('character:choose', { characterId: selectedId });
  }

  const myConfirmedId = Object.entries(takenMap).find(([, idx]) => idx === myPlayerIndex)?.[0];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => getSocket().emit(EV.CHARACTER_BACK)}
            activeOpacity={0.7}
          >
            <Text style={styles.backBtnText}>← Changer de scénario</Text>
          </TouchableOpacity>
          <Text style={styles.scenario}>{derniereSaison.title}</Text>
          <Text style={styles.title}>Choisis ton{'\n'}personnage</Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {characters.map(character => {
            const ownerIndex = takenMap[character.id];
            const isTakenByOther = ownerIndex !== undefined && ownerIndex !== myPlayerIndex;
            const isTakenByMe = ownerIndex === myPlayerIndex;
            const isSelected = character.id === selectedId && !isTakenByOther;
            const hasError = character.id === errorId;

            const card = (
              <TouchableOpacity
                key={character.id}
                style={[
                  styles.card,
                  isSelected && !isTakenByMe && styles.cardSelected,
                  isTakenByMe && styles.cardMine,
                  isTakenByOther && styles.cardTaken,
                  hasError && styles.cardError,
                ]}
                onPress={() => {
                  if (isTakenByOther || pending || isTakenByMe) return;
                  setSelectedId(character.id);
                }}
                disabled={isTakenByOther}
                activeOpacity={isTakenByOther ? 1 : 0.7}
              >
                {(isSelected || isTakenByMe) && !isTakenByOther && (
                  <View style={[styles.cardGlow, isTakenByMe && styles.cardGlowMine]} />
                )}
                <View style={styles.cardInner}>
                  <Text style={[
                    styles.cardName,
                    isSelected && styles.cardNameSelected,
                    isTakenByMe && styles.cardNameMine,
                    isTakenByOther && styles.cardNameTaken,
                  ]}>
                    {character.name}
                  </Text>
                  <Text style={[styles.cardTagline, isTakenByOther && styles.cardTaglineTaken]}>
                    {character.tagline}
                  </Text>
                  {isTakenByOther && (
                    <Text style={styles.takenLabel}>Pris par joueur {ownerIndex + 1}</Text>
                  )}
                </View>
                {isTakenByMe && (
                  <View style={styles.checkMine}>
                    <Text style={styles.checkMineText}>✓</Text>
                  </View>
                )}
                {isSelected && !isTakenByMe && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );

            return hasError ? (
              <Animated.View key={character.id} style={{ transform: [{ translateX: errorAnim }] }}>
                {card}
              </Animated.View>
            ) : (
              <View key={character.id}>{card}</View>
            );
          })}
        </ScrollView>

        <View style={styles.footer}>
          {myConfirmedId ? (
            <Text style={styles.footerConfirmed}>
              ✓ En attente des autres joueurs…
            </Text>
          ) : (
            <Text style={styles.footerHint} numberOfLines={1}>
              {selectedId
                ? `${characters.find(c => c.id === selectedId)?.name} sélectionné·e`
                : 'Sélectionne un personnage'}
            </Text>
          )}
          <TouchableOpacity
            style={[
              styles.buttonPrimary,
              (!selectedId || pending || !!myConfirmedId) && styles.buttonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={!selectedId || pending || !!myConfirmedId}
            activeOpacity={0.8}
          >
            {pending
              ? <ActivityIndicator color="#111111" />
              : <Text style={styles.buttonPrimaryText}>
                  {myConfirmedId ? 'Personnage confirmé' : 'Choisir ce personnage'}
                </Text>
            }
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#111111' },
  container: { flex: 1, paddingTop: 60 },

  header: { paddingHorizontal: 32, marginBottom: 28, gap: 0 },
  backBtn: { marginBottom: 20 },
  backBtnText: {
    fontSize: 13, fontWeight: '600', color: '#555555', letterSpacing: 0.2,
  },
  scenario: {
    fontSize: 12, fontWeight: '600', color: '#555555',
    letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8,
  },
  title: {
    fontSize: 40, fontWeight: '800', color: '#FFFFFF',
    lineHeight: 46, letterSpacing: -1,
  },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 32, paddingBottom: 16, gap: 12 },

  card: {
    backgroundColor: '#1A1A1A', borderRadius: 14,
    borderWidth: 1, borderColor: '#222222',
    padding: 20, flexDirection: 'row', alignItems: 'center', overflow: 'hidden',
  },
  cardSelected: { borderColor: '#FFFFFF', backgroundColor: '#1E1E1E' },
  cardMine:     { borderColor: '#4ADE80', backgroundColor: '#0D1A10', borderWidth: 2 },
  cardTaken:    { opacity: 0.35 },
  cardError:    { borderColor: '#FF4444', borderWidth: 2 },

  cardGlow: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
    backgroundColor: '#FFFFFF', opacity: 0.15,
  },
  cardGlowMine: { backgroundColor: '#4ADE80', opacity: 0.3 },

  cardInner: { flex: 1 },
  cardName: { fontSize: 17, fontWeight: '700', color: '#AAAAAA', marginBottom: 4 },
  cardNameSelected: { color: '#FFFFFF' },
  cardNameMine:     { color: '#4ADE80' },
  cardNameTaken:    { color: '#444444' },
  cardTagline: { fontSize: 14, color: '#555555', lineHeight: 20 },
  cardTaglineTaken: { color: '#333333' },
  takenLabel: { fontSize: 11, color: '#444444', marginTop: 4, fontStyle: 'italic' },

  checkmark: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginLeft: 12,
  },
  checkmarkText: { fontSize: 12, fontWeight: '800', color: '#111111' },

  checkMine: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#4ADE80', alignItems: 'center', justifyContent: 'center', marginLeft: 12,
  },
  checkMineText: { fontSize: 12, fontWeight: '800', color: '#111111' },

  footer: { paddingHorizontal: 32, paddingTop: 16, paddingBottom: 48, gap: 10 },
  footerHint: { fontSize: 14, color: '#555555', textAlign: 'center' },
  footerConfirmed: { fontSize: 14, color: '#4ADE80', textAlign: 'center', fontWeight: '600' },

  buttonPrimary: {
    backgroundColor: '#FFFFFF', paddingVertical: 16,
    borderRadius: 12, alignItems: 'center',
  },
  buttonPrimaryText: { color: '#111111', fontSize: 17, fontWeight: '700' },
  buttonDisabled: { opacity: 0.25 },
});
