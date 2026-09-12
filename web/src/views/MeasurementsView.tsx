import React, { useState, useMemo, useEffect, useId } from 'react';
import { Scale, Plus, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../api/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MeasurementEntry {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  weight: number | null;       // kg
  neck: number | null;         // cm
  shoulders: number | null;    // cm
  chest: number | null;        // cm
  waist: number | null;        // cm
  hips: number | null;         // cm
  bicep: number | null;        // cm
  thigh: number | null;        // cm
  calf: number | null;         // cm
  bodyFat: number | null;      // %
  [key: string]: string | number | null; // index signature for dynamic access
}

const STORAGE_KEY = 'ascend_measurements';

// ─── SVG Line Chart ───────────────────────────────────────────────────────────

interface ChartPoint { date: string; value: number }

interface LineChartProps {
  points: ChartPoint[];
  color: string;
  unit: string;
  label: string;
}

const LineChart: React.FC<LineChartProps> = ({ points, color, unit }) => {
  const gradId = useId();
  const W = 560;
  const H = 160;
  const PAD = { top: 16, right: 20, bottom: 32, left: 48 };

  if (points.length === 0) {
    return (
      <div style={{ height: H + PAD.top + PAD.bottom, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Sin datos registrados aún</span>
      </div>
    );
  }

  const vals = points.map((p) => p.value);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const rangeV = maxV - minV || 1;

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const toX = (i: number) => PAD.left + (i / Math.max(points.length - 1, 1)) * innerW;
  const toY = (v: number) => PAD.top + innerH - ((v - minV) / rangeV) * innerH;

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(p.value).toFixed(1)}`).join(' ');

  // Area fill path
  const areaD = `${pathD} L ${toX(points.length - 1).toFixed(1)} ${(PAD.top + innerH).toFixed(1)} L ${PAD.left.toFixed(1)} ${(PAD.top + innerH).toFixed(1)} Z`;

  // Y axis labels
  const yLabels = [minV, minV + rangeV * 0.5, maxV].map((v) => ({
    val: v,
    y: toY(v),
  }));

  // X axis labels (show up to 6)
  const step = Math.max(1, Math.floor(points.length / 6));
  const xLabels = points.filter((_, i) => i % step === 0 || i === points.length - 1);

  return (
    <svg viewBox={`0 0 ${W} ${H + PAD.top + PAD.bottom}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yLabels.map(({ val, y }) => (
        <g key={val}>
          <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
            stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 4" />
          <text x={PAD.left - 6} y={y + 4} textAnchor="end" fill="var(--text-dim)" fontSize="11">
            {val % 1 === 0 ? val : val.toFixed(1)}
          </text>
        </g>
      ))}

      {/* Area fill */}
      <path d={areaD} fill={`url(#${gradId})`} />

      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={toX(i)} cy={toY(p.value)} r="5" fill={color} />
          <circle cx={toX(i)} cy={toY(p.value)} r="3" fill="var(--bg-color)" />
        </g>
      ))}

      {/* X labels */}
      {xLabels.map((p, i) => {
        const idx = points.indexOf(p);
        return (
          <text key={i} x={toX(idx)} y={H + PAD.top + 20}
            textAnchor="middle" fill="var(--text-dim)" fontSize="10">
            {p.date.slice(5)} {/* MM-DD */}
          </text>
        );
      })}

      {/* Unit label */}
      <text x={PAD.left - 6} y={PAD.top - 4} textAnchor="end" fill="var(--text-muted)" fontSize="10">{unit}</text>
    </svg>
  );
};

// ─── Trend Badge ──────────────────────────────────────────────────────────────

const TrendBadge: React.FC<{ current: number | null; prev: number | null; unit: string; lowerIsBetter?: boolean }> = ({
  current, prev, unit, lowerIsBetter = false,
}) => {
  if (current === null || prev === null) return null;
  const diff = current - prev;
  if (diff === 0) return <span style={badgeStyles.neutral}><Minus size={12} /> Sin cambio</span>;
  const isPositive = lowerIsBetter ? diff < 0 : diff > 0;
  const Icon = diff > 0 ? TrendingUp : TrendingDown;
  const style = isPositive ? badgeStyles.positive : badgeStyles.negative;
  return (
    <span style={style}>
      <Icon size={12} />
      {diff > 0 ? '+' : ''}{diff.toFixed(1)} {unit}
    </span>
  );
};

