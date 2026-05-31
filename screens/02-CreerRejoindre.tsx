import { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, TextInput, Platform, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../data/navigationTypes';
import { connectSocket, getSocket } from '../services/socket';
import { useGame } from '../contexts/GameContext';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CreerRejoindre'>;
type Route = RouteProp<RootStackParamList, 'CreerRejoindre'>;

const PLAYER_OPTIONS = [2, 3, 4, 5, 6];

export default function CreerRejoindreScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { mode } = route.params;

  const { setSession } = useGame();

  const [inputCode, setInputCode] = useState('');
  const [playerCount, setPlayerCount] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clean up listeners if the screen unmounts while waiting
  useEffect(() => {
    return () => {
      const s = getSocket();
      s.off('session:created');
      s.off('session:joined');
      s.off('session:error');
    };
  }, []);

  function handleCreer() {
    setLoading(true);
    setError(null);

    const socket = connectSocket();

    socket.once('session:created', (data: {
      code: string; playerCount: number; totalConnected: number;
    }) => {
      setSession(data.code, data.playerCount, 0); // creator is always index 0
      navigation.navigate('SalleAttente', {
        sessionCode: data.code,
        playerCount: data.playerCount,
        isCreator: true,
        initialConnected: data.totalConnected,
      });
    });

    socket.once('session:error', ({ message }: { message: string }) => {
      setError(message);
      setLoading(false);
    });

    socket.emit('session:create', { playerCount });
  }

  function handleRejoindre() {
    if (inputCode.length < 4) return;
    setLoading(true);
    setError(null);

    const socket = connectSocket();

    socket.once('session:joined', (data: {
      code: string; playerCount: number; totalConnected: number; playerIndex: number;
    }) => {
      setSession(data.code, data.playerCount, data.playerIndex);
      navigation.navigate('SalleAttente', {
        sessionCode: data.code,
        playerCount: data.playerCount,
        isCreator: false,
        initialConnected: data.totalConnected,
      });
    });

    socket.once('session:error', ({ message }: { message: string }) => {
      setError(message);
      setLoading(false);
    });

    socket.emit('session:join', { code: inputCode });
  }

  function handleCopy() {
    // Code is shown on screen; clipboard would need a real code from server
    if (Platform.OS === 'web') {
      navigator.clipboard?.writeText('');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()} disabled={loading}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>

        <View style={styles.hero}>
          {mode === 'creer' ? (
            <>
              <Text style={styles.title}>Créer{'\n'}une partie</Text>
              <Text style={styles.subtitle}>Le code sera généré au démarrage</Text>

              <View style={styles.pickerSection}>
                <Text style={styles.pickerLabel}>Nombre de joueurs</Text>
                <View style={styles.pickerRow}>
                  {PLAYER_OPTIONS.map(n => (
                    <TouchableOpacity
                      key={n}
                      style={[styles.pickerBtn, playerCount === n && styles.pickerBtnActive]}
                      onPress={() => setPlayerCount(n)}
                      activeOpacity={0.75}
                      disabled={loading}
                    >
                      <Text style={[styles.pickerBtnText, playerCount === n && styles.pickerBtnTextActive]}>
                        {n}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.title}>Rejoindre{'\n'}une partie</Text>
              <Text style={styles.subtitle}>Entre le code de session</Text>
              <TextInput
                style={[styles.input, loading && styles.inputDisabled]}
                value={inputCode}
                onChangeText={t => { setInputCode(t.toUpperCase().slice(0, 4)); setError(null); }}
                placeholder="XXXX"
                placeholderTextColor="#444444"
                maxLength={4}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!loading}
              />
            </>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        <View style={styles.actions}>
          {mode === 'creer' ? (
            <TouchableOpacity
              style={[styles.buttonPrimary, loading && styles.buttonDisabled]}
              onPress={handleCreer}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#111111" />
                : <Text style={styles.buttonPrimaryText}>Créer la session →</Text>
              }
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.buttonPrimary,
                (inputCode.length < 4 || loading) && styles.buttonDisabled,
              ]}
              onPress={handleRejoindre}
              disabled={inputCode.length < 4 || loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#111111" />
                : <Text style={styles.buttonPrimaryText}>Rejoindre →</Text>
              }
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
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 48,
  },
  back: {
    marginBottom: 16,
  },
  backText: {
    color: '#555555',
    fontSize: 15,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    gap: 0,
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 52,
    marginBottom: 16,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 17,
    color: '#A0A0A0',
    marginBottom: 24,
  },
  pickerSection: {
    gap: 12,
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555555',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pickerBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  pickerBtnActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  pickerBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#555555',
  },
  pickerBtnTextActive: {
    color: '#111111',
  },
  input: {
    backgroundColor: '#1C1C1C',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 24,
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 12,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  inputDisabled: {
    opacity: 0.5,
  },
  errorText: {
    marginTop: 16,
    fontSize: 14,
    color: '#FF4444',
    textAlign: 'center',
  },
  actions: {
    gap: 12,
  },
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
  buttonDisabled: {
    opacity: 0.35,
  },
});
