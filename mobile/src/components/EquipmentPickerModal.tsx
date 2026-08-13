import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import AnimatedPressable from './AnimatedPressable';
import { EQUIPMENT_OPTIONS } from '../features/exercise/exercise-categories';
import { colors, spacing, typography } from '../theme';

interface EquipmentPickerModalProps {
  onClose: () => void;
  onSelect: (equipment: string | undefined) => void;
  selectedValue?: string;
  visible: boolean;
}

export function EquipmentPickerModal({
  onClose,
  onSelect,
  selectedValue,
  visible,
}: EquipmentPickerModalProps): React.JSX.Element {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Equipo</Text>
            <AnimatedPressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </AnimatedPressable>
          </View>
          <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContainer}>
            <AnimatedPressable
              onPress={() => {
                onSelect(undefined);
                onClose();
              }}
              style={[styles.item, !selectedValue && styles.itemSelected]}
            >
              <Text style={[styles.itemText, !selectedValue && styles.itemTextSelected]}>
                Todos los equipos
              </Text>
            </AnimatedPressable>

            <View style={styles.grid}>
              {EQUIPMENT_OPTIONS.map((item) => {
                const isSelected = selectedValue?.toLowerCase() === item.toLowerCase();
                return (
                  <AnimatedPressable
                    key={item}
                    onPress={() => {
                      onSelect(item);
                      onClose();
                    }}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {item}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: '#111827',
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1.2),
  },
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#052e16',
    fontWeight: '700',
  },
  closeButton: {
    padding: spacing(0.5),
  },
  closeText: {
    color: colors.muted,
    fontSize: 20,
    fontWeight: '600',
  },
  container: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(255,255,255,0.1)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: '75%',
    padding: spacing(2.5),
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(1),
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing(1.5),
  },
  item: {
    backgroundColor: '#111827',
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing(1.5),
  },
  itemSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  itemText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '600',
    textAlign: 'center',
  },
  itemTextSelected: {
    color: '#052e16',
    fontWeight: '700',
  },
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrollContainer: {
    gap: spacing(2),
    paddingBottom: spacing(3),
  },
  scrollContent: {
    flexGrow: 0,
  },
  title: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: '700',
  },
});
