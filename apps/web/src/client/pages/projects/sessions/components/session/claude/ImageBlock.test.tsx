/**
 * Tests for ImageBlock component
 * Validates image rendering, loading states, and error handling
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { UnifiedImageBlock } from '@repo/agent-cli-sdk';
import { ImageBlock } from './ImageBlock';

describe('ImageBlock', () => {
  const mockImageBlock: UnifiedImageBlock = {
    type: 'image',
    source: {
      type: 'base64',
      data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      media_type: 'image/png'
    }
  };

  it('should render loading state initially', () => {
    render(<ImageBlock image={mockImageBlock} />);

    expect(screen.getByText('Loading image...')).toBeInTheDocument();
  });

  it('should construct correct data URL from base64 image', () => {
    render(<ImageBlock image={mockImageBlock} />);

    const img = screen.getByRole('img', { hidden: true });
    expect(img).toHaveAttribute(
      'src',
      `data:${mockImageBlock.source.media_type};base64,${mockImageBlock.source.data}`
    );
  });

  it('should use provided alt text', () => {
    const altText = 'Test screenshot';
    render(<ImageBlock image={mockImageBlock} alt={altText} />);

    const img = screen.getByRole('img', { hidden: true });
    expect(img).toHaveAttribute('alt', altText);
  });

  it('should use default alt text when not provided', () => {
    render(<ImageBlock image={mockImageBlock} />);

    const img = screen.getByRole('img', { hidden: true });
    expect(img).toHaveAttribute('alt', 'Tool result image');
  });

  it('should show image when loaded successfully', async () => {
    const { container } = render(<ImageBlock image={mockImageBlock} />);

    const img = screen.getByRole('img', { hidden: true }) as HTMLImageElement;

    // Simulate image load
    Object.defineProperty(img, 'complete', { value: true, configurable: true });
    img.dispatchEvent(new Event('load'));

    await waitFor(() => {
      expect(screen.queryByText('Loading image...')).not.toBeInTheDocument();
    });

    // Image should be visible (not hidden class)
    expect(img).not.toHaveClass('hidden');
    expect(img).toHaveClass('block');
  });

  it('should show error state when image fails to load', async () => {
    render(<ImageBlock image={mockImageBlock} />);

    const img = screen.getByRole('img', { hidden: true });

    // Simulate image error
    img.dispatchEvent(new Event('error'));

    await waitFor(() => {
      expect(screen.getByText('Failed to load image')).toBeInTheDocument();
    });

    expect(screen.queryByText('Loading image...')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ImageBlock image={mockImageBlock} className="custom-class" />
    );

    const wrapper = container.querySelector('.custom-class');
    expect(wrapper).toBeInTheDocument();
  });

  it('should set max height style', () => {
    render(<ImageBlock image={mockImageBlock} />);

    const img = screen.getByRole('img', { hidden: true });
    expect(img).toHaveStyle({ maxHeight: '500px' });
  });

  it('should set object-fit to contain', () => {
    render(<ImageBlock image={mockImageBlock} />);

    const img = screen.getByRole('img', { hidden: true });
    expect(img).toHaveStyle({ objectFit: 'contain' });
  });

  it('should handle different media types', () => {
    const jpegImage: UnifiedImageBlock = {
      type: 'image',
      source: {
        type: 'base64',
        data: '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
        media_type: 'image/jpeg'
      }
    };

    render(<ImageBlock image={jpegImage} />);

    const img = screen.getByRole('img', { hidden: true });
    expect(img).toHaveAttribute('src', expect.stringContaining('image/jpeg'));
  });

  it('should handle WebP images', () => {
    const webpImage: UnifiedImageBlock = {
      type: 'image',
      source: {
        type: 'base64',
        data: 'UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=',
        media_type: 'image/webp'
      }
    };

    render(<ImageBlock image={webpImage} />);

    const img = screen.getByRole('img', { hidden: true });
    expect(img).toHaveAttribute('src', expect.stringContaining('image/webp'));
  });

  it('should reset error state on successful retry', async () => {
    const { rerender } = render(<ImageBlock image={mockImageBlock} />);

    const img = screen.getByRole('img', { hidden: true });

    // Simulate error
    img.dispatchEvent(new Event('error'));

    await waitFor(() => {
      expect(screen.getByText('Failed to load image')).toBeInTheDocument();
    });

    // Rerender with new image
    const newImage: UnifiedImageBlock = {
      ...mockImageBlock,
      source: {
        ...mockImageBlock.source,
        data: 'different-base64-data'
      }
    };

    rerender(<ImageBlock image={newImage} />);

    // Should show loading state again
    await waitFor(() => {
      expect(screen.getByText('Loading image...')).toBeInTheDocument();
    });
  });

  it('should have rounded corners and border', () => {
    render(<ImageBlock image={mockImageBlock} />);

    const img = screen.getByRole('img', { hidden: true });
    expect(img).toHaveClass('rounded-md');
    expect(img).toHaveClass('border');
    expect(img).toHaveClass('border-border');
  });

  it('should be responsive with max-w-full', () => {
    render(<ImageBlock image={mockImageBlock} />);

    const img = screen.getByRole('img', { hidden: true });
    expect(img).toHaveClass('max-w-full');
    expect(img).toHaveClass('h-auto');
  });
});

describe('ImageBlock - Loading State UI', () => {
  const mockImage: UnifiedImageBlock = {
    type: 'image',
    source: {
      type: 'base64',
      data: 'test-data',
      media_type: 'image/png'
    }
  };

  it('should show loading spinner/animation', () => {
    const { container } = render(<ImageBlock image={mockImage} />);

    // Check for loading container with animation
    const loadingDiv = container.querySelector('.animate-pulse');
    expect(loadingDiv).toBeInTheDocument();
  });

  it('should show loading text in muted color', () => {
    render(<ImageBlock image={mockImage} />);

    const loadingText = screen.getByText('Loading image...');
    expect(loadingText).toHaveClass('text-muted-foreground');
  });
});

describe('ImageBlock - Error State UI', () => {
  const mockImage: UnifiedImageBlock = {
    type: 'image',
    source: {
      type: 'base64',
      data: 'invalid-data',
      media_type: 'image/png'
    }
  };

  it('should show error message with destructive styling', async () => {
    render(<ImageBlock image={mockImage} />);

    const img = screen.getByRole('img', { hidden: true });
    img.dispatchEvent(new Event('error'));

    await waitFor(() => {
      const errorText = screen.getByText('Failed to load image');
      expect(errorText).toHaveClass('text-destructive');
    });
  });

  it('should show error container with destructive border', async () => {
    const { container } = render(<ImageBlock image={mockImage} />);

    const img = screen.getByRole('img', { hidden: true });
    img.dispatchEvent(new Event('error'));

    await waitFor(() => {
      const errorContainer = container.querySelector('.border-destructive\\/20');
      expect(errorContainer).toBeInTheDocument();
    });
  });
});
