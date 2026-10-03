import React, { useRef, useState, useEffect } from 'react';
import { Search, X, SlidersHorizontal, ChevronDown, ArrowUpDown, Check } from 'lucide-react';

export const MUSCLE_GROUPS = [
  'Todos',
  'Pecho',
  'Dorsal',
  'Hombros',
  'Trapecio',
  'Biceps',
  'Triceps',
  'Antebrazo',
  'Abdominales',
  'Espalda baja',
  'Cuadriceps',
  'Femoral',
  'Gluteos',
  'Pantorrillas',
  'Adductor',
  'Cardio',
  'Full body',
  'Otros',
];

export const EQUIPMENT_OPTIONS = [
  'Todos',
  'Ninguno',
  'Barra',
  'Mancuernas',
  'Maquinas',
  'Kettlebell',
  'Discos',
  'Bandas de resistencia',
  'Otros',
];

export const CHIP_DEFS: { label: string; muscles: string[] }[] = [
  { label: 'Todos', muscles: [] },
  { label: 'Pecho', muscles: ['Pecho'] },
  { label: 'Espalda', muscles: ['Dorsal', 'Espalda baja', 'Trapecio'] },
  { label: 'Piernas', muscles: ['Cuadriceps', 'Femoral', 'Pantorrillas', 'Adductor'] },
  { label: 'Glúteos', muscles: ['Gluteos'] },
  { label: 'Hombros', muscles: ['Hombros'] },
  { label: 'Bíceps', muscles: ['Biceps'] },
  { label: 'Tríceps', muscles: ['Triceps'] },
  { label: 'Abdomen', muscles: ['Abdominales'] },
  { label: 'Cardio', muscles: ['Cardio'] },
];

export const SORT_OPTIONS = [
  { key: 'default', label: 'Relevancia' },
  { key: 'az', label: 'Nombre A → Z' },
  { key: 'za', label: 'Nombre Z → A' },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]['key'];

interface ExerciseFiltersProps {
  activeTab: 'all' | 'custom' | 'favorites';
  onTabChange: (tab: 'all' | 'custom' | 'favorites') => void;
  counts: { all: number; custom: number; favorites: number };
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedMuscle: string;
  onMuscleChange: (m: string) => void;
  selectedEquipment: string;
  onEquipmentChange: (eq: string) => void;
  activeChip: string;
  onChipSelect: (label: string) => void;
  sortBy: SortKey;
  onSortChange: (key: SortKey) => void;
  onClearFilters: () => void;
}

