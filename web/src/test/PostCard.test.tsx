import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import type { FeedPost } from '../api/api';
import { PostCard } from '../components/PostCard';

// The real modal fetches the routine; replace it with a controllable stub.
vi.mock('../components/RoutineDetailModal', () => ({
  RoutineDetailModal: ({
    routineId,
    workoutId,
    onClose,
  }: {
    routineId: string;
    workoutId?: string;
    onClose: () => void;
  }) => (
    <div data-testid="routine-detail-mock">
      <span>routine:{routineId}</span>
      <span>workout:{workoutId ?? 'none'}</span>
      <button onClick={onClose}>close</button>
    </div>
  ),
}));

const post: FeedPost = {
  id: 'post-1',
  postType: 'workout',
  caption: 'Gran sesión de pecho',
  imageUrl: null,
  prAchieved: true,
  author: { id: 'user-1', fullName: 'Tomas', avatarUrl: null },
  workout: {
    id: 'workout-1',
    routineId: 'routine-1',
    routineName: 'Push Day',
    completedAt: '2026-09-10T18:00:00.000Z',
    durationSeconds: 3720,
    totalVolume: 12500,
    exercises: [{ id: 'ex-1', name: 'Press Banca', mediaUrl: null, setsCompleted: 4 }],
  },
  routine: null,
  likeCount: 3,
  likedByMe: true,
  commentCount: 2,
  createdAt: '2026-09-10T19:00:00.000Z',
};

function renderPost(overrides: Partial<FeedPost> = {}) {
  const handlers = {
    onToggleLike: vi.fn(),
    onDelete: vi.fn(),
    onCopyRoutine: vi.fn(),
  };
  render(
    <MemoryRouter>
      <PostCard post={{ ...post, ...overrides }} currentUserId="user-1" {...handlers} />
    </MemoryRouter>,
  );
  return handlers;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PostCard', () => {
  it('renders author, workout stats and exercise chips', () => {
    renderPost();

    expect(screen.getByText('Tomas')).toBeInTheDocument();
    expect(screen.getByText('Push Day')).toBeInTheDocument();
    expect(screen.getByText('12.500 kg')).toBeInTheDocument();
    expect(screen.getByText('62m 00s')).toBeInTheDocument();
    expect(screen.getByText('1 ejercicio')).toBeInTheDocument();
    expect(screen.getByText('PR')).toBeInTheDocument();
    expect(screen.getByText('Press Banca')).toBeInTheDocument();
  });

  it('opens the routine detail with workout when the workout snapshot is clicked', () => {
    renderPost();

    fireEvent.click(screen.getByTitle('Ver la rutina con lo realizado en esta sesión'));

    expect(screen.getByTestId('routine-detail-mock')).toBeInTheDocument();
    expect(screen.getByText('routine:routine-1')).toBeInTheDocument();
    expect(screen.getByText('workout:workout-1')).toBeInTheDocument();
  });

  it('does not open a detail modal when the workout has no linked routine', () => {
    renderPost({ workout: { ...post.workout!, routineId: null, routineName: null } });

    expect(screen.queryByTitle('Ver la rutina con lo realizado en esta sesión')).not.toBeInTheDocument();
    expect(screen.queryByTestId('routine-detail-mock')).not.toBeInTheDocument();
  });
});