import { useState, useRef, useMemo, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, Animated, Pressable, ActivityIndicator,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../data/navigationTypes';
import { derniereSaison } from '../data/scenarios/derniere-saison';
import { getSocket } from '../services/socket';
import { useGame } from '../contexts/GameContext';
import { EV } from '../shared/events';

type Route = RouteProp<RootStackParamList, 'Roue'>;

type Step = 'initial' | 'spinning' | 'flipped' | 'revealed';

export default function RoueScreen() {
  const route = useRoute<Route>();
  const { roueNumber, isCreator } = route.params;
  const { roueContrainte, roueNotification } = useGame();

  const [step, setStep] = useState<Step>('initial');
  const [pret, setPret] = useState(false);

  const flipAnim      = useRef(new Animated.Value(0)).current;
  const secretBtnAnim = useRef(new Animated.Value(0)).current;
  const notifAnim     = useRef(new Animated.Value(0)).current;
  const btnAnim       = useRef(new Animated.Value(0)).current;

  // Prevents double-flip regardless of step state
  const hasFlipped = useRef(false);
  // Always holds the latest notification so the animation callback isn't stale
  const latestNotifRef = useRef(roueNotification?.roueNumber === roueNumber ? roueNotification : null);
  useEffect(() => {
    latestNotifRef.current = roueNotification?.roueNumber === roueNumber ? roueNotification : null;
  });

  const roue = useMemo(() => derniereSaison.roues.find(r => r.number === roueNumber)!, [roueNumber]);

  // Derived values for display only
  const contrainte = roueContrainte?.roueNumber === roueNumber ? roueContrainte : null;
  const notification = roueNotification?.roueNumber === roueNumber ? roueNotification : null;

  const scaleX = flipAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.01, 1] });
  const frontOpacity = flipAnim.interpolate({ inputRange: [0, 0.499, 0.5, 1], outputRange: [1, 1, 0, 0] });
  const backOpacity  = flipAnim.interpolate({ inputRange: [0, 0.499, 0.5, 1], outputRange: [0, 0, 1, 1] });

  // Flip logic — watches roueContrainte directly, not the derived `contrainte`.
  // Uses hasFlipped ref (not step check) so the creator (step='spinning') also flips.
  useEffect(() => {
    if (!roueContrainte || roueContrainte.roueNumber !== roueNumber) return;
    if (hasFlipped.current) return;
    hasFlipped.current = true;

    setStep('flipped');
    Animated.timing(flipAnim, { toValue: 1, duration: 500, useNativeDriver: false }).start(() => {
      // Read latestNotifRef instead of captured `notification` — avoids stale closure
      if (latestNotifRef.current) {
        Animated.timing(secretBtnAnim, { toValue: 1, duration: 350, useNativeDriver: false }).start();
      } else {
        Animated.timing(btnAnim, { toValue: 1, duration: 350, useNativeDriver: false }).start();
      }
    });
  }, [roueContrainte, roueNumber]);

  function handlePressCard() {
    if (step !== 'initial') return;
    getSocket().emit(EV.ROUE_SPIN, { roueNumber });
    setStep('spinning');
  }

  function revealNotif() {
    if (step !== 'flipped') return;
    setStep('revealed');
    Animated.timing(notifAnim, { toValue: 1, duration: 500, useNativeDriver: false }).start(() => {
      Animated.timing(btnAnim, { toValue: 1, duration: 350, useNativeDriver: false }).start();
    });
  }

  const notifLabel =
    notification?.type === 'FAILLE'     ? 'Ta faille' :
    notification?.type === 'MOTIVATION' ? 'Ta motivation' :
    'Ton secret';

  const btnReady = step === 'revealed' || (step === 'flipped' && !notification);

  const cardHintText =
    step === 'spinning' ? 'En attente...' :
    'Appuyez pour révéler';

  return (
    <SafeAreaView style={styles.safe}>

      <View style={styles.header}>
        <Text style={styles.headerLabel}>{roue.title.toUpperCase()}</Text>
        <Text style={styles.headerTitle}>La roue tourne...</Text>
        <Text style={styles.headerSub}>{roue.subtitle}</Text>
      </View>

      <View style={styles.cardArea}>

        <Pressable
          onPress={handlePressCard}
          style={styles.cardPressable}
          disabled={step !== 'initial'}
        >
          <Animated.View style={{ transform: [{ scaleX }] }}>

            {/* Face texte (révélée) */}
            <Animated.View style={{ opacity: backOpacity }}>
              <View style={styles.cardFront}>
                <Text style={styles.contrainte}>{contrainte?.texte ?? ''}</Text>
              </View>
            </Animated.View>

            {/* Dos décoratif */}
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: frontOpacity }]}>
              <View style={[StyleSheet.absoluteFill, styles.cardBack]}>
                <View style={styles.cardBackInsetBorder} />
                <View style={styles.cardBackOrnament}>
                  <View style={styles.cardBackDiamond} />
                  <View style={styles.cardBackDot} />
                </View>
                <Text style={styles.cardBackHint}>{cardHintText}</Text>
              </View>
            </Animated.View>

          </Animated.View>
        </Pressable>

        {/* Bouton message secret */}
        {notification && step === 'flipped' && (
          <Animated.View style={[styles.secretBtnWrapper, { opacity: secretBtnAnim }]} pointerEvents="auto">
            <TouchableOpacity style={styles.secretBtn} onPress={revealNotif} activeOpacity={0.75}>
              <Text style={styles.secretBtnEyebrow}>Pour toi seul·e</Text>
              <View style={styles.secretBtnRow}>
                <Text style={styles.secretBtnIcon}>◆</Text>
                <Text style={styles.secretBtnText}>Voir mon message secret</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Notification privée */}
        {notification && step === 'revealed' && (
          <Animated.View style={[styles.notifWrapper, { opacity: notifAnim }]}>
            <View style={styles.notifBox}>
              <Text style={styles.notifLabel}>Pour toi seul·e — {notifLabel}</Text>
              <Text style={styles.notifText}>{notification.texte}</Text>
            </View>
          </Animated.View>
        )}

      </View>

      <Animated.View style={[styles.footer, { opacity: btnAnim }]} pointerEvents={btnReady ? 'auto' : 'none'}>
        <TouchableOpacity
          style={[styles.btnSuivant, pret && styles.btnSuivantWaiting]}
          onPress={() => {
            if (pret) return;
            setPret(true);
            getSocket().emit(EV.NOTIF_LU);
          }}
          disabled={pret}
          activeOpacity={0.8}
        >
          {pret ? (
            <View style={styles.waitingRow}>
              <ActivityIndicator color="#555555" size="small" />
              <Text style={styles.waitingText}>En attente des autres joueurs…</Text>
            </View>
          ) : (
            <Text style={styles.btnSuivantText}>J'ai lu ✓</Text>
          )}
        </TouchableOpacity>
      </Animated.View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#111111' },

  header: { paddingHorizontal: 28, paddingTop: 36, paddingBottom: 16 },
  headerLabel: { fontSize: 11, fontWeight: '600', color: '#555555', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5, marginBottom: 4 },
  headerSub: { fontSize: 13, color: '#444444', lineHeight: 19 },

  cardArea: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, gap: 12 },
  cardPressable: { width: '100%' },

  cardFront: {
    backgroundColor: '#1A1A1A', borderRadius: 16, borderWidth: 1, borderColor: '#2A2A2A',
    padding: 16, minHeight: 120, alignItems: 'center', justifyContent: 'center',
  },
  contrainte: { fontSize: 15, color: '#EEEEEE', lineHeight: 24, fontStyle: 'italic', textAlign: 'center' },

  cardBack: {
    backgroundColor: '#1A1A1A', borderRadius: 16, borderWidth: 1, borderColor: '#2A2A2A',
    alignItems: 'center', justifyContent: 'center', gap: 20,
  },
  cardBackInsetBorder: { position: 'absolute', top: 12, left: 12, right: 12, bottom: 12, borderWidth: 1, borderColor: '#222222', borderRadius: 10 },
  cardBackOrnament: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  cardBackDiamond: { position: 'absolute', width: 52, height: 52, borderWidth: 1, borderColor: '#333333', transform: [{ rotate: '45deg' }] },
  cardBackDot: { position: 'absolute', width: 9, height: 9, backgroundColor: '#282828', transform: [{ rotate: '45deg' }] },
  cardBackHint: { fontSize: 11, color: '#333333', letterSpacing: 2, textTransform: 'uppercase' },

  secretBtnWrapper: { width: '100%' },
  secretBtn: { backgroundColor: '#120A0A', borderRadius: 12, borderWidth: 1, borderColor: '#3A1818', paddingVertical: 14, paddingHorizontal: 20, gap: 6 },
  secretBtnEyebrow: { fontSize: 12, color: '#5A2A2A', letterSpacing: 1.5, textTransform: 'uppercase' },
  secretBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  secretBtnIcon: { fontSize: 9, color: '#7A3333' },
  secretBtnText: { fontSize: 15, fontWeight: '600', color: '#9B5050', letterSpacing: 0.2 },

  notifWrapper: { width: '100%' },
  notifBox: {
    backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E0E0E0',
    borderLeftWidth: 3, borderLeftColor: '#CC4444', padding: 16, gap: 8,
  },
  notifLabel: { fontSize: 11, fontWeight: '700', color: '#CC4444', letterSpacing: 1.5, textTransform: 'uppercase' },
  notifText: { fontSize: 14, color: '#1A1A1A', lineHeight: 22 },

  footer: { paddingHorizontal: 28, paddingTop: 12, paddingBottom: 40 },
  btnSuivant: { backgroundColor: '#FFFFFF', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  btnSuivantWaiting: { opacity: 0.5 },
  btnSuivantText: { color: '#111111', fontSize: 17, fontWeight: '700' },
  waitingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  waitingText: { fontSize: 15, color: '#444444', fontWeight: '500' },
});
