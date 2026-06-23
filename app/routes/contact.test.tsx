import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, LocationProbe } from '../../test/utils';
import Contact from './contact';

async function fillField(label: RegExp, value: string) {
  const user = userEvent.setup();
  const field = screen.getByLabelText(label);
  await user.clear(field);
  await user.type(field, value);
  return field;
}

describe('Contact form', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('has no detectable accessibility violations', async () => {
    const { container } = renderWithProviders(<Contact />, { route: '/contact' });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('formats the phone number live as (xxx)-xxx-xxxx', async () => {
    renderWithProviders(<Contact />, { route: '/contact' });
    const phone = await fillField(/phone/i, '6135550123');
    expect(phone).toHaveValue('(613)-555-0123');
  });

  it('caps the phone at 10 digits and ignores non-numeric input', async () => {
    renderWithProviders(<Contact />, { route: '/contact' });
    const phone = await fillField(/phone/i, '613-555-0123999abc');
    expect(phone).toHaveValue('(613)-555-0123');
  });

  it('rejects an email without a TLD and does not submit', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    const user = userEvent.setup();
    renderWithProviders(<Contact />, { route: '/contact' });

    await fillField(/first name/i, 'John');
    await fillField(/last name/i, 'Smith');
    await fillField(/email/i, 'john@nodot'); // passes native type=email, fails our regex
    await fillField(/phone/i, '6135550123');
    await fillField(/message/i, 'Hello there, I would like to learn more.');

    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(await screen.findByText(/valid email address/i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects a phone with fewer than 10 digits and does not submit', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    const user = userEvent.setup();
    renderWithProviders(<Contact />, { route: '/contact' });

    await fillField(/first name/i, 'John');
    await fillField(/last name/i, 'Smith');
    await fillField(/email/i, 'john@example.com');
    await fillField(/phone/i, '613555'); // incomplete
    await fillField(/message/i, 'Hello there, I would like to learn more.');

    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(await screen.findByText(/valid 10-digit phone/i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('submits valid data to the function and navigates to /thank-you', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const user = userEvent.setup();

    renderWithProviders(
      <>
        <Contact />
        <LocationProbe />
      </>,
      { route: '/contact' },
    );

    await fillField(/first name/i, 'John');
    await fillField(/last name/i, 'Smith');
    await fillField(/email/i, 'john@example.com');
    await fillField(/phone/i, '6135550123');
    await fillField(/message/i, 'Hello there, I would like to learn more.');

    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/.netlify/functions/submit-contact',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    // The submitted body carries the formatted phone and the entered email.
    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toMatchObject({
      firstName: 'John',
      email: 'john@example.com',
      phone: '(613)-555-0123',
    });

    expect(await screen.findByTestId('location-pathname')).toHaveTextContent('/thank-you');
  });
});
