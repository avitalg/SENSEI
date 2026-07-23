import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PatientsPage from '../src/pages/PatientsPage';
import { AppStoreProvider } from '../src/store/AppStore';

describe('patients roster — mobile context labels', () => {
  it('keeps every compact-card value understandable without the hidden table header', () => {
    render(
      <AppStoreProvider>
        <PatientsPage />
      </AppStoreProvider>,
    );

    const patient = screen.getByRole('button', { name: 'סימבה' });
    const row = patient.closest('.pat-row');

    expect(row?.querySelector('[data-label="טלפון"]')).toBeTruthy();
    expect(row?.querySelector('[data-label="הפגישה הבאה"]')).toBeTruthy();
    expect(row?.querySelector('[data-label="שעה"]')).toBeTruthy();
    expect(row?.querySelector('[data-label="פגישות"]')).toBeTruthy();
    expect(row?.querySelector('[data-label="פגישה אחרונה"]')).toBeTruthy();
    expect(row?.querySelector('.pat-col-phone')).toHaveClass('is-empty');
    expect(row?.querySelector('.pat-col-time')).toHaveClass('is-empty');
  });
});
