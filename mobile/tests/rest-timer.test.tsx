import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

import { RestTimer } from '../src/features/rest-timer/rest-timer';
import { useRestTimer } from '../src/features/rest-timer/use-rest-timer';

function TimerHarness(): React.JSX.Element {
  const timer = useRestTimer({ defaultDurationSeconds: 3 });

  return <RestTimer timer={timer} />;
}

describe('RestTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts, pauses and skips the rest period', () => {
    const screen = render(<TimerHarness />);

    expect(screen.getByText('0:03')).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Iniciar' }));
    act(() => jest.advanceTimersByTime(1000));

    expect(screen.getByText('0:02')).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Pausar' }));
    act(() => jest.advanceTimersByTime(2000));

    expect(screen.getByText('0:02')).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Omitir' }));

    expect(screen.getByText('0:00')).toBeOnTheScreen();
  });
});
