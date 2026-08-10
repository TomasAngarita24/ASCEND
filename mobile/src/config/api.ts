import { Platform } from 'react-native';

export const apiBaseUrl = Platform.select({
  android: 'http://10.0.2.2:3000',
  default: 'http://localhost:3000',
})!;
