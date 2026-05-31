import { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../data/navigationTypes';
import { getSocket } from '../services/socket';
import { EV } from '../shared/events';

type Route = RouteProp<RootStackParamList, 'HistoireAssemblee'>;

export default function HistoireAssembleeScreen() {
  const route = useRoute<Route>();
  const { histoire, temps } = route.params;
  const [pret, setPret] = useState(false);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        <View style={styles.header}>
          <Text style={styles.headerLabel}>Temps {temps}</Text>
          <Text style={styles.headerTitle}>Histoire assemblée</Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.histoireText}>{histoire}</Text>
          <View style={styles.hint}>
            <Text style={styles.hintText}>Lisez à voix haute, puis continuez.</Text>
          </View>
          <View style={styles.spacer} />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.btnSuivant, pret && styles.btnSuivantWaiting]}
            onPress={() => {
              if (pret) return;
              setPret(true);
              getSocket().emit(EV.HISTOIRE_LU);
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
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 28,
    marginBottom: 24,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555555',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 28,
  },
  histoireText: {
    fontSize: 17,
    color: '#DDDDDD',
    lineHeight: 30,
  },
  hint: {
    marginTop: 32,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#222222',
    alignItems: 'center',
  },
  hintText: {
    fontSize: 14,
    color: '#444444',
    letterSpacing: 0.3,
    fontStyle: 'italic',
  },
  spacer: {
    height: 16,
  },
  footer: {
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 48,
  },
  btnSuivant: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnSuivantWaiting: { opacity: 0.5 },
  btnSuivantText: {
    color: '#111111',
    fontSize: 17,
    fontWeight: '700',
  },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  waitingText: {
    fontSize: 15,
    color: '#444444',
    fontWeight: '500',
  },
});
