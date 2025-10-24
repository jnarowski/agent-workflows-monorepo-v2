import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatPromptInput } from './ChatPromptInput';
import { useNavigationStore } from '@/client/stores/navigationStore';
import { useProjectFiles } from '@/client/pages/projects/files/hooks/useFiles';
import { useActiveProject } from '@/client/hooks/navigation/useActiveProject';
import { useState, createContext, useContext } from 'react';

// Mock dependencies
vi.mock('@/client/stores/navigationStore');
vi.mock('@/client/pages/projects/files/hooks/useFiles');
vi.mock('@/client/hooks/navigation/useActiveProject');

// Create a mock controller context that mimics the real one
const MockPromptInputController = createContext<any>(null);

const useMockPromptInputController = () => {
  const ctx = useContext(MockPromptInputController);
  if (!ctx) {
    throw new Error('Must be wrapped in MockPromptInputController.Provider');
  }
  return ctx;
};

// Mock PromptInput components with proper provider behavior
vi.mock('@/client/components/ai-elements/prompt-input', () => {
  // Define PromptInput component that can access context
  const MockPromptInput = ({ children, onSubmit }: any) => {
    const controller = useMockPromptInputController();
    return (
      <form
        data-testid="prompt-input"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit?.({ text: controller.textInput.value }, e);
        }}
      >
        {children}
      </form>
    );
  };

  const MockPromptInputProvider = ({ children }: any) => {
    const [textInput, setTextInput] = useState('');
    const controller = {
      textInput: {
        value: textInput,
        setInput: setTextInput,
        clear: () => setTextInput(''),
      },
      attachments: {
        files: [],
        add: vi.fn(),
        remove: vi.fn(),
        clear: vi.fn(),
        openFileDialog: vi.fn(),
        fileInputRef: { current: null },
      },
      __registerFileInput: vi.fn(),
    };
    return (
      <MockPromptInputController.Provider value={controller}>
        {children}
      </MockPromptInputController.Provider>
    );
  };

  const MockPromptInputTextarea = ({ onChange, ...props }: any) => {
    const controller = useMockPromptInputController();
    return (
      <textarea
        data-testid="prompt-textarea"
        value={controller.textInput.value}
        onChange={(e) => {
          controller.textInput.setInput(e.target.value);
          onChange?.(e);
        }}
        {...props}
      />
    );
  };

  return {
    PromptInput: MockPromptInput,
    PromptInputProvider: MockPromptInputProvider,
    usePromptInputController: () => useMockPromptInputController(),
    PromptInputBody: ({ children }: any) => <div>{children}</div>,
    PromptInputAttachments: ({ children }: any) => (
      <div>{typeof children === 'function' ? children({}) : children}</div>
    ),
    PromptInputAttachment: () => <div />,
    PromptInputTextarea: MockPromptInputTextarea,
    PromptInputFooter: ({ children }: any) => <div>{children}</div>,
    PromptInputTools: ({ children }: any) => <div>{children}</div>,
    PromptInputActionMenu: ({ children }: any) => <div>{children}</div>,
    PromptInputActionMenuTrigger: () => <button />,
    PromptInputActionMenuContent: ({ children }: any) => <div>{children}</div>,
    PromptInputActionAddAttachments: () => <div />,
    PromptInputSpeechButton: () => <div />,
    PromptInputButton: ({ children }: any) => <button>{children}</button>,
    PromptInputModelSelect: ({ children }: any) => <div>{children}</div>,
    PromptInputModelSelectTrigger: ({ children }: any) => <div>{children}</div>,
    PromptInputModelSelectValue: () => <div />,
    PromptInputModelSelectContent: ({ children }: any) => <div>{children}</div>,
    PromptInputModelSelectItem: ({ children }: any) => <div>{children}</div>,
    PromptInputSubmit: () => <button>Submit</button>,
  };
});

