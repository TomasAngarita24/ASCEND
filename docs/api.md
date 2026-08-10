# API

The general API contract will be designed after the requirements and architecture have been finalized. The authentication contract is defined below because it is needed by every protected endpoint.

## Authentication

All authentication requests and protected API requests must use HTTPS.

### `POST /auth/register`

Creates an account using an email and password.

The backend normalizes the email to lowercase, validates the password, hashes it, and creates the user. On success, it returns the same authentication response as login.

#### Request body

```json
{
  "email": "user@example.com",
  "password": "a-secure-password"
}
```

#### Success response — `201 Created`

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "createdAt": "2026-08-09T00:00:00Z"
  },
  "accessToken": "jwt-access-token",
  "accessTokenExpiresAt": "2026-08-09T00:15:00Z",
  "refreshToken": "opaque-refresh-token"
}
```

#### Errors

- `400 Bad Request` — Invalid email or password that does not meet the password policy.
- `409 Conflict` — The email is already registered.

### `POST /auth/login`

Authenticates a user using an email and password.

For invalid credentials, the backend returns a generic authentication error and must not indicate whether the email address exists.

#### Request body

```json
{
  "email": "user@example.com",
  "password": "a-secure-password"
}
```

#### Success response — `200 OK`

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "createdAt": "2026-08-09T00:00:00Z"
  },
  "accessToken": "jwt-access-token",
  "accessTokenExpiresAt": "2026-08-09T00:15:00Z",
  "refreshToken": "opaque-refresh-token"
}
```

#### Errors

- `400 Bad Request` — Invalid request body.
- `401 Unauthorized` — Invalid email or password. The response is identical whether the email exists or not.

### `POST /auth/refresh`

Exchanges a valid refresh token for a new access token and a new refresh token. The previous refresh-token session is permanently deleted as part of the rotation.

#### Request body

```json
{
  "refreshToken": "opaque-refresh-token"
}
```

#### Success response — `200 OK`

```json
{
  "accessToken": "jwt-access-token",
  "accessTokenExpiresAt": "2026-08-09T00:15:00Z",
  "refreshToken": "new-opaque-refresh-token"
}
```

#### Errors

- `400 Bad Request` — Invalid request body.
- `401 Unauthorized` — Invalid or expired refresh token.

### `POST /auth/logout`

Permanently deletes the session associated with the supplied refresh token. The mobile application must remove both tokens from secure device storage.

#### Request body

```json
{
  "refreshToken": "opaque-refresh-token"
}
```

#### Success response — `204 No Content`

The endpoint returns `204 No Content` whether or not the supplied refresh token matches an active session. This makes logout idempotent and does not disclose session state.

#### Errors

- `400 Bad Request` — Invalid request body.

### `GET /auth/me`

Returns the authenticated user's account information. This endpoint requires a valid access token.

#### Request headers

```text
Authorization: Bearer <access-token>
```

#### Success response — `200 OK`

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "createdAt": "2026-08-09T00:00:00Z",
    "updatedAt": "2026-08-09T00:00:00Z"
  }
}
```

#### Errors

- `401 Unauthorized` — Missing, expired, or invalid access token.

## Request Validation and Error Format

Authentication requests use `Content-Type: application/json`. All timestamps in responses use ISO 8601 UTC format.

Errors use this format:

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password."
  }
}
```

The initial authentication error codes are:

| Code | HTTP status | Meaning |
| --- | --- | --- |
| `VALIDATION_ERROR` | `400` | The request body is missing or invalid. |
| `EMAIL_ALREADY_REGISTERED` | `409` | The email cannot be used to create a new account. |
| `INVALID_CREDENTIALS` | `401` | The supplied email or password is invalid. |
| `INVALID_REFRESH_TOKEN` | `401` | The refresh token is invalid or expired. |
| `UNAUTHORIZED` | `401` | An access token is missing, invalid, or expired. |

## Tokens and Session Storage

