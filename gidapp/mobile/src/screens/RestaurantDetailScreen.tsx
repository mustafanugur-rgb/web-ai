import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { apiFetch } from '../api';
import type { CustomerStackParamList } from './HomeScreen';

type Props = {
  navigation: NativeStackNavigationProp<CustomerStackParamList, 'Restaurant'>;
  route: RouteProp<CustomerStackParamList, 'Restaurant'>;
};

type Restaurant = {
  id: string;
  name: string;
  description: string;
  category: string;
  menu: unknown;
};

export function RestaurantDetailScreen({ route }: Props) {
  const { id } = route.params;
  const [r, setR] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<Restaurant>(`/restaurants/public/${id}`);
        setR(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading || !r) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#0d9488" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.pad}>
      <Text style={styles.title}>{r.name}</Text>
      <Text style={styles.cat}>{r.category}</Text>
      <Text style={styles.desc}>{r.description}</Text>
      <Text style={styles.h2}>Menü (JSON)</Text>
      <Text style={styles.mono}>{JSON.stringify(r.menu, null, 2)}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pad: { padding: 16 },
  title: { fontSize: 26, fontWeight: '800' },
  cat: { color: '#0d9488', marginTop: 4, fontWeight: '600' },
  desc: { color: '#475569', marginTop: 12, lineHeight: 22 },
  h2: { marginTop: 24, fontWeight: '700', fontSize: 16 },
  mono: { marginTop: 8, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: undefined }), fontSize: 12, color: '#334155' },
});
