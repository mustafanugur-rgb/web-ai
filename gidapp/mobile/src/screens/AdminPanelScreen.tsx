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

export function AdminPanelScreen() {
  const [earn, setEarn] = useState<{ total_commission: number; paid_bills_count: number } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const a = await apiFetch<{ total_commission: number; paid_bills_count: number }>(
        '/analytics/platform'
      );
      setEarn({ total_commission: a.total_commission, paid_bills_count: a.paid_bills_count });
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.pad}>
      <Text style={styles.h1}>Admin</Text>
      {err ? <Text style={styles.err}>{err}</Text> : null}
      {earn && (
        <View style={styles.card}>
          <Text style={styles.label}>Platform komisyon geliri</Text>
          <Text style={styles.big}>{earn.total_commission.toFixed(2)} ₺</Text>
          <Text style={styles.sub}>Ödenen adisyon: {earn.paid_bills_count}</Text>
        </View>
      )}
      <Text style={styles.note}>
        Kullanıcı / restoran / adisyon listeleri için Swagger: GET /api/admin/*
      </Text>
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
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  label: { color: '#64748b' },
  big: { fontSize: 26, fontWeight: '800', color: '#0d9488', marginVertical: 8 },
  sub: { color: '#475569' },
  note: { color: '#94a3b8', fontSize: 13, marginVertical: 12 },
  btn: { backgroundColor: '#0f172a', padding: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
});
