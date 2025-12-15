import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

export type GuidePhase = 'INHALE' | 'HOLD' | 'EXHALE' | 'PULSE';

export const VisualGuide = ({ phase }: { phase: GuidePhase }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const color = phase === 'INHALE' ? '#b8e1ff' : phase === 'HOLD' ? '#d8def7' : '#cde4ff';
  const target = phase === 'PULSE' ? 1.2 : phase === 'INHALE' ? 1.15 : phase === 'EXHALE' ? 0.95 : 1.0;

  useEffect(() => {
    Animated.timing(scale, {
      toValue: target,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [target, scale]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.circle, { backgroundColor: color, transform: [{ scale }] }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  circle: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#cde4ff' },
});
