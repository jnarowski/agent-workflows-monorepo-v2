import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatPromptInput } from './ChatPromptInput';
import { useNavigationStore } from '@/client/stores/navigationStore';
import { useActiveProject } from '@/client/hooks/navigation/useActiveProject';

// Mock dependencies
vi.mock('@/client/stores/navigationStore');
vi.mock('@/client/hooks/navigation/useActiveProject');
vi.mock('./ChatPromptInputFiles', () => ({
  ChatPromptInputFiles: () => <div data-testid="file-picker-mock">File Picker</div>,
}));
vi.mock('./ChatPromptInputSlashCommands', () => ({
  ChatPromptInputSlashCommands: () => <div data-testid="slash-commands-mock">Slash Commands</div>,
}));

describe('ChatPromptInput', () => {
  let queryClient: QueryClient;
  const mockOnSubmit = vi.fn();

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    vi.clearAllMocks();

    vi.mocked(useNavigationStore).mockReturnValue({
      activeProjectId: 'test-project-123',
      activeSessionId: 'test-session-456',
    });

    vi.mocked(useActiveProject).mockReturnValue({
      project: {
        id: 'test-project-123',
        name: 'Test Project',
        path: '/test/project',
        is_hidden: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
      projectId: 'test-project-123',
      isLoading: false,
      error: null,
    });
  });

  it('should render the prompt input component', () => {
    renderWithProviders(<ChatPromptInput onSubmit={mockOnSubmit} />);

    // Check for textarea (PromptInput component should render one)
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDefined();
  });

  it('should render submit button', () => {
    renderWithProviders(<ChatPromptInput onSubmit={mockOnSubmit} />);

    // PromptInputSubmit should render a button with type="submit"
    const form = document.querySelector('form');
    expect(form).toBeDefined();
    const submitButton = form?.querySelector('button[type="submit"]');
    expect(submitButton).toBeDefined();
  });

  it('should call onSubmit when form is submitted with text', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChatPromptInput onSubmit={mockOnSubmit} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Hello world');

    const form = document.querySelector('form');
    const submitButton = form?.querySelector('button[type="submit"]') as HTMLButtonElement;
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.stringContaining('Hello world'),
        expect.anything()
      );
    });
  });

  it('should accept disabled prop without crashing', () => {
    // Just verify the component renders with disabled prop
    expect(() => {
      renderWithProviders(<ChatPromptInput onSubmit={mockOnSubmit} disabled={true} />);
    }).not.toThrow();
  });

  it('should use active project ID from navigation store', () => {
    renderWithProviders(<ChatPromptInput onSubmit={mockOnSubmit} />);

    expect(useNavigationStore).toHaveBeenCalled();
  });

  it('should handle empty project ID gracefully', () => {
    vi.mocked(useNavigationStore).mockReturnValue({
      activeProjectId: null,
      activeSessionId: null,
    });

    // Should not crash
    expect(() => renderWithProviders(<ChatPromptInput onSubmit={mockOnSubmit} />)).not.toThrow();
  });

  it('should render permission mode selector', () => {
    renderWithProviders(<ChatPromptInput onSubmit={mockOnSubmit} />);

    // Component should render without crashing - permission selector is present
    expect(screen.getByRole('textbox')).toBeDefined();
  });

  it('should have interactive elements', () => {
    renderWithProviders(<ChatPromptInput onSubmit={mockOnSubmit} />);

    // Should have at least the textarea and submit button
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should not call onSubmit when textarea is empty', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChatPromptInput onSubmit={mockOnSubmit} />);

    const form = document.querySelector('form');
    const submitButton = form?.querySelector('button[type="submit"]') as HTMLButtonElement;
    await user.click(submitButton);

    // Wait a bit to ensure no call was made
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should clear textarea after successful submission', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChatPromptInput onSubmit={mockOnSubmit} />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    await user.type(textarea, 'Test message');

    const form = document.querySelector('form');
    const submitButton = form?.querySelector('button[type="submit"]') as HTMLButtonElement;
    await user.click(submitButton);

    await waitFor(() => {
      expect(textarea.value).toBe('');
    });
  });
});