const badgeStyles: Record<string, React.CSSProperties> = {
  positive: { display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--accent-green)', fontSize: '0.8rem', fontWeight: 700 },
  negative: { display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--danger-color)', fontSize: '0.8rem', fontWeight: 700 },
  neutral: { display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700 },
};

// ─── Field config ─────────────────────────────────────────────────────────────

interface FieldDef { key: string; label: string; unit: string; color: string; lowerIsBetter?: boolean }

const FIELDS: FieldDef[] = [
  { key: 'weight', label: 'Peso corporal', unit: 'kg', color: 'var(--accent-teal)', lowerIsBetter: false },
  { key: 'bodyFat', label: 'Grasa corporal', unit: '%', color: '#B5754F', lowerIsBetter: true },
  { key: 'neck', label: 'Cuello', unit: 'cm', color: '#C0C2C6', lowerIsBetter: false },
  { key: 'shoulders', label: 'Hombros', unit: 'cm', color: '#B8914D', lowerIsBetter: false },
  { key: 'chest', label: 'Pecho', unit: 'cm', color: '#4CAF7D', lowerIsBetter: false },
  { key: 'waist', label: 'Cintura', unit: 'cm', color: 'var(--danger-color)', lowerIsBetter: true },
  { key: 'hips', label: 'Cadera', unit: 'cm', color: '#B8914D', lowerIsBetter: false },
  { key: 'bicep', label: 'Bícep', unit: 'cm', color: '#E1C27A', lowerIsBetter: false },
  { key: 'thigh', label: 'Muslo', unit: 'cm', color: '#6FC79B', lowerIsBetter: false },
  { key: 'calf', label: 'Pantorrilla', unit: 'cm', color: '#7A9E87', lowerIsBetter: false },
];

// ─── Empty form helper ────────────────────────────────────────────────────────

