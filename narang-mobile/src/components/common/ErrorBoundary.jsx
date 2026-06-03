import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text, Button } from 'react-native-paper';

/**
 * Top-level error boundary. Catches uncaught render/runtime errors anywhere in
 * the tree and shows a recoverable fallback instead of a white screen / crash.
 * Wrap the whole app with this in App.js.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Keep a console trace for crash reports / adb logcat.
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Uncaught error:', error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
        >
          <Text variant="headlineSmall" style={{ fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
            Something went wrong
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: '#555', textAlign: 'center', marginBottom: 24 }}
          >
            The app hit an unexpected error. You can try again — your saved data is safe.
          </Text>
          {__DEV__ && this.state.error ? (
            <Text
              variant="bodySmall"
              style={{ color: '#b00020', textAlign: 'center', marginBottom: 24 }}
            >
              {String(this.state.error?.message || this.state.error)}
            </Text>
          ) : null}
          <Button mode="contained" onPress={this.handleReset}>
            Try again
          </Button>
        </ScrollView>
      </View>
    );
  }
}
