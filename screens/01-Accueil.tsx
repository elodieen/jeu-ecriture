import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../data/navigationTypes';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Accueil'>;

export default function AccueilScreen() {
  const navigation = useNavigation<Nav>();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        <View style={styles.hero}>
          <Text style={styles.title}>Prêts à écrire ?</Text>
          <Text style={styles.subtitle}>
            L'histoire est à vous. À vous d'écrire la fin.
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={() => navigation.navigate('CreerRejoindre', { mode: 'creer' })}
          >
            <Text style={styles.buttonPrimaryText}>Créer une partie</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonSecondary}
            onPress={() => navigation.navigate('CreerRejoindre', { mode: 'rejoindre' })}
          >
            <Text style={styles.buttonSecondaryText}>Rejoindre une partie</Text>
          </TouchableOpacity>

          <Text style={styles.hint}>Pas de compte requis</Text>
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
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 48,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 56,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 60,
    marginBottom: 24,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 17,
    color: '#A0A0A0',
    lineHeight: 26,
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
  buttonSecondary: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  buttonSecondaryText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '500',
  },
  hint: {
    textAlign: 'center',
    color: '#555555',
    fontSize: 14,
    marginTop: 4,
  },
});
