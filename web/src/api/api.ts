import { offlineQueue } from '../utils/offlineQueue';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;
// An explicitly empty VITE_API_BASE_URL means "same origin" (Vercel proxies the
// API prefixes to the backend). Leave it unset in dev to talk to localhost.
const API_BASE_URL =
  configuredBaseUrl !== undefined && configuredBaseUrl !== ''
    ? configuredBaseUrl
    : import.meta.env.DEV
      ? 'http://localhost:3000'
      : '';

/**
 * Session architecture: access and refresh tokens live only in httpOnly,
 * SameSite cookies. JavaScript never sees a token value, which makes the app
 * resilient to token exfiltration via XSS. The `accessToken` parameters kept on
 * the API methods below are vestigial (always ignored by the client) and exist
 * only so existing call sites keep compiling; requests authenticate via cookies.
 */

export interface User {
  id: string;
  email: string;
  fullName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
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

export interface RoutineMuscleSet {
  muscleGroup: string;
  sets: number;
}

export interface RoutineSummary {
  id: string;
  name: string;
  folderId?: string | null;
  exerciseCount: number;
  totalSets?: number;
  muscleSets?: RoutineMuscleSet[];
}

export interface RoutineFolder {
  id: string;
  name: string;
  routineIds: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface BodyMeasurement {
  id: string;
  date: string;
  weight: number | null;
  neck: number | null;
  shoulders: number | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  bicep: number | null;
  thigh: number | null;
  calf: number | null;
  bodyFat: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveMeasurementInput {
  date: string;
  weight?: number | null;
  neck?: number | null;
  shoulders?: number | null;
  chest?: number | null;
  waist?: number | null;
  hips?: number | null;
  bicep?: number | null;
  thigh?: number | null;
  calf?: number | null;
  bodyFat?: number | null;
}

export interface ExerciseProgressionPoint {
  date: string;
  weight: number | null;
  repetitions: number;
  volume: number;
  estimatedOneRepMax: number | null;
}

export interface ExerciseProgressionResponse {
  exercise: ExerciseSummary;
  data: ExerciseProgressionPoint[];
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

export interface RoutineSaveExercise {
  exerciseId: string;
  targetSets?: number;
  targetWeight?: number;
  targetRepetitionsMin?: number;
  targetRepetitionsMax?: number;
  restSeconds?: number;
  notes?: string;
}

export interface RoutineSaveInput {
  id?: string;
  name: string;
  exercises: RoutineSaveExercise[];
}

export type RoutineTemplateLevel = 'beginner' | 'intermediate' | 'advanced';
export type RoutineTemplateGoal = 'strength' | 'hypertrophy' | 'general';

export interface RoutineTemplateSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  level: RoutineTemplateLevel;
  goal: RoutineTemplateGoal;
  equipment: string;
  exerciseCount: number;
}

export interface RoutineTemplateExercise {
  id: string;
  position: number;
  exercise: {
    id: string;
    name: string;
  };
  targetSets: number | null;
  targetRepetitionsMin: number | null;
  targetRepetitionsMax: number | null;
  restSeconds: number | null;
}

export interface RoutineTemplateDetail extends RoutineTemplateSummary {
  exercises: RoutineTemplateExercise[];
}

export interface RoutineTemplateFilters {
  level?: RoutineTemplateLevel;
  goal?: RoutineTemplateGoal;
  equipment?: string;
}

export interface WorkoutSet {
  id: string;
  setNumber: number;
  weight: number | null;
  repetitions: number | null;
  rpe: number | null;
  setType: 'warmup' | 'normal' | 'drop' | 'failure';
  isCompleted: boolean;
  notes?: string | null;
}

export interface WorkoutExercise {
  id: string;
  position: number;
  exercise: {
    id: string;
    name: string;
    mediaUrl?: string | null;
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

export interface FeedAuthor {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface FeedWorkoutExercise {
  id: string;
  name: string;
  mediaUrl: string | null;
  setsCompleted: number;
}

export interface FeedWorkout {
  id: string;
  routineName: string | null;
  completedAt: string | null;
  durationSeconds: number;
  totalVolume: number;
  exercises: FeedWorkoutExercise[];
}

export interface FeedRoutine {
  id: string;
  name: string;
  exerciseCount: number;
  muscleGroups: string[];
}

export interface FeedPost {
  id: string;
  postType: string;
  caption: string | null;
  author: FeedAuthor;
  workout: FeedWorkout | null;
  routine: FeedRoutine | null;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
  createdAt: string;
}

export interface FeedResponse {
  data: FeedPost[];
  pagination: { page: number; limit: number; total: number };
}

export interface PostComment {
  id: string;
  postId: string;
  body: string;
  author: FeedAuthor;
  createdAt: string;
}

export interface CommentsResponse {
  data: PostComment[];
  pagination: { page: number; limit: number; total: number };
}

export interface SocialUserSummary {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  isFollowing: boolean;
}

export interface PublicProfileResponse {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
  stats: {
    workoutsCompleted: number;
    postsCount: number;
  };
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isSelf: boolean;
}

export interface FollowMutationResponse {
  following: boolean;
  followersCount: number;
}

export interface FollowListResponse {
  data: SocialUserSummary[];
  pagination: { page: number; limit: number; total: number };
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

export interface WeeklyMuscleSetStat {
  muscleGroup: string;
  weeklySets: number;
  weeklyVolume: number;
  dailySets: number;
  dailyVolume: number;
  totalSets: number;
  totalVolume: number;
  frequencyThisWeek: number;
}

export class ApiError extends Error {
  readonly status?: number;
  readonly code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/** Sent when a mutation was enqueued for offline sync (it will be replayed later). */
export class OfflineQueuedError extends Error {
  constructor() {
    super('Sin conexión: los cambios quedarán guardados y se sincronizarán al reconectarte.');
    this.name = 'OfflineQueuedError';
  }
}

/** Coerces an unknown thrown value into an error, keeping the HTTP status when present. */
export function toError(err: unknown): { message: string; status?: number } {
  if (err instanceof ApiError) {
    return { message: err.message, status: err.status };
  }
  return { message: err instanceof Error ? err.message : 'Ocurrió un error inesperado.' };
}

class ApiClient {
  private sessionExpiredCallback: (() => void) | null = null;
  private tokenRefreshedCallback: ((accessTokenExpiresAt: string) => void) | null = null;
  private refreshPromise: Promise<void> | null = null;

  constructor() {
    offlineQueue.setTokenRefresher(() => this.refreshTokens());
  }

  setSessionExpiredCallback(fn: () => void) {
    this.sessionExpiredCallback = fn;
  }

  /** Fired whenever a background token refresh issues a fresh access token. */
  setTokenRefreshedCallback(fn: (accessTokenExpiresAt: string) => void) {
    this.tokenRefreshedCallback = fn;
  }

  private async refreshTokens(): Promise<void> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      // The refresh token travels in an httpOnly cookie, so nothing needs to
      // be read from storage — just renew the session and let the browser
      // store the fresh cookies.
      const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!refreshResponse.ok) {
        throw new Error('Refresh failed.');
      }

      // Keep the in-memory expiry current so the app knows when the token
      // will actually rotate again.
      const data = await refreshResponse.json().catch(() => null);
      if (data && typeof data.accessTokenExpiresAt === 'string') {
        this.tokenRefreshedCallback?.(data.accessTokenExpiresAt);
      }
    })();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  /** Ends the server-side session and clears the httpOnly cookies. */
  async logout(): Promise<void> {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  }

  async request<T>(path: string, options: RequestInit & { accessToken?: string } = {}, isRetry = false): Promise<T> {
    const { accessToken: _accessToken, headers, ...rest } = options;
    const isAuthEntry = path === '/auth/login' || path === '/auth/register' || path === '/auth/google';
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...rest,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      });
    } catch {
      const method = (rest.method ?? 'GET').toUpperCase();
      if (method !== 'GET' && !path.startsWith('/auth/')) {
        let body: unknown;
        if (typeof rest.body === 'string') {
          try {
            body = JSON.parse(rest.body);
          } catch {
            body = rest.body;
          }
        } else {
          body = rest.body;
        }
        offlineQueue.enqueue({
          url: `${API_BASE_URL}${path}`,
          method,
          body,
          description: `${method} ${path}`,
        });
        throw new OfflineQueuedError();
      }
      throw new Error('No fue posible conectar con el servidor. Verifica tu conexión a internet.');
    }

    // Auto token refresh on 401 (single shared refresh to avoid racing requests).
    // Auth entry points (login/register/google) are exempt: a 401 there means
    // invalid credentials, not an expired session.
    if (response.status === 401 && !isRetry && !isAuthEntry) {
      try {
        await this.refreshTokens();
        return this.request<T>(path, options, true);
      } catch {
        this.sessionExpiredCallback?.();
        throw new Error('La sesión ha expirado. Por favor, inicia sesión nuevamente.');
      }
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const serverMessage = data.message || data.error?.message;
      let friendlyMessage = serverMessage || 'Ocurrió un error inesperado.';
      if (response.status === 401) {
        friendlyMessage = 'La sesión ha expirado o las credenciales no son válidas.';
      } else if (response.status === 400 || response.status === 422) {
        friendlyMessage = serverMessage || 'Los datos ingresados no son válidos.';
      } else if (response.status === 404) {
        friendlyMessage = 'El recurso solicitado no fue encontrado.';
      } else if (response.status >= 500) {
        friendlyMessage = 'Ocurrió un problema en el servidor. Inténtalo de nuevo más tarde.';
      }
      throw new ApiError(friendlyMessage, response.status, data.code);
    }
    return data as T;
  }

  // --- Auth ---
  private toAuthSession(res: { accessTokenExpiresAt: string; user: User }): AuthSession {
    return {
      user: res.user,
      tokens: {
        accessToken: '',
        refreshToken: '',
        accessTokenExpiresAt: res.accessTokenExpiresAt,
      },
    };
  }

  async login(email: string, password: string): Promise<AuthSession> {
    const res = await this.request<{ accessToken: string; accessTokenExpiresAt: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return this.toAuthSession(res);
  }

  async loginWithGoogle(idToken: string): Promise<AuthSession> {
    const res = await this.request<{ accessToken: string; accessTokenExpiresAt: string; user: User }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
    return this.toAuthSession(res);
  }

  async register(email: string, password: string): Promise<AuthSession> {
    const res = await this.request<{ accessToken: string; accessTokenExpiresAt: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return this.toAuthSession(res);
  }

  async forgotPassword(email: string): Promise<void> {
    await this.request<void>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    await this.request<void>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  async getProfile(accessToken: string): Promise<User> {
    const res = await this.request<{ user: User }>('/auth/me', { accessToken });
    return res.user;
  }

  // --- Exercises ---
  async listExercises(accessToken: string, params: { query?: string; muscleGroup?: string; equipment?: string } = {}): Promise<ExerciseSummary[]> {
    const search = new URLSearchParams({ limit: '200' });
    if (params.query) search.set('query', params.query);
    if (params.muscleGroup) search.set('muscleGroup', params.muscleGroup);
    if (params.equipment) search.set('equipment', params.equipment);

    const collected: ExerciseSummary[] = [];
    let page = 1;
    for (;;) {
      search.set('page', String(page));
      const res = await this.request<{ data: ExerciseSummary[]; pagination: { page: number; limit: number; total: number } }>(`/exercises?${search.toString()}`, { accessToken });
      collected.push(...res.data);
      const total = res.pagination?.total ?? collected.length;
      if (collected.length >= total || res.data.length === 0) break;
      page += 1;
    }
    return collected;
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
    return { id: res.routine.id, name: res.routine.name, exerciseCount: 0, totalSets: 0, muscleSets: [] };
  }

  async saveRoutine(accessToken: string, input: RoutineSaveInput): Promise<RoutineDetail> {
    const res = await this.request<{ routine: RoutineDetail }>('/routines/save', {
      method: 'POST',
      accessToken,
      body: JSON.stringify(input),
    });
    return res.routine;
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

async reorderRoutineExercises(accessToken: string, routineId: string, routineExerciseIds: string[]): Promise<RoutineDetail> {
    const res = await this.request<{ routine: RoutineDetail }>(`/routines/${routineId}/exercises/reorder`, {
      method: 'POST',
      body: JSON.stringify({ routineExerciseIds }),
      accessToken,
    });
    return res.routine;
  }

  async listRoutineTemplates(accessToken: string, filters: RoutineTemplateFilters = {}): Promise<RoutineTemplateSummary[]> {
    const search = new URLSearchParams();
    if (filters.level) search.set('level', filters.level);
    if (filters.goal) search.set('goal', filters.goal);
    if (filters.equipment) search.set('equipment', filters.equipment);
    const query = search.toString();
    const res = await this.request<{ data: RoutineTemplateSummary[] }>(`/routine-templates${query ? `?${query}` : ''}`, { accessToken });
    return res.data;
  }

  async getRoutineTemplate(accessToken: string, templateId: string): Promise<RoutineTemplateDetail> {
    const res = await this.request<{ template: RoutineTemplateDetail }>(`/routine-templates/${templateId}`, { accessToken });
    return res.template;
  }

  async addRoutineTemplate(accessToken: string, templateId: string): Promise<RoutineDetail> {
    const res = await this.request<{ routine: RoutineDetail }>(`/routine-templates/${templateId}/add`, {
      method: 'POST',
      accessToken,
    });
    return res.routine;
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
    input: { weight?: number | null; repetitions?: number | null; rpe?: number; isCompleted?: boolean },
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

  async deleteWorkout(accessToken: string, workoutId: string): Promise<void> {
    await this.request<void>(`/workouts/${workoutId}`, {
      method: 'DELETE',
      accessToken,
    });
  }

  async listWorkoutHistory(accessToken: string): Promise<WorkoutHistoryEntry[]> {
    const collected: WorkoutHistoryEntry[] = [];
    let page = 1;
    const limit = 100;
    for (;;) {
      const res = await this.request<{ data: WorkoutHistoryEntry[]; pagination: { page: number; limit: number; total: number } }>(`/workouts?status=completed&page=${page}&limit=${limit}`, { accessToken });
      collected.push(...res.data);
      const total = res.pagination?.total ?? collected.length;
      if (collected.length >= total || res.data.length === 0) break;
      page += 1;
    }
    return collected;
  }

  /** Fetches the export blob and triggers a browser download. */
  async exportWorkouts(_accessToken: string, format: 'csv' | 'json'): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/workouts/export?format=${format}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({})) as { message?: string };
      throw new Error(data.message ?? 'Error al exportar los datos.');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = format === 'csv' ? 'ascend-historial.csv' : 'ascend-historial.json';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  async reorderWorkoutExercises(accessToken: string, workoutId: string, exerciseIds: string[]): Promise<ActiveWorkout> {
    const res = await this.request<{ workout: ActiveWorkout }>(`/workouts/${workoutId}/exercises/reorder`, {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify({ exerciseIds }),
    });
    return res.workout;
  }

  async importWorkouts(accessToken: string, backupData: unknown): Promise<{ importedWorkouts: number; importedSets: number }> {
    return await this.request<{ importedWorkouts: number; importedSets: number }>('/workouts/import', {
      method: 'POST',
      accessToken,
      body: JSON.stringify(backupData),
    });
  }

  async getWorkout(accessToken: string, workoutId: string): Promise<WorkoutDetailEntry> {
    const res = await this.request<{ workout: WorkoutDetailEntry }>(`/workouts/${workoutId}`, { accessToken });
    return res.workout;
  }

  // --- Social feed ---
  async shareWorkout(accessToken: string, workoutId: string, caption?: string): Promise<FeedPost> {
    const res = await this.request<{ post: FeedPost }>(`/workouts/${workoutId}/share`, {
      method: 'POST',
      accessToken,
      body: JSON.stringify(caption ? { caption } : {}),
    });
    return res.post;
  }

  async copyRoutinePost(accessToken: string, postId: string): Promise<{ id: string; name: string }> {
    const res = await this.request<{ routine: { id: string; name: string } }>(`/social/posts/${postId}/copy-routine`, {
      method: 'POST',
      accessToken,
    });
    return res.routine;
  }

  async getSocialFeed(accessToken: string, page = 1, limit = 20): Promise<FeedResponse> {
    return await this.request<FeedResponse>(`/social/feed?page=${page}&limit=${limit}`, { accessToken });
  }

  async likePost(accessToken: string, postId: string): Promise<void> {
    await this.request<void>(`/social/posts/${postId}/likes`, {
      method: 'POST',
      accessToken,
    });
  }

  async unlikePost(accessToken: string, postId: string): Promise<void> {
    await this.request<void>(`/social/posts/${postId}/likes`, {
      method: 'DELETE',
      accessToken,
    });
  }

  async deletePost(accessToken: string, postId: string): Promise<void> {
    await this.request<void>(`/social/posts/${postId}`, {
      method: 'DELETE',
      accessToken,
    });
  }

  async getPostComments(accessToken: string, postId: string, page = 1, limit = 20): Promise<CommentsResponse> {
    return await this.request<CommentsResponse>(`/social/posts/${postId}/comments?page=${page}&limit=${limit}`, { accessToken });
  }

  async addPostComment(accessToken: string, postId: string, body: string): Promise<PostComment> {
    const res = await this.request<{ comment: PostComment }>(`/social/posts/${postId}/comments`, {
      method: 'POST',
      accessToken,
      body: JSON.stringify({ body }),
    });
    return res.comment;
  }

  // --- Public profiles & follows ---
  async getPublicProfile(accessToken: string, userId: string): Promise<PublicProfileResponse> {
    return await this.request<PublicProfileResponse>(`/users/${userId}/profile`, { accessToken });
  }

  async followUser(accessToken: string, userId: string): Promise<FollowMutationResponse> {
    return await this.request<FollowMutationResponse>(`/users/${userId}/follow`, {
      method: 'POST',
      accessToken,
    });
  }

  async unfollowUser(accessToken: string, userId: string): Promise<FollowMutationResponse> {
    return await this.request<FollowMutationResponse>(`/users/${userId}/follow`, {
      method: 'DELETE',
      accessToken,
    });
  }

  async getUserFollowers(accessToken: string, userId: string, page = 1, limit = 20): Promise<FollowListResponse> {
    return await this.request<FollowListResponse>(`/users/${userId}/followers?page=${page}&limit=${limit}`, { accessToken });
  }

  async getUserFollowing(accessToken: string, userId: string, page = 1, limit = 20): Promise<FollowListResponse> {
    return await this.request<FollowListResponse>(`/users/${userId}/following?page=${page}&limit=${limit}`, { accessToken });
  }

  async searchUsers(accessToken: string, query: string, page = 1, limit = 20): Promise<FollowListResponse> {
    const q = encodeURIComponent(query);
    return await this.request<FollowListResponse>(`/users/search?q=${q}&page=${page}&limit=${limit}`, { accessToken });
  }

  // --- Progress & Analytics ---
  async getStatistics(accessToken: string): Promise<ProgressStatistics> {
    const res = await this.request<{ statistics: ProgressStatistics }>('/progress/statistics', { accessToken });
    return res.statistics;
  }

  async getMuscleGroupStatistics(accessToken: string): Promise<MuscleGroupStat[]> {
    const res = await this.request<{ data: MuscleGroupStat[] }>('/progress/muscle-groups', { accessToken });
    return res.data;
  }

  async getWeeklyMuscleSets(accessToken: string): Promise<{ data: WeeklyMuscleSetStat[]; totalWeeklySets: number; totalDailySets: number }> {
    return await this.request<{ data: WeeklyMuscleSetStat[]; totalWeeklySets: number; totalDailySets: number }>('/progress/weekly-muscle-sets', { accessToken });
  }

  async getExerciseProgression(accessToken: string, exerciseId: string): Promise<ExerciseProgressionResponse> {
    return await this.request<ExerciseProgressionResponse>(`/progress/exercises/${exerciseId}`, { accessToken });
  }

  // --- Profile ---
  async updateProfile(accessToken: string, data: { fullName?: string | null; bio?: string | null; avatarUrl?: string | null }): Promise<User> {
    const res = await this.request<{ user: User }>('/auth/me', {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify(data),
    });
    return res.user;
  }

  async changePassword(accessToken: string, currentPassword: string, newPassword: string): Promise<void> {
    await this.request<void>('/auth/me/password', {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async deleteAccount(accessToken: string): Promise<void> {
    await this.request<void>('/auth/me', {
      method: 'DELETE',
      accessToken,
    });
  }

  // --- Routine Folders ---
  async listFolders(accessToken: string): Promise<RoutineFolder[]> {
    const res = await this.request<{ data: RoutineFolder[] }>('/routines/folders', { accessToken });
    return res.data;
  }

  async createFolder(accessToken: string, name: string): Promise<RoutineFolder> {
    const res = await this.request<{ folder: RoutineFolder }>('/routines/folders', {
      method: 'POST',
      accessToken,
      body: JSON.stringify({ name }),
    });
    return res.folder;
  }

  async deleteFolder(accessToken: string, folderId: string): Promise<void> {
    await this.request<void>(`/routines/folders/${folderId}`, {
      method: 'DELETE',
      accessToken,
    });
  }

  async setRoutineFolder(accessToken: string, routineId: string, folderId: string | null): Promise<void> {
    await this.request<{ routine: RoutineDetail }>(`/routines/${routineId}/folder`, {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify({ folderId }),
    });
  }

  // --- Measurements ---
  async listMeasurements(accessToken: string): Promise<BodyMeasurement[]> {
    const res = await this.request<{ data: BodyMeasurement[] }>('/measurements', { accessToken });
    return res.data;
  }

  async saveMeasurement(accessToken: string, input: SaveMeasurementInput): Promise<BodyMeasurement> {
    const res = await this.request<{ measurement: BodyMeasurement }>('/measurements', {
      method: 'POST',
      accessToken,
      body: JSON.stringify(input),
    });
    return res.measurement;
  }

  async deleteMeasurement(accessToken: string, id: string): Promise<void> {
    await this.request<void>(`/measurements/${id}`, {
      method: 'DELETE',
      accessToken,
    });
  }
}

export const api = new ApiClient();
