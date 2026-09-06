# ASCEND Requirements

This document contains ASCEND's functional and non-functional requirements. Product context is documented in [Product Overview](product.md), and release scope is documented in [Roadmap](roadmap.md).

# Functional Requirements

## Authentication

### FR-AUTH-001 — Account Management

The system must allow users to create and manage their accounts.

### FR-AUTH-002 — User Registration

The system must allow users to register an account.

### FR-AUTH-003 — User Login

The system must allow users to log in.

### FR-AUTH-004 — User Logout

The system must allow users to log out.

### FR-AUTH-005 — Backend Authentication

Users must be able to securely authenticate with the backend.

### FR-AUTH-006 — Private Workout Data

Users must only be able to access their own private workout data.

## Exercise Management

### FR-EXER-001 — Exercise Library

ASCEND must provide an exercise library that users can browse and search. Each exercise should contain its name, description, target muscle groups, equipment, instructions, and media or demonstration.

### FR-EXER-002 — Exercise Discovery

Users must be able to browse exercises, search exercises by name, filter exercises by muscle group and equipment, and view exercise details.

### FR-EXER-003 — Custom Exercises

Users must be able to create their own exercises. A custom exercise may contain a name, description, target muscle group, equipment, and instructions. Custom exercises should only be available to the user who created them unless future sharing functionality is implemented.

## Routine Management

### FR-ROUT-001 — Routine Management

Users must be able to create and manage workout routines. A routine represents a reusable workout template.

### FR-ROUT-002 — Routine Creation and Editing

Users must be able to create and name a routine; add, remove, reorder, and edit exercises within it; delete it; duplicate it.

### FR-ROUT-003 — Exercise Configuration

For each exercise in a routine, users should be able to configure the target number of sets, target repetition range, target weight when applicable, rest time, exercise order, and notes.

## Workout Tracking

### FR-WORK-001 — Start Workout

Users must be able to start a workout based on an existing routine or create a workout independently.

### FR-WORK-002 — Real-Time Performance Recording

During an active workout, users must be able to record their performance in real time. Each completed set may contain weight, repetitions, RPE, set type, notes, and completion status.

### FR-WORK-003 — Set Types

ASCEND should support Normal, Warm-up, Drop set, and Failure set types.

### FR-WORK-004 — Previous Performance

When performing an exercise, ASCEND should display relevant information from the user's previous performance to help users make informed decisions about their current workout.

Example:

```text
Previous workout:

Bench Press
60 kg × 10
60 kg × 9
65 kg × 7
```

### FR-WORK-005 — Workout Controls

Users must be able to start, pause, resume, complete, and cancel a workout; add and remove exercises during a workout; and edit recorded sets.

## Rest Timer

### FR-REST-001 — Integrated Rest Timer

ASCEND should provide an integrated rest timer. When a user completes a set, the application should be able to automatically start a countdown based on the configured rest period.

### FR-REST-002 — Rest Timer Controls

Users should be able to start the timer automatically or manually, pause it, skip it, and adjust its duration. The timer should remain accessible while navigating through the active workout.

## Supersets

### FR-SUPER-001 — Superset Management

ASCEND should support grouping two or more exercises into supersets. Users should be able to create a superset, add and remove exercises, perform exercises sequentially, and track sets independently for each exercise.


## Workout History

### FR-HIST-001 — Previous Workouts

Users must be able to view their previous workouts. Each workout should contain the date, duration, routine, exercises performed, sets completed, total repetitions, and total volume.

### FR-HIST-002 — Workout Details

Users should be able to open a previous workout and inspect its details.

## Progress Tracking

### FR-PROG-001 — Exercise Progression

Users should be able to view weight, repetition, volume, and estimated strength progression for individual exercises.

### FR-PROG-002 — Training Statistics

ASCEND should provide total workouts, workout frequency, total volume, total sets, total repetitions, personal records, and exercise progression statistics.

### FR-PROG-003 — Progress Charts

The application should provide visual representations of weight, volume, repetitions, and workout frequency over time, as well as weekly volume.

## Personal Records

### FR-PR-001 — Personal Record Identification

ASCEND should identify personal records, including the highest weight lifted, highest repetitions at a given weight, estimated one-repetition maximum, and highest training volume. The application should maintain a history of relevant personal records.

## Estimated One-Rep Max

### FR-1RM-001 — Estimated One-Rep Max Calculation

ASCEND may calculate an estimated one-repetition maximum from recorded workout sets rather than requiring an actual one-repetition maximum test. The exact calculation method will be defined during implementation.

## Muscle Group Tracking

### FR-MUSC-001 — Exercise Muscle Groups

ASCEND should be able to associate exercises with one or more muscle groups.

### FR-MUSC-002 — Muscle Group Insights

Muscle group information can later be used to provide muscle group statistics, training frequency by muscle group, muscle group volume, and muscle balance visualizations.

## Plate Calculator

### FR-PLATE-001 — Plate Calculation

ASCEND should provide a plate calculator for barbell exercises. Users should be able to enter target weight, barbell weight, and available plates; the application should calculate the plates required on each side of the bar.

Example:

```text
Target: 100 kg
Bar: 20 kg

Each side:
20 kg
10 kg
5 kg
2.5 kg
```

## Routine Templates

### FR-TMPL-001 — Predefined Routine Templates

ASCEND may provide predefined workout routines that users can add to their accounts, including Push / Pull / Legs, Upper / Lower, Full Body, and beginner routines. Templates may be categorized by experience level, training goal, and available equipment.

## Social Features

### FR-SOC-001 — Social Functionality

ASCEND may eventually include user profiles, following users, followers, a workout feed, likes, comments, sharing workouts and routines, and copying another user's routine.

Example:

```text
User A
  ↓
Publishes workout
  ↓
Social Feed
  ↓
User B
  ├── Like
  ├── Comment
  └── Copy Routine
```

# Non-Functional Requirements

## Performance

### NFR-PERF-001 — Application Performance

The application should respond quickly to user interactions, avoid unnecessary API requests, load workout data efficiently, remain responsive during active workouts, and support efficient synchronization with the backend.

## Security

### NFR-SEC-001 — Data and Access Security

The application must secure user authentication, hash passwords before storing them, protect authenticated API endpoints, validate incoming data, prevent unauthorized access to user data, never expose sensitive credentials in the web client, and store secrets using environment variables. User passwords must never be stored in plain text.

## Usability

### NFR-USE-001 — Fast Workout Interaction

The application should prioritize fast interaction during workouts. Users should be able to record a set with minimal interaction.

### NFR-USE-002 — Active Workout Priorities

The active workout interface should prioritize exercise name, previous performance, weight, repetitions, set completion, and rest timer.

## Reliability

### NFR-REL-001 — Workout Data Reliability

Workout data should not be easily lost due to temporary network failures, application interruptions, or accidental navigation. The architecture should allow future implementation of local persistence and synchronization.

## Scalability

### NFR-SCALE-001 — Extensible Backend

The backend should be structured so that future functionality can be added without requiring a complete rewrite, including social features, more advanced analytics, additional exercise metadata, notifications, cloud synchronization, and multiple devices.
