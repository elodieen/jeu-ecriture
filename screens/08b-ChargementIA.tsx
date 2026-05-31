import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View,
  SafeAreaView, Animated,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../data/navigationTypes';
import { getSocket } from '../services/socket';

type Route = RouteProp<RootStackParamList, 'ChargementIA'>;

const MESSAGES = [
  "L'histoire se tisse...",
  "Les voix s'assemblent...",
  "Le récit prend forme...",
  "Presque prêt...",
];

export default function ChargementIAScreen() {
  const route = useRoute<Route>();
  const { contribution, temps } = route.params;

  const [msgIdx, setMsgIdx] = useState(0);
  const [received, setReceived] = useState<{ count: number; total: number } | null>(null);
  const msgOpacity = useRef(new Animated.Value(1)).current;

  const dot1 = useRef(new Animated.Value(0.2)).current;
  const dot2 = useRef(new Animated.Value(0.2)).current;
  const dot3 = useRef(new Animated.Value(0.2)).current;
  const t2 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const t3 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    function pulse(dot: Animated.Value) {
      return Animated.loop(Animated.sequence([
        Animated.timing(dot, { toValue: 1,    duration: 450, useNativeDriver: false }),
        Animated.timing(dot, { toValue: 0.15, duration: 450, useNativeDriver: false }),
      ]));
    }
    const a1 = pulse(dot1); const a2 = pulse(dot2); const a3 = pulse(dot3);
    a1.start();
    t2.current = setTimeout(() => a2.start(), 200);
    t3.current = setTimeout(() => a3.start(), 400);
    return () => {
      a1.stop(); a2.stop(); a3.stop();
      clearTimeout(t2.current); clearTimeout(t3.current);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      Animated.timing(msgOpacity, { toValue: 0, duration: 280, useNativeDriver: false }).start(() => {
        setMsgIdx(i => (i + 1) % MESSAGES.length);
        Animated.timing(msgOpacity, { toValue: 1, duration: 280, useNativeDriver: false }).start();
      });
    }, 2000);
    return () => clearInterval(id);
  }, []);

  // Submit contribution and track server-side progress
  useEffect(() => {
    const socket = getSocket();

    console.log('[ChargementIA] ecriture:submit — temps=', temps, '| contribution (60 premiers cars):', (contribution ?? '').slice(0, 60));
    socket.emit('ecriture:submit', { contribution: contribution ?? '', temps });

    function onReceived({ count, total }: { count: number; total: number }) {
      console.log('[ChargementIA] ecriture:received —', count, '/', total);
      setReceived({ count, total });
    }

    function onAiDone({ histoire, temps: t }: { histoire: string; temps: number }) {
      console.log('[ChargementIA] ai:done reçu — temps=', t, '| début histoire:', histoire.slice(0, 80));
    }

    socket.on('ecriture:received', onReceived);
    socket.on('ai:done', onAiDone);
    return () => {
      socket.off('ecriture:received', onReceived);
      socket.off('ai:done', onAiDone);
    };
    // Navigation to HistoireAssemblee is server-driven via game:navigateTo in GameContext
  }, []);

  const counterText = received
    ? `${received.count} / ${received.total} contributions reçues`
    : 'Envoi de ta contribution...';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        <View style={styles.dots}>
          <Animated.View style={[styles.dot, { opacity: dot1 }]} />
          <Animated.View style={[styles.dot, { opacity: dot2 }]} />
          <Animated.View style={[styles.dot, { opacity: dot3 }]} />
        </View>

        <Animated.Text style={[styles.message, { opacity: msgOpacity }]}>
          {MESSAGES[msgIdx]}
        </Animated.Text>

        <Text style={styles.counter}>{counterText}</Text>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0A0A' },
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 32, paddingHorizontal: 40,
  },
  dots: { flexDirection: 'row', gap: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#6366F1' },
  message: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', letterSpacing: -0.3 },
  counter: { fontSize: 14, color: '#333333', letterSpacing: 0.5 },
});
