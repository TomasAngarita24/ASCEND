# ASCEND

ASCEND is a workout tracking and training management application designed to help users plan their workouts, record training sessions in real time, and analyze their progress over time. It runs on desktop and mobile as a progressive web app (PWA) and is backed by a Node.js API and PostgreSQL database.

The goal of ASCEND is to provide a simple, flexible, and data-driven way to manage strength training.

## Features

### Workout Tracking

- Record weight and repetitions.
- Track RPE.
- Support different set types.
- View previous performance.
- Track completed workouts.
- Integrated rest timer.

### Routine Management

- Create custom workout routines.
- Add and remove exercises.
- Reorder exercises.
- Configure target sets and repetitions.
- Edit and duplicate routines.

### Exercise Library

- Browse exercises.
- Search and filter exercises.
- Filter by muscle group and equipment.
- View exercise information.
- Create custom exercises.

### Progress Tracking

- Track exercise progression.
- Monitor training volume.
- Track workout frequency.
- Identify personal records.
- Visualize progress with charts.
- Analyze training performance over time.

### Future Features

ASCEND is planned to evolve with additional features such as:

- Supersets.
- Plate calculator.
- Muscle group analytics.
- Muscle heatmap.
- Routine templates.
- Social profiles and workout sharing.
- Following and followers.
- Social feed.
- Advanced analytics.

## Project Structure

```text
ASCEND/
│
├── backend/         # Node.js + Express API
│
├── web/             # PWA frontend (React + Vite), installable on desktop & mobile
│
├── docs/            # Project and technical documentation
│
├── compose.yaml     # Local PostgreSQL via Docker
│
├── .gitignore
└── README.md
