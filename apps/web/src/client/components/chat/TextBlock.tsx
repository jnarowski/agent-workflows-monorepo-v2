/**
 * Text content block with Markdown rendering
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface TextBlockProps {
  text: string;
  className?: string;
}

export function TextBlock({ text, className = '' }: TextBlockProps) {
  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom code inline rendering
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;

            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-sm"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            // Block code will be handled by parent component or CodeBlock
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          // Custom link rendering
          a({ href, children, ...props }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
                {...props}
              >
                {children}
              </a>
            );
          },
          // Custom blockquote rendering
          blockquote({ children, ...props }) {
            return (
              <blockquote
                className="border-l-4 border-muted-foreground/20 pl-4 italic text-muted-foreground"
                {...props}
              >
                {children}
              </blockquote>
            );
          }
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
