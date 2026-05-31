import { useRef, useState, useMemo } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, ScrollView, Animated, TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../data/navigationTypes';
import { useGame } from '../contexts/GameContext';
import { derniereSaison } from '../data/scenarios/derniere-saison';
import {
  TEMPS_LABELS, parseText, generateAndDownloadPDF, DEFAULT_INTRO_TEMPS1,
} from '../utils/generatePDF';

type Nav = NativeStackNavigationProp<RootStackParamList, 'FlipBook'>;
type Route = RouteProp<RootStackParamList, 'FlipBook'>;

// ── Data helper ───────────────────────────────────────────────────────────────

function charName(id: string): string {
  return derniereSaison.characters.find(c => c.id === id)?.name ?? id;
}

// ── Page types ────────────────────────────────────────────────────────────────

type PageData =
  | { kind: 'cover' }
  | { kind: 'temps'; numero: number; label: string; text: string }
  | { kind: 'end' };

// ── Main screen ───────────────────────────────────────────────────────────────

export default function FlipBookScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { titre } = route.params;
  const { historiqueAssemblages, allCharacters, historiqueContraintes, isCreator } = useGame();

  const dateStr = useMemo(
    () => new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    [],
  );

  const characters = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const id of allCharacters.values()) {
      const name = charName(id);
      if (!seen.has(name)) { seen.add(name); list.push(name); }
    }
    return list;
  }, [allCharacters]);

  const pages = useMemo((): PageData[] => {
    const p: PageData[] = [{ kind: 'cover' }];
    for (let t = 1; t <= 4; t++) {
      if (historiqueAssemblages[t]) {
        p.push({
          kind: 'temps',
          numero: t,
          label: TEMPS_LABELS[t] ?? `Temps ${t}`,
          text: historiqueAssemblages[t],
        });
      }
    }
    p.push({ kind: 'end' });
    return p;
  }, [historiqueAssemblages]);

  const [displayIndex, setDisplayIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [introText, setIntroText] = useState(DEFAULT_INTRO_TEMPS1);
  const [editingIntro, setEditingIntro] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  function goTo(target: number) {
    if (animating || target === displayIndex || target < 0 || target >= pages.length) return;
    if (editingIntro) setEditingIntro(false);
    const forward = target > displayIndex;
    setAnimating(true);
    Animated.timing(flipAnim, {
      toValue: forward ? 90 : -90,
      duration: 220,
      useNativeDriver: false,
    }).start(() => {
      setDisplayIndex(target);
      flipAnim.setValue(forward ? -90 : 90);
      Animated.timing(flipAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: false,
      }).start(() => setAnimating(false));
    });
  }

  const rotateY = flipAnim.interpolate({
    inputRange: [-90, 0, 90],
    outputRange: ['-90deg', '0deg', '90deg'],
  });

  const page = pages[displayIndex];
  const canPrev = displayIndex > 0;
  const canNext = displayIndex < pages.length - 1;
  const isDark = page.kind === 'cover' || page.kind === 'end';

  return (
    <SafeAreaView style={s.safe}>

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
          <Text style={s.backText}>← Retour</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => generateAndDownloadPDF({
            titre, dateStr, characters,
            historiqueAssemblages, historiqueContraintes, introText,
          })}
          style={s.dlBtn}
        >
          <Text style={s.dlText}>↓ Télécharger PDF</Text>
        </TouchableOpacity>
      </View>

      {/* ── Book ── */}
      <View style={s.bookWrap}>
        <Animated.View
          style={[
            s.page,
            isDark ? s.pageDark : s.pageLight,
            { transform: [{ perspective: 1200 }, { rotateY }] },
          ]}
        >
          <ScrollView
            style={s.scroll}
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {page.kind === 'cover' && (
              <CoverPage titre={titre} dateStr={dateStr} characters={characters} />
            )}
            {page.kind === 'temps' && (
              <TempsPage
                numero={page.numero}
                text={page.text}
                contrainte={page.numero === 1
                  ? introText
                  : (historiqueContraintes[page.numero] ?? '')}
                editableIntro={isCreator && page.numero === 1}
                editingIntro={editingIntro}
                onToggleEdit={() => setEditingIntro(v => !v)}
                onIntroChange={setIntroText}
              />
            )}
            {page.kind === 'end' && (
              <EndPage titre={titre} dateStr={dateStr} characters={characters} />
            )}
          </ScrollView>

          {/* Invisible edge tap zones */}
          {canPrev && (
            <TouchableOpacity
              style={s.edgeLeft}
              onPress={() => goTo(displayIndex - 1)}
              disabled={animating}
              activeOpacity={0.08}
            />
          )}
          {canNext && (
            <TouchableOpacity
              style={s.edgeRight}
              onPress={() => goTo(displayIndex + 1)}
              disabled={animating}
              activeOpacity={0.08}
            />
          )}
        </Animated.View>
      </View>

      {/* ── Footer ── */}
      <View style={s.footer}>
        <TouchableOpacity
          onPress={() => goTo(displayIndex - 1)}
          style={[s.arrow, !canPrev && s.arrowOff]}
          disabled={!canPrev || animating}
          activeOpacity={0.7}
        >
          <Text style={[s.arrowGlyph, !canPrev && s.arrowGlyphOff]}>‹</Text>
        </TouchableOpacity>

        <View style={s.dots}>
          {pages.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => goTo(i)}
              disabled={animating}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <View style={[s.dot, i === displayIndex && s.dotOn]} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={() => goTo(displayIndex + 1)}
          style={[s.arrow, !canNext && s.arrowOff]}
          disabled={!canNext || animating}
          activeOpacity={0.7}
        >
          <Text style={[s.arrowGlyph, !canNext && s.arrowGlyphOff]}>›</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

