import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, SafeAreaView, Animated } from 'react-native';

export default function CestPartiScreen() {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const dotAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
    ]).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(dotAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
        ]),
      ).start();
    });
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.eyebrow}>Tout le monde est prêt</Text>
        <Text style={styles.title}>C'est parti !</Text>
        <Text style={styles.subtitle}>Temps 1 · Bonne écriture</Text>
        <Animated.View style={[styles.pulse, { opacity: dotAnim }]} />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#111111' },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555555',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontSize: 52,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#444444',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  pulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366F1',
    marginTop: 32,
  },
});
