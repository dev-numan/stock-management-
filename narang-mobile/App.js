import './global.css';
import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider, Portal } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/common/ErrorBoundary';
import OfflineBanner from './src/components/common/OfflineBanner';
import { useNetworkSync } from './src/hooks/useNetworkSync';
import { appTheme } from './src/theme/paperTheme';

function AppRoot() {
  useNetworkSync();

  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
      <AppNavigator />
      <StatusBar style="light" />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={appTheme}>
        <Portal.Host>
          <ErrorBoundary>
            <AuthProvider>
              <CartProvider>
                <AppRoot />
              </CartProvider>
            </AuthProvider>
          </ErrorBoundary>
        </Portal.Host>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
