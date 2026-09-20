/**
 * CSV / Notion / Excel / Hevy / Strong Workout Importer
 *
 * Parses CSV exported from Notion databases, Microsoft Excel, Google Sheets,
 * Strong, Hevy, or ASCEND backups, and maps them into the backend ImportRow format.
 */

export interface ImportRow {
  workoutId?: string | null;
  date?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  durationSeconds?: number | null;
  exercise?: string | null;
  setNumber?: number | null;
  weight?: number | null;
  repetitions?: number | null;
  rpe?: number | null;
  setType?: 'normal' | 'warmup' | 'drop_set' | 'failure' | null;
  notes?: string | null;
  volume?: number | null;
}

export interface ImportParseResult {
  data: ImportRow[];
  stats: {
    totalWorkouts: number;
    totalSets: number;
    totalExercises: number;
  };
}

/**
 * Detects whether the delimiter is comma, semicolon, or tab.
 */
function detectDelimiter(text: string): string {
  const firstLines = text.slice(0, 2048).split(/\r?\n/).filter((l) => l.trim().length > 0).slice(0, 5);
  let commaCount = 0;
  let semicolonCount = 0;
  let tabCount = 0;

  for (const line of firstLines) {
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (!inQuotes) {
        if (char === ',') commaCount++;
        else if (char === ';') semicolonCount++;
        else if (char === '\t') tabCount++;
      }
    }
  }

  if (semicolonCount > commaCount && semicolonCount > tabCount) return ';';
  if (tabCount > commaCount && tabCount > semicolonCount) return '\t';
  return ',';
}

/**
 * Tokenizes a CSV string respecting RFC 4180 quotes and escaped quotes.
 */
export function parseCsvRows(text: string, delimiter?: string): string[][] {
  const cleanText = text.replace(/^\uFEFF/, ''); // Strip BOM
  const delim = delimiter ?? detectDelimiter(cleanText);

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i++;
        } else {
          // End of quoted field
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delim) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  return rows.filter((r) => r.some((field) => field.trim().length > 0));
}

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Maps CSV column index to normalized field key.
 */
function identifyColumns(headerRow: string[]): Record<string, number> {
  const map: Record<string, number> = {};

  headerRow.forEach((col, idx) => {
    const norm = normalizeHeader(col);

    // Exercise name
    if (['exercise', 'ejercicio', 'name', 'nombre', 'exercisename', 'nombredelejercicio', 'title', 'titulo'].includes(norm)) {
      if (map.exercise === undefined) map.exercise = idx;
    }
    // Date
    else if (['date', 'fecha', 'startedat', 'started', 'workoutdate', 'fechadeentrenamiento', 'dia', 'createdtime', 'starttime'].includes(norm)) {
      if (map.date === undefined) map.date = idx;
    }
    // Completed date / time
    else if (['completedat', 'completed', 'endedat', 'fechafin', 'horafin', 'endtime'].includes(norm)) {
      if (map.completedAt === undefined) map.completedAt = idx;
    }
    // Duration
    else if (['durationseconds', 'duration', 'duracion', 'time', 'tiempo', 'duracionminutos', 'duracionsegundos'].includes(norm)) {
      if (map.duration === undefined) map.duration = idx;
    }
    // Set number
    else if (['setnumber', 'set', 'serie', 'nserie', 'nroserie', 'numerodeserie', 'setorder', 'order'].includes(norm)) {
      if (map.setNumber === undefined) map.setNumber = idx;
    }
    // Weight
    else if (['weight', 'peso', 'weightkg', 'pesokg', 'kg', 'carga', 'weightlbs', 'pesolbs', 'lbs'].includes(norm)) {
      if (map.weight === undefined) {
        map.weight = idx;
        if (norm.includes('lbs')) map.weightIsLbs = 1;
      }
    }
    // Repetitions
    else if (['repetitions', 'reps', 'repeticiones', 'repeticion', 'repsreps'].includes(norm)) {
      if (map.repetitions === undefined) map.repetitions = idx;
    }
    // RPE
    else if (['rpe', 'esfuerzo', 'intensidad', 'rateofperceivedexertion'].includes(norm)) {
      if (map.rpe === undefined) map.rpe = idx;
    }
    // Set type
    else if (['settype', 'type', 'tipo', 'tipodeserie', 'categoria'].includes(norm)) {
      if (map.setType === undefined) map.setType = idx;
    }
    // Notes
    else if (['notes', 'notas', 'comentarios', 'comment', 'comments', 'observaciones'].includes(norm)) {
      if (map.notes === undefined) map.notes = idx;
    }
    // Workout / Routine session identifier
    else if (['workoutid', 'workout', 'workoutname', 'rutina', 'routine', 'sesion', 'session', 'nombrederutina'].includes(norm)) {
      if (map.workout === undefined) map.workout = idx;
    }
  });

  return map;
}

/**
 * Cleans and parses a numeric weight value, supporting comma decimals (e.g. 82,5)
 * and optional conversion from lbs to kg.
 */
function parseWeight(raw: string | undefined, isLbsColumn: boolean): number | null {
  if (!raw) return null;
  let s = raw.trim();
  if (!s || s === '-' || s.toLowerCase() === 'bodyweight' || s.toLowerCase() === 'corporal') {
    return 0;
  }

  const isLbs = isLbsColumn || /lbs?/i.test(s);
  s = s.replace(/[^0-9.,]/g, '').replace(',', '.');
  const val = Number.parseFloat(s);
  if (Number.isNaN(val) || val < 0) return null;

  if (isLbs) {
    return Math.round(val * 0.45359237 * 10) / 10;
  }
  return Math.round(val * 100) / 100;
}