- Access tokens are JWTs with a 15-minute lifetime.
- Refresh tokens are opaque, randomly generated credentials with a 30-day lifetime.
- Refresh tokens are stored only as hashes in the `session` table.
- Every refresh token is single-use: refresh-token rotation creates a new session and permanently deletes the previous session.
- Access tokens must include the user identifier, session identifier, issued-at time, expiration time, issuer, and audience. The backend must validate these values and only accept its configured signing algorithm.
- The backend stores signing secrets in environment variables; the mobile application must never contain backend secrets.
- The mobile application must store tokens only in platform-secure storage, such as the iOS Keychain or Android Keystore. It must not store tokens in AsyncStorage.

## Password Policy

- Passwords must be at least 12 characters long.
- Passwords may include Unicode characters and whitespace.
- The API must not silently truncate passwords.
- Passwords are hashed on the backend with Argon2id using a minimum configuration of 19 MiB memory, 2 iterations, and parallelism of 1.
- Passwords must never be logged, returned by the API, encrypted for storage, or stored in plain text.

Password recovery, email verification, social login, and multi-device synchronization remain future roadmap items.

## Protected Endpoints

Endpoints that access private data require an access token using the `Authorization: Bearer <access-token>` header. Backend authorization must ensure that authenticated users can access only their own private data.

## Exercises

All exercise endpoints require a valid access token. An authenticated user can access application-provided exercises and their own custom exercises. Another user's custom exercise must be treated as not found.

### `GET /exercises`

Returns a paginated exercise library. The endpoint supports search and filtering.

#### Query parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `query` | No | Searches exercise names. |
| `muscleGroup` | No | Filters by a target muscle group. |
| `equipment` | No | Filters by equipment. |
| `page` | No | Page number; defaults to `1`. |
| `limit` | No | Results per page; defaults to `20` and must not exceed `100`. |

#### Success response — `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Bench Press",
      "targetMuscleGroups": ["Chest", "Triceps"],
      "equipment": "Barbell",
      "isCustom": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

#### Errors

- `400 Bad Request` — One or more query parameters are invalid.
- `401 Unauthorized` — Access token is missing, invalid, or expired.

### `GET /exercises/:exerciseId`

Returns the details of one application-provided exercise or one custom exercise owned by the authenticated user.

#### Success response — `200 OK`

```json
{
  "exercise": {
    "id": "uuid",
    "name": "Bench Press",
    "description": "A barbell pressing exercise.",
    "targetMuscleGroups": ["Chest", "Triceps"],
    "equipment": "Barbell",
    "instructions": "Lower the bar with control, then press upward.",
    "mediaUrl": "https://example.com/bench-press.mp4",
    "isCustom": false,
    "createdAt": "2026-08-09T00:00:00Z",
    "updatedAt": "2026-08-09T00:00:00Z"
  }
}
```

#### Errors

- `400 Bad Request` — `exerciseId` is not a valid UUID.
- `401 Unauthorized` — Access token is missing, invalid, or expired.
- `404 Not Found` — The exercise does not exist or is not accessible to the authenticated user.

### `POST /exercises`

Creates a custom exercise that is available only to the authenticated user.

#### Request body

```json
{
  "name": "Single-Arm Cable Row",
  "description": "A unilateral cable row.",
  "targetMuscleGroups": ["Back", "Biceps"],
  "equipment": "Cable Machine",
  "instructions": "Pull the handle toward the torso with control."
}
```

`name` is required. `description`, `targetMuscleGroups`, `equipment`, and `instructions` are optional.

#### Success response — `201 Created`

```json
{
  "exercise": {
    "id": "uuid",
    "name": "Single-Arm Cable Row",
    "description": "A unilateral cable row.",
    "targetMuscleGroups": ["Back", "Biceps"],
    "equipment": "Cable Machine",
    "instructions": "Pull the handle toward the torso with control.",
    "mediaUrl": null,
    "isCustom": true,
    "createdAt": "2026-08-09T00:00:00Z",
    "updatedAt": "2026-08-09T00:00:00Z"
  }
}
```

#### Errors

- `400 Bad Request` — The request body is invalid or `name` is missing.
- `401 Unauthorized` — Access token is missing, invalid, or expired.

## Exercise Error Codes

| Code | HTTP status | Meaning |
| --- | --- | --- |
| `EXERCISE_NOT_FOUND` | `404` | The exercise does not exist or is not accessible to the authenticated user. |

## Routines

