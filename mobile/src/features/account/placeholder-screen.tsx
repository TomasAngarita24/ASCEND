import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import AnimatedPressable from '../../components/AnimatedPressable';
import { colors, spacing, typography } from '../../theme';

interface PlaceholderScreenProps {
  title: string;
  description: string;
  onBack: () => void;
}

export function PlaceholderScreen({ title, description, onBack }: PlaceholderScreenProps): React.JSX.Element {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <AnimatedPressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>Volver</Text>
      </AnimatedPressable>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <Text style={styles.comingSoon}>Próximamente disponible</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
  },
  backButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
  comingSoon: {
    color: colors.accent,
    fontSize: typography.body,
    fontWeight: '700',
    marginTop: spacing(2),
  },
  container: {
    flexGrow: 1,
    gap: spacing(2),
    padding: spacing(2.5),
  },
  content: {
    flex: 1,
    gap: spacing(1),
    justifyContent: 'center',
  },
  description: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 22,
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
