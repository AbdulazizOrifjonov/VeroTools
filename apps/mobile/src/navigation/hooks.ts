import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';

/**
 * Navigation typed against the root stack. `navigate()` bubbles up from nested (tab) stacks, so a screen
 * inside a tab can open root screens (Product, Search, Checkout …) directly.
 */
export function useRootNavigation() {
  return useNavigation<NativeStackNavigationProp<RootStackParamList>>();
}
