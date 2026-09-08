import React, { useState, useMemo } from 'react';
import { RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface PlateConfig {
  weight: number;
  color: string;
  enabled: boolean;
  label: string;
}

const DEFAULT_PLATES: PlateConfig[] = [
  { weight: 25, color: '#ef4444', enabled: true, label: '25 kg (Rojo)' },
  { weight: 20, color: '#3b82f6', enabled: true, label: '20 kg (Azul)' },
  { weight: 15, color: '#eab308', enabled: true, label: '15 kg (Amarillo)' },
  { weight: 10, color: '#22c55e', enabled: true, label: '10 kg (Verde)' },
  { weight: 5, color: '#f8fafc', enabled: true, label: '5 kg (Blanco)' },
  { weight: 2.5, color: '#334155', enabled: true, label: '2.5 kg (Negro)' },
  { weight: 1.25, color: '#94a3b8', enabled: true, label: '1.25 kg (Gris)' },
  { weight: 0.5, color: '#0d9488', enabled: true, label: '0.5 kg (Turquesa)' },
];

const PRESETS = [40, 60, 80, 100, 120, 140, 160, 180, 200];

export const PlateCalculatorView: React.FC = () => {
  const [targetWeight, setTargetWeight] = useState<number>(100);
  const [barWeight, setBarWeight] = useState<number>(20);
  const [customBar, setCustomBar] = useState<boolean>(false);
  const [plates, setPlates] = useState<PlateConfig[]>(DEFAULT_PLATES);

  const togglePlate = (weight: number) => {
    setPlates(prev => prev.map(p => p.weight === weight ? { ...p, enabled: !p.enabled } : p));
  };

  const calculation = useMemo(() => {
    if (targetWeight < barWeight) {
      return { perSideWeight: 0, platesNeeded: [], totalAchieved: barWeight, remainder: 0, error: 'El peso objetivo no puede ser menor que la barra.' };
    }

    const totalPlatesWeightNeeded = targetWeight - barWeight;
    const perSideNeeded = totalPlatesWeightNeeded / 2;

    const availablePlates = plates.filter(p => p.enabled).sort((a, b) => b.weight - a.weight);
    let remaining = perSideNeeded;
    const result: { plate: PlateConfig; count: number }[] = [];

    for (const p of availablePlates) {
      if (remaining <= 0) break;
      const count = Math.floor(remaining / p.weight);
      if (count > 0) {
        result.push({ plate: p, count });
        remaining = Math.round((remaining - count * p.weight) * 100) / 100;
      }
    }

    const achievedPerSide = perSideNeeded - remaining;
    const totalAchieved = barWeight + achievedPerSide * 2;
    const remainder = Math.round((targetWeight - totalAchieved) * 100) / 100;

    return {
      perSideWeight: Math.round(perSideNeeded * 100) / 100,
      platesNeeded: result,
      totalAchieved,
      remainder,
      error: null,
    };
  }, [targetWeight, barWeight, plates]);

  // Flattened plates list for visual render on each side
  const visualPlatesPerSide = useMemo(() => {
    const list: PlateConfig[] = [];
    for (const item of calculation.platesNeeded) {
      for (let i = 0; i < item.count; i++) {
        list.push(item.plate);
      }
    }
    return list;
  }, [calculation.platesNeeded]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.headerHero}>
        <div>
          <div style={styles.eyebrow}>CALCULADORA DE CARGAS</div>
          <h1 style={styles.title}>Calculadora de Discos</h1>
          <p style={styles.subtitle}>Calcula los discos exactos que debes cargar en cada extremo de la barra olímpica.</p>
        </div>
      </div>

      <div style={styles.grid}>
        {/* Left Column: Controls & Presets */}
        <div style={styles.controlsPanel}>
          {/* Target Weight Card */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Peso Objetivo</h2>
            <div style={styles.inputWrapper}>
              <input
                type="number"
                min="0"
                step="0.5"
                value={targetWeight || ''}
                onChange={e => setTargetWeight(Number(e.target.value))}
                style={styles.bigInput}
                placeholder="100"
              />
              <span style={styles.unitTag}>kg</span>
            </div>

            {/* Quick Presets */}
            <div style={styles.presetLabel}>Acceso Rápido:</div>
            <div style={styles.presetsGrid}>
              {PRESETS.map(w => (
                <button
                  key={w}
                  onClick={() => setTargetWeight(w)}
                  style={{
                    ...styles.presetBtn,
                    ...(targetWeight === w ? styles.presetBtnActive : {}),
                  }}
                >
                  {w} kg
                </button>
              ))}
            </div>
          </div>

          {/* Bar Weight Selection Card */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Peso de la Barra</h2>
            <div style={styles.barOptions}>
              <button
                onClick={() => { setBarWeight(20); setCustomBar(false); }}
                style={{ ...styles.barBtn, ...(barWeight === 20 && !customBar ? styles.barBtnActive : {}) }}
              >
                20 kg (Olímpica Estándar)
              </button>
              <button
                onClick={() => { setBarWeight(15); setCustomBar(false); }}
                style={{ ...styles.barBtn, ...(barWeight === 15 && !customBar ? styles.barBtnActive : {}) }}
              >
                15 kg (Olímpica Femenina)
              </button>
              <button
                onClick={() => { setBarWeight(10); setCustomBar(false); }}
                style={{ ...styles.barBtn, ...(barWeight === 10 && !customBar ? styles.barBtnActive : {}) }}
              >
                10 kg (Barra Z / Corta)
              </button>
              <button
                onClick={() => setCustomBar(true)}
                style={{ ...styles.barBtn, ...(customBar ? styles.barBtnActive : {}) }}
              >
                Personalizado
              </button>
            </div>
            {customBar && (
              <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="number"
                  min="0"
                  value={barWeight}
                  onChange={e => setBarWeight(Number(e.target.value))}
                  style={{ flex: 1 }}
                  placeholder="Peso de barra..."
                />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>kg</span>
              </div>
            )}
          </div>

          {/* Available Plates Inventory */}
          <div style={styles.card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h2 style={styles.cardTitle}>Discos Disponibles</h2>
              <button
                onClick={() => setPlates(DEFAULT_PLATES)}
                style={{ fontSize: '0.8rem', color: 'var(--accent-teal)', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}
              >
                <RotateCcw size={14} /> Resetear
              </button>
            </div>
            <div style={styles.platesChecklist}>
              {plates.map(p => (
                <label key={p.weight} style={styles.plateCheckRow}>
                  <input
                    type="checkbox"
                    checked={p.enabled}
                    onChange={() => togglePlate(p.weight)}
                    style={{ cursor: 'pointer' }}
                  />
                  <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: p.color, border: '1px solid rgba(0,0,0,0.2)' }} />
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>{p.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Visual Barbell & Breakdown */}
        <div style={styles.visualPanel}>
          {/* Summary Banner */}
          <div style={styles.summaryCard}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>PESO POR LADO</div>
                <div style={{ fontSize: '2.8rem', fontWeight: 800, color: 'var(--accent-teal)', lineHeight: 1.1, fontFamily: 'var(--font-mono)' }}>
                  {calculation.perSideWeight} <span style={{ fontSize: '1.2rem', fontFamily: 'var(--font-sans)' }}>kg</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>CARGA TOTAL</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {calculation.totalAchieved} / {targetWeight} kg
                </div>
              </div>
            </div>

            {calculation.error && (
              <div style={styles.errorAlert}>
                <AlertCircle size={18} />
                <span>{calculation.error}</span>
              </div>
            )}

            {calculation.remainder > 0 && !calculation.error && (
              <div style={styles.warningAlert}>
                <AlertCircle size={18} />
                <span>Faltan {calculation.remainder} kg (no hay combinaciones exactas con tus discos habilitados).</span>
              </div>
            )}

            {calculation.remainder === 0 && !calculation.error && (
              <div style={styles.successAlert}>
                <CheckCircle2 size={18} />
                <span>Carga exacta lograda para ambos extremos.</span>
              </div>
            )}
          </div>

          {/* Barbell Visual Representation */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Simulación Visual</h2>
            <div style={styles.barbellStage}>
              {/* Left Plates */}
              <div style={styles.sleevePlatesLeft}>
                {[...visualPlatesPerSide].reverse().map((p, i) => {
                  const heightPct = Math.max(35, Math.min(100, p.weight * 3.5));
                  return (
                    <div
                      key={i}
                      title={`${p.weight} kg`}
                      style={{
                        width: Math.max(15, p.weight * 0.85),
                        height: `${heightPct}%`,
                        backgroundColor: p.color,
                        borderRadius: 4,
                        border: '1px solid rgba(0,0,0,0.3)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: p.weight === 5 ? '#000' : '#fff',
                        textShadow: p.weight === 5 ? 'none' : '0 1px 2px rgba(0,0,0,0.6)',
                        flexShrink: 0,
                      }}
                    >
                      {p.weight}
                    </div>
                  );
                })}
              </div>

              {/* Bar Collar Left */}
              <div style={styles.collar} />

              {/* Main Shaft */}
              <div style={styles.mainShaft}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                  {barWeight} kg
                </span>
              </div>

              {/* Bar Collar Right */}
              <div style={styles.collar} />

              {/* Right Plates */}
              <div style={styles.sleevePlatesRight}>
                {visualPlatesPerSide.map((p, i) => {
                  const heightPct = Math.max(35, Math.min(100, p.weight * 3.5));
                  return (
                    <div
                      key={i}
                      title={`${p.weight} kg`}
                      style={{
                        width: Math.max(15, p.weight * 0.85),
                        height: `${heightPct}%`,
                        backgroundColor: p.color,
                        borderRadius: 4,
                        border: '1px solid rgba(0,0,0,0.3)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: p.weight === 5 ? '#000' : '#fff',
                        textShadow: p.weight === 5 ? 'none' : '0 1px 2px rgba(0,0,0,0.6)',
                        flexShrink: 0,
                      }}
                    >
                      {p.weight}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Breakdown Table */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Desglose de Discos por Extremo</h2>
            {calculation.platesNeeded.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>No se necesitan discos adicionales.</div>
            ) : (
              <div style={styles.breakdownList}>
                {calculation.platesNeeded.map(item => (
                  <div key={item.plate.weight} style={styles.breakdownRow}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: item.plate.color, border: '1px solid rgba(0,0,0,0.2)' }} />
                      <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {item.plate.weight} kg
                      </span>
                    </div>
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-teal)' }}>
                      × {item.count} {item.count === 1 ? 'disco' : 'discos'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '2.5rem 3rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
    maxWidth: '1280px',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  headerHero: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '2rem 2.5rem',
  },
  eyebrow: {
    fontSize: '0.72rem',
    fontWeight: 800,
    color: 'var(--accent-teal)',
    letterSpacing: '0.08em',
    marginBottom: '0.2rem',
  },
  title: {
    fontSize: '2.2rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.03em',
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
    marginTop: '0.25rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '4.5fr 5.5fr',
    gap: '1.75rem',
    alignItems: 'start',
  },
  controlsPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  visualPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  card: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '1.6rem 1.85rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.1rem',
    boxSizing: 'border-box',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
  },
  summaryCard: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '1.6rem 1.85rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.1rem',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
  },
  cardTitle: {
    fontSize: '1.15rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  bigInput: {
    width: '100%',
    fontSize: '2.2rem',
    fontWeight: 800,
    padding: '0.85rem 3.5rem 0.85rem 1.25rem',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'var(--input-bg)',
    borderColor: 'var(--border-color)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
  },
  unitTag: {
    position: 'absolute',
    right: '1.25rem',
    fontSize: '1.2rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
  },
  presetLabel: {
    fontSize: '0.82rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    marginTop: '0.25rem',
  },
  presetsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.5rem',
  },
  presetBtn: {
    padding: '0.6rem 0.5rem',
    borderRadius: 'var(--radius-control)',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    fontWeight: 700,
    fontSize: '0.88rem',
    cursor: 'pointer',
  },
  presetBtnActive: {
    backgroundColor: 'var(--accent-teal)',
    color: 'var(--bg-color)',
    borderColor: 'var(--accent-teal)',
    fontWeight: 800,
    
  },
  barOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  barBtn: {
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    fontWeight: 600,
    fontSize: '0.9rem',
    textAlign: 'left',
    cursor: 'pointer',
  },
  barBtnActive: {
    backgroundColor: 'rgba(192, 138, 90, 0.12)',
    borderColor: 'var(--accent-teal)',
    color: 'var(--accent-teal)',
    fontWeight: 700,
  },
  platesChecklist: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.65rem',
  },
  plateCheckRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    cursor: 'pointer',
  },
  errorAlert: {
    backgroundColor: 'rgba(192, 105, 105, 0.12)',
    color: 'var(--danger-color)',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-container)',
    fontSize: '0.85rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  warningAlert: {
    backgroundColor: 'rgba(192, 138, 90, 0.12)',
    color: 'var(--accent-gold)',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-container)',
    fontSize: '0.85rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  successAlert: {
    backgroundColor: 'rgba(76, 175, 125, 0.12)',
    color: 'var(--accent-green)',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-container)',
    fontSize: '0.85rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  barbellStage: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '150px',
    backgroundColor: 'var(--input-bg)',
    borderRadius: 'var(--radius-container)',
    border: '1px solid var(--border-color)',
    padding: '0 1rem',
    overflowX: 'auto',
  },
  sleevePlatesLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    height: '100%',
  },
  sleevePlatesRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    height: '100%',
  },
  collar: {
    width: '12px',
    height: '55%',
    backgroundColor: '#64748b',
    borderRadius: '3px',
    flexShrink: 0,
  },
  mainShaft: {
    flex: 1,
    height: '16px',
    backgroundColor: '#475569',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '90px',
    borderRadius: '2px',
  },
  breakdownList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.65rem',
  },
  breakdownRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.85rem 1.25rem',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
  },
};
