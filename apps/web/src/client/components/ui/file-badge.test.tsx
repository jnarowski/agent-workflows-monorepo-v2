import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FileBadge } from './file-badge';

describe('FileBadge', () => {
  it('should render correct label for TypeScript files', () => {
    render(<FileBadge extension="ts" />);
    expect(screen.getByText('TS')).toBeInTheDocument();
  });

  it('should render correct label for TSX files', () => {
    render(<FileBadge extension="tsx" />);
    expect(screen.getByText('TS')).toBeInTheDocument();
  });

  it('should render correct label for JavaScript files', () => {
    render(<FileBadge extension="js" />);
    expect(screen.getByText('JS')).toBeInTheDocument();
  });

  it('should render correct label for JSX files', () => {
    render(<FileBadge extension="jsx" />);
    expect(screen.getByText('JS')).toBeInTheDocument();
  });

  it('should render correct label for JSON files', () => {
    render(<FileBadge extension="json" />);
    expect(screen.getByText('JSON')).toBeInTheDocument();
  });

  it('should render correct label for Markdown files', () => {
    render(<FileBadge extension="md" />);
    expect(screen.getByText('MD')).toBeInTheDocument();
  });

  it('should handle unknown extension', () => {
    render(<FileBadge extension="xyz" />);
    expect(screen.getByText('FILE')).toBeInTheDocument();
  });

  it('should apply correct color for TypeScript files', () => {
    const { container } = render(<FileBadge extension="ts" />);
    const badge = container.querySelector('span');
    expect(badge).toHaveStyle({ color: 'rgb(59, 130, 246)' });
  });

  it('should apply correct color for JavaScript files', () => {
    const { container } = render(<FileBadge extension="js" />);
    const badge = container.querySelector('span');
    expect(badge).toHaveStyle({ color: 'rgb(234, 179, 8)' });
  });

  it('should apply correct color for JSON files', () => {
    const { container } = render(<FileBadge extension="json" />);
    const badge = container.querySelector('span');
    expect(badge).toHaveStyle({ color: 'rgb(107, 114, 128)' });
  });

  it('should have consistent width for all types', () => {
    const { container: container1 } = render(<FileBadge extension="ts" />);
    const { container: container2 } = render(<FileBadge extension="json" />);

    const badge1 = container1.querySelector('span');
    const badge2 = container2.querySelector('span');

    expect(badge1).toHaveClass('w-12');
    expect(badge2).toHaveClass('w-12');
  });
});