// ── Cover page ────────────────────────────────────────────────────────────────

function CoverPage({
  titre, dateStr, characters,
}: { titre: string; dateStr: string; characters: string[] }) {
  return (
    <View style={cvr.root}>
      <View style={cvr.topRule} />
      <View style={cvr.mid}>
        <Text style={cvr.scenarioTag}>LA DERNIÈRE SAISON</Text>
        <Text style={cvr.titre}>{titre}</Text>
      </View>
      <View style={cvr.bottom}>
        <View style={cvr.rule} />
        <Text style={cvr.date}>{dateStr}</Text>
        {characters.length > 0 && (
          <Text style={cvr.chars}>{characters.join('  ·  ')}</Text>
        )}
      </View>
    </View>
  );
}

// ── Temps page ────────────────────────────────────────────────────────────────

function TempsPage({
  numero, text, contrainte,
  editableIntro, editingIntro, onToggleEdit, onIntroChange,
}: {
  numero: number;
  text: string;
  contrainte: string;
  editableIntro?: boolean;
  editingIntro?: boolean;
  onToggleEdit?: () => void;
  onIntroChange?: (t: string) => void;
}) {
  const segments = useMemo(() => parseText(text), [text]);
  return (
    <View style={tmp.root}>
      <View style={tmp.titleBlock}>
        <View style={tmp.stripe} />
        <View style={tmp.titleText}>
          <Text style={tmp.num}>TEMPS {numero}</Text>
          {editableIntro && editingIntro ? (
            <TextInput
              style={tmp.contrainte}
              value={contrainte}
              onChangeText={onIntroChange}
              multiline
              autoFocus
              autoCorrect={false}
              selectionColor="#000000"
            />
          ) : (
            <Text style={tmp.contrainte}>{contrainte}</Text>
          )}
          {editableIntro && (
            <TouchableOpacity onPress={onToggleEdit} style={tmp.editBtn}>
              <Text style={tmp.editBtnText}>{editingIntro ? '✓ Valider' : '✎ modifier'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={tmp.body}>
        {segments.map((seg, i) => {
          if (seg.type === 'transition') {
            return <Text key={i} style={tmp.transition}>[{seg.text}]</Text>;
          }
          if (seg.type === 'dialogue') {
            return <Text key={i} style={tmp.dialogue}>{seg.text}</Text>;
          }
          return <Text key={i} style={tmp.paragraph}>{seg.text}</Text>;
        })}
      </View>
    </View>
  );
}

// ── End page ──────────────────────────────────────────────────────────────────

function EndPage({
  titre, dateStr, characters,
}: { titre: string; dateStr: string; characters: string[] }) {
  return (
    <View style={end.root}>
      <View style={{ flex: 1 }} />
      <View style={end.centerBlock}>
        <Text style={end.theEnd}>THE END</Text>
        <View style={end.rule} />
        <Text style={end.titre}>« {titre} »</Text>
      </View>
      <View style={{ flex: 1 }} />
      <View style={end.footer}>
        <Text style={end.date}>{dateStr}</Text>
        {characters.map((c, i) => (
          <Text key={i} style={end.char}>{c}</Text>
        ))}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0A0A' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  back: { paddingVertical: 4, paddingRight: 12 },
  backText: { fontSize: 14, color: '#555555', letterSpacing: 0.2 },
  dlBtn: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  dlText: { fontSize: 13, color: '#888888', fontWeight: '600' },

  bookWrap: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 6,
  },
  page: {
    flex: 1,
    borderRadius: 3,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 6, height: 10 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
    elevation: 14,
    position: 'relative',
  },
  pageDark: { backgroundColor: '#111111' },
  pageLight: { backgroundColor: '#F7F4EE' },

  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 30, paddingBottom: 48 },

  edgeLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 56,
  },
  edgeRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 56,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },
  arrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#252525',
    backgroundColor: '#141414',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowOff: { opacity: 0.2 },
  arrowGlyph: { fontSize: 26, color: '#FFFFFF', lineHeight: 30, marginTop: -2 },
  arrowGlyphOff: { color: '#555555' },

  dots: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2A2A2A' },
  dotOn: { backgroundColor: '#FFFFFF', width: 20, borderRadius: 3 },
});

