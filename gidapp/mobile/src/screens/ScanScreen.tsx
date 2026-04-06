import { CameraView, useCameraPermissions } from 'expo-camera';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { apiFetch } from '../api';
import type { CustomerStackParamList } from './HomeScreen';

type Props = { navigation: NativeStackNavigationProp<CustomerStackParamList, 'Scan'> };

export function ScanScreen({ navigation }: Props) {
  const [manual, setManual] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);

  const parseAndScan = async (raw: string) => {
    setErr(null);
    let payload: { restaurant_id: string; table_id: string; token: string };
    try {
      payload = JSON.parse(raw.trim());
    } catch {
      setErr('Geçersiz QR içeriği (JSON bekleniyor)');
      return;
    }
    if (!payload.restaurant_id || !payload.table_id || !payload.token) {
      setErr('restaurant_id, table_id, token gerekli');
      return;
    }
    try {
      const res = await apiFetch<{ bill: { id: string } }>('/tables/scan', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      navigation.replace('Bill', { billId: res.bill.id });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Hata');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Masa QR</Text>
      <Text style={styles.hint}>
        QR içeriği JSON: {'{'} &quot;restaurant_id&quot;, &quot;table_id&quot;, &quot;token&quot; {'}'}
      </Text>

      {permission?.granted && scanning ? (
        <View style={styles.camWrap}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => {
              setScanning(false);
              parseAndScan(data);
            }}
          />
          <Pressable style={styles.closeCam} onPress={() => setScanning(false)}>
            <Text style={styles.closeCamTxt}>Kapat</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={styles.btn}
          onPress={async () => {
            if (!permission?.granted) {
              const r = await requestPermission();
              if (!r.granted) return;
            }
            setScanning(true);
          }}
        >
          <Text style={styles.btnText}>Kamerayı aç</Text>
        </Pressable>
      )}

      <Text style={styles.or}>veya yapıştır</Text>
      <TextInput
        style={styles.input}
        placeholder="JSON"
        multiline
        value={manual}
        onChangeText={setManual}
      />
      {err ? <Text style={styles.err}>{err}</Text> : null}
      <Pressable style={styles.btn} onPress={() => parseAndScan(manual)}>
        <Text style={styles.btnText}>Adisyona git</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  h1: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  hint: { color: '#64748b', marginBottom: 16, fontSize: 13 },
  camWrap: { height: 280, borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  camera: { flex: 1 },
  closeCam: { position: 'absolute', bottom: 12, alignSelf: 'center', backgroundColor: '#0008', padding: 10, borderRadius: 8 },
  closeCamTxt: { color: '#fff', fontWeight: '700' },
  btn: { backgroundColor: '#0d9488', padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  btnText: { color: '#fff', fontWeight: '700' },
  or: { textAlign: 'center', color: '#94a3b8', marginVertical: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 12,
    minHeight: 100,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  err: { color: '#dc2626', marginBottom: 8 },
});
