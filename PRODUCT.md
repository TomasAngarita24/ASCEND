# PRODUCT.md — ASCEND

## 1. Product Overview & Vision
**ASCEND** is a high-performance strength training, hypertrophy tracking, and progressive overload platform designed for dedicated lifters, athletes, and fitness enthusiasts.

It bridges fast, zero-friction workout execution in the gym with deep analytics, scientific 1RM estimations, muscle balance diagnostics, and an open illustrated exercise library.

---

## 2. Target Audience & Personas
- **The Dedicated Gym Lifter**: Needs to log sets, weights, reps, and RPE within seconds between sets without dealing with clutter or laggy interfaces.
- **The Progressive Overload Tracker**: Requires instant visibility into previous workout performance (weight × reps) on every exercise to ensure continuous progression.
- **The Structured Programmer**: Builds and duplicates routine templates (Push/Pull/Legs, Upper/Lower, Full Body), organizing exercise order and target rest intervals.
- **The Data-Driven Athlete**: Analyzes weekly training frequency, total volume progression (kg/week), muscle group distribution balance, and body measurements over time.

---

## 3. Core Problems Solved
1. **Friction in the Gym**: Eliminates slow multi-tap flows during active sets with keyboard-friendly inputs, automatic previous set placeholders, and one-tap rest timers.
2. **Lack of Transparent Exercise Knowledge**: Integrates a 151+ bilingual exercise library with muscle maps, anatomical illustrations, and execution instructions, plus support for custom exercises.
3. **Overload Blindness**: Automatically shows previous session benchmarks directly in the active workout view so athletes always know the target weight and reps to beat.
4. **Subscription Paywalls & Clutter**: Provides a clean, modern, dark-first fitness system without predatory monetization or ads.

---

## 4. Key Functional Modules

### 🏋️ Active Workout Logger (`/workouts/active`)
- Start from routine template or empty session.
- Real-time elapsed timer and rest countdown timer.
- Dynamic set management: Add sets, reorder exercises, delete sets with automatic renumbering.
- Previous performance benchmarks (`weight kg × reps`) dynamically shown as smart placeholders.
- Set types supported: `Normal`, `Warmup`, `Drop Set`, `Failure`.

### 📋 Routine Manager (`/routines`)
- Custom routine creation with targeted sets, reps ranges, and rest intervals.
- Quick exercise reordering with up/down controls.
- One-click routine duplication (`cloning routine and exercise configurations`).

### 📚 Exercise Library (`/exercises`)
- **Catálogo General**: 151 bilingual exercises powered by the Exercise API with illustrated cards, primary/secondary muscle tags, and equipment filters.
- **Mis Ejercicios Creados**: Dedicated management section for user-defined custom exercises with full create, edit, and soft-delete capabilities.
- **Progression Drilldown**: Historical 1RM trends, max weight curves, and complete past set history per exercise.

### 📊 Progress Dashboard & Home (`/home`, `/history`)
- **Weekly Volume & Frequency Chart (FR-PROG-003)**: Interactive bar charts showing weekly volume load (kg) and sessions completed.
- **Muscle Balance Distribution (FR-MUSC-002)**: Muscle group volume breakdown preventing systemic training imbalances.
- **Detailed History (FR-HIST-002)**: Inspect completed workouts, 1RM estimations, set types, and volume.

### 🛠 Utilities (`/plate-calculator`, `/measurements`, `/profile`)
- Visual barbell plate calculator supporting standard Olympic plates (20kg, 15kg, 10kg, 5kg, 2.5kg, 1.25kg).
- Body composition and circumference measurement logging.
- Dual theme support (Cyber Dark & Crisp Light) and Google OAuth 2.0 / JWT session security.

---

## 5. Product Quality Principles
- **Speed Above All**: All interactions in the active workout view must respond in <50ms.
- **Data Integrity**: Never drop workout history or orphan sets; preserve historical workouts even when custom exercises are updated or soft-deleted.
- **Ergonomics in the Gym**: High contrast text, large tap targets (minimum 44x44px), readable under bright gym lighting or dark gym environments.
- **Bilingual & Accessible**: Full Spanish and English muscle and exercise nomenclature.
