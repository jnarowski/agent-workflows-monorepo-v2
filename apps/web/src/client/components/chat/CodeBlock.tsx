/**
 * Code block with syntax highlighting, copy button, and collapse support
 */

import { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from "@/client/components/ui/button";
import { Badge } from "@/client/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/client/components/ui/collapsible";
import { SyntaxHighlighter } from "@/client/utils/syntaxHighlighter";
import { getLanguageDisplayName } from "@/client/utils/getLanguageFromPath";

interface CodeBlockProps {
  code: string;
  language: string;
  showLineNumbers?: boolean;
  collapsedByDefault?: boolean;
  className?: string;
}

const MAX_LINES_BEFORE_COLLAPSE = 20;

export function CodeBlock({
  code,
  language,
  showLineNumbers = false,
  collapsedByDefault = false,
  className = ''
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const lineCount = code.split('\n').length;
  const shouldCollapse = collapsedByDefault && lineCount > MAX_LINES_BEFORE_COLLAPSE;
  const [isOpen, setIsOpen] = useState(!shouldCollapse);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  const content = (
    <div className={`rounded-lg border bg-muted/50 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          {shouldCollapse && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          )}
          <Badge variant="secondary" className="text-xs font-mono">
            {getLanguageDisplayName(language)}
          </Badge>
          {lineCount > 1 && (
            <span className="text-xs text-muted-foreground">
              {lineCount} lines
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 mr-1" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>

      {/* Code content */}
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <SyntaxHighlighter
          code={code}
          language={language}
          showLineNumbers={showLineNumbers}
          className="text-sm"
        />
      </div>
    </div>
  );

  if (shouldCollapse) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          {content}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return content;
}
