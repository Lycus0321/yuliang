import { BlurView } from 'expo-blur';
import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, shadow } from '../theme';

type Props = PropsWithChildren<{
  style?: ViewStyle | ViewStyle[];
}>;

export function GlassPanel({ children, style }: Props) {
  return (
    <View style={[styles.outer, style]}>
      <BlurView intensity={34} style={StyleSheet.absoluteFill} tint="light" />
      <View style={styles.tint}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderColor: 'rgba(255,255,255,0.78)',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadow,
  },
  tint: {
    backgroundColor: 'rgba(255,255,255,0.52)',
    flex: 1,
  },
});
