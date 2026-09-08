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

export interface CopyRoutineResponse {
  routine: { id: string; name: string };
}

export interface PostCommentResponse {
  id: string;
  postId: string;
  body: string;
  author: FeedAuthor;
  createdAt: string;
}

export interface CommentsResponse {
  data: PostCommentResponse[];
  pagination: { page: number; limit: number; total: number };
}