import { useMemo, useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../data/navigationTypes';
import { useGame } from '../contexts/GameContext';
import { derniereSaison } from '../data/scenarios/derniere-saison';
import { generateAndDownloadPDF, DEFAULT_INTRO_TEMPS1 } from '../utils/generatePDF';

type Nav = NativeStackNavigationProp<RootStackParamList, 'TheEnd' | 'FlipBook'>;
type Route = RouteProp<RootStackParamList, 'TheEnd'>;


export default function TheEndScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { titre } = route.params;
  const { historiqueAssemblages, allCharacters, historiqueContraintes } = useGame();
  const [showQuit, setShowQuit] = useState(false);

  const dateStr = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const characters = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const id of allCharacters.values()) {
      const name = derniereSaison.characters.find(c => c.id === id)?.name ?? id;
      if (!seen.has(name)) { seen.add(name); list.push(name); }
    }
    return list;
  }, [allCharacters]);

  function goAccueil() {
    navigation.reset({ index: 0, routes: [{ name: 'Accueil' }] });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        <View style={styles.main}>
          <Text style={styles.theEnd}>THE END</Text>
          <View style={styles.titleBlock}>
            <Text style={styles.titre}>« {titre} »</Text>
          </View>
          <Text style={styles.date}>Histoire créée le {dateStr}</Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.btnDownload}
            onPress={() => generateAndDownloadPDF({
              titre, dateStr, characters,
              historiqueAssemblages, historiqueContraintes,
              introText: DEFAULT_INTRO_TEMPS1,
            })}
            activeOpacity={0.8}
          >
            <Text style={styles.btnDownloadText}>↓ Télécharger l'histoire</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnFlipBook}
            onPress={() => navigation.navigate('FlipBook', { titre })}
            activeOpacity={0.8}
          >
            <Text style={styles.btnFlipBookText}>Lire notre histoire →</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnNouvelle}
            onPress={() => setShowQuit(true)}
          >
            <Text style={styles.btnNouvelleText}>← Nouvelle partie</Text>
          </TouchableOpacity>
        </View>

      </View>

      <Modal
        visible={showQuit}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQuit(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Quitter ?</Text>
            <Text style={styles.dialogBody}>
              Voulez-vous télécharger votre histoire avant de partir ?
            </Text>
            <TouchableOpacity
              style={styles.dialogBtnPrimary}
              onPress={() => {
                setShowQuit(false);
                generateAndDownloadPDF({
                  titre, dateStr, characters,
                  historiqueAssemblages, historiqueContraintes,
                  introText: DEFAULT_INTRO_TEMPS1,
                }).then(goAccueil);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.dialogBtnPrimaryText}>↓ Télécharger</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dialogBtnSecondary}
              onPress={() => { setShowQuit(false); goAccueil(); }}
              activeOpacity={0.8}
            >
              <Text style={styles.dialogBtnSecondaryText}>Continuer sans télécharger</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#111111' },
  container: { flex: 1, paddingTop: 60, justifyContent: 'space-between' },

  main: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 36, gap: 18,
  },
  theEnd: {
    fontSize: 12, fontWeight: '800', color: '#333333',
    letterSpacing: 6, textTransform: 'uppercase',
  },
  titleBlock: { alignItems: 'center' },
  titre: {
    fontSize: 30, fontWeight: '800', color: '#FFFFFF',
    letterSpacing: -0.5, textAlign: 'center', lineHeight: 40,
  },
  date: { fontSize: 14, color: '#444444', letterSpacing: 0.3 },

  footer: {
    paddingHorizontal: 28, paddingTop: 16, paddingBottom: 48, gap: 12,
  },
  btnDownload: {
    backgroundColor: '#FFFFFF', paddingVertical: 16,
    borderRadius: 12, alignItems: 'center',
  },
  btnDownloadText: { color: '#111111', fontSize: 17, fontWeight: '700' },
  btnFlipBook: {
    backgroundColor: '#111111', paddingVertical: 16,
    borderRadius: 12, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#FFFFFF',
  },
  btnFlipBookText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  btnNouvelle: {
    backgroundColor: '#1A1A1A', paddingVertical: 16,
    borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  btnNouvelleText: { color: '#666666', fontSize: 15, fontWeight: '600' },

  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32,
  },
  dialog: {
    backgroundColor: '#1A1A1A', borderRadius: 16,
    borderWidth: 1, borderColor: '#2A2A2A',
    padding: 28, width: '100%', gap: 12,
  },
  dialogTitle: {
    fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 4,
  },
  dialogBody: {
    fontSize: 15, color: '#888888', lineHeight: 22, marginBottom: 8,
  },
  dialogBtnPrimary: {
    backgroundColor: '#FFFFFF', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
  },
  dialogBtnPrimaryText: { color: '#111111', fontSize: 16, fontWeight: '700' },
  dialogBtnSecondary: {
    backgroundColor: '#111111', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
    borderWidth: 1, borderColor: '#333333',
  },
  dialogBtnSecondaryText: { color: '#666666', fontSize: 15, fontWeight: '600' },
});
