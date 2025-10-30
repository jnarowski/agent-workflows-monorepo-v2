import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AskUserQuestionToolRenderer } from './AskUserQuestionToolRenderer';
import type { AskUserQuestionToolInput } from '@/shared/types/tool.types';

describe('AskUserQuestionToolRenderer', () => {
  const mockInput: AskUserQuestionToolInput = {
    questions: [
      {
        question: 'Which scrolling approach would you like to implement?',
        header: 'Approach',
        multiSelect: false,
        options: [
          {
            label: 'use-stick-to-bottom hook (recommended)',
            description: 'Battle-tested library already installed. Best performance and configurability.',
          },
          {
            label: 'AI Elements components',
            description: 'Use existing Conversation/ConversationContent/ConversationScrollButton components.',
          },
          {
            label: 'Hybrid approach',
            description: 'Combine use-stick-to-bottom hook for logic with ConversationScrollButton for UI.',
          },
        ],
      },
      {
        question: 'What scroll behavior do you prefer?',
        header: 'Auto-scroll',
        multiSelect: false,
        options: [
          {
            label: 'Smart auto-scroll',
            description: 'Only auto-scroll if user is near bottom.',
          },
          {
            label: 'Always auto-scroll',
            description: 'Always jump to newest message.',
          },
        ],
      },
    ],
  };

  describe('Question Rendering', () => {
    it('renders all questions', () => {
      render(<AskUserQuestionToolRenderer input={mockInput} />);

      expect(screen.getByText('Which scrolling approach would you like to implement?')).toBeInTheDocument();
      expect(screen.getByText('What scroll behavior do you prefer?')).toBeInTheDocument();
    });

    it('renders question headers', () => {
      render(<AskUserQuestionToolRenderer input={mockInput} />);

      expect(screen.getByText('Approach')).toBeInTheDocument();
      expect(screen.getByText('Auto-scroll')).toBeInTheDocument();
    });

    it('renders all option labels', () => {
      render(<AskUserQuestionToolRenderer input={mockInput} />);

      expect(screen.getByText('use-stick-to-bottom hook (recommended)')).toBeInTheDocument();
      expect(screen.getByText('AI Elements components')).toBeInTheDocument();
      expect(screen.getByText('Hybrid approach')).toBeInTheDocument();
      expect(screen.getByText('Smart auto-scroll')).toBeInTheDocument();
      expect(screen.getByText('Always auto-scroll')).toBeInTheDocument();
    });

    it('renders all option descriptions', () => {
      render(<AskUserQuestionToolRenderer input={mockInput} />);

      expect(screen.getByText(/Battle-tested library already installed/)).toBeInTheDocument();
      expect(screen.getByText(/Use existing Conversation/)).toBeInTheDocument();
    });

    it('shows multi-select indicator when applicable', () => {
      const multiSelectInput: AskUserQuestionToolInput = {
        questions: [
          {
            question: 'Which features do you want?',
            header: 'Features',
            multiSelect: true,
            options: [
              { label: 'Feature 1', description: 'Description 1' },
              { label: 'Feature 2', description: 'Description 2' },
            ],
          },
        ],
      };

      render(<AskUserQuestionToolRenderer input={multiSelectInput} />);

      expect(screen.getByText('(multi-select)')).toBeInTheDocument();
    });

    it('does not show multi-select indicator when not applicable', () => {
      render(<AskUserQuestionToolRenderer input={mockInput} />);

      expect(screen.queryByText('(multi-select)')).not.toBeInTheDocument();
    });
  });

  describe('Answer Parsing - String Format', () => {
    it('parses answers from Claude CLI format', () => {
      const result = {
        content: 'User has answered your questions: "Which scrolling approach would you like to implement?"="AI Elements components", "What scroll behavior do you prefer?"="Smart auto-scroll".',
        is_error: false,
      };

      render(<AskUserQuestionToolRenderer input={mockInput} result={result} />);

      // Check that the selected options are rendered
      expect(screen.getByText('AI Elements components')).toBeInTheDocument();
      expect(screen.getByText('Smart auto-scroll')).toBeInTheDocument();
    });

    it('handles answers with special characters', () => {
      const result = {
        content: 'User has answered your questions: "Which scrolling approach would you like to implement?"="AI Elements components", "What scroll behavior do you prefer?"="Remove anything custom we have and use the ai elements approach. What they have is perfect".',
        is_error: false,
      };

      render(<AskUserQuestionToolRenderer input={mockInput} result={result} />);

      // Should show the freeform answer in a custom answer box
      expect(screen.getByText(/Remove anything custom/)).toBeInTheDocument();
    });

    it('handles empty answer string gracefully', () => {
      const result = {
        content: 'User has answered your questions: .',
        is_error: false,
      };

      render(<AskUserQuestionToolRenderer input={mockInput} result={result} />);

      // Should render without errors, no answers highlighted
      expect(screen.getByText('Which scrolling approach would you like to implement?')).toBeInTheDocument();
    });

    it('handles missing result gracefully', () => {
      render(<AskUserQuestionToolRenderer input={mockInput} />);

      // Should render questions without errors
      expect(screen.getByText('Which scrolling approach would you like to implement?')).toBeInTheDocument();
    });

    it('handles malformed answer string gracefully', () => {
      const result = {
        content: 'Some random text that is not in the expected format',
        is_error: false,
      };

      render(<AskUserQuestionToolRenderer input={mockInput} result={result} />);

      // Should render questions without errors, show raw response
      expect(screen.getByText('Which scrolling approach would you like to implement?')).toBeInTheDocument();
      expect(screen.getByText('Raw Response')).toBeInTheDocument();
    });
  });

  describe('Answer Display', () => {
    it('highlights selected option that matches a predefined choice', () => {
      const result = {
        content: 'User has answered your questions: "Which scrolling approach would you like to implement?"="AI Elements components".',
        is_error: false,
      };

      const { container } = render(<AskUserQuestionToolRenderer input={mockInput} result={result} />);

      // Find the selected option's container (has blue border class)
      const selectedOption = container.querySelector('.border-blue-500');
      expect(selectedOption).toBeInTheDocument();
      expect(selectedOption?.textContent).toContain('AI Elements components');
    });

    it('shows freeform answer when it does not match any option', () => {
      const result = {
        content: 'User has answered your questions: "Which scrolling approach would you like to implement?"="My custom implementation".',
        is_error: false,
      };

      render(<AskUserQuestionToolRenderer input={mockInput} result={result} />);

      // Should show custom answer box
      expect(screen.getByText('Custom Answer')).toBeInTheDocument();
      expect(screen.getByText('My custom implementation')).toBeInTheDocument();
    });

    it('does not show freeform answer box when answer matches an option', () => {
      const result = {
        content: 'User has answered your questions: "Which scrolling approach would you like to implement?"="AI Elements components".',
        is_error: false,
      };

      render(<AskUserQuestionToolRenderer input={mockInput} result={result} />);

      // Should NOT show custom answer box
      expect(screen.queryByText('Custom Answer')).not.toBeInTheDocument();
    });

    it('shows raw response when no answers are parsed', () => {
      const result = {
        content: 'Invalid format',
        is_error: false,
      };

      render(<AskUserQuestionToolRenderer input={mockInput} result={result} />);

      expect(screen.getByText('Raw Response')).toBeInTheDocument();
      expect(screen.getByText('Invalid format')).toBeInTheDocument();
    });

    it('does not show raw response when answers are parsed successfully', () => {
      const result = {
        content: 'User has answered your questions: "Which scrolling approach would you like to implement?"="AI Elements components".',
        is_error: false,
      };

      render(<AskUserQuestionToolRenderer input={mockInput} result={result} />);

      expect(screen.queryByText('Raw Response')).not.toBeInTheDocument();
    });
  });

  describe('Multiple Questions', () => {
    it('handles multiple questions with different answers', () => {
      const result = {
        content: 'User has answered your questions: "Which scrolling approach would you like to implement?"="AI Elements components", "What scroll behavior do you prefer?"="Always auto-scroll".',
        is_error: false,
      };

      const { container } = render(<AskUserQuestionToolRenderer input={mockInput} result={result} />);

      // Both answers should be highlighted
      const selectedOptions = container.querySelectorAll('.border-blue-500');
      expect(selectedOptions).toHaveLength(2);

      // Check that the correct options are selected
      expect(selectedOptions[0]?.textContent).toContain('AI Elements components');
      expect(selectedOptions[1]?.textContent).toContain('Always auto-scroll');
    });

    it('handles partial answers (only some questions answered)', () => {
      const result = {
        content: 'User has answered your questions: "Which scrolling approach would you like to implement?"="AI Elements components".',
        is_error: false,
      };

      const { container } = render(<AskUserQuestionToolRenderer input={mockInput} result={result} />);

      // Only one answer should be highlighted
      const selectedOptions = container.querySelectorAll('.border-blue-500');
      expect(selectedOptions).toHaveLength(1);
      expect(selectedOptions[0]?.textContent).toContain('AI Elements components');
    });
  });

  describe('Edge Cases', () => {
    it('handles questions with no options', () => {
      const emptyOptionsInput: AskUserQuestionToolInput = {
        questions: [
          {
            question: 'Do you want to continue?',
            header: 'Confirm',
            multiSelect: false,
            options: [],
          },
        ],
      };

      render(<AskUserQuestionToolRenderer input={emptyOptionsInput} />);

      expect(screen.getByText('Do you want to continue?')).toBeInTheDocument();
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });

    it('handles empty questions array', () => {
      const emptyInput: AskUserQuestionToolInput = {
        questions: [],
      };

      const { container } = render(<AskUserQuestionToolRenderer input={emptyInput} />);

      // Should render without errors
      expect(container).toBeInTheDocument();
    });

    it('handles error result', () => {
      const result = {
        content: 'Error processing questions',
        is_error: true,
      };

      render(<AskUserQuestionToolRenderer input={mockInput} result={result} />);

      // Should still render questions
      expect(screen.getByText('Which scrolling approach would you like to implement?')).toBeInTheDocument();
      // Show raw response for errors
      expect(screen.getByText('Raw Response')).toBeInTheDocument();
    });
  });
});
