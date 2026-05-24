import React from 'react';
import { Banner } from 'react-native-paper';

export default function ErrorMessage({ message }) {
  if (!message) return null;
  return (
    <Banner visible icon="alert-circle" onDismiss={() => {}} style={{ marginBottom: 12, borderRadius: 12 }}>
      {message}
    </Banner>
  );
}
