import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View,
  SafeAreaView, Animated,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../data/navigationTypes';
import { getSocket } from '../services/socket';

type Route = RouteProp<RootStackParamList, 'SalleAttente'>;

export default function SalleAttenteScreen() {
  const route = useRoute<Route>();
  const { playerCount, sessionCode, initialConnected } = route.params;

  const [connected, setConnected] = useState(initialConnected);

  const circleAnims = useRef(
    Array.from({ length: 6 }, () => new Animated.Value(0)),
  ).current;

  // Animate circles for players already present when this screen mounts
  useEffect(() => {
    for (let i = 0; i < initialConnected; i++) {
      Animated.spring(circleAnims[i], {
        toValue: 1, tension: 90, friction: 7, useNativeDriver: false,
      }).start();
    }
  }, []);

  // Animate each new circle as players join
  useEffect(() => {
    if (connected <= 0) return;
    Animated.spring(circleAnims[connected - 1], {
      toValue: 1, tension: 90, friction: 7, useNativeDriver: false,
    }).start();
  }, [connected]);

  // Listen to socket events
  useEffect(() => {
    const socket = getSocket();

    function onPlayerJoined({ totalConnected }: { totalConnected: number }) {
      setConnected(totalConnected);
    }

    function onReady() {
      // Will be handled by the count-based navigation effect below
    }

    socket.on('session:player_joined', onPlayerJoined);
    socket.on('session:ready', onReady);

    return () => {
      socket.off('session:player_joined', onPlayerJoined);
      socket.off('session:ready', onReady);
    };
  }, []);

  // Navigation is driven by the server (game:navigate_to) — no client-side redirect here.

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Code de session */}
        <View style={styles.codeRow}>
          <Text style={styles.codeLabel}>Code de session</Text>
          <Text style={styles.code}>{sessionCode}</Text>
        </View>

        {/* Titre + compteur */}
        <View style={styles.hero}>
          <Text style={styles.title}>En attente{'\n'}des joueurs</Text>
          <Text style={styles.counter}>
            {connected} / {playerCount} connecté{connected > 1 ? 's' : ''}
          </Text>
        </View>

        {/* Cercles de progression */}
        <View style={styles.circlesArea}>
          <View style={styles.circlesRow}>
            {Array.from({ length: playerCount }, (_, i) => {
              const anim = circleAnims[i];
              const bgColor = anim.interpolate({
                inputRange: [0, 1],
                outputRange: ['#1A1A1A', '#4ADE80'],
              });
              const scale = anim.interpolate({
                inputRange: [0, 0.6, 1],
                outputRange: [0.7, 1.1, 1],
              });
              const isFilled = i < connected;

              return (
                <Animated.View
                  key={i}
                  style={[
                    styles.circle,
                    { backgroundColor: bgColor, transform: [{ scale }] },
                  ]}
                >
                  <Text style={[styles.circleNumber, isFilled && styles.circleNumberFilled]}>
                    {i + 1}
                  </Text>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* Message bas */}
        <View style={styles.footer}>
          <Text style={styles.footerHint}>
            {connected < playerCount
              ? `En attente de ${playerCount - connected} joueur${playerCount - connected > 1 ? 's' : ''}…`
              : 'Tout le monde est là !'}
          </Text>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#111111',
  },
  container: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 48,
  },

  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 36,
  },
  codeLabel: {
    fontSize: 14,
    color: '#555555',
  },
  code: {
    fontSize: 14,
    fontWeight: '700',
    color: '#888888',
    letterSpacing: 3,
  },

  hero: {
    marginBottom: 40,
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 46,
    letterSpacing: -1,
    marginBottom: 10,
  },
  counter: {
    fontSize: 15,
    color: '#555555',
  },

  circlesArea: {
    flex: 1,
    gap: 28,
  },
  circlesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  circle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  circleNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
  },
  circleNumberFilled: {
    color: '#111111',
  },

  footer: {
    alignItems: 'center',
    paddingTop: 16,
  },
  footerHint: {
    fontSize: 14,
    color: '#444444',
    fontStyle: 'italic',
  },
});
