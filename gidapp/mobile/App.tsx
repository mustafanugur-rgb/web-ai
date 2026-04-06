import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthProvider, useAuth } from './src/AuthContext';
import { AdminPanelScreen } from './src/screens/AdminPanelScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { BillScreen } from './src/screens/BillScreen';
import type { CustomerStackParamList } from './src/screens/HomeScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { RestaurantDetailScreen } from './src/screens/RestaurantDetailScreen';
import { RestaurantPanelScreen } from './src/screens/RestaurantPanelScreen';
import { ReviewScreen } from './src/screens/ReviewScreen';
import { ScanScreen } from './src/screens/ScanScreen';
import { SplitScreen } from './src/screens/SplitScreen';

const CustomerStack = createNativeStackNavigator<CustomerStackParamList>();
const RestStack = createNativeStackNavigator();
const AdminStack = createNativeStackNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: '#f8fafc' },
};

function CustomerNavigator() {
  const { logout } = useAuth();
  return (
    <CustomerStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#f8fafc' },
        headerShadowVisible: false,
      }}
    >
      <CustomerStack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'GidApp',
          headerRight: () => (
            <Pressable onPress={() => logout()} style={styles.hdrBtn}>
              <Text style={styles.hdrTxt}>Çıkış</Text>
            </Pressable>
          ),
        }}
      />
      <CustomerStack.Screen name="Restaurant" component={RestaurantDetailScreen} options={{ title: 'Restoran' }} />
      <CustomerStack.Screen name="Scan" component={ScanScreen} options={{ title: 'QR' }} />
      <CustomerStack.Screen name="Bill" component={BillScreen} options={{ title: 'Adisyon' }} />
      <CustomerStack.Screen name="Split" component={SplitScreen} options={{ title: 'Bölüşüm' }} />
      <CustomerStack.Screen name="Review" component={ReviewScreen} options={{ title: 'Yorum' }} />
    </CustomerStack.Navigator>
  );
}

function RestaurantNavigator() {
  const { logout } = useAuth();
  return (
    <RestStack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#f8fafc' } }}>
      <RestStack.Screen
        name="RestaurantMain"
        options={{
          title: 'Restoran',
          headerRight: () => (
            <Pressable onPress={() => logout()} style={styles.hdrBtn}>
              <Text style={styles.hdrTxt}>Çıkış</Text>
            </Pressable>
          ),
        }}
        component={RestaurantPanelScreen}
      />
    </RestStack.Navigator>
  );
}

function AdminNavigator() {
  const { logout } = useAuth();
  return (
    <AdminStack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#f8fafc' } }}>
      <AdminStack.Screen
        name="AdminMain"
        options={{
          title: 'Admin',
          headerRight: () => (
            <Pressable onPress={() => logout()} style={styles.hdrBtn}>
              <Text style={styles.hdrTxt}>Çıkış</Text>
            </Pressable>
          ),
        }}
        component={AdminPanelScreen}
      />
    </AdminStack.Navigator>
  );
}

function Root() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#0d9488" />
      </View>
    );
  }
  if (!user) {
    return <AuthScreen />;
  }
  return (
    <NavigationContainer theme={navTheme}>
      {user.role === 'CUSTOMER' && <CustomerNavigator />}
      {user.role === 'RESTAURANT' && <RestaurantNavigator />}
      {user.role === 'ADMIN' && <AdminNavigator />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Root />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  hdrBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  hdrTxt: { color: '#0d9488', fontWeight: '700' },
});