const cvr = StyleSheet.create({
  root: { flex: 1, minHeight: 460 },
  topRule: { height: 2, backgroundColor: '#FFFFFF', marginBottom: 0 },
  mid: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 40,
    paddingBottom: 24,
  },
  scenarioTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3A3A3A',
    letterSpacing: 3,
    marginBottom: 20,
  },
  titre: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 44,
  },
  bottom: { paddingTop: 24 },
  rule: { height: 1, backgroundColor: '#222222', marginBottom: 16 },
  date: {
    fontSize: 12,
    color: '#444444',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  chars: {
    fontSize: 13,
    color: '#555555',
    lineHeight: 22,
  },
});

const tmp = StyleSheet.create({
  root: { flex: 1, minHeight: 460 },
  titleBlock: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 14,
    paddingBottom: 22,
    borderBottomWidth: 1,
    borderBottomColor: '#DDDDDD',
    marginBottom: 26,
  },
  stripe: {
    width: 3,
    backgroundColor: '#000000',
    borderRadius: 2,
    flexShrink: 0,
  },
  titleText: { flex: 1 },
  num: {
    fontSize: 10,
    fontWeight: '700',
    color: '#AAAAAA',
    letterSpacing: 2.5,
    marginBottom: 8,
  },
  contrainte: {
    fontSize: 17,
    color: '#111111',
    fontStyle: 'italic',
    lineHeight: 26,
    marginBottom: 2,
  },
  editBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  editBtnText: {
    fontSize: 11,
    color: '#999999',
    letterSpacing: 0.3,
  },
  body: { gap: 18 },
  paragraph: {
    fontSize: 16,
    color: '#111111',
    lineHeight: 28,
  },
  transition: {
    fontSize: 14,
    color: '#888888',
    fontStyle: 'italic',
    lineHeight: 22,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#DDDDDD',
    marginVertical: 2,
  },
  dialogue: {
    fontSize: 16,
    color: '#111111',
    lineHeight: 28,
    paddingLeft: 22,
    borderLeftWidth: 2,
    borderLeftColor: '#BBBBBB',
  },
});

const end = StyleSheet.create({
  root: { flex: 1, minHeight: 460 },
  centerBlock: { alignItems: 'center', gap: 16 },
  theEnd: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 8,
  },
  rule: { width: 40, height: 1, backgroundColor: '#2A2A2A' },
  titre: {
    fontSize: 16,
    color: '#444444',
    fontStyle: 'italic',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  footer: {
    alignItems: 'center',
    gap: 6,
    paddingBottom: 8,
  },
  date: { fontSize: 12, color: '#333333', letterSpacing: 0.5 },
  char: { fontSize: 13, color: '#333333', letterSpacing: 0.2 },
});
