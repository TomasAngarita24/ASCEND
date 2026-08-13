const fallbackApiBaseUrls = [
  'http://192.168.1.17:3000',
  'http://10.0.2.2:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3000',
  'http://192.168.1.1:3000',
  'http://192.168.0.1:3000',
  'http://192.168.0.10:3000',
  'http://172.20.0.1:3000',
  'http://172.16.0.1:3000',
  'http://10.0.0.1:3000',
  'http://10.0.0.2:3000',
] as const;

export const apiBaseUrls = fallbackApiBaseUrls;
