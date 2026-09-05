import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AnimatedPressable from '../../components/AnimatedPressable';
import { EquipmentPickerModal } from '../../components/EquipmentPickerModal';
import { MuscleGroupPickerModal } from '../../components/MuscleGroupPickerModal';
import { colors, spacing, typography } from '../../theme';
import type { Tokens } from '../auth/auth.types';
import { ExerciseService, type ExerciseFilters, type ExerciseSummary } from './exercise.service';

interface MultiExercisePickerProps {
  exerciseService: ExerciseService;
  onCancel: () => void;
  onConfirm: (selectedExerciseIds: string[]) => Promise<void>;
  onTokensChange: (tokens: Tokens) => void;
  tokens: Tokens;
  visible: boolean;
}

export function MultiExercisePicker({
  exerciseService,
  onCancel,
  onConfirm,
  onTokensChange,
  tokens,
  visible,
}: MultiExercisePickerProps): React.JSX.Element {
  const [filters, setFilters] = useState<ExerciseFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [rawExercises, setRawExercises] = useState<ExerciseSummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showMusclePicker, setShowMusclePicker] = useState(false);
  const [showEquipmentPicker, setShowEquipmentPicker] = useState(false);

  const loadExercises = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await exerciseService.list(tokens, {});
      setRawExercises(result.exercises);
      if (result.tokens.accessToken !== tokens.accessToken) {
        onTokensChange(result.tokens);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  }, [exerciseService, onTokensChange, tokens]);

  useEffect(() => {
    if (visible) {
      setSelectedIds([]);
      setSearchQuery('');
      setFilters({});
      void loadExercises();
    }
  }, [loadExercises, visible]);

  const filteredExercises = useMemo(() => {
    return rawExercises.filter((e) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        if (!e.name.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (filters.muscleGroup) {
        const targetGroup = filters.muscleGroup.toLowerCase().trim();
        const hasMuscle = e.targetMuscleGroups.some((g) => g.toLowerCase().trim() === targetGroup);
        if (!hasMuscle) {
          return false;
        }
      }
      if (filters.equipment) {
        const targetEquip = filters.equipment.toLowerCase().trim();
        if (targetEquip === 'ninguno') {
          if (e.equipment && e.equipment.toLowerCase().trim() !== 'ninguno') {
            return false;
          }
        } else if (!e.equipment || e.equipment.toLowerCase().trim() !== targetEquip) {
          return false;
        }
      }
      return true;
    });
  }, [filters.equipment, filters.muscleGroup, rawExercises, searchQuery]);

  const toggleSelect = (id: string) => {
    setSelectedIds((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
  };

  const handleConfirm = async () => {
    if (selectedIds.length === 0) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onConfirm(selectedIds);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={onCancel} visible={visible}>
      <View style={styles.root}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
          {/* Header Bar matching Exercise Library with Cancel link on top-left */}
          <View style={styles.topBar}>
            <AnimatedPressable onPress={onCancel}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </AnimatedPressable>
            <Text style={styles.topBarTitle}>Añadir ejercicios</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* Search Input */}
          <View style={styles.searchBarContainer}>
            <MaterialIcons name="search" size={20} color={colors.muted} />
            <TextInput
              onChangeText={setSearchQuery}
              placeholder="Buscar ejercicio"
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
              value={searchQuery}
            />
            {Boolean(searchQuery) && (
              <AnimatedPressable onPress={() => setSearchQuery('')}>
                <MaterialIcons name="close" size={18} color={colors.muted} />
              </AnimatedPressable>
            )}
          </View>

          {/* Filters Row */}
          <View style={styles.selectorRow}>
            <AnimatedPressable
              onPress={() => setShowEquipmentPicker(true)}
              style={[styles.filterPillButton, Boolean(filters.equipment) && styles.filterPillActive]}
            >
              <Text style={[styles.filterPillText, Boolean(filters.equipment) && styles.filterPillTextActive]}>
                {filters.equipment ? `Equipo: ${filters.equipment}` : 'Todo el equipo ▾'}
              </Text>
            </AnimatedPressable>

            <AnimatedPressable
              onPress={() => setShowMusclePicker(true)}
              style={[styles.filterPillButton, Boolean(filters.muscleGroup) && styles.filterPillActive]}
            >
              <Text style={[styles.filterPillText, Boolean(filters.muscleGroup) && styles.filterPillTextActive]}>
                {filters.muscleGroup ? `Músculo: ${filters.muscleGroup}` : 'Todos los músculos ▾'}
              </Text>
            </AnimatedPressable>
          </View>

          <Text style={styles.sectionHeader}>Todos los ejercicios</Text>

          {isLoading && <ActivityIndicator color={colors.accentAlt} style={{ marginVertical: 10 }} />}
          {!isLoading && filteredExercises.length === 0 && (
            <Text style={styles.helper}>No se encontraron ejercicios.</Text>
          )}

          {/* Exercise Rows with Multi-Selection Checkbox */}
          {filteredExercises.map((exercise) => {
            const isSelected = selectedIds.includes(exercise.id);
            return (
              <AnimatedPressable
                key={exercise.id}
                onPress={() => toggleSelect(exercise.id)}
                style={[styles.exerciseRow, isSelected && styles.exerciseRowSelected]}
              >
                <View style={[styles.exerciseAvatar, isSelected && styles.exerciseAvatarSelected]}>
                  <MaterialIcons
                    name={isSelected ? 'check' : 'fitness-center'}
                    size={22}
                    color={isSelected ? '#ffffff' : colors.muted}
                  />
                </View>
                <View style={styles.exerciseInfo}>
                  <Text style={[styles.exerciseRowName, isSelected && styles.exerciseRowNameSelected]}>
                    {exercise.name}
                  </Text>
                  <Text style={styles.exerciseRowMuscle}>
                    {exercise.targetMuscleGroups.join(', ') || 'Sin grupo muscular'}
                  </Text>
                </View>
                <MaterialIcons
                  name={isSelected ? 'check-circle' : 'radio-button-unchecked'}
                  size={24}
                  color={isSelected ? colors.accentAlt : colors.muted}
                />
              </AnimatedPressable>
            );
          })}
        </ScrollView>

        {/* Floating Bottom Action Bar when exercises selected */}
        {selectedIds.length > 0 && (
          <View style={styles.bottomBar}>
            <AnimatedPressable
              disabled={isSubmitting}
              onPress={() => { void handleConfirm(); }}
              style={styles.confirmBtn}
            >
              <Text style={styles.confirmBtnText}>
                {isSubmitting
                  ? 'Añadiendo...'
                  : `Añadir ${selectedIds.length} ${selectedIds.length === 1 ? 'ejercicio' : 'ejercicios'}`}
              </Text>
            </AnimatedPressable>
          </View>
        )}

        <MuscleGroupPickerModal
          onClose={() => setShowMusclePicker(false)}
          onSelect={(group) => {
            setShowMusclePicker(false);
            setFilters((curr) => ({ ...curr, muscleGroup: group }));
          }}
          selectedValue={filters.muscleGroup}
          visible={showMusclePicker}
        />

        <EquipmentPickerModal
          onClose={() => setShowEquipmentPicker(false)}
          onSelect={(equip) => {
            setShowEquipmentPicker(false);
            setFilters((curr) => ({ ...curr, equipment: equip }));
          }}
          selectedValue={filters.equipment}
          visible={showEquipmentPicker}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    backgroundColor: colors.surface,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    borderTopWidth: 1,
    padding: spacing(2),
  },
  cancelText: {
    color: colors.accentAlt,
    fontSize: typography.body,
    fontWeight: '600',
  },
  confirmBtn: {
    alignItems: 'center',
    backgroundColor: colors.accentAlt,
    borderRadius: 14,
    justifyContent: 'center',
    paddingVertical: spacing(1.75),
    width: '100%',
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: typography.body,
    fontWeight: '700',
    textAlign: 'center',
  },
  container: {
    gap: spacing(1.5),
    padding: spacing(2.5),
    paddingBottom: spacing(4),
  },
  exerciseAvatar: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 25,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  exerciseAvatarSelected: {
    backgroundColor: colors.accentAlt,
    borderColor: colors.accentAlt,
  },
  exerciseInfo: {
    flex: 1,
    gap: 2,
  },
  exerciseRow: {
    alignItems: 'center',
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    borderBottomWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    gap: spacing(1.5),
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(1.5),
  },
  exerciseRowMuscle: {
    color: colors.muted,
    fontSize: typography.caption,
  },
  exerciseRowName: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '600',
  },
  exerciseRowNameSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  exerciseRowSelected: {
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  filterPillActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    borderColor: colors.accentAlt,
  },
  filterPillButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(1.5),
    width: '100%',
  },
  filterPillText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '600',
    textAlign: 'center',
  },
  filterPillTextActive: {
    color: colors.accentAlt,
    fontWeight: '700',
  },
  helper: {
    color: colors.muted,
  },
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
  scroll: {
    backgroundColor: colors.background,
    flex: 1,
  },
  searchBarContainer: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing(1),
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontSize: typography.body,
    paddingVertical: spacing(1),
  },
  sectionHeader: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '700',
    marginTop: spacing(1),
  },
  selectorRow: {
    flexDirection: 'row',
    gap: spacing(1.25),
    width: '100%',
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing(0.5),
  },
  topBarTitle: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: '700',
  },
});
