import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { apiFetch } from '../api';

type R = {
  id: string;
  name: string;
  description: string;
  category: string;
};

export type CustomerStackParamList = {
  Home: undefined;
  Restaurant: { id: string };
  Scan: undefined;
  Bill: { billId: string };
  Split: { billId: string };
  Review: { restaurantId: string; billId: string };
};

type Props = { navigation: NativeStackNavigationProp<CustomerStackParamList, 'Home'> };

export function HomeScreen({ navigation }: Props) {
  const [list, setList] = useState<R[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const data = await apiFetch<R[]>('/restaurants/public');
      setList(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Yükleme hatası');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0d9488" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.h1}>Restoranlar</Text>
        <Pressable style={styles.scanBtn} onPress={() => navigation.navigate('Scan')}>
          <Text style={styles.scanTxt}>QR Tara</Text>
        </Pressable>
      </View>
      {err ? <Text style={styles.err}>{err}</Text> : null}
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={load}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate('Restaurant', { id: item.id })}
          >
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.cat}>{item.category || 'Genel'}</Text>
            <Text style={styles.desc} numberOfLines={2}>
              {item.description}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
  },
  h1: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  scanBtn: { backgroundColor: '#0d9488', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  scanTxt: { color: '#fff', fontWeight: '700' },
  err: { color: '#dc2626', paddingHorizontal: 16 },
  list: { padding: 16, paddingTop: 0 },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  name: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  cat: { color: '#0d9488', marginTop: 4, fontWeight: '600' },
  desc: { color: '#64748b', marginTop: 8 },
});
