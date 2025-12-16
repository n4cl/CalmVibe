import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

export type GuidePhase = 'INHALE' | 'HOLD' | 'EXHALE' | 'PULSE';

type Props = {
  phase: GuidePhase;
  tick?: number;
  phaseDurations?: Partial<Record<GuidePhase, number>>; // ms
  testID?: string;
  accessibilityLabel?: string;
};

const baseScale = 1;
const maxScale = 1.12;
const minScaleBreath = 0.6; // 吐き切り感をさらに強調
const minScalePulse = 0.9;
// 振動ガイドの最大スケールに合わせる
const pulseSeq = { seq: [minScalePulse, maxScale, 1], durations: [160, 140, 140] };

export const VisualGuide = ({ phase, tick = 0, phaseDurations, testID, accessibilityLabel }: Props) => {
  const scale = useRef(new Animated.Value(minScaleBreath)).current;
  const currentScale = useRef(minScaleBreath);

  useEffect(() => {
    const inhaleMs = phaseDurations?.INHALE ?? 500;
    const holdMs = phaseDurations?.HOLD ?? 300;
    const exhaleMs = phaseDurations?.EXHALE ?? 500;

    const runSeq = (values: number[], durations: number[]) => {
      const anims = values.map((v, i) =>
        Animated.timing(scale, {
          toValue: v,
          duration: durations[i] ?? durations[durations.length - 1],
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        })
      );
      Animated.sequence(anims).start(() => {
        currentScale.current = values[values.length - 1];
      });
    };

    switch (phase) {
      case 'INHALE':
        // 吸う時間いっぱいで最大値に到達
        runSeq([maxScale], [inhaleMs]);
        break;
      case 'HOLD':
        // スケールを維持し時間だけ経過させる
        runSeq([currentScale.current], [holdMs]);
        break;
      case 'EXHALE':
        // 吐く時間いっぱいで最小値に到達（戻さない）
        runSeq([minScaleBreath], [exhaleMs]);
        break;
      case 'PULSE':
      default:
        runSeq(pulseSeq.seq, pulseSeq.durations);
        break;
    }
  }, [phase, phaseDurations, scale, tick]);

  const color = phase === 'HOLD' ? '#d8def7' : '#b8e1ff';

  return (
    <View style={styles.container} testID={testID} accessibilityLabel={accessibilityLabel ?? phase}>
      <Animated.View
        style={[
          styles.circle,
          {
            backgroundColor: color,
            transform: [{ scale }],
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  circle: { width: 160, height: 160, borderRadius: 80, backgroundColor: '#cde4ff' },
});
