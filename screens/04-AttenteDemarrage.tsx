import { useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View,
  SafeAreaView, Animated,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../data/navigationTypes';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AttenteDemarrage'>;
type Route = RouteProp<RootStackParamList, 'AttenteDemarrage'>;

export default function AttenteDemarrageScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { isCreator } = route.params;
  const spinValue = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    spinAnim.current = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1600,
        useNativeDriver: false,
      }),
    );
    spinAnim.current.start();
    return () => spinAnim.current?.stop();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => navigation.navigate('Ecriture', { temps: 1, isCreator }), 3000);
    return () => clearTimeout(timer);
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]} />
        <Text style={styles.title}>C'est parti !</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 40,
  },
  spinner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: '#222222',
    borderTopColor: '#6366F1',
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textAlign: 'center',
  },

});
