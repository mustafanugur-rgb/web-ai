import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { apiFetch } from '../api';
import type { CustomerStackParamList } from './HomeScreen';

type Props = {
  navigation: NativeStackNavigationProp<CustomerStackParamList, 'Split'>;
  route: RouteProp<CustomerStackParamList, 'Split'>;
};

export function SplitScreen({ route }: Props) {
  const { billId } = route.params;
  const [equal, setEqual] = useState<Record<string, number> | null>(null);
  const [byItem, setByItem] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const e = await apiFetch<{ per_user: Record<string, number> }>(
          `/bills/${billId}/split?mode=equal`
        );
        const b = await apiFetch<{ per_user: Record<string, number> }>(
          `/bills/${billId}/split?mode=by_item`
        );
        setEqual(e.per_user);
        setByItem(b.per_user);
      } finally {
        setLoading(false);
      }
    })();
  }, [billId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#0d9488" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.pad}>
      <Text style={styles.h1}>Bölüşüm</Text>
      <Text style={styles.h2}>Eşit</Text>
      {equal &&
        Object.entries(equal).map(([uid, amt]) => (
          <Text key={uid} style={styles.row}>
            {uid.slice(0, 8)}… : {amt.toFixed(2)} ₺
          </Text>
        ))}
      <Text style={styles.h2}>Kaleme göre</Text>
      {byItem &&
        Object.entries(byItem).map(([uid, amt]) => (
          <Text key={uid} style={styles.row}>
            {uid.slice(0, 8)}… : {amt.toFixed(2)} ₺
          </Text>
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pad: { padding: 16 },
  h1: { fontSize: 22, fontWeight: '800', marginBottom: 16 },
  h2: { fontWeight: '700', marginTop: 16, marginBottom: 8, color: '#0d9488' },
  row: { paddingVertical: 6, fontSize: 15 },
});
