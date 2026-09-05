const API_BASE_URL = 'http://localhost:3000';

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
}

export interface AuthSession {
  user: User;
  tokens: Tokens;
}

export interface ExerciseSummary {
  id: string;
  name: string;
  targetMuscleGroups: string[];
  equipment: string | null;
  description?: string | null;
  mediaUrl?: string | null;
  instructions?: string | null;
  isCustom?: boolean;
}

export interface ExerciseDetail extends ExerciseSummary {
  description: string | null;
  instructions: string | null;
  mediaUrl: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoutineSummary {
  id: string;
  name: string;
  exerciseCount: number;
}

export interface RoutineExercise {
  id: string;
  exercise: {
    id: string;
    name: string;
  };
  position: number;
  restSeconds: number | null;
  targetRepetitionsMax: number | null;
  targetRepetitionsMin: number | null;
  targetSets: number | null;
  targetWeight: number | null;
  notes: string | null;
}

export interface RoutineDetail {
  id: string;
  name: string;
  exercises: RoutineExercise[];
}

export interface WorkoutSet {
  id: string;
  setNumber: number;
  weight: number | null;
  repetitions: number | null;
  rpe: number | null;
  setType: 'warmup' | 'normal' | 'drop' | 'failure';
  isCompleted: boolean;
}

export interface WorkoutExercise {
  id: string;
  position: number;
  exercise: {
    id: string;
    name: string;
  };
  sets: WorkoutSet[];
}

export interface ActiveWorkout {
  id: string;
  routineId: string | null;
  status: string;
  startedAt: string;
  completedAt: string | null;
  exercises: WorkoutExercise[];
}

export interface WorkoutHistoryEntry {
  id: string;
  routineId: string | null;
  status: 'completed' | 'cancelled';
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
  exerciseCount: number;
  setsCompleted: number;
  totalRepetitions: number;
  totalVolume: number;
}

export interface WorkoutDetailEntry {
  id: string;
  startedAt: string;
  exercises: WorkoutExercise[];
}

export interface ProgressChartData {
  metric: string;
  data: Array<{ date: string; value: number }>;
}

export interface MuscleGroupStat {
  muscleGroup: string;
  trainingFrequency: number;
  volume: number;
}

export interface ProgressStatistics {
  totalWorkouts: number;
  workoutFrequency: number;
  totalVolume: number;
  totalSets: number;
  totalRepetitions: number;
  personalRecords: number;
}

class ApiClient {
  private getAuthHeader(accessToken?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    return headers;
  }

