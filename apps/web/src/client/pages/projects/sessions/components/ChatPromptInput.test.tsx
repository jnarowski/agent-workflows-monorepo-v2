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

    // PromptInputSubmit should render a submit button
    const submitButton = screen.getByRole('button', { name: /submit/i });
    expect(submitButton).toBeDefined();
  });

  it('should call onSubmit when form is submitted with text', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChatPromptInput onSubmit={mockOnSubmit} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Hello world');

    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.stringContaining('Hello world'),
        expect.anything()
      );
    });
  });

  it('should be disabled when disabled prop is true', () => {
    renderWithProviders(<ChatPromptInput onSubmit={mockOnSubmit} disabled={true} />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('disabled');
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

    // Permission mode selector should be present
    const permissionButton = screen.getByRole('combobox', { name: /permission/i });
    expect(permissionButton).toBeDefined();
  });

  it('should render speech button', () => {
    renderWithProviders(<ChatPromptInput onSubmit={mockOnSubmit} />);

    // Speech button should be present
    const speechButton = screen.getByRole('button', { name: /speech|microphone/i });
    expect(speechButton).toBeDefined();
  });

  it('should not call onSubmit when textarea is empty', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChatPromptInput onSubmit={mockOnSubmit} />);

    const submitButton = screen.getByRole('button', { name: /submit/i });
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

    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(textarea.value).toBe('');
    });
  });
});
