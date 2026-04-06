import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { apiFetch } from '../api';
import type { CustomerStackParamList } from './HomeScreen';

type Props = {
  navigation: NativeStackNavigationProp<CustomerStackParamList, 'Review'>;
  route: RouteProp<CustomerStackParamList, 'Review'>;
};

export function ReviewScreen({ navigation, route }: Props) {
  const { restaurantId, billId } = route.params;
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async () => {
    setMsg(null);
    try {
      await apiFetch('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          restaurant_id: restaurantId,
          linked_bill_id: billId,
          rating: parseInt(rating, 10) || 5,
          comment,
        }),
      });
      setMsg('Teşekkürler! Yorum kaydedildi.');
      setTimeout(() => navigation.navigate('Home'), 1500);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Hata');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Doğrulanmış yorum</Text>
      <Text style={styles.label}>Puan (1–5)</Text>
      <TextInput style={styles.input} value={rating} onChangeText={setRating} keyboardType="number-pad" />
      <Text style={styles.label}>Yorum</Text>
      <TextInput
        style={[styles.input, styles.area]}
        value={comment}
        onChangeText={setComment}
        multiline
        placeholder="Deneyiminizi yazın"
      />
      {msg ? <Text style={styles.msg}>{msg}</Text> : null}
      <Pressable style={styles.btn} onPress={submit}>
        <Text style={styles.btnText}>Gönder</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  h1: { fontSize: 22, fontWeight: '800', marginBottom: 16 },
  label: { fontWeight: '600', marginBottom: 4, color: '#475569' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  area: { minHeight: 100, textAlignVertical: 'top' },
  msg: { color: '#0d9488', marginBottom: 8 },
  btn: { backgroundColor: '#0d9488', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '700' },
});
