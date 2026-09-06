import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ConfirmModal } from '../components/ConfirmModal';

describe('ConfirmModal component', () => {
  it('does not render when isOpen is false', () => {
    render(
      <ConfirmModal
        isOpen={false}
        title="Confirmar acción"
        message="¿Estás seguro?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.queryByText('Confirmar acción')).not.toBeInTheDocument();
  });

  it('renders title, message and buttons when isOpen is true', () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();

    render(
      <ConfirmModal
        isOpen={true}
        title="Finalizar entrenamiento"
        message="¿Deseas guardar la sesión?"
        confirmLabel="Finalizar"
        cancelLabel="Volver"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );

    expect(screen.getByText('Finalizar entrenamiento')).toBeInTheDocument();
    expect(screen.getByText('¿Deseas guardar la sesión?')).toBeInTheDocument();

    const confirmBtn = screen.getByText('Finalizar');
    fireEvent.click(confirmBtn);
    expect(handleConfirm).toHaveBeenCalledTimes(1);

    const cancelBtn = screen.getByText('Volver');
    fireEvent.click(cancelBtn);
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });
});
