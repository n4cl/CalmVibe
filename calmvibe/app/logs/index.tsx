import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function LogsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>履歴</Text>
      <Text style={styles.body}>セッションの前後心拍や体感を振り返ります。</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 8 },
  body: { fontSize: 16, color: '#555' },
});
