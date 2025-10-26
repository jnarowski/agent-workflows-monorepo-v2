/**
 * Codex text content block with Markdown rendering
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from '../../CodeBlock';

interface CodexTextBlockProps {
  text: string;
  className?: string;
}

export function CodexTextBlock({ text, className = '' }: CodexTextBlockProps) {
  // Ensure text is a string
  const safeText = typeof text === 'string' ? text : JSON.stringify(text, null, 2);

  return (
    <div className={`flex gap-2.5 ${className}`}>
      {/* Purple dot indicator for Codex */}
      <div className="h-2 w-2 rounded-full bg-purple-500 shrink-0 mt-1.5" />

      {/* Text content */}
      <div className="prose prose-sm dark:prose-invert max-w-none prose-hr:my-2 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-headings:mb-2 prose-headings:mt-3 prose-p:first:mt-0 prose-p:last:mb-0 prose-pre:my-0 prose-pre:bg-transparent prose-pre:p-0 flex-1 min-w-0">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          children={safeText}
          components={{
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const isInline = !match;

              if (isInline) {
                return (
                  <code
                    className="px-1.5 py-0.5 rounded bg-muted text-purple-600 dark:text-purple-400 font-mono text-xs font-normal"
                    {...props}
                  >
                    {children}
                  </code>
                );
              }

              const language = match[1] || 'text';
              const code = String(children).replace(/\n$/, '');
              return <CodeBlock code={code} language={language} showHeader={false} />;
            },
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
            blockquote({ children, ...props }) {
              return (
                <blockquote
                  className="border-l-4 border-muted-foreground/20 pl-4 italic text-muted-foreground"
                  {...props}
                >
                  {children}
                </blockquote>
              );
            },
          }}
        />
      </div>
    </div>
  );
}
