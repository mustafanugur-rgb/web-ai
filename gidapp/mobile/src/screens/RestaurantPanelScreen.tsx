import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { apiFetch } from '../api';

export type RestStackParamList = {
  RestaurantMain: undefined;
};

type Props = { navigation: NativeStackNavigationProp<RestStackParamList, 'RestaurantMain'> };

type Summary = {
  total_earnings: number;
  commission_to_platform: number;
  completed_bills: number;
  average_bill_amount: number;
};

export function RestaurantPanelScreen({}: Props) {
  const [restId, setRestId] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const mine = await apiFetch<{ id: string }[]>('/restaurants/mine');
      if (!mine.length) {
        setRestId(null);
        setSummary(null);
        return;
      }
      const id = mine[0].id;
      setRestId(id);
      const s = await apiFetch<Summary>(`/restaurant-dashboard/${id}/summary`);
      setSummary(s);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Hata');
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
        <ActivityIndicator color="#0d9488" />
      </View>
    );
  }

  if (!restId) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>Önce API üzerinden restoran profili oluşturun (/api/restaurants).</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.pad}>
      <Text style={styles.h1}>Restoran paneli</Text>
      {err ? <Text style={styles.err}>{err}</Text> : null}
      {summary && (
        <>
          <View style={styles.card}>
            <Text style={styles.label}>Toplam ciro</Text>
            <Text style={styles.big}>{summary.total_earnings.toFixed(2)} ₺</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Platform komisyonu</Text>
            <Text style={styles.val}>{summary.commission_to_platform.toFixed(2)} ₺</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Tamamlanan adisyon</Text>
            <Text style={styles.val}>{summary.completed_bills}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Ortalama adisyon</Text>
            <Text style={styles.val}>{summary.average_bill_amount.toFixed(2)} ₺</Text>
          </View>
        </>
      )}
      <Pressable style={styles.btn} onPress={load}>
        <Text style={styles.btnText}>Yenile</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pad: { padding: 16 },
  h1: { fontSize: 24, fontWeight: '800', marginBottom: 16 },
  err: { color: '#dc2626', marginBottom: 8 },
  empty: { padding: 16, color: '#64748b' },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  label: { color: '#64748b', fontSize: 13 },
  big: { fontSize: 28, fontWeight: '800', color: '#0d9488', marginTop: 4 },
  val: { fontSize: 20, fontWeight: '700', marginTop: 4 },
  btn: { backgroundColor: '#0d9488', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '700' },
});
