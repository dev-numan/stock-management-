import React from 'react';
import { Banner } from 'react-native-paper';
import { sanitizeDisplayMessage } from '../../utils/apiErrors';

export default function ErrorMessage({ message }) {
  const text = sanitizeDisplayMessage(message);
  if (!text) return null;
  return (
    <Banner visible icon="alert-circle" onDismiss={() => {}} style={{ marginBottom: 12, borderRadius: 12 }}>
      {text}
    </Banner>
  );
}
