import React from 'react';
import { Tabs } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { Ionicons } from '@expo/vector-icons';
import { useDatabaseCompatibility } from '../src/bootstrap/useDatabaseCompatibility';

export default function RootLayout() {
  useKeepAwake();
  const { ready } = useDatabaseCompatibility();
  if (!ready) {
    return <GestureHandlerRootView style={styles.container} />;
  }
  return (
    <GestureHandlerRootView style={styles.container}>
      <Tabs
        initialRouteName="session"
        detachInactiveScreens={false}
        lazy={false}
        screenOptions={{
          headerShown: false,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            href: null, // ルートは /session へリダイレクトするだけでタブには出さない
          }}
        />
        <Tabs.Screen
          name="session"
          options={{
            title: 'セッション',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="pulse-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="logs"
          options={{
            title: '履歴',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="time-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
