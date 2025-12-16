import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

export type GuidePhase = 'INHALE' | 'HOLD' | 'EXHALE' | 'PULSE';

type Props = {
  phase: GuidePhase;
  tick?: number;
  testID?: string;
  accessibilityLabel?: string;
};

type PhaseStyle = {
  color: string;
  sequence: number[]; // 連続したscale値
  durations: number[]; // sequenceと同じ長さ
};

const phaseStyles: Record<GuidePhase, PhaseStyle> = {
  INHALE: { color: '#b8e1ff', sequence: [1.12, 1], durations: [500, 300] },
  HOLD: { color: '#d8def7', sequence: [1.05, 1], durations: [400, 250] },
  EXHALE: { color: '#cde4ff', sequence: [0.9, 1], durations: [500, 300] },
  // 心拍らしさを出すために「縮む→少し戻る」のシーケンス
  PULSE: { color: '#cde4ff', sequence: [0.9, 1.05, 1], durations: [160, 140, 140] },
};

export const VisualGuide = ({ phase, tick = 0, testID, accessibilityLabel }: Props) => {
  const scale = useRef(new Animated.Value(1)).current;
  const { color, sequence, durations } = phaseStyles[phase];

  useEffect(() => {
    const anims = sequence.map((value, idx) =>
      Animated.timing(scale, {
        toValue: value,
        duration: durations[idx] ?? durations[durations.length - 1],
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    Animated.sequence(anims).start();
  }, [phase, sequence, durations, scale, tick]);

  return (
    <View style={styles.container} testID={testID} accessibilityLabel={accessibilityLabel ?? phase}>
      <Animated.View style={[styles.circle, { backgroundColor: color, transform: [{ scale }] }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  circle: { width: 160, height: 160, borderRadius: 80, backgroundColor: '#cde4ff' },
});
