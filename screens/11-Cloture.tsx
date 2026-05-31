import { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, ScrollView, TextInput, ActivityIndicator,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../data/navigationTypes';
import { getSocket } from '../services/socket';
import { EV } from '../shared/events';

type Route = RouteProp<RootStackParamList, 'Cloture'>;

const TITRES_IA = [
  'Le bal des mensonges',
  'Ce soir, tout le monde sait',
  'La dernière danse des Varel',
];

export default function ClotureScreen() {
  const route = useRoute<Route>();
  const { isCreator } = route.params;

  const [customTitre, setCustomTitre] = useState('');
  const [enAttente, setEnAttente] = useState(false);

  function choisirTitre(titre: string) {
    if (enAttente) return;
    setEnAttente(true);
    getSocket().emit(EV.CLOTURE_TITRE, { title: titre });
  }

  if (!isCreator) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.waitingFull}>
          <ActivityIndicator color="#6366F1" size="large" />
          <Text style={styles.waitingFullTitle}>
            Le créateur est en train{'\n'}de choisir le titre…
          </Text>
          <Text style={styles.waitingFullHint}>Mettez-vous d'accord !</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        <View style={styles.header}>
          <Text style={styles.headerLabel}>Fin de partie</Text>
          <Text style={styles.headerTitle}>L'histoire est terminée</Text>
          {isCreator && (
            <Text style={styles.headerHint}>Tu es le créateur · choisis le titre final</Text>
          )}
        </View>

        {/* ── Champ titre libre ── */}
        <View style={styles.inputSection}>
          <TextInput
            style={[styles.titreInput, !isCreator && styles.inputDisabled]}
            value={customTitre}
            onChangeText={isCreator ? setCustomTitre : undefined}
            placeholder="Quel titre pour votre histoire ?"
            placeholderTextColor="#444444"
            maxLength={80}
            editable={isCreator}
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.btnProposer, (!isCreator || !customTitre.trim() || enAttente) && styles.btnDisabled]}
            onPress={() => customTitre.trim() && choisirTitre(customTitre.trim())}
            disabled={!isCreator || !customTitre.trim() || enAttente}
            activeOpacity={0.75}
          >
            {enAttente
              ? <ActivityIndicator color="#111111" />
              : <Text style={styles.btnProposerText}>Proposer ce titre →</Text>
            }
          </TouchableOpacity>
        </View>

        {/* ── Séparateur ── */}
        <View style={styles.separator}>
          <View style={styles.separatorLine} />
          <Text style={styles.separatorText}>ou choisissez parmi les suggestions de l'IA</Text>
          <View style={styles.separatorLine} />
        </View>

        {/* ── Suggestions IA ── */}
        <View style={styles.titresSection}>
          {TITRES_IA.map((titre, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.titreCard, (!isCreator || enAttente) && styles.titreCardReadOnly]}
              onPress={() => isCreator && choisirTitre(titre)}
              disabled={!isCreator || enAttente}
              activeOpacity={0.7}
            >
              <Text style={[styles.titreText, !isCreator && styles.titreTextReadOnly]}>
                {titre}
              </Text>
              {isCreator && <Text style={styles.cardArrow}>›</Text>}
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#111111' },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 60, paddingBottom: 56 },

  // Header
  header: { paddingHorizontal: 28, marginBottom: 32, gap: 6 },
  headerLabel: {
    fontSize: 12, fontWeight: '600', color: '#555555',
    letterSpacing: 2, textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5,
  },
  headerHint: { fontSize: 13, color: '#6366F1', fontWeight: '500', marginTop: 2 },

  // Champ libre
  inputSection: { paddingHorizontal: 28, marginBottom: 28, gap: 10 },
  titreInput: {
    backgroundColor: '#1A1A1A', borderRadius: 12,
    borderWidth: 1, borderColor: '#333333',
    paddingVertical: 16, paddingHorizontal: 18,
    fontSize: 16, color: '#FFFFFF',
  },
  inputDisabled: { opacity: 0.35 },
  btnProposer: {
    backgroundColor: '#FFFFFF', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  btnProposerText: { fontSize: 16, fontWeight: '700', color: '#111111' },
  btnDisabled: { opacity: 0.35 },

  // Séparateur
  separator: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 28, marginBottom: 24, gap: 12,
  },
  separatorLine: { flex: 1, height: 1, backgroundColor: '#222222' },
  separatorText: { fontSize: 12, color: '#444444', textAlign: 'center', flexShrink: 1 },

  // Titres IA
  titresSection: { paddingHorizontal: 28, gap: 10, marginBottom: 24 },
  titreCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A1A1A', borderRadius: 12,
    borderWidth: 1, borderColor: '#2A2A2A',
    paddingVertical: 18, paddingHorizontal: 20,
  },
  titreCardReadOnly: { opacity: 0.45 },
  titreText: { flex: 1, fontSize: 17, fontWeight: '700', color: '#FFFFFF', lineHeight: 24 },
  titreTextReadOnly: { color: '#AAAAAA' },
  cardArrow: { fontSize: 22, color: '#555555', marginLeft: 12 },

  // Attente non-créateur
  waitingFull: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 20, paddingHorizontal: 40,
  },
  waitingFullTitle: {
    fontSize: 22, fontWeight: '700', color: '#FFFFFF',
    textAlign: 'center', lineHeight: 32,
  },
  waitingFullHint: {
    fontSize: 14, color: '#6366F1', fontWeight: '500', textAlign: 'center',
  },
});
