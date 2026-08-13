import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export function HomeScreen(): React.JSX.Element {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>ASCEND</Text>
        <Text style={styles.title}>Home</Text>
      </View>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Contenido por implementar</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    gap: spacing(2),
    padding: spacing(2.5),
    paddingBottom: spacing(4),
  },
  eyebrow: {
    color: colors.accentAlt,
    fontSize: typography.caption,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  header: {
    gap: spacing(0.5),
  },
  placeholder: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 240,
  },
  placeholderText: {
    color: colors.muted,
    fontSize: typography.body,
  },
  scroll: {
    backgroundColor: colors.background,
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: '700',
  },
});
