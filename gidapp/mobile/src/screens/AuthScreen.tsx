import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '../AuthContext';

export function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'CUSTOMER' | 'RESTAURANT'>('CUSTOMER');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      if (mode === 'login') await login(email.trim(), password);
      else await register(email.trim(), password, role);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <Text style={styles.logo}>GidApp</Text>
      <Text style={styles.sub}>Keşfet · Adisyon · POS hazır</Text>

      <View style={styles.tabs}>
        <Pressable onPress={() => setMode('login')} style={[styles.tab, mode === 'login' && styles.tabOn]}>
          <Text style={styles.tabText}>Giriş</Text>
        </Pressable>
        <Pressable
          onPress={() => setMode('register')}
          style={[styles.tab, mode === 'register' && styles.tabOn]}
        >
          <Text style={styles.tabText}>Kayıt</Text>
        </Pressable>
      </View>

      {mode === 'register' && (
        <View style={styles.roleRow}>
          <Pressable
            onPress={() => setRole('CUSTOMER')}
            style={[styles.roleBtn, role === 'CUSTOMER' && styles.roleOn]}
          >
            <Text style={styles.roleTxt}>Müşteri</Text>
          </Pressable>
          <Pressable
            onPress={() => setRole('RESTAURANT')}
            style={[styles.roleBtn, role === 'RESTAURANT' && styles.roleOn]}
          >
            <Text style={styles.roleTxt}>Restoran</Text>
          </Pressable>
        </View>
      )}

      <TextInput
        style={styles.input}
        placeholder="E-posta"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Şifre"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {err ? <Text style={styles.err}>{err}</Text> : null}
      <Pressable style={styles.btn} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Devam</Text>}
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#f8fafc' },
  logo: { fontSize: 32, fontWeight: '800', color: '#0f766e', textAlign: 'center' },
  sub: { textAlign: 'center', color: '#64748b', marginBottom: 28 },
  tabs: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  tab: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#e2e8f0', alignItems: 'center' },
  tabOn: { backgroundColor: '#ccfbf1' },
  tabText: { fontWeight: '600', color: '#334155' },
  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  roleBtn: { flex: 1, padding: 10, borderRadius: 8, backgroundColor: '#e2e8f0', alignItems: 'center' },
  roleOn: { backgroundColor: '#99f6e4' },
  roleTxt: { fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  err: { color: '#dc2626', marginBottom: 8 },
  btn: {
    backgroundColor: '#0d9488',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