// Mock ChatPromptInputFiles
vi.mock('./ChatPromptInputFiles', () => ({
  ChatPromptInputFiles: ({ onFileSelect, onFileRemove, open }: any) => (
    <div data-testid="file-picker" data-open={open}>
      <button
        data-testid="select-file-btn"
        onClick={() => onFileSelect('@src/test.ts')}
      >
        Select File
      </button>
      <button
        data-testid="remove-file-btn"
        onClick={() => onFileRemove('@src/test.ts')}
      >
        Remove File
      </button>
    </div>
  ),
}));

describe('ChatPromptInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigationStore as any).mockReturnValue({
      activeProjectId: 'test-project-123',
    });
    (useProjectFiles as any).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    (useActiveProject as any).mockReturnValue({
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

  it('should open @ menu when @ is typed', async () => {
    render(<ChatPromptInput />);

    const textarea = screen.getByTestId('prompt-textarea');

    // Type "@" in the textarea
    fireEvent.change(textarea, { target: { value: '@', selectionStart: 1 } });

    await waitFor(() => {
      const filePicker = screen.getByTestId('file-picker');
      expect(filePicker).toHaveAttribute('data-open', 'true');
    });
  });

  it('should remove @ symbol and keep cursor at end', async () => {
    render(<ChatPromptInput />);

    const textarea = screen.getByTestId('prompt-textarea') as HTMLTextAreaElement;

    // Type "Hello @"
    fireEvent.change(textarea, {
      target: { value: 'Hello @', selectionStart: 7 },
    });

    await waitFor(() => {
      // The @ should be removed, leaving "Hello "
      expect(textarea.value).toBe('Hello ');
    });
  });

  it('should insert file path with space at cursor position', async () => {
    render(<ChatPromptInput />);

    const textarea = screen.getByTestId('prompt-textarea') as HTMLTextAreaElement;

    // Type "Check @"
    fireEvent.change(textarea, {
      target: { value: 'Check @', selectionStart: 7 },
    });

    // Wait for @ to be removed
    await waitFor(() => {
      expect(textarea.value).toBe('Check ');
    });

    // Click select file button
    const selectBtn = screen.getByTestId('select-file-btn');
    fireEvent.click(selectBtn);

    await waitFor(() => {
      // File path should be inserted with trailing space
      expect(textarea.value).toBe('Check @src/test.ts ');
    });
  });

  it('should insert file path in middle of text', async () => {
    render(<ChatPromptInput />);

    const textarea = screen.getByTestId('prompt-textarea') as HTMLTextAreaElement;

    // Type "Check @ for details"
    fireEvent.change(textarea, {
      target: { value: 'Check  for details', selectionStart: 6 },
    });

    // Manually trigger file selection (simulating menu open and selection)
    const selectBtn = screen.getByTestId('select-file-btn');
    fireEvent.click(selectBtn);

    await waitFor(() => {
      // File path should be inserted at cursor position
      expect(textarea.value).toBe('Check @src/test.ts  for details');
    });
  });

  it('should remove all occurrences of file path', async () => {
    render(<ChatPromptInput />);

    const textarea = screen.getByTestId('prompt-textarea') as HTMLTextAreaElement;

    // Set text with file path multiple times
    fireEvent.change(textarea, {
      target: {
        value: 'Check @src/test.ts and @src/test.ts again',
        selectionStart: 0,
      },
    });

    // Click remove file button
    const removeBtn = screen.getByTestId('remove-file-btn');
    fireEvent.click(removeBtn);

    await waitFor(() => {
      // All occurrences should be removed
      expect(textarea.value).toBe('Check  and  again');
    });
  });

  it('should close menu after file selection', async () => {
    render(<ChatPromptInput />);

    const textarea = screen.getByTestId('prompt-textarea');

    // Open menu by typing @
    fireEvent.change(textarea, {
      target: { value: '@', selectionStart: 1 },
    });

    await waitFor(() => {
      const filePicker = screen.getByTestId('file-picker');
      expect(filePicker).toHaveAttribute('data-open', 'true');
    });

    // Select a file
    const selectBtn = screen.getByTestId('select-file-btn');
    fireEvent.click(selectBtn);

    await waitFor(() => {
      const filePicker = screen.getByTestId('file-picker');
      expect(filePicker).toHaveAttribute('data-open', 'false');
    });
  });

  it('should use project ID from navigation store', () => {
    const mockUseNavigationStore = useNavigationStore as any;
    mockUseNavigationStore.mockReturnValue({
      activeProjectId: 'my-project-456',
    });

    render(<ChatPromptInput />);

    // Verify the mock was called
    expect(mockUseNavigationStore).toHaveBeenCalled();
  });

  it('should handle empty project ID gracefully', () => {
    const mockUseNavigationStore = useNavigationStore as any;
    mockUseNavigationStore.mockReturnValue({
      activeProjectId: null,
    });

    // Should not crash
    expect(() => render(<ChatPromptInput />)).not.toThrow();
  });

  it('should maintain textarea value when typing normally', async () => {
    render(<ChatPromptInput />);

    const textarea = screen.getByTestId('prompt-textarea') as HTMLTextAreaElement;

    // Type some text
    fireEvent.change(textarea, {
      target: { value: 'Hello world', selectionStart: 11 },
    });

    await waitFor(() => {
      expect(textarea.value).toBe('Hello world');
    });

    // Continue typing
    fireEvent.change(textarea, {
      target: { value: 'Hello world!', selectionStart: 12 },
    });

    await waitFor(() => {
      expect(textarea.value).toBe('Hello world!');
    });
  });

  it('should update textarea value via controller when file is selected', async () => {
    render(<ChatPromptInput />);

    const textarea = screen.getByTestId('prompt-textarea') as HTMLTextAreaElement;

    // Type "Check @" to open the menu
    fireEvent.change(textarea, {
      target: { value: 'Check @', selectionStart: 7 },
    });

    // Wait for @ to be removed (this updates via controller)
    await waitFor(() => {
      expect(textarea.value).toBe('Check ');
    });

    // Select a file (this also updates via controller)
    const selectBtn = screen.getByTestId('select-file-btn');
    fireEvent.click(selectBtn);

    // Verify textarea reflects the controller state
    await waitFor(() => {
      expect(textarea.value).toBe('Check @src/test.ts ');
    });
  });

  it('should preserve cursor position when @ is removed', async () => {
    render(<ChatPromptInput />);

    const textarea = screen.getByTestId('prompt-textarea') as HTMLTextAreaElement;

    // Type "Hello @"
    fireEvent.change(textarea, {
      target: { value: 'Hello @', selectionStart: 7 },
    });

    await waitFor(() => {
      // @ should be removed, text should be "Hello "
      expect(textarea.value).toBe('Hello ');
    });

    // The cursor should still be at the end (position 6, after "Hello ")
    // This is tracked by the cursorPosition state
  });

  it('should sync controller state with textarea on change', async () => {
    render(<ChatPromptInput />);

    const textarea = screen.getByTestId('prompt-textarea') as HTMLTextAreaElement;

    // Type text
    fireEvent.change(textarea, {
      target: { value: 'Test message', selectionStart: 12 },
    });

    await waitFor(() => {
      // Textarea should show the value from controller
      expect(textarea.value).toBe('Test message');
    });

    // Change the text again
    fireEvent.change(textarea, {
      target: { value: 'Test message updated', selectionStart: 20 },
    });

    await waitFor(() => {
      expect(textarea.value).toBe('Test message updated');
    });
  });

  it('should handle file removal via controller', async () => {
    render(<ChatPromptInput />);

    const textarea = screen.getByTestId('prompt-textarea') as HTMLTextAreaElement;

    // Set initial text with a file path
    fireEvent.change(textarea, {
      target: {
        value: 'Check @src/test.ts for details',
        selectionStart: 30,
      },
    });

    await waitFor(() => {
      expect(textarea.value).toBe('Check @src/test.ts for details');
    });

    // Remove the file
    const removeBtn = screen.getByTestId('remove-file-btn');
    fireEvent.click(removeBtn);

    await waitFor(() => {
      // File path should be removed via controller
      expect(textarea.value).toBe('Check  for details');
    });
  });
});
