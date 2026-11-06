import { PropsWithChildren } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
export function Screen({ children }: PropsWithChildren) {
  return <SafeAreaView style={styles.safe}><View style={styles.content}>{children}</View></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#F7FAF6' }, content: { padding: 20, gap: 14, flex: 1 } });
