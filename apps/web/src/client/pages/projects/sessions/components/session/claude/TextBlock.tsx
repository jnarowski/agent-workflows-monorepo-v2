/**
 * Text content block with Markdown rendering
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface TextBlockProps {
  text: string;
  className?: string;
}

export function TextBlock({ text, className = "" }: TextBlockProps) {
  return (
    <div className={`flex gap-2.5 ${className}`}>
      {/* Gray dot indicator */}
      <div className="h-2 w-2 rounded-full bg-gray-500 shrink-0 mt-1.5" />

      {/* Text content */}
      <div className="prose prose-sm dark:prose-invert max-w-none prose-hr:my-2 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-headings:mb-2 prose-headings:mt-3 prose-p:first:mt-0 prose-p:last:mb-0 flex-1 min-w-0"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom heading renderers - compact and minimal
          h1({ children, ...props }) {
            return (
              <h1 className="text-lg font-semibold mb-2 mt-3" {...props}>
                {children}
              </h1>
            );
          },
          h2({ children, ...props }) {
            return (
              <h2 className="text-base font-semibold mb-1.5 mt-3" {...props}>
                {children}
              </h2>
            );
          },
          h3({ children, ...props }) {
            return (
              <h3 className="text-sm font-semibold mb-1 mt-2" {...props}>
                {children}
              </h3>
            );
          },
          h4({ children, ...props }) {
            return (
              <h4 className="text-sm font-medium mb-1 mt-2" {...props}>
                {children}
              </h4>
            );
          },
          h5({ children, ...props }) {
            return (
              <h5 className="text-sm font-medium mb-1 mt-2" {...props}>
                {children}
              </h5>
            );
          },
          h6({ children, ...props }) {
            return (
              <h6 className="text-sm font-medium mb-1 mt-2" {...props}>
                {children}
              </h6>
            );
          },
          // Custom code inline rendering
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const isInline = !match;

            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded bg-muted text-blue-700 font-mono text-xs font-normal"
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
          },
        }}
      >
        {text}
      </ReactMarkdown>
      </div>
    </div>
  );
}
