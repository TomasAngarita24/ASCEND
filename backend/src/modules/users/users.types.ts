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

export interface FollowListResponse {
  data: SocialUserSummary[];
  pagination: { page: number; limit: number; total: number };
}

export interface FollowMutationResponse {
  following: boolean;
  followersCount: number;
}