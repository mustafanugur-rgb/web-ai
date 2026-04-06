import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { apiFetch } from '../api';
import type { CustomerStackParamList } from './HomeScreen';

type Bill = {
  id: string;
  restaurant_id: string;
  items: { name: string; price: number; quantity: number; added_by_user_id: string }[];
  total_amount: number;
  status: string;
  user_ids: string[];
};

type Props = {
  navigation: NativeStackNavigationProp<CustomerStackParamList, 'Bill'>;
  route: RouteProp<CustomerStackParamList, 'Bill'>;
};

export function BillScreen({ navigation, route }: Props) {
  const { billId } = route.params;
  const [bill, setBill] = useState<Bill | null>(null);
  const [name, setName] = useState('Ürün');
  const [price, setPrice] = useState('25');
  const [qty, setQty] = useState('1');
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const b = await apiFetch<Bill>(`/bills/${billId}`);
      setBill(b);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Hata');
    }
  }, [billId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const addLine = async () => {
    setErr(null);
    try {
      await apiFetch(`/bills/${billId}/items`, {
        method: 'POST',
        body: JSON.stringify({
          name,
          price: parseFloat(price) || 0,
          quantity: parseInt(qty, 10) || 1,
        }),
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Hata');
    }
  };

  const markPaid = async () => {
    setErr(null);
    try {
      await apiFetch(`/bills/${billId}/mark-paid`, { method: 'POST' });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Hata');
    }
  };

  if (!bill) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#0d9488" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.pad}>
      <Text style={styles.title}>Adisyon</Text>
      <Text style={styles.meta}>Durum: {bill.status}</Text>
      <Text style={styles.total}>Toplam: {bill.total_amount.toFixed(2)} ₺</Text>
      {err ? <Text style={styles.err}>{err}</Text> : null}

      <Text style={styles.h2}>Kalemler</Text>
      {bill.items.map((it, i) => (
        <View key={i} style={styles.line}>
          <Text>
            {it.name} × {it.quantity} — {(it.price * it.quantity).toFixed(2)} ₺
          </Text>
        </View>
      ))}

      {bill.status === 'OPEN' && (
        <>
          <Text style={styles.h2}>Satır ekle (MVP)</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ad" />
          <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          <TextInput style={styles.input} value={qty} onChangeText={setQty} keyboardType="number-pad" />
          <Pressable style={styles.btn} onPress={addLine}>
            <Text style={styles.btnText}>Ekle</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnSec]} onPress={markPaid}>
            <Text style={styles.btnTextDark}>Ödendi işaretle</Text>
          </Pressable>
        </>
      )}

      <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => navigation.navigate('Split', { billId })}>
        <Text style={styles.btnTextDark}>Hesabı böl</Text>
      </Pressable>
      {bill.status === 'PAID' && (
        <Pressable
          style={[styles.btn, styles.btnGhost]}
          onPress={() =>
            navigation.navigate('Review', { restaurantId: bill.restaurant_id, billId: bill.id })
          }
        >
          <Text style={styles.btnTextDark}>Yorum yaz</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pad: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800' },
  meta: { color: '#64748b', marginTop: 4 },
  total: { fontSize: 20, fontWeight: '700', color: '#0d9488', marginVertical: 12 },
  err: { color: '#dc2626' },
  h2: { fontWeight: '700', marginTop: 16, marginBottom: 8 },
  line: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  btn: { backgroundColor: '#0d9488', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnSec: { backgroundColor: '#e0f2fe' },
  btnGhost: { backgroundColor: '#f1f5f9' },
  btnText: { color: '#fff', fontWeight: '700' },
  btnTextDark: { color: '#0f172a', fontWeight: '700' },
});
