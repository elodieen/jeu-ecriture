import { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ActivityIndicator,
  SafeAreaView, ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../data/navigationTypes';
import { derniereSaison } from '../data/scenarios/derniere-saison';
import { getSocket } from '../services/socket';
import { EV } from '../shared/events';

type Nav = NativeStackNavigationProp<RootStackParamList, 'FichePersonnage'>;
type Route = RouteProp<RootStackParamList, 'FichePersonnage'>;

type Tab = 'publique' | 'cachee';

export default function FichePersonnageScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { characterId, isCreator } = route.params;
  const [activeTab, setActiveTab] = useState<Tab>('publique');

  const character = derniereSaison.characters.find(c => c.id === characterId) ?? null;

  const [lu, setLu] = useState(false);

  if (!character) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Aucun personnage sélectionné.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.errorButtonText}>← Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.topScenario}>{derniereSaison.title}</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.name}>{character.name}</Text>
          <Text style={styles.tagline}>{character.tagline}</Text>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'publique' && styles.tabActive]}
            onPress={() => setActiveTab('publique')}
          >
            <Text style={[styles.tabText, activeTab === 'publique' && styles.tabTextActive]}>
              Face publique
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'cachee' && styles.tabActive, styles.tabSecret]}
            onPress={() => setActiveTab('cachee')}
          >
            <Text style={[styles.tabText, activeTab === 'cachee' && styles.tabTextActive]}>
              {activeTab === 'cachee' ? '▼ Face cachée' : '● Face cachée'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          key={activeTab}
        >
          {activeTab === 'publique' ? (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Ce que tout le monde voit</Text>
                <Text style={styles.publicText}>{character.facePublique}</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Ton objectif</Text>
                <Text style={styles.objectifText}>{character.objectif}</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Tes relations</Text>
                <View style={styles.relationsList}>
                  {character.relations.map((rel, index) => (
                    <View key={index} style={styles.relationRow}>
                      <Text style={styles.relationName}>
                        {derniereSaison.characters.find(c => c.id === rel.character)?.name ?? rel.character}
                      </Text>
                      <Text style={styles.relationLabel}>{rel.label}</Text>
                      <Text style={styles.relationDesc}>{rel.description}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={styles.secretBanner}>
                <Text style={styles.secretBannerText}>● Visible uniquement par toi</Text>
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionLabel, styles.sectionLabelSecret]}>Ta face cachée</Text>
                <View style={styles.secretBox}>
                  <Text style={styles.secretText}>{character.faceCachee}</Text>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionLabel, styles.sectionLabelSecret]}>Ton objectif</Text>
                <Text style={styles.objectifText}>{character.objectif}</Text>
              </View>

              <View style={styles.rulesSection}>
                <Text style={styles.rulesTitle}>Règles de jeu</Text>
                {[
                  'Tu écris uniquement les actions et dialogues de ton personnage.',
                  "Tu n'as pas accès à ce que les autres écrivent pendant le temps d'écriture.",
                  "Ta face cachée t'appartient — utilise-la quand tu veux, ou garde-la jusqu'au bout.",
                  "Quand le timer sonne, tu envoies ce que tu as. Même si c'est court.",
                ].map((rule, i) => (
                  <View key={i} style={styles.ruleRow}>
                    <Text style={styles.ruleBullet}>◆</Text>
                    <Text style={styles.ruleText}>{rule}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <View style={styles.footerSpacer} />
        </ScrollView>

        <View style={styles.footer}>
          {lu ? (
            <View style={styles.waitingRow}>
              <ActivityIndicator color="#555555" />
              <Text style={styles.waitingText}>En attente des autres joueurs…</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.buttonPrimary}
              onPress={() => { setLu(true); getSocket().emit(EV.ECRITURE_PRET); }}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonPrimaryText}>J'ai lu ma fiche ✓</Text>
            </TouchableOpacity>
          )}
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: 32,
  },
  errorText: {
    color: '#555555',
    fontSize: 17,
    textAlign: 'center',
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginBottom: 20,
  },
  backText: {
    color: '#555555',
    fontSize: 15,
  },
  topScenario: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444444',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  hero: {
    paddingHorizontal: 32,
    marginBottom: 24,
  },
  name: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    color: '#666666',
    fontStyle: 'italic',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 32,
    marginBottom: 24,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#2A2A2A',
  },
  tabSecret: {},
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555555',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 32,
  },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#444444',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  sectionLabelSecret: {
    color: '#5A3A3A',
  },
  publicText: {
    fontSize: 15,
    color: '#CCCCCC',
    lineHeight: 24,
  },
  objectifText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 26,
    fontWeight: '500',
  },
  relationsList: {
    gap: 10,
  },
  relationRow: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222222',
    padding: 16,
    gap: 3,
  },
  relationName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  relationLabel: {
    fontSize: 13,
    color: '#888888',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  relationDesc: {
    fontSize: 14,
    color: '#555555',
    lineHeight: 20,
  },
  secretBanner: {
    backgroundColor: '#1A0F0F',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#3A1A1A',
  },
  secretBannerText: {
    fontSize: 12,
    color: '#884444',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  secretBox: {
    backgroundColor: '#170F0F',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A1515',
    borderLeftWidth: 3,
    borderLeftColor: '#884444',
  },
  secretText: {
    fontSize: 15,
    color: '#CCBBBB',
    lineHeight: 24,
  },
  rulesSection: {
    backgroundColor: '#161616',
    borderRadius: 14,
    padding: 20,
    gap: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  rulesTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#444444',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  ruleRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  ruleBullet: {
    fontSize: 8,
    color: '#444444',
    marginTop: 5,
  },
  ruleText: {
    flex: 1,
    fontSize: 14,
    color: '#555555',
    lineHeight: 21,
  },
  footerSpacer: {
    height: 24,
  },
  footer: {
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 48,
  },
  waitingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    paddingVertical: 18,
  },
  waitingText: { fontSize: 15, color: '#555555' },
  buttonPrimary: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonPrimaryText: {
    color: '#111111',
    fontSize: 17,
    fontWeight: '700',
  },
});
