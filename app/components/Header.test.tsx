import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { screen } from '@testing-library/react';
import { renderWithProviders, LocationProbe } from '../../test/utils';
import Header from './Header';

describe('Header / navigation', () => {
  it('has no detectable accessibility violations', async () => {
    const { container } = renderWithProviders(<Header />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('renders the brand and a primary desktop nav link', () => {
    renderWithProviders(<Header />);
    expect(screen.getByText('Goodwood Lodge')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^events$/i })).toBeInTheDocument();
  });

  it('exposes an accessible label on the mobile menu button', () => {
    renderWithProviders(<Header />);
    expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument();
  });

  it('opens the mobile drawer and navigates when a link is tapped', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <Header />
        <LocationProbe />
      </>,
    );

    // Drawer links (e.g. the About submenu) are not in the DOM until opened.
    expect(screen.queryByRole('link', { name: /history/i })).toBeNull();

    await user.click(screen.getByRole('button', { name: /open menu/i }));

    const historyLink = await screen.findByRole('link', { name: /history/i });
    await user.click(historyLink);

    expect(screen.getByTestId('location-pathname')).toHaveTextContent('/history');
  });
});
