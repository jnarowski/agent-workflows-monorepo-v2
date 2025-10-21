/**
 * Syntax highlighter component using Shiki
 * Provides code highlighting with theme support
 */

import { useEffect, useState } from 'react';
import { codeToHtml, BundledLanguage } from 'shiki';

interface SyntaxHighlighterProps {
  code: string;
  language: string;
  showLineNumbers?: boolean;
  className?: string;
}

/**
 * Syntax highlighter component that uses Shiki for code highlighting
 * Automatically adapts to light/dark theme
 */
export function SyntaxHighlighter({
  code,
  language,
  showLineNumbers = false,
  className = ''
}: SyntaxHighlighterProps) {
  const [html, setHtml] = useState<string>('');
  const [isDark, setIsDark] = useState(false);

  // Detect theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mediaQuery.matches || document.documentElement.classList.contains('dark'));

    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mediaQuery.addEventListener('change', handler);

    // Also watch for class changes on document element (for manual theme toggle)
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => {
      mediaQuery.removeEventListener('change', handler);
      observer.disconnect();
    };
  }, []);

  // Highlight code when language, code, or theme changes
  useEffect(() => {
    let cancelled = false;

    const highlight = async () => {
      try {
        // Map common language names to Shiki's language IDs
        const languageMap: Record<string, BundledLanguage> = {
          js: 'javascript',
          ts: 'typescript',
          sh: 'bash',
          yml: 'yaml',
          text: 'text'
        };

        const shikiLang = (languageMap[language] || language) as BundledLanguage;

        const highlighted = await codeToHtml(code, {
          lang: shikiLang,
          theme: isDark ? 'github-dark' : 'github-light',
          transformers: showLineNumbers
            ? [
                {
                  line(node, line) {
                    node.properties['data-line'] = line;
                  }
                }
              ]
            : []
        });

        if (!cancelled) {
          setHtml(highlighted);
        }
      } catch (error) {
        console.warn('Syntax highlighting failed:', error);
        // Fallback to plain code
        if (!cancelled) {
          setHtml(`<pre><code>${escapeHtml(code)}</code></pre>`);
        }
      }
    };

    highlight();

    return () => {
      cancelled = true;
    };
  }, [code, language, showLineNumbers, isDark]);

  return (
    <div
      className={`syntax-highlighter ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Preload highlighter for common languages
 * Call this once during app initialization for better performance
 */
export async function preloadHighlighter() {
  try {
    await codeToHtml('', {
      lang: 'typescript',
      theme: 'github-light'
    });
  } catch (error) {
    console.warn('Failed to preload syntax highlighter:', error);
  }
}
