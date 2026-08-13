export const colors = {
  background: '#040816',
  surface: '#0f1417',
  card: '#0b1116',
  accent: '#22c55e',
  accentAlt: '#2563eb',
  text: '#E6EEF3',
  muted: '#94a3b8',
  danger: '#ef4444',
};

export const typography = {
  h1: 30,
  h2: 26,
  h3: 20,
  body: 16,
  caption: 12,
};

export const spacing = (units: number) => units * 8;

export const shadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.45,
  shadowRadius: 14,
  elevation: 8,
};

export default {
  colors,
  typography,
  spacing,
  shadow,
};