function emptyForm() {
  return {
    date: new Date().toISOString().slice(0, 10),
    weight: '', neck: '', shoulders: '', chest: '', waist: '',
    hips: '', bicep: '', thigh: '', calf: '', bodyFat: '',
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const MeasurementsView: React.FC = () => {
  const [entries, setEntries] = useState<MeasurementEntry[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState<string>('weight');
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    const loadMeasurements = async () => {
      setLoading(true);
      try {
        // 1. Check if localStorage has old measurements that need migration
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          try {
            const localList = JSON.parse(raw);
            if (Array.isArray(localList) && localList.length > 0) {
              for (const item of localList) {
if (item && item.date) {
                  await api.saveMeasurement({
                    date: item.date,
                    weight: item.weight !== null && item.weight !== undefined ? Number(item.weight) : null,
                    neck: item.neck !== null && item.neck !== undefined ? Number(item.neck) : null,
                    shoulders: item.shoulders !== null && item.shoulders !== undefined ? Number(item.shoulders) : null,
                    chest: item.chest !== null && item.chest !== undefined ? Number(item.chest) : null,
                    waist: item.waist !== null && item.waist !== undefined ? Number(item.waist) : null,
                    hips: item.hips !== null && item.hips !== undefined ? Number(item.hips) : null,
                    bicep: item.bicep !== null && item.bicep !== undefined ? Number(item.bicep) : null,
                    thigh: item.thigh !== null && item.thigh !== undefined ? Number(item.thigh) : null,
                    calf: item.calf !== null && item.calf !== undefined ? Number(item.calf) : null,
                    bodyFat: item.bodyFat !== null && item.bodyFat !== undefined ? Number(item.bodyFat) : null,
                  });
                }
              }
            }
            localStorage.removeItem(STORAGE_KEY);
          } catch (e) {
            console.error('Error migrating local measurements:', e);
          }
        }

        // 2. Fetch measurements from backend
        const data = await api.listMeasurements();
        setEntries(data.map((m) => ({
          id: m.id,
          date: m.date.slice(0, 10),
          weight: m.weight,
          neck: m.neck,
          shoulders: m.shoulders,
          chest: m.chest,
          waist: m.waist,
          hips: m.hips,
          bicep: m.bicep,
          thigh: m.thigh,
          calf: m.calf,
          bodyFat: m.bodyFat,
        })));
      } catch {
        toast.error('Error al cargar tus medidas.');
      } finally {
        setLoading(false);
      }
    };

    loadMeasurements();
  }, []);

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => a.date.localeCompare(b.date)),
    [entries],
  );

  const latest = sortedEntries[sortedEntries.length - 1] ?? null;
  const prev = sortedEntries[sortedEntries.length - 2] ?? null;

  function getChartPoints(fieldKey: string): ChartPoint[] {
    return sortedEntries
      .map((e) => ({ date: e.date, value: (e as Record<string, unknown>)[fieldKey] as number | null }))
      .filter((p): p is { date: string; value: number } => p.value !== null && p.value > 0);
  }

  const activeField = FIELDS.find((f) => f.key === activeChart) ?? FIELDS[0];

  function handleFormChange(key: string, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await api.saveMeasurement({
        date: form.date,
        weight: form.weight ? parseFloat(form.weight) : null,
        neck: form.neck ? parseFloat(form.neck) : null,
        shoulders: form.shoulders ? parseFloat(form.shoulders) : null,
        chest: form.chest ? parseFloat(form.chest) : null,
        waist: form.waist ? parseFloat(form.waist) : null,
        hips: form.hips ? parseFloat(form.hips) : null,
        bicep: form.bicep ? parseFloat(form.bicep) : null,
        thigh: form.thigh ? parseFloat(form.thigh) : null,
        calf: form.calf ? parseFloat(form.calf) : null,
        bodyFat: form.bodyFat ? parseFloat(form.bodyFat) : null,
      });

      const entry: MeasurementEntry = {
        id: saved.id,
        date: saved.date.slice(0, 10),
        weight: saved.weight,
        neck: saved.neck,
        shoulders: saved.shoulders,
        chest: saved.chest,
        waist: saved.waist,
        hips: saved.hips,
        bicep: saved.bicep,
        thigh: saved.thigh,
        calf: saved.calf,
        bodyFat: saved.bodyFat,
      };

      setEntries((prevEntries) => {
        const existingIdx = prevEntries.findIndex((item) => item.date === entry.date);
        if (existingIdx >= 0) {
          const updated = [...prevEntries];
          updated[existingIdx] = entry;
          return updated;
        }
        return [...prevEntries, entry];
      });

      setForm(emptyForm());
      setShowForm(false);
      toast.success('Medidas sincronizadas en la nube');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar medidas');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteMeasurement(id);
      setEntries((prevEntries) => prevEntries.filter((e) => e.id !== id));
      setConfirmDelete(null);
      toast.success('Medida eliminada');
    } catch {
      toast.error('Error al eliminar la medida');
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.topRow}>
        <h1 style={styles.pageTitle}>Medidas</h1>
        <button style={styles.addBtn} onClick={() => setShowForm((v) => !v)}>
          <Plus size={20} />
          {showForm ? 'Cancelar' : 'Registrar medidas'}
        </button>
      </div>

      {/* New Measurement Form */}
      {showForm && (
        <div style={styles.formCard}>
          <h2 style={styles.formTitle}>Nueva entrada de medidas</h2>
          <form onSubmit={handleSave} style={styles.form}>
            <div style={styles.formGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Fecha</label>
                <input type="date" value={form.date} onChange={(e) => handleFormChange('date', e.target.value)} style={styles.input} required />
              </div>
              {FIELDS.map((f) => (
                <div key={f.key} style={styles.inputGroup}>
                  <label style={styles.label}>{f.label} ({f.unit})</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={(form as Record<string, string>)[f.key]}
                    onChange={(e) => handleFormChange(f.key, e.target.value)}
                    placeholder={`0.0 ${f.unit}`}
                    style={styles.input}
                  />
                </div>
              ))}
            </div>
            <button type="submit" style={styles.saveBtn} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar medidas'}
            </button>
          </form>
        </div>
      )}

      {/* Main Layout: 30% Measurements Panel | 70% Charts Panel */}
      <div style={styles.mainGrid}>

        {/* LEFT 30%: Anthropometric Summary */}
        <div style={styles.leftPanel}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <Scale size={22} color="var(--accent-teal)" />
              <h2 style={styles.cardTitle}>Medidas actuales</h2>
            </div>

            {latest === null ? (
              <div style={styles.emptyText}>
                {loading ? 'Cargando medidas sincronizadas...' : 'Registra tu primera entrada para ver tus medidas aquí.'}
              </div>
            ) : (
              <>
                <div style={styles.latestDate}>
                  Última actualización: {new Date(latest.date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>

                <div style={styles.measureList}>
                  {FIELDS.map((f) => {
                    const val = (latest as Record<string, unknown>)[f.key] as number | null;
                    const prevVal = prev ? (prev as Record<string, unknown>)[f.key] as number | null : null;
                    if (val === null || val === 0) return null;
                    return (
                      <div
                        key={f.key}
                        style={{
                          ...styles.measureRow,
                          ...(activeChart === f.key ? styles.measureRowActive : {}),
                        }}
                        onClick={() => setActiveChart(f.key)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{ ...styles.measureDot, backgroundColor: f.color }} />
                          <span style={styles.measureLabel}>{f.label}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                          <span style={styles.measureValue}>{val} {f.unit}</span>
                          <TrendBadge current={val} prev={prevVal} unit={f.unit} lowerIsBetter={f.lowerIsBetter} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* History List */}
          {sortedEntries.length > 0 && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Historial</h2>
              <div style={styles.historyList}>
                {[...sortedEntries].reverse().map((e) => (
                  <div key={e.id} style={styles.historyRow}>
                    <div>
                      <div style={styles.historyDate}>
                        {new Date(e.date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <div style={styles.historySub}>
                        {e.weight ? `${e.weight} kg` : ''}
                        {e.waist ? ` · Cin. ${e.waist} cm` : ''}
                        {e.bodyFat ? ` · ${e.bodyFat}% grasa` : ''}
                      </div>
                    </div>
                    <button style={styles.deleteBtn} onClick={() => setConfirmDelete(e.id)}>
                      <Trash2 size={15} color="var(--danger-color)" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT 70%: Charts */}
        <div style={styles.rightPanel}>
          {/* Chart Selector Tabs */}
          <div style={styles.chartTabsCard}>
            <div style={styles.chartTabsRow}>
              {FIELDS.map((f) => (
                <button
                  key={f.key}
                  style={{
                    ...styles.chartTab,
                    ...(activeChart === f.key ? { ...styles.chartTabActive, borderColor: f.color, color: f.color } : {}),
                  }}
                  onClick={() => setActiveChart(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main Chart Card */}
          <div style={styles.card}>
            <div style={styles.chartHeader}>
              <div style={styles.titleRow}>
                <div style={{ ...styles.chartColorDot, backgroundColor: activeField.color }} />
                <h2 style={styles.cardTitle}>{activeField.label}</h2>
              </div>

              {latest && (latest as Record<string, unknown>)[activeField.key] !== null && (
                <div style={styles.chartCurrentVal}>
                  <span style={{ ...styles.bigVal, color: activeField.color }}>
                    {(latest as Record<string, unknown>)[activeField.key] as number}
                  </span>
                  <span style={styles.bigUnit}>{activeField.unit}</span>
                  <TrendBadge
                    current={(latest as Record<string, unknown>)[activeField.key] as number | null}
                    prev={prev ? (prev as Record<string, unknown>)[activeField.key] as number | null : null}
                    unit={activeField.unit}
                    lowerIsBetter={activeField.lowerIsBetter}
                  />
                </div>
              )}
            </div>

            <LineChart
              points={getChartPoints(activeField.key)}
              color={activeField.color}
              unit={activeField.unit}
              label={activeField.label}
            />
          </div>

                  {/* Mini charts removed – select via tabs */}
          </div>
        </div>
      

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', textAlign: 'center' }}>
            <Trash2 size={32} color="var(--danger-color)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              ¿Eliminar esta entrada?
            </h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Se eliminarán todos los datos de esta fecha. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button style={styles.cancelModalBtn} onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button style={styles.confirmDeleteBtn} onClick={() => handleDelete(confirmDelete)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
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
  topRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: {
    fontSize: '2.4rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    backgroundColor: 'var(--accent-teal)',
    color: 'var(--bg-color)',
    padding: '0.85rem 1.75rem',
    borderRadius: 'var(--radius-container)',
    fontWeight: 700,
    fontSize: '1rem',
    border: 'none',
    cursor: 'pointer',
  },
  formCard: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '2rem 2.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  formTitle: {
    fontSize: '1.3rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '1rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
  },
  input: {
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-control)',
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    color: 'var(--text-primary)',
    width: '100%',
    boxSizing: 'border-box',
  },
  saveBtn: {
    backgroundColor: 'var(--accent-teal)',
    color: 'var(--bg-color)',
    padding: '0.85rem 2rem',
    borderRadius: 'var(--radius-container)',
    fontWeight: 700,
    fontSize: '1rem',
    border: 'none',
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '3fr 7fr',
    gap: '1.75rem',
    alignItems: 'start',
    width: '100%',
  },
  leftPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.75rem',
  },
  rightPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.75rem',
  },
  card: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '1.75rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    boxSizing: 'border-box',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  cardTitle: {
    fontSize: '1.3rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  emptyText: {
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    lineHeight: 1.5,
  },
  latestDate: {
    fontSize: '0.82rem',
    color: 'var(--text-muted)',
    marginTop: '-0.5rem',
  },
  measureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  measureRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.65rem 0.85rem',
    borderRadius: 'var(--radius-control)',
    cursor: 'pointer',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease, transform 0.15s ease',
  },
  measureRowActive: {
    backgroundColor: 'rgba(192,138,90,0.08)',
    border: '1px solid rgba(192,138,90,0.3)',
  },
  measureDot: {
    width: '9px',
    height: '9px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  measureLabel: {
    fontSize: '0.88rem',
    color: 'var(--text-secondary)',
    fontWeight: 600,
  },
  measureValue: {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    maxHeight: '280px',
    overflowY: 'auto',
  },
  historyRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.65rem 0.85rem',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-control)',
  },
  historyDate: {
    fontSize: '0.9rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  historySub: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  deleteBtn: {
    padding: '0.35rem',
    borderRadius: 'var(--radius-element)',
    cursor: 'pointer',
    backgroundColor: 'rgba(217,108,108,0.1)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
  },
  chartTabsCard: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '1rem 1.5rem',
  },
  chartTabsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  chartTab: {
    padding: '0.4rem 0.9rem',
    borderRadius: 'var(--radius-element)',
    fontSize: '0.82rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease, transform 0.15s ease',
  },
  chartTabActive: {
    backgroundColor: 'rgba(192,138,90,0.08)',
    borderColor: 'var(--accent-teal)',
    color: 'var(--text-primary)',
    borderWidth: '1.5px',
  },
  chartHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  chartColorDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  chartCurrentVal: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.4rem',
  },
  bigVal: {
    fontSize: '2rem',
    fontWeight: 800,
    lineHeight: 1,
    color: 'var(--text-primary)',
  },
  bigUnit: {
    fontSize: '1rem',
    color: 'var(--text-muted)',
    fontWeight: 600,
  },
  miniChartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '1.25rem',
  },
  miniChartCard: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '1.25rem 1.5rem',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    transition: 'border-color 0.15s',
  },
  miniChartHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  miniChartLabel: {
    fontSize: '0.88rem',
    fontWeight: 700,
    color: 'var(--text-secondary)',
    flex: 1,
  },
  miniChartVal: {
    fontSize: '0.9rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  cancelModalBtn: {
    padding: '0.75rem 1.5rem',
    borderRadius: 'var(--radius-control)',
    color: 'var(--text-muted)',
    fontWeight: 600,
    fontSize: '1rem',
    border: '1px solid var(--border-color)',
    cursor: 'pointer',
    backgroundColor: 'var(--input-bg)',
  },
  confirmDeleteBtn: {
    backgroundColor: 'var(--danger-color)',
    color: '#fff',
    padding: '0.75rem 1.5rem',
    borderRadius: 'var(--radius-control)',
    fontWeight: 700,
    fontSize: '1rem',
    border: 'none',
    cursor: 'pointer',
  },
};
