import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../data/navigationTypes';
import { scenarios } from '../data/scenarios/index';
import { getSocket } from '../services/socket';
import { EV } from '../shared/events';

type Route = RouteProp<RootStackParamList, 'ChoisirScenario'>;

export default function ChoisirScenarioScreen() {
  const route = useRoute<Route>();
  const { isCreator } = route.params;

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null); // server-confirmed
  const [sending, setSending] = useState(false);

  // Reset all local state when the screen gains focus (handles character:back return)
  useFocusEffect(
    useCallback(() => {
      setExpandedId(null);
      setSelectedId(null);
      setSending(false);
    }, [])
  );

  useEffect(() => {
    const socket = getSocket();
    function onScenarioSelected({ scenarioId }: { scenarioId: string }) {
      setSelectedId(scenarioId);
      setSending(true); // lock UI for all players while server navigates
    }
    socket.on(EV.SCENARIO_SELECTED, onScenarioSelected);
    return () => { socket.off(EV.SCENARIO_SELECTED, onScenarioSelected); };
  }, []);

  function handleChoose(scenarioId: string) {
    if (sending) return;
    setSending(true);
    getSocket().emit(EV.SCENARIO_SELECT, { scenarioId });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        <View style={styles.header}>
          <Text style={styles.headerLabel}>Étape 1</Text>
          <Text style={styles.headerTitle}>Choisir un scénario</Text>
          {selectedId
            ? <Text style={styles.headerHint}>Préparation en cours…</Text>
            : !isCreator
              ? <Text style={styles.headerHint}>Choisissez un scénario pour commencer.</Text>
              : null
          }
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {scenarios.map((scenario) => {
            const isExpanded = expandedId === scenario.id;
            const isHighlighted = selectedId === scenario.id;
            const summary = scenario.introduction.split('\n\n').slice(0, 2).join('\n\n');

            return (
              <TouchableOpacity
                key={scenario.id}
                style={[
                  styles.card,
                  isExpanded && styles.cardExpanded,
                  isHighlighted && styles.cardHighlighted,
                ]}
                onPress={() => {
                  if (sending) return;
                  setExpandedId(isExpanded ? null : scenario.id);
                }}
                activeOpacity={0.85}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardMeta}>
                    <Text style={[styles.cardTitle, isHighlighted && styles.cardTitleHighlighted]}>
                      {scenario.title}
                    </Text>
                    <Text style={styles.cardTagline}>{scenario.tagline}</Text>
                  </View>
                  {isHighlighted
                    ? <Text style={styles.selectedBadge}>✓</Text>
                    : <Text style={[styles.cardChevron, isExpanded && styles.cardChevronOpen]}>
                        {isExpanded ? '▲' : '▼'}
                      </Text>
                  }
                </View>

                <View style={styles.chips}>
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>
                      {scenario.minPlayers === scenario.maxPlayers
                        ? `${scenario.maxPlayers} joueurs`
                        : `${scenario.minPlayers}–${scenario.maxPlayers} joueurs`}
                    </Text>
                  </View>
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>{scenario.duration}</Text>
                  </View>
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>{scenario.universe} · {scenario.tone}</Text>
                  </View>
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>{scenario.audience}</Text>
                  </View>
                </View>

                {isExpanded && (
                  <>
                    <View style={styles.cardDivider} />
                    <Text style={styles.summaryText}>{summary}</Text>
                    {!isHighlighted && (
                      <TouchableOpacity
                        style={[styles.btnChoisir, sending && styles.btnChoisirSending]}
                        onPress={() => handleChoose(scenario.id)}
                        disabled={sending}
                        activeOpacity={0.8}
                      >
                        {sending
                          ? <ActivityIndicator color="#FFFFFF" />
                          : <Text style={styles.btnChoisirText}>Choisir ce scénario →</Text>
                        }
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </TouchableOpacity>
            );
          })}

          <View style={styles.spacer} />
        </ScrollView>

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
    gap: 4,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555555',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerHint: {
    fontSize: 13,
    color: '#555555',
    fontStyle: 'italic',
    marginTop: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 20,
    marginBottom: 14,
  },
  cardExpanded: {
    borderColor: '#3A3A3A',
  },
  cardHighlighted: {
    borderColor: '#6366F1',
    borderWidth: 2,
    backgroundColor: '#0F0F1E',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardMeta: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  cardTitleHighlighted: {
    color: '#A5B4FC',
  },
  cardTagline: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
  },
  cardChevron: {
    fontSize: 10,
    color: '#444444',
    marginTop: 4,
    marginLeft: 12,
  },
  cardChevronOpen: {
    color: '#6366F1',
  },
  selectedBadge: {
    fontSize: 16,
    color: '#6366F1',
    fontWeight: '800',
    marginTop: 2,
    marginLeft: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: '#111111',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  chipText: {
    fontSize: 11,
    color: '#555555',
    letterSpacing: 0.2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginVertical: 16,
  },
  summaryText: {
    fontSize: 14,
    color: '#AAAAAA',
    lineHeight: 22,
    marginBottom: 20,
  },
  btnChoisir: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnChoisirSending: {
    opacity: 0.6,
  },
  btnChoisirText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  spacer: {
    height: 40,
  },
});
