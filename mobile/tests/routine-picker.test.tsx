import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

jest.mock('react-native-vector-icons/MaterialIcons', () => 'MaterialIcons');

import { RoutinePicker } from '../src/features/routine/routine-picker';
import type { RoutineService } from '../src/features/routine/routine.service';
import type { Tokens } from '../src/features/auth/auth.types';

const tokens: Tokens = {
  accessToken: 'access-token',
  accessTokenExpiresAt: '2026-12-31T00:00:00.000Z',
  refreshToken: 'refresh-token',
};

describe('RoutinePicker', () => {
  it('redirects to the routine editor after tapping Nueva rutina', async () => {
    const create = jest.fn().mockResolvedValue({
      routine: { exerciseCount: 0, id: 'routine-1', name: 'Nueva rutina' },
      tokens,
    });
    const onEditRoutine = jest.fn();
    const routineService = {
      create,
      list: jest.fn().mockResolvedValue({ routines: [], tokens }),
    } as unknown as RoutineService;
    const screen = render(
      <RoutinePicker
        onEditRoutine={onEditRoutine}
        onExploreRoutines={jest.fn()}
        onStartIndependentWorkout={jest.fn().mockResolvedValue(undefined)}
        onStarted={jest.fn()}
        onTokensChange={jest.fn()}
        routineService={routineService}
        tokens={tokens}
      />,
    );

    expect(await screen.findByText('Aún no tienes rutinas.')).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Nueva rutina' }));

    await waitFor(() => expect(create).toHaveBeenCalledWith(tokens, 'Nueva rutina'));
    expect(onEditRoutine).toHaveBeenCalledWith('routine-1');
  }, 15000);
});
