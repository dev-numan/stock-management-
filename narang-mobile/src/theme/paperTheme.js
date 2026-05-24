import { MD3LightTheme } from 'react-native-paper';

export const appTheme = {
  ...MD3LightTheme,
  roundness: 12,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2E7D32',
    onPrimary: '#FFFFFF',
    primaryContainer: '#C8E6C9',
    onPrimaryContainer: '#1B5E20',
    secondary: '#FFA000',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#FFE082',
    tertiary: '#1565C0',
    background: '#F3F4F6',
    surface: '#FFFFFF',
    surfaceVariant: '#F9FAFB',
    error: '#DC2626',
    onError: '#FFFFFF',
    outline: '#D1D5DB',
    onSurface: '#111827',
    onSurfaceVariant: '#6B7280',
    elevation: {
      ...MD3LightTheme.colors.elevation,
      level1: '#FFFFFF',
      level2: '#FFFFFF',
    },
  },
};

export const stackScreenOptions = (theme) => ({
  headerStyle: { backgroundColor: theme.colors.primary },
  headerTintColor: theme.colors.onPrimary,
  headerTitleStyle: { fontWeight: '600', fontSize: 17 },
  headerShadowVisible: false,
  headerBackVisible: true,
  contentStyle: { backgroundColor: theme.colors.background },
});