All routine endpoints require a valid access token. Users can access only their own routines. A routine that does not belong to the authenticated user must be treated as not found.

### `GET /routines`

Returns the authenticated user's routines.

#### Success response — `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Push Day",
      "exerciseCount": 5,
      "createdAt": "2026-08-09T00:00:00Z",
      "updatedAt": "2026-08-09T00:00:00Z"
    }
  ]
}
```

### `POST /routines`

Creates an empty reusable workout routine for the authenticated user.

#### Request body

```json
{
  "name": "Push Day"
}
```

#### Success response — `201 Created`

```json
{
  "routine": {
    "id": "uuid",
    "name": "Push Day",
    "exercises": [],
    "createdAt": "2026-08-09T00:00:00Z",
    "updatedAt": "2026-08-09T00:00:00Z"
  }
}
```

#### Errors

- `400 Bad Request` — The request body is invalid or `name` is missing.
- `401 Unauthorized` — Access token is missing, invalid, or expired.

### `GET /routines/:routineId`

Returns one routine and its exercises in routine order.

#### Success response — `200 OK`

```json
{
  "routine": {
    "id": "uuid",
    "name": "Push Day",
    "exercises": [
      {
        "id": "uuid",
        "position": 1,
        "targetSets": 3,
        "targetRepetitionsMin": 8,
        "targetRepetitionsMax": 12,
        "targetWeight": 60,
        "restSeconds": 120,
        "notes": "Use controlled repetitions.",
        "exercise": {
          "id": "uuid",
          "name": "Bench Press"
        }
      }
    ],
    "createdAt": "2026-08-09T00:00:00Z",
    "updatedAt": "2026-08-09T00:00:00Z"
  }
}
```

#### Errors

- `400 Bad Request` — `routineId` is not a valid UUID.
- `401 Unauthorized` — Access token is missing, invalid, or expired.
- `404 Not Found` — The routine does not exist or is not accessible to the authenticated user.

### `PATCH /routines/:routineId`

Updates a routine's name.

#### Request body

```json
{
  "name": "Updated Push Day"
}
```

#### Success response — `200 OK`

Returns the updated routine.

#### Errors

- `400 Bad Request` — The request body is invalid or does not contain an updatable field.
- `401 Unauthorized` — Access token is missing, invalid, or expired.
- `404 Not Found` — The routine does not exist or is not accessible to the authenticated user.

### `DELETE /routines/:routineId`

Permanently deletes a routine and its dependent data, according to the database cascade-deletion policy.

#### Success response — `204 No Content`

#### Errors

- `400 Bad Request` — `routineId` is not a valid UUID.
- `401 Unauthorized` — Access token is missing, invalid, or expired.
- `404 Not Found` — The routine does not exist or is not accessible to the authenticated user.

### `POST /routines/:routineId/duplicate`

Creates a duplicate of the authenticated user's routine, including its routine exercises and their configuration.

#### Success response — `201 Created`

Returns the newly created routine with its exercises.

#### Errors

- `400 Bad Request` — `routineId` is not a valid UUID.
- `401 Unauthorized` — Access token is missing, invalid, or expired.
- `404 Not Found` — The routine does not exist or is not accessible to the authenticated user.

### `POST /routines/:routineId/exercises`

Adds an exercise to a routine. If `position` is omitted, the exercise is added at the end of the routine.

#### Request body

```json
{
  "exerciseId": "uuid",
  "position": 1,
  "targetSets": 3,
  "targetRepetitionsMin": 8,
  "targetRepetitionsMax": 12,
  "targetWeight": 60,
  "restSeconds": 120,
  "notes": "Use controlled repetitions."
}
```

All fields except `exerciseId` are optional.

#### Success response — `201 Created`

Returns the created routine exercise.

#### Errors

- `400 Bad Request` — The request body is invalid, including an invalid target range or position.
- `401 Unauthorized` — Access token is missing, invalid, or expired.
- `404 Not Found` — The routine or exercise does not exist or is not accessible to the authenticated user.

### `PATCH /routines/:routineId/exercises/:routineExerciseId`

Updates the configuration of an exercise within a routine. The request may update `position`, `targetSets`, `targetRepetitionsMin`, `targetRepetitionsMax`, `targetWeight`, `restSeconds`, or `notes`.

#### Success response — `200 OK`

Returns the updated routine exercise.

#### Errors

- `400 Bad Request` — The request body is invalid or does not contain an updatable field.
- `401 Unauthorized` — Access token is missing, invalid, or expired.
- `404 Not Found` — The routine or routine exercise does not exist or is not accessible to the authenticated user.

### `DELETE /routines/:routineId/exercises/:routineExerciseId`

Permanently removes an exercise from a routine.

#### Success response — `204 No Content`

#### Errors

- `400 Bad Request` — One or more route parameters are not valid UUIDs.
- `401 Unauthorized` — Access token is missing, invalid, or expired.
- `404 Not Found` — The routine or routine exercise does not exist or is not accessible to the authenticated user.

### `POST /routines/:routineId/exercises/reorder`

Reorders every exercise in a routine. The `routineExerciseIds` array must contain every current routine exercise exactly once, in its desired order.

#### Request body

```json
{
  "routineExerciseIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```

#### Success response — `200 OK`

Returns the routine with its exercises in the updated order.

#### Errors

- `400 Bad Request` — The request does not include every current routine exercise exactly once.
- `401 Unauthorized` — Access token is missing, invalid, or expired.
- `404 Not Found` — The routine does not exist or is not accessible to the authenticated user.

## Routine Error Codes

| Code | HTTP status | Meaning |
| --- | --- | --- |
| `ROUTINE_NOT_FOUND` | `404` | The routine does not exist or is not accessible to the authenticated user. |
| `ROUTINE_EXERCISE_NOT_FOUND` | `404` | The routine exercise does not exist or is not accessible to the authenticated user. |

## Workouts

All workout endpoints require a valid access token. Users can access only their own workouts and the exercises and sets that belong to those workouts.

### `POST /workouts`

Starts an active workout. The request may include a routine or omit it to start an independent workout. When a routine is provided, its exercises are copied into the new workout in their configured order.

#### Request body

```json
{
  "routineId": "uuid"
}
```

To start an independent workout, send an empty JSON object.

```json
{}
```

#### Success response — `201 Created`

```json
{
  "workout": {
    "id": "uuid",
    "routineId": "uuid",
    "status": "active",
    "startedAt": "2026-08-09T00:00:00Z",
    "completedAt": null,
    "exercises": []
  }
}
```

#### Errors

- `400 Bad Request` — The request body is invalid.
- `401 Unauthorized` — Access token is missing, invalid, or expired.
- `404 Not Found` — The routine does not exist or is not accessible to the authenticated user.

### `GET /workouts/:workoutId`

Returns a workout with its exercises and recorded sets, ordered by exercise position and set number.

#### Success response — `200 OK`

```json
{
  "workout": {
    "id": "uuid",
    "routineId": "uuid",
    "status": "active",
    "startedAt": "2026-08-09T00:00:00Z",
    "completedAt": null,
    "exercises": [
      {
        "id": "uuid",
        "position": 1,
        "exercise": {
          "id": "uuid",
          "name": "Bench Press"
        },
        "sets": [
          {
            "id": "uuid",
            "setNumber": 1,
            "weight": 60,
            "repetitions": 10,
            "rpe": 8,
            "setType": "normal",
            "notes": null,
            "isCompleted": true,
            "completedAt": "2026-08-09T00:05:00Z"
          }
        ]
      }
    ]
  }
}
```

#### Errors

- `400 Bad Request` — `workoutId` is not a valid UUID.
- `401 Unauthorized` — Access token is missing, invalid, or expired.
- `404 Not Found` — The workout does not exist or is not accessible to the authenticated user.

### `POST /workouts/:workoutId/pause`

Pauses an active workout.

#### Success response — `200 OK`

Returns the workout with `status` set to `paused`.

#### Errors

- `401 Unauthorized` — Access token is missing, invalid, or expired.
- `404 Not Found` — The workout does not exist or is not accessible to the authenticated user.
- `409 Conflict` — The workout is not active.

### `POST /workouts/:workoutId/resume`

Resumes a paused workout.

#### Success response — `200 OK`

Returns the workout with `status` set to `active`.

#### Errors

- `401 Unauthorized` — Access token is missing, invalid, or expired.
- `404 Not Found` — The workout does not exist or is not accessible to the authenticated user.
- `409 Conflict` — The workout is not paused.

### `POST /workouts/:workoutId/complete`

Completes an active or paused workout and records `completedAt`.

#### Success response — `200 OK`

Returns the workout with `status` set to `completed`.

#### Errors

- `401 Unauthorized` — Access token is missing, invalid, or expired.
- `404 Not Found` — The workout does not exist or is not accessible to the authenticated user.
- `409 Conflict` — The workout is already completed or cancelled.

### `POST /workouts/:workoutId/cancel`

Cancels an active or paused workout. The workout is retained with `status` set to `cancelled`.

#### Success response — `200 OK`

Returns the workout with `status` set to `cancelled`.

#### Errors

- `401 Unauthorized` — Access token is missing, invalid, or expired.
- `404 Not Found` — The workout does not exist or is not accessible to the authenticated user.
- `409 Conflict` — The workout is already completed or cancelled.

### `POST /workouts/:workoutId/exercises`

Adds an exercise to an active workout. If `position` is omitted, the exercise is added at the end of the workout.

#### Request body

```json
{
  "exerciseId": "uuid",
  "position": 1
}
```

#### Success response — `201 Created`

Returns the created workout exercise with an empty `sets` array.

#### Errors

- `400 Bad Request` — The request body is invalid, including an invalid position.
- `401 Unauthorized` — Access token is missing, invalid, or expired.
- `404 Not Found` — The workout or exercise does not exist or is not accessible to the authenticated user.
- `409 Conflict` — The workout is not active.

### `DELETE /workouts/:workoutId/exercises/:workoutExerciseId`

Permanently removes an exercise and its sets from an active workout.

#### Success response — `204 No Content`

#### Errors

- `400 Bad Request` — One or more route parameters are not valid UUIDs.
- `401 Unauthorized` — Access token is missing, invalid, or expired.
- `404 Not Found` — The workout or workout exercise does not exist or is not accessible to the authenticated user.
- `409 Conflict` — The workout is not active.

### `POST /workouts/:workoutId/exercises/:workoutExerciseId/sets`

Creates a set for an exercise in an active workout. If `setNumber` is omitted, the set is appended after the existing sets for that workout exercise.

#### Request body

```json
{
  "setNumber": 1,
  "weight": 60,
  "repetitions": 10,
  "rpe": 8,
  "setType": "normal",
  "notes": "Controlled repetitions.",
  "isCompleted": true
}
```

All fields are optional. `setType` defaults to `normal` and `isCompleted` defaults to `false`.

#### Success response — `201 Created`

Returns the created set. When `isCompleted` is `true`, the backend records `completedAt`.

#### Errors

- `400 Bad Request` — The request body is invalid, including an invalid set type, set number, or negative recorded value.
- `401 Unauthorized` — Access token is missing, invalid, or expired.
- `404 Not Found` — The workout or workout exercise does not exist or is not accessible to the authenticated user.
- `409 Conflict` — The workout is not active.

### `PATCH /workouts/:workoutId/exercises/:workoutExerciseId/sets/:setId`

Edits a recorded set in an active workout. The request may update `weight`, `repetitions`, `rpe`, `setType`, `notes`, or `isCompleted`.

When `isCompleted` changes to `true`, the backend records `completedAt`. When it changes to `false`, `completedAt` is cleared.

#### Success response — `200 OK`

Returns the updated set.

#### Errors

- `400 Bad Request` — The request body is invalid or does not contain an updatable field.
- `401 Unauthorized` — Access token is missing, invalid, or expired.
- `404 Not Found` — The workout, workout exercise, or set does not exist or is not accessible to the authenticated user.
- `409 Conflict` — The workout is not active.

### `GET /exercises/:exerciseId/previous-performance`

Returns the authenticated user's recorded sets for the most recent completed workout containing the specified exercise. If no previous completed performance exists, `previousWorkout` is `null`.

#### Success response — `200 OK`

```json
{
  "previousWorkout": {
    "id": "uuid",
    "completedAt": "2026-08-08T00:00:00Z",
    "sets": [
      {
        "setNumber": 1,
        "weight": 60,
        "repetitions": 10,
        "rpe": 8,
        "setType": "normal"
      }
    ]
  }
}
```

#### Errors

- `400 Bad Request` — `exerciseId` is not a valid UUID.
- `401 Unauthorized` — Access token is missing, invalid, or expired.
- `404 Not Found` — The exercise does not exist or is not accessible to the authenticated user.

## Workout Error Codes

| Code | HTTP status | Meaning |
| --- | --- | --- |
| `WORKOUT_NOT_FOUND` | `404` | The workout does not exist or is not accessible to the authenticated user. |
| `WORKOUT_EXERCISE_NOT_FOUND` | `404` | The workout exercise does not exist or is not accessible to the authenticated user. |
| `SET_NOT_FOUND` | `404` | The set does not exist or is not accessible to the authenticated user. |
| `INVALID_WORKOUT_STATE` | `409` | The requested operation is not allowed for the workout's current status. |

## Workout History

All history endpoints require a valid access token and return only the authenticated user's workouts.

### `GET /workouts`

Returns a paginated workout history. By default, only completed workouts are returned.

#### Query parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `status` | No | Filters by `completed` or `cancelled`; defaults to `completed`. |
| `dateFrom` | No | Inclusive ISO 8601 start date. |
| `dateTo` | No | Inclusive ISO 8601 end date. |
| `page` | No | Page number; defaults to `1`. |
| `limit` | No | Results per page; defaults to `20` and must not exceed `100`. |

#### Success response — `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "routineId": "uuid",
      "status": "completed",
      "startedAt": "2026-08-09T00:00:00Z",
      "completedAt": "2026-08-09T01:05:00Z",
      "durationSeconds": 3900,
      "exerciseCount": 5,
      "setsCompleted": 15,
      "totalRepetitions": 120,
      "totalVolume": 5400
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

#### Errors

- `400 Bad Request` — One or more query parameters are invalid.
- `401 Unauthorized` — Access token is missing, invalid, or expired.

The existing `GET /workouts/:workoutId` endpoint provides the detail view for a workout in this history.

## Progress and Personal Records

All progress endpoints require a valid access token. Statistics, charts, estimated strength, and personal records are derived from the authenticated user's recorded workout data.

### `GET /progress/statistics`

Returns aggregate training statistics.

#### Query parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `dateFrom` | No | Inclusive ISO 8601 start date. |
| `dateTo` | No | Inclusive ISO 8601 end date. |

#### Success response — `200 OK`

```json
{
  "statistics": {
    "totalWorkouts": 12,
    "workoutFrequency": 3,
    "totalVolume": 54000,
    "totalSets": 180,
    "totalRepetitions": 1440,
    "personalRecords": 4
  }
}
```

`workoutFrequency` represents the number of workouts per week for the requested period.

### `GET /progress/exercises/:exerciseId`

Returns progression data for one exercise, including weight, repetitions, volume, and estimated strength.

#### Query parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `dateFrom` | No | Inclusive ISO 8601 start date. |
| `dateTo` | No | Inclusive ISO 8601 end date. |

#### Success response — `200 OK`

```json
{
  "exercise": {
    "id": "uuid",
    "name": "Bench Press"
  },
  "data": [
    {
      "date": "2026-08-09",
      "weight": 60,
      "repetitions": 10,
      "volume": 600,
      "estimatedOneRepMax": 80
    }
  ]
}
```

### `GET /progress/charts`

Returns chart-ready training data.

#### Query parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `metric` | Yes | One of `weight`, `volume`, `repetitions`, `workout_frequency`, or `weekly_volume`. |
| `exerciseId` | Conditional | Required for `weight`, `volume`, and `repetitions` exercise charts. |
| `dateFrom` | No | Inclusive ISO 8601 start date. |
| `dateTo` | No | Inclusive ISO 8601 end date. |

#### Success response — `200 OK`

```json
{
  "metric": "weekly_volume",
  "data": [
    {
      "date": "2026-08-03",
      "value": 5400
    }
  ]
}
```

### `GET /progress/personal-records`

Returns the authenticated user's personal-record history.

#### Success response — `200 OK`

```json
{
  "data": [
    {
      "type": "highest_weight",
      "exercise": {
        "id": "uuid",
        "name": "Bench Press"
      },
      "value": 100,
      "achievedAt": "2026-08-09T00:00:00Z"
    }
  ]
}
```

Record types are `highest_weight`, `highest_repetitions_at_weight`, `estimated_one_rep_max`, and `highest_training_volume`.

### `GET /progress/exercises/:exerciseId/estimated-one-rep-max`

Returns the current estimated one-repetition maximum for an exercise, calculated from recorded sets.

#### Success response — `200 OK`

```json
{
  "exercise": {
    "id": "uuid",
    "name": "Bench Press"
  },
  "estimatedOneRepMax": 80
}
```

The calculation method is intentionally not fixed yet; it will be defined during implementation.

### `GET /progress/muscle-groups`

Returns muscle-group statistics derived from exercise associations and recorded workout data.

#### Success response — `200 OK`

```json
{
  "data": [
    {
      "muscleGroup": "Chest",
      "trainingFrequency": 2,
      "volume": 5400
    }
  ]
}
```

Muscle-balance visualizations and the heatmap remain future features; this endpoint supplies the data that may support them.

#### Errors for Progress Endpoints

- `400 Bad Request` — A date range, metric, or exercise identifier is invalid.
- `401 Unauthorized` — Access token is missing, invalid, or expired.
- `404 Not Found` — The requested exercise does not exist or is not accessible to the authenticated user.

## Client-Side Features Without API Endpoints

### Rest Timer

The rest timer is an active-workout user-interface feature. Its configured rest duration is read from `routine_exercise.rest_seconds`; automatic start, manual start, pause, skip, adjustment, and visibility while navigating are handled by the mobile application. No standalone backend endpoint is required.

### Plate Calculator

The plate calculator is a stateless calculation based on target weight, barbell weight, and available plates. It is performed locally in the mobile application and does not require a backend endpoint.

## Post-MVP API Surface

The following endpoints document the existing post-MVP and future feature scope. They are reserved contracts: their database models and implementation are not yet defined.

### Supersets

| Endpoint | Purpose |
| --- | --- |
| `POST /routines/:routineId/supersets` | Creates a superset from two or more routine exercises. |
| `POST /routines/:routineId/supersets/:supersetId/exercises` | Adds a routine exercise to a superset. |
| `DELETE /routines/:routineId/supersets/:supersetId/exercises/:routineExerciseId` | Removes a routine exercise from a superset. |
| `DELETE /routines/:routineId/supersets/:supersetId` | Removes a superset. |

Superset exercises remain independently tracked when a routine is used to start a workout.

### Routine Templates

| Endpoint | Purpose |
| --- | --- |
| `GET /routine-templates` | Lists predefined templates; supports experience level, training goal, and equipment filters. |
| `GET /routine-templates/:templateId` | Returns one predefined routine template. |
| `POST /routine-templates/:templateId/add` | Adds a copy of a template to the authenticated user's routines. |

### Social Features

| Endpoint | Purpose |
| --- | --- |
| `GET /users/:userId/profile` | Returns a user profile. |
| `POST /users/:userId/follow` | Follows a user. |
| `DELETE /users/:userId/follow` | Unfollows a user. |
| `GET /users/:userId/followers` | Lists a user's followers. |
| `GET /users/:userId/following` | Lists users followed by that user. |
| `GET /social/feed` | Returns the workout feed. |
| `POST /workouts/:workoutId/share` | Shares a workout to the feed. |
| `POST /routines/:routineId/share` | Shares a routine to the feed. |
| `POST /social/posts/:postId/likes` | Likes a shared workout or routine. |
| `DELETE /social/posts/:postId/likes` | Removes a like. |
| `GET /social/posts/:postId/comments` | Lists comments for a shared workout or routine. |
| `POST /social/posts/:postId/comments` | Adds a comment. |
| `POST /social/posts/:postId/copy-routine` | Copies a shared routine to the authenticated user's routines. |

Social APIs are outside the initial MVP and must not be implemented until their data model and authorization rules have been defined.
