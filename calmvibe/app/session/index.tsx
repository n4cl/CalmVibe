import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SessionScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>セッション</Text>
      <Text style={styles.body}>ここから鎮静セッションを開始・終了します。</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 8 },
  body: { fontSize: 16, color: '#555' },
});