function parseReps(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9]/g, '');
  const val = Number.parseInt(cleaned, 10);
  return Number.isNaN(val) || val < 0 ? null : val;
}

function parseRpe(raw: string | undefined): number | null {
  if (!raw) return null;
  const s = raw.trim().replace(',', '.');
  const val = Number.parseFloat(s);
  return Number.isNaN(val) || val < 0 || val > 10 ? null : val;
}

function parseSetType(raw: string | undefined): 'normal' | 'warmup' | 'drop_set' | 'failure' | null {
  if (!raw) return 'normal';
  const norm = raw.trim().toLowerCase();
  if (norm.includes('warm') || norm.includes('calent')) return 'warmup';
  if (norm.includes('drop')) return 'drop_set';
  if (norm.includes('fail') || norm.includes('fallo')) return 'failure';
  return 'normal';
}

/**
 * Normalizes date formats into a standard YYYY-MM-DD or ISO string.
 */
function parseDate(raw: string | undefined): { dateStr: string; isoStr: string } {
  const fallback = new Date();
  const fallbackDateStr = fallback.toISOString().slice(0, 10);
  const fallbackIsoStr = fallback.toISOString();

  if (!raw) return { dateStr: fallbackDateStr, isoStr: fallbackIsoStr };

  let s = raw.trim();
  // Notion date ranges like "2024-03-10 -> 2024-03-10"
  if (s.includes('->')) {
    s = s.split('->')[0].trim();
  }

  // Check DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
  if (ddmmyyyy) {
    const [, day, month, year, h, m, sec] = ddmmyyyy;
    const pad = (n: string) => n.padStart(2, '0');
    const dateStr = `${year}-${pad(month)}-${pad(day)}`;
    const timeStr = h ? `T${pad(h)}:${pad(m)}:${pad(sec || '00')}.000Z` : 'T12:00:00.000Z';
    return { dateStr, isoStr: `${dateStr}${timeStr}` };
  }

  // Standard Date.parse
  const ms = Date.parse(s);
  if (!Number.isNaN(ms)) {
    const d = new Date(ms);
    return {
      dateStr: d.toISOString().slice(0, 10),
      isoStr: d.toISOString(),
    };
  }

  return { dateStr: fallbackDateStr, isoStr: fallbackIsoStr };
}

/**
 * Main parser entry point: transforms raw CSV text from Notion/Excel into ImportRow array.
 */
export function parseCsvToWorkoutRows(csvText: string): ImportParseResult {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) {
    throw new Error('El archivo CSV está vacío o no contiene filas de datos.');
  }

  const headerRow = rows[0];
  const colMap = identifyColumns(headerRow);

  if (colMap.exercise === undefined) {
    throw new Error(
      'No se encontró la columna de ejercicio. Asegúrate de que tu tabla tenga un encabezado como "Ejercicio", "Exercise" o "Nombre".',
    );
  }

  const resultRows: ImportRow[] = [];
  const exerciseNamesSet = new Set<string>();
  const workoutSet = new Set<string>();

  // Map to track per-workout exercise set numbering if missing
  const setCounters = new Map<string, number>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const exerciseName = (row[colMap.exercise] || '').trim();
    if (!exerciseName) continue; // Skip blank exercise rows

    exerciseNamesSet.add(exerciseName.toLowerCase());

    const { dateStr, isoStr } = parseDate(colMap.date !== undefined ? row[colMap.date] : undefined);
    const workoutLabel = colMap.workout !== undefined && row[colMap.workout] ? row[colMap.workout].trim() : 'Entrenamiento';
    const workoutKey = `import_${dateStr}_${workoutLabel.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    workoutSet.add(workoutKey);

    // Calculate set number
    const exerciseCounterKey = `${workoutKey}_${exerciseName.toLowerCase()}`;
    const nextCounter = (setCounters.get(exerciseCounterKey) || 0) + 1;
    setCounters.set(exerciseCounterKey, nextCounter);

    const explicitSetNumber = colMap.setNumber !== undefined ? parseReps(row[colMap.setNumber]) : null;
    const finalSetNumber = explicitSetNumber && explicitSetNumber > 0 ? explicitSetNumber : nextCounter;

    const weight = colMap.weight !== undefined ? parseWeight(row[colMap.weight], Boolean(colMap.weightIsLbs)) : null;
    const repetitions = colMap.repetitions !== undefined ? parseReps(row[colMap.repetitions]) : null;
    const rpe = colMap.rpe !== undefined ? parseRpe(row[colMap.rpe]) : null;
    const setType = colMap.setType !== undefined ? parseSetType(row[colMap.setType]) : 'normal';
    const notes = colMap.notes !== undefined && row[colMap.notes] ? row[colMap.notes].trim() : null;

    const volume = weight !== null && repetitions !== null ? Math.round(weight * repetitions * 100) / 100 : null;

    resultRows.push({
      workoutId: workoutKey,
      date: dateStr,
      startedAt: isoStr,
      completedAt: null,
      durationSeconds: null,
      exercise: exerciseName,
      setNumber: finalSetNumber,
      weight,
      repetitions,
      rpe,
      setType,
      notes,
      volume,
    });
  }

  if (resultRows.length === 0) {
    throw new Error('No se encontraron registros válidos de entrenamiento para importar en el archivo.');
  }

  return {
    data: resultRows,
    stats: {
      totalWorkouts: workoutSet.size,
      totalSets: resultRows.length,
      totalExercises: exerciseNamesSet.size,
    },
  };
}
