import React from 'react';
import { Image } from 'react-native';

const LOGO = require('../../../assets/logo.png');

export default function AppLogo({ size = 96, style }) {
  return (
    <Image
      source={LOGO}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      accessibilityLabel="Hafeez Zarai Markaz logo"
    />
  );
}
