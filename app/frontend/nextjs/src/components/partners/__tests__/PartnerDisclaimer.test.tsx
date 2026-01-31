import { render, screen } from '@testing-library/react';
import { PartnerDisclaimer } from '../PartnerDisclaimer';

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue: string) => defaultValue || key,
  }),
}));

describe('PartnerDisclaimer', () => {
  it('renders short variant correctly', () => {
    render(<PartnerDisclaimer variant="short" />);
    
    expect(screen.getByText(/All logos and trademarks/i)).toBeInTheDocument();
    expect(screen.getByText(/Learn more/i)).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/partners');
  });

  it('renders full variant correctly', () => {
    render(<PartnerDisclaimer variant="full" />);
    
    expect(screen.getByText(/All logos, trademarks, and brand names/i)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<PartnerDisclaimer className="custom-class" />);
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