export const ExerciseFilters: React.FC<ExerciseFiltersProps> = ({
  activeTab,
  onTabChange,
  counts,
  searchQuery,
  onSearchChange,
  selectedMuscle,
  onMuscleChange,
  selectedEquipment,
  onEquipmentChange,
  activeChip,
  onChipSelect,
  sortBy,
  onSortChange,
  onClearFilters,
}) => {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const filtersRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node))
        setFiltersOpen(false);
      if (sortRef.current && !sortRef.current.contains(e.target as Node))
        setSortOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  const activeFilterCount =
    (activeChip !== 'Todos' ? 1 : 0) + (selectedEquipment !== 'Todos' ? 1 : 0);

  const tabs = [
    { key: 'all' as const, label: 'Todos', count: counts.all },
    { key: 'custom' as const, label: 'Mis ejercicios', count: counts.custom },
    { key: 'favorites' as const, label: 'Favoritos', count: counts.favorites },
  ];

  return (
    <>
      {/* Text tabs */}
      <div style={styles.tabsRow}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => onTabChange(t.key)}
            style={{
              ...styles.tabButton,
              ...(activeTab === t.key ? styles.tabButtonActive : {}),
            }}
          >
            <span>{t.label}</span>
            <span style={activeTab === t.key ? styles.tabCountActive : styles.tabCount}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Quick category chips */}
      <div className="exercise-chip-row">
        {CHIP_DEFS.map((chip) => (
          <button
            key={chip.label}
            onClick={() => onChipSelect(chip.label)}
            className={`exercise-chip${activeChip === chip.label ? ' is-active' : ''}`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Search + filters + sort */}
      <div style={styles.searchBar}>
        <div style={styles.searchInputWrap}>
          <Search size={17} color="var(--text-muted)" style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Buscar ejercicios..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={styles.searchInput}
          />
          {searchQuery && (
            <button style={styles.clearSearch} onClick={() => onSearchChange('')}>
              <X size={15} color="var(--text-muted)" />
            </button>
          )}
        </div>

        <div ref={filtersRef} style={styles.dropdownWrap}>
          <button
            onClick={() => setFiltersOpen((o) => !o)}
            style={{
              ...styles.dropdownBtn,
              ...(activeFilterCount > 0 ? styles.dropdownBtnActive : {}),
            }}
          >
            <SlidersHorizontal size={16} />
            <span>Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
            <ChevronDown
              size={15}
              style={{
                transform: filtersOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            />
          </button>
          {filtersOpen && (
            <div style={styles.popover}>
              <div style={styles.popoverLabel}>Músculo</div>
              <select
                value={selectedMuscle}
                onChange={(e) => onMuscleChange(e.target.value)}
                style={styles.popoverSelect}
              >
                {MUSCLE_GROUPS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <div style={styles.popoverLabel}>Equipamiento</div>
              <select
                value={selectedEquipment}
                onChange={(e) => onEquipmentChange(e.target.value)}
                style={styles.popoverSelect}
              >
                {EQUIPMENT_OPTIONS.map((eq) => (
                  <option key={eq} value={eq}>
                    {eq}
                  </option>
                ))}
              </select>
              {activeFilterCount > 0 && (
                <button style={styles.popoverClear} onClick={onClearFilters}>
                  Limpiar filtros
                </button>
              )}
            </div>
          )}
        </div>

        <div ref={sortRef} style={styles.dropdownWrap}>
          <button
            onClick={() => setSortOpen((o) => !o)}
            style={{
              ...styles.dropdownBtn,
              ...(sortBy !== 'default' ? styles.dropdownBtnActive : {}),
            }}
          >
            <ArrowUpDown size={16} />
            <span>Ordenar</span>
            <ChevronDown
              size={15}
              style={{
                transform: sortOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            />
          </button>
          {sortOpen && (
            <div style={styles.sortMenu}>
              {SORT_OPTIONS.map((o) => (
                <button
                  key={o.key}
                  onClick={() => {
                    onSortChange(o.key);
                    setSortOpen(false);
                  }}
                  style={{
                    ...styles.sortItem,
                    ...(sortBy === o.key ? styles.sortItemActive : {}),
                  }}
                >
                  <span>{o.label}</span>
                  {sortBy === o.key && <Check size={15} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  tabsRow: { display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--border-color)' },
  tabButton: {
    background: 'none',
    border: 'none',
    padding: '0.4rem 0 0.65rem',
    fontSize: '0.95rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    borderBottom: '2px solid transparent',
    marginBottom: '-1px',
    transition: 'color 0.15s ease, border-color 0.15s ease',
  },
  tabButtonActive: { color: 'var(--primary)', borderBottomColor: 'var(--primary)', fontWeight: 700 },
  tabCount: {
    fontSize: '0.72rem',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text-muted)',
    padding: '0.1rem 0.5rem',
    borderRadius: 'var(--radius-full)',
    fontWeight: 600,
  },
  tabCountActive: {
    fontSize: '0.72rem',
    backgroundColor: 'rgba(192, 138, 90, 0.16)',
    color: 'var(--primary)',
    padding: '0.1rem 0.5rem',
    borderRadius: 'var(--radius-full)',
    fontWeight: 700,
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.15rem',
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-control)',
    padding: '0.35rem 0.5rem',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
  },
  searchInputWrap: {
    position: 'relative',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    minWidth: '220px',
  },
  searchIcon: { position: 'absolute', left: '12px' },
  searchInput: {
    width: '100%',
    padding: '0.7rem 2.5rem 0.7rem 2.75rem',
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: '0.92rem',
    color: 'var(--text-primary)',
  },
  clearSearch: {
    position: 'absolute',
    right: '10px',
    padding: '4px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  dropdownWrap: { position: 'relative' },
  dropdownBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
    padding: '0.6rem 0.9rem',
    borderRadius: 'var(--radius-element)',
    fontSize: '0.88rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: 'color 0.15s ease, background-color 0.15s ease',
  },
  dropdownBtnActive: {
    color: 'var(--primary)',
    backgroundColor: 'rgba(192, 138, 90, 0.12)',
  },
  popover: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    minWidth: '240px',
    backgroundColor: 'var(--surface-elevated)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-control)',
    padding: '1rem',
    boxShadow: '0 18px 45px -12px rgba(0,0,0,0.45)',
    zIndex: 30,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    animation: 'fadeIn 0.18s ease',
  },
  popoverLabel: {
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'var(--text-muted)',
    marginTop: '0.35rem',
  },
  popoverSelect: {
    width: '100%',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-element)',
    padding: '0.55rem 0.75rem',
    fontSize: '0.88rem',
    outline: 'none',
  },
  popoverClear: {
    marginTop: '0.5rem',
    padding: '0.55rem 0.75rem',
    borderRadius: 'var(--radius-element)',
    background: 'rgba(192, 105, 105, 0.1)',
    color: 'var(--danger-color)',
    border: '1px solid rgba(192, 105, 105, 0.2)',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  sortMenu: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    minWidth: '200px',
    backgroundColor: 'var(--surface-elevated)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-control)',
    padding: '0.4rem',
    boxShadow: '0 18px 45px -12px rgba(0,0,0,0.45)',
    zIndex: 30,
    animation: 'fadeIn 0.18s ease',
    display: 'flex',
    flexDirection: 'column',
  },
  sortItem: {
    width: '100%',
    textAlign: 'left',
    padding: '0.6rem 0.75rem',
    borderRadius: 'var(--radius-element)',
    border: 'none',
    background: 'none',
    color: 'var(--text-muted)',
    fontWeight: 600,
    fontSize: '0.88rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'background-color 0.15s ease',
  },
  sortItemActive: { backgroundColor: 'rgba(192, 138, 90, 0.1)', color: 'var(--primary)' },
};
