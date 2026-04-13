import { Platform } from 'react-native';

type HapticStyle = 'light' | 'medium' | 'heavy';

export function triggerHaptic(style: HapticStyle = 'light') {
  if (Platform.OS === 'web') return;

  try {
    const Haptics = require('expo-haptics');
    const map: Record<HapticStyle, unknown> = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
    };
    Haptics.impactAsync(map[style]);
  } catch {
    // expo-haptics not available
  }
}