  async request<T>(path: string, options: RequestInit & { accessToken?: string } = {}): Promise<T> {
    const { accessToken, headers, ...rest } = options;
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...rest,
        headers: {
          ...this.getAuthHeader(accessToken),
          ...headers,
        },
      });
    } catch {
      throw new Error('No fue posible conectar con el servidor. Verifica tu conexión a internet.');
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      let friendlyMessage = data.message || 'Ocurrió un error inesperado.';
      if (response.status === 401) {
        friendlyMessage = 'La sesión ha expirado o las credenciales no son válidas.';
      } else if (response.status === 400 || response.status === 422) {
        friendlyMessage = data.message || 'Los datos ingresados no son válidos.';
      } else if (response.status === 404) {
        friendlyMessage = 'El recurso solicitado no fue encontrado.';
      } else if (response.status >= 500) {
        friendlyMessage = 'Ocurrió un problema en el servidor. Inténtalo de nuevo más tarde.';
      }
      throw new Error(friendlyMessage);
    }
    return data as T;
  }

  // --- Auth ---
  async login(email: string, password: string): Promise<AuthSession> {
    const res = await this.request<{ accessToken: string; refreshToken: string; accessTokenExpiresAt: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return {
      user: res.user,
      tokens: {
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        accessTokenExpiresAt: res.accessTokenExpiresAt,
      },
    };
  }

  async loginWithGoogle(idToken: string): Promise<AuthSession> {
    const res = await this.request<{ accessToken: string; refreshToken: string; accessTokenExpiresAt: string; user: User }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
    return {
      user: res.user,
      tokens: {
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        accessTokenExpiresAt: res.accessTokenExpiresAt,
      },
    };
  }

  async register(email: string, password: string): Promise<AuthSession> {
    const res = await this.request<{ accessToken: string; refreshToken: string; accessTokenExpiresAt: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return {
      user: res.user,
      tokens: {
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        accessTokenExpiresAt: res.accessTokenExpiresAt,
      },
    };
  }

  async getProfile(accessToken: string): Promise<User> {
    const res = await this.request<{ user: User }>('/auth/me', { accessToken });
    return res.user;
  }

  // --- Exercises ---
  async listExercises(accessToken: string, params: { query?: string; muscleGroup?: string; equipment?: string } = {}): Promise<ExerciseSummary[]> {
    const search = new URLSearchParams({ page: '1', limit: '200' });
    if (params.query) search.set('query', params.query);
    if (params.muscleGroup) search.set('muscleGroup', params.muscleGroup);
    if (params.equipment) search.set('equipment', params.equipment);

    const res = await this.request<{ data: ExerciseSummary[] }>(`/exercises?${search.toString()}`, { accessToken });
    return res.data;
  }

  async createExercise(accessToken: string, input: { name: string; targetMuscleGroups?: string[]; equipment?: string; description?: string; instructions?: string; mediaUrl?: string }): Promise<ExerciseDetail> {
    const res = await this.request<{ exercise: ExerciseDetail }>('/exercises', {
      method: 'POST',
      accessToken,
      body: JSON.stringify(input),
    });
    return res.exercise;
  }

  async updateExercise(accessToken: string, exerciseId: string, input: { name?: string; targetMuscleGroups?: string[]; equipment?: string; description?: string; instructions?: string; mediaUrl?: string }): Promise<ExerciseDetail> {
    const res = await this.request<{ exercise: ExerciseDetail }>(`/exercises/${exerciseId}`, {
      method: 'PUT',
      accessToken,
      body: JSON.stringify(input),
    });
    return res.exercise;
  }

  async deleteExercise(accessToken: string, exerciseId: string): Promise<void> {
    await this.request<void>(`/exercises/${exerciseId}`, {
      method: 'DELETE',
      accessToken,
    });
  }

  // --- Routines ---
  async listRoutines(accessToken: string): Promise<RoutineSummary[]> {
    const res = await this.request<{ data: RoutineSummary[] }>('/routines', { accessToken });
    return res.data;
  }

  async getRoutine(accessToken: string, routineId: string): Promise<RoutineDetail> {
    const res = await this.request<{ routine: RoutineDetail }>(`/routines/${routineId}`, { accessToken });
    return res.routine;
  }

  async createRoutine(accessToken: string, name: string): Promise<RoutineSummary> {
    const res = await this.request<{ routine: { id: string; name: string } }>('/routines', {
      method: 'POST',
      accessToken,
      body: JSON.stringify({ name }),
    });
    return { id: res.routine.id, name: res.routine.name, exerciseCount: 0 };
  }

  async updateRoutine(accessToken: string, routineId: string, name: string): Promise<RoutineDetail> {
    const res = await this.request<{ routine: RoutineDetail }>(`/routines/${routineId}`, {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify({ name }),
    });
    return res.routine;
  }

  async deleteRoutine(accessToken: string, routineId: string): Promise<void> {
    await this.request<void>(`/routines/${routineId}`, {
      method: 'DELETE',
      accessToken,
    });
  }

  async addExerciseToRoutine(accessToken: string, routineId: string, exerciseId: string): Promise<RoutineExercise> {
    const res = await this.request<{ routineExercise: RoutineExercise }>(`/routines/${routineId}/exercises`, {
      method: 'POST',
      accessToken,
      body: JSON.stringify({ exerciseId }),
    });
    return res.routineExercise;
  }

  async updateRoutineExercise(accessToken: string, routineId: string, routineExerciseId: string, input: Partial<RoutineExercise>): Promise<RoutineExercise> {
    const res = await this.request<{ routineExercise: RoutineExercise }>(`/routines/${routineId}/exercises/${routineExerciseId}`, {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify(input),
    });
    return res.routineExercise;
  }

  async deleteRoutineExercise(accessToken: string, routineId: string, routineExerciseId: string): Promise<void> {
    await this.request<void>(`/routines/${routineId}/exercises/${routineExerciseId}`, {
      method: 'DELETE',
      accessToken,
    });
  }

  // --- Workouts ---
  async startWorkout(accessToken: string, routineId?: string): Promise<ActiveWorkout> {
    const res = await this.request<{ workout: ActiveWorkout }>('/workouts', {
      method: 'POST',
      accessToken,
      body: JSON.stringify({ ...(routineId ? { routineId } : {}) }),
    });
    return res.workout;
  }

  async addExerciseToWorkout(accessToken: string, workoutId: string, exerciseId: string): Promise<WorkoutExercise> {
    const res = await this.request<{ workoutExercise: WorkoutExercise }>(`/workouts/${workoutId}/exercises`, {
      method: 'POST',
      accessToken,
      body: JSON.stringify({ exerciseId }),
    });
    return res.workoutExercise;
  }

  async createWorkoutSet(accessToken: string, workoutId: string, exerciseId: string, input: { setType?: string; weight?: number; repetitions?: number } = {}): Promise<WorkoutSet> {
    const res = await this.request<{ set: WorkoutSet }>(`/workouts/${workoutId}/exercises/${exerciseId}/sets`, {
      method: 'POST',
      accessToken,
      body: JSON.stringify(input),
    });
    return res.set;
  }

  async recordWorkoutSet(
    accessToken: string,
    workoutId: string,
    exerciseId: string,
    setId: string,
    input: { weight?: number; repetitions?: number; rpe?: number; isCompleted?: boolean },
  ): Promise<WorkoutSet> {
    const res = await this.request<{ set: WorkoutSet }>(`/workouts/${workoutId}/exercises/${exerciseId}/sets/${setId}`, {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify(input),
    });
    return res.set;
  }

  async deleteWorkoutSet(accessToken: string, workoutId: string, exerciseId: string, setId: string): Promise<void> {
    await this.request<void>(`/workouts/${workoutId}/exercises/${exerciseId}/sets/${setId}`, {
      method: 'DELETE',
      accessToken,
    });
  }

  async deleteWorkoutExercise(accessToken: string, workoutId: string, workoutExerciseId: string): Promise<void> {
    await this.request<void>(`/workouts/${workoutId}/exercises/${workoutExerciseId}`, {
      method: 'DELETE',
      accessToken,
    });
  }

  async finishWorkout(accessToken: string, workoutId: string, action: 'complete' | 'cancel' = 'complete'): Promise<ActiveWorkout> {
    const res = await this.request<{ workout: ActiveWorkout }>(`/workouts/${workoutId}/${action}`, {
      method: 'POST',
      accessToken,
    });
    return res.workout;
  }

  async listWorkoutHistory(accessToken: string): Promise<WorkoutHistoryEntry[]> {
    const res = await this.request<{ data: WorkoutHistoryEntry[]; pagination: { page: number; limit: number; total: number } }>('/workouts?status=completed&page=1&limit=50', { accessToken });
    return res.data;
  }

  async getWorkout(accessToken: string, workoutId: string): Promise<WorkoutDetailEntry> {
    const res = await this.request<{ workout: WorkoutDetailEntry }>(`/workouts/${workoutId}`, { accessToken });
    return res.workout;
  }

  // --- Progress & Analytics ---
  async getStatistics(accessToken: string): Promise<ProgressStatistics> {
    const res = await this.request<{ statistics: ProgressStatistics }>('/progress/statistics', { accessToken });
    return res.statistics;
  }

  async getProgressChart(accessToken: string, metric: 'volume' | 'workout_frequency' | 'exercise_1rm' | 'duration', exerciseId?: string): Promise<ProgressChartData> {
    const search = new URLSearchParams({ metric });
    if (exerciseId) search.set('exerciseId', exerciseId);
    return await this.request<ProgressChartData>(`/progress/charts?${search.toString()}`, { accessToken });
  }

  async getMuscleGroupStatistics(accessToken: string): Promise<MuscleGroupStat[]> {
    const res = await this.request<{ data: MuscleGroupStat[] }>('/progress/muscle-groups', { accessToken });
    return res.data;
  }
}

export const api = new ApiClient();
