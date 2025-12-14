import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

export const BreathVisualGuide = ({ running, cycle }: { running: boolean; cycle: number }) => {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!running) {
      scale.setValue(1);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.3, duration: 800, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [running, scale, cycle]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.circle, { transform: [{ scale }] }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  circle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#cde4ff',
  },
});
