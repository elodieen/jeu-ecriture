import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '../data/navigationTypes';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateTo<K extends keyof RootStackParamList>(
  screen: K,
  params: RootStackParamList[K],
) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(screen, params as never);
  }
}
