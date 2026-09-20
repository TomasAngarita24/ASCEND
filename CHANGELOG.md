# Changelog

All notable changes are tracked per fase below. Commits follow lowercase conventional messages (`feat:` / `fix:` / `chore:`).

## Fase 15 — Importador de entrenamientos desde Notion, Excel y CSV
- Parser inteligente de CSV (`csvImporter.ts`): detección automática de delimitador (coma, punto y coma, tabulación), soporte de comillas RFC 4180 y eliminación de BOM.
- Reconocimiento de encabezados en español e inglés (`Ejercicio`, `Fecha`, `Serie`, `Peso`, `Reps`, `RPE`, `Tipo de serie`, `Notas`, `Rutina`).
- Conversión de unidades (`lbs` a `kg`), decimales con coma (estilo Excel en español) y fechas (ISO, DD/MM/YYYY, Notion).
- Agrupación automática de sesiones por fecha y rutina para generar entrenamientos completos.
- Integración en `SettingsView.tsx` permitiendo importar archivos `.csv` y `.json` directamente.
- Suite de pruebas unitarias automatizadas (`csvImporter.test.ts`).

## Fase 14 — Coaching en sesión, rendimiento y PWA
`c979e7f`
- In-session coaching: progressive-overload working-weight suggestion per exercise (from last session; +2.5 kg at ≥10 reps, −2.5 kg at ≤3 reps) with tap-to-apply.
- Weekly-volume deload detection: warns when an exercise reaches 12+ completed sets in 7 days.
- Vendor chunk splitting (`manualChunks`): main entry dropped from ~324 KB to ~62 KB (raw), with cacheable react/router/ui vendor chunks.
- Idle prefetch of the most common lazy views (`requestIdleCallback` + timeout fallback).
- Offline-friendly favorites: an enqueued favorite toggle is kept optimistically instead of being reverted.

## Fase 13 — Favoritos, PWA, rutas compartidas, UX de entrenamiento
`f7ac9d1`
- Server-backed exercise favorites (GET/PUT/DELETE `/exercises/favorites`) with one-time legacy migration.
- PWA update prompt (manual update) + install button; `registerType: 'prompt'`.
- Share routines by deep link (`/r/:routineId`) with copy-to-clipboard.
- Active-workout rest timer: pause/resume, +30s, server-pushed end-of-rest reminder.
- Drop sets with suggested weight (70%, rounded to 2.5 kg) applied in one tap.
- Component tests: `RoutineDetailModal`, `PostCard`, `ActiveWorkoutView`.

## Fase 12 — Descanso programado y rutinas públicas
`7662470`
- Rest seconds on the active workout; DB-backed rest-end pushes (`RestPushSchedule`, 5s sweeper).
- Public routines shared socially with the performed session (workout record + per-exercise chips) in `RoutineDetailModal`.

## Fase 11 — Fotos de perfil, targets y uso de rutinas públicas
`f6250cf`
- Profile photos (raise 1 MB JSON body limit), workout sets pre-filled from routine targets.
- View other users' public routines with the performed session; mobile text-overlap fixes in active workout and history.

## Fase 10 — Organización y visibilidad de rutinas
`2151bf3`
- Routine ordering: drag & drop plus folders; public/private visibility with one-click copying of public routines.
- Fixed duplicate +/− icons.

## Fase 9 — Post social y perfiles
`c8b124d`
- Social posts with own image and PR badge; user profiles show their posts; public copyable routine detail.

## Fase 8 — Notificaciones push
`493ed65`
- Web push (VAPID): end-of-rest and daily reminders; custom service worker with push handlers.

## Fase 7 — Limpieza y refresco de sesión
`ea293df`
- Removed dead Navbar and starter assets; refresh-token expiry kept in memory; desktop/mobile profile options split.