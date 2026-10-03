import React from 'react';
import { Plus, Heart, Sparkles, Search } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { ExerciseDetailPanel } from '../components/exercise/ExerciseDetailPanel';
import { ExerciseCard } from '../components/exercise/ExerciseCard';
import { ExerciseFilters } from '../components/exercise/ExerciseFilters';
import { ExerciseFormModal } from '../components/exercise/ExerciseFormModal';
import { useExerciseLibrary } from '../hooks/useExerciseLibrary';

export const ExerciseLibraryView: React.FC = () => {
  const navigate = useNavigate();
  const { exerciseId } = useParams<{ exerciseId?: string }>();

  const {
    exercises,
    customExercises,
    favoriteExercises,
    sortedExercises,
    loading,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    selectedMuscle,
    onMuscleFilterChange,
    selectedEquipment,
    setSelectedEquipment,
    activeChip,
    selectChip,
    sortBy,
    setSortBy,
    clearFilters,
    favoriteIds,
    toggleFavorite,
    selectedExercise,
    workoutHistory,
    isModalOpen,
    setIsModalOpen,
    editingExercise,
    formName,
    setFormName,
    formMuscle,
    setFormMuscle,
    formEquipment,
    setFormEquipment,
    formDesc,
    setFormDesc,
    formInstructions,
    setFormInstructions,
    formMediaUrl,
    setFormMediaUrl,
    formSubmitting,
    formError,
    openCreateModal,
    openEditModal,
    handleFormSubmit,
    deletingExercise,
    setDeletingExercise,
    deleting,
    handleDeleteExercise,
  } = useExerciseLibrary(exerciseId);

  if (selectedExercise) {
    return (
      <div style={styles.container}>
        <ExerciseDetailPanel
          exercise={selectedExercise}
          history={workoutHistory}
          onBack={() => navigate('/exercises')}
          onEdit={openEditModal}
          onDelete={setDeletingExercise}
        />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Ejercicios</h1>
          <p style={styles.subtitle}>
            {exercises.length} ejercicios · Explora, filtra y encuentra tu próximo movimiento
          </p>
        </div>
        <button style={styles.createBtn} onClick={openCreateModal}>
          <Plus size={18} />
          <span>Crear ejercicio</span>
        </button>
      </div>

      {/* Filters and Tabs */}
      <ExerciseFilters
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={{
          all: exercises.length,
          custom: customExercises.length,
          favorites: favoriteExercises.length,
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedMuscle={selectedMuscle}
        onMuscleChange={onMuscleFilterChange}
        selectedEquipment={selectedEquipment}
        onEquipmentChange={setSelectedEquipment}
        activeChip={activeChip}
        onChipSelect={selectChip}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onClearFilters={clearFilters}
      />

      {/* Results meta */}
      {!loading && (
        <div style={styles.resultsLine}>
          <span>
            {sortedExercises.length} {sortedExercises.length === 1 ? 'ejercicio' : 'ejercicios'}
          </span>
          {searchQuery.trim() && (
            <span style={styles.resultsMeta}>{` · búsqueda "${searchQuery.trim()}"`}</span>
          )}
        </div>
      )}

      {/* Grid of Exercises */}
      {loading ? (
        <div style={styles.loadingText}>Cargando ejercicios...</div>
      ) : sortedExercises.length === 0 ? (
        activeTab === 'favorites' ? (
          <div style={styles.emptyCard}>
            <div style={styles.emptyIcon}>
              <Heart size={36} fill="var(--accent-gold)" color="var(--accent-gold)" />
            </div>
            <h3
              style={{
                color: 'var(--text-primary)',
                fontSize: '1.2rem',
                fontWeight: 700,
                marginBottom: '0.5rem',
              }}
            >
              Sin favoritos todavía
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>
              Toca el corazón en cualquier ejercicio para guardarlo aquí y tenerlo siempre a mano.
            </p>
          </div>
        ) : activeTab === 'custom' ? (
          <div style={styles.emptyCard}>
            <Sparkles size={40} color="var(--accent-gold)" style={{ marginBottom: '1rem' }} />
            <h3
              style={{
                color: 'var(--text-primary)',
                fontSize: '1.2rem',
                fontWeight: 700,
                marginBottom: '0.5rem',
              }}
            >
              No tienes ejercicios personalizados aún
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
              Crea tus propios ejercicios para agregarlos a tus rutinas y llevar el seguimiento de su progresión.
            </p>
            <button style={styles.createBtn} onClick={openCreateModal}>
              <Plus size={18} />
              <span>Crear mi primer ejercicio</span>
            </button>
          </div>
        ) : (
          <div style={styles.emptyCard}>
            <Search size={36} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
            <h3
              style={{
                color: 'var(--text-primary)',
                fontSize: '1.2rem',
                fontWeight: 700,
                marginBottom: '0.5rem',
              }}
            >
              Sin resultados
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>
              No se encontraron ejercicios con los filtros seleccionados. Prueba con otros términos o limpia los filtros.
            </p>
          </div>
        )
      ) : (
        <div className="exercise-grid">
          {sortedExercises.map((ex) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              isFavorite={favoriteIds.includes(ex.id)}
              onSelect={(e) => {
                navigate(`/exercises/${e.id}`);
              }}
              onToggleFavorite={toggleFavorite}
              onEdit={openEditModal}
              onDelete={setDeletingExercise}
            />
          ))}
        </div>
      )}

      {/* Create / Edit & Delete Modals */}
      <ExerciseFormModal
        isModalOpen={isModalOpen}
        editingExercise={editingExercise}
        formName={formName}
        onFormNameChange={setFormName}
        formMuscle={formMuscle}
        onFormMuscleChange={setFormMuscle}
        formEquipment={formEquipment}
        onFormEquipmentChange={setFormEquipment}
        formDesc={formDesc}
        onFormDescChange={setFormDesc}
        formInstructions={formInstructions}
        onFormInstructionsChange={setFormInstructions}
        formMediaUrl={formMediaUrl}
        onFormMediaUrlChange={setFormMediaUrl}
        formSubmitting={formSubmitting}
        formError={formError}
        onSubmit={handleFormSubmit}
        onClose={() => setIsModalOpen(false)}
        deletingExercise={deletingExercise}
        deleting={deleting}
        onDeleteConfirm={handleDeleteExercise}
        onDeleteCancel={() => setDeletingExercise(null)}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    padding: 'clamp(1.5rem, 4vw, 2.5rem) clamp(1rem, 5vw, 3rem)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.75rem',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  title: {
    fontSize: 'clamp(1.8rem, 3vw, 2.4rem)',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    color: 'var(--text-primary)',
    margin: 0,
  },
  subtitle: { color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.35rem' },
  createBtn: {
    backgroundColor: 'var(--primary)',
    color: 'var(--bg-color)',
    padding: '0.7rem 1.2rem',
    borderRadius: 'var(--radius-element)',
    fontWeight: 700,
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    border: 'none',
  },
  resultsLine: { fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 },
  resultsMeta: { color: 'var(--text-dim)' },
  loadingText: { textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' },
  emptyCard: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '3.5rem 2rem',
    textAlign: 'center',
    color: 'var(--text-muted)',
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    backgroundColor: 'rgba(192, 138, 90, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1rem',
  },
};