import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StarRating } from './StarRating';

describe('StarRating component', () => {
  it('calls onChange with selected rating', async () => {
    const handleChange = vi.fn(() => Promise.resolve());
    const { getAllByRole } = render(<StarRating value={null} onChange={handleChange} />);
    const buttons = getAllByRole('button');
    await userEvent.click(buttons[2]);
    expect(handleChange).toHaveBeenCalledWith(3);
  });

  it('shows read-only state', () => {
    const { getAllByRole } = render(<StarRating value={4} readOnly />);
    const buttons = getAllByRole('button');
    buttons.forEach(btn => expect(btn).toHaveAttribute('tabindex', '-1'));
  });
});
