/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { Suspense, lazy } from 'react';
import remarkGfm from 'remark-gfm';
import { MarkdownTable } from '@/shared/components/markdown-table';

// Lazy load react-markdown for better performance
const LazyReactMarkdown = lazy(() => import('react-markdown'));

interface SafeReactMarkdownProps {
  children: string;
}

export const SafeReactMarkdown = ({ children }: SafeReactMarkdownProps) => {
  // Function to clean up markdown content
  const cleanMarkdownContent = (content: string): string => {
    if (!content) return content;

    // Handle JSON array format (e.g., ["- quote1", "- quote2"])
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        // Clean each item in the array and join with double newlines
        return parsed
            .map(item => {
              // Remove any leading/trailing quotes and whitespace
              const cleanItem = String(item).trim()
                .replace(/^["']|["']$/g, '')  // Remove surrounding quotes
                .replace(/^\s*-\s*/, '')       // Remove leading bullet point
                .trim();
              return cleanItem;
            })
          .filter(Boolean) // Remove any empty strings
          .join('\n\n');
      }
    } catch {
      // Not a JSON string, continue with other cleaning
    }

    // Clean up the content if it's not a JSON array
    return content
      .replace(/^\s*\[\s*/g, '')        // Remove opening [
      .replace(/\s*\]\s*$/g, '')        // Remove closing ]
      .replace(/"\s*,\s*"/g, '\n')     // Replace "," with newlines
      .replace(/[\r\n]+/g, '\n')        // Normalize line endings
      .split('\n')                      // Split into lines
      .map(line =>
        line
          .replace(/^\s*["-]\s*/, '')  // Remove leading "- or -
          .replace(/^\s*\d+\.?\s*/, '') // Remove leading numbers like "1. "
          .replace(/"$/g, '')           // Remove trailing quotes
          .trim()
      )
      .filter(Boolean)                  // Remove empty lines
      .join('\n\n')                    // Join with double newlines
      .replace(/\n{3,}/g, '\n\n')       // Normalize multiple newlines
      .trim();
  };

  const cleanedContent = cleanMarkdownContent(children);

  // Simple table detection
  const containsTable = (text: string): boolean => {
    const lines = text.split('\n').map(line => line.trim());
    const tableStartIndex = lines.findIndex(line =>
      line.includes('|') && line.match(/^\s*\|.*\|\s*$/)
    );
    if (tableStartIndex === -1) return false;

    // Check if there's a separator row (with dashes)
    const separatorIndex = lines.findIndex((line, index) =>
      index > tableStartIndex &&
      line.includes('|') &&
      line.match(/^\s*\|[\s\-:|]+\|\s*$/)
    );

    return separatorIndex !== -1;
  };

  // Simple table extraction
  const extractTable = (text: string): string | null => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const tableStartIndex = lines.findIndex(line =>
      line.includes('|') && line.match(/^\s*\|.*\|\s*$/)
    );

    if (tableStartIndex === -1) return null;

    // Find the end of the table
    let tableEndIndex = lines.length;
    for (let i = tableStartIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.includes('|') || !line.match(/^\s*\|.*\|\s*$/)) {
        tableEndIndex = i;
        break;
      }
    }

    // Extract table lines
    const tableLines = lines.slice(tableStartIndex, tableEndIndex);
    return tableLines.join('\n');
  };

  // If content contains tables, render them directly with MarkdownTable
  if (containsTable(cleanedContent)) {
    const tableContent = extractTable(cleanedContent);

    if (tableContent) {
      // Use regex to find and replace the table content more reliably
      const tableRegex = new RegExp(
        tableContent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*'),
        's'
      );

      const parts = cleanedContent.split(tableRegex);
      const beforeTable = parts[0] || '';
      const afterTable = parts[1] || '';

      return (
        <div className="prose prose-invert prose-neutral prose-sm max-w-none">
          {/* Render content before table */}
          {beforeTable.trim() && (
            <Suspense fallback={<div>Loading...</div>}>
              <LazyReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children, ...props }: any) => (
                    <p className="mb-2 text-neutral-300" {...props}>{children}</p>
                  ),
                  h1: ({ children, ...props }: any) => (
                    <h1 className="text-2xl font-bold mb-4 text-neutral-100" {...props}>{children}</h1>
                  ),
                  h2: ({ children, ...props }: any) => (
                    <h2 className="text-xl font-semibold mb-3 text-neutral-200" {...props}>{children}</h2>
                  ),
                  h3: ({ children, ...props }: any) => (
                    <h3 className="text-lg font-medium mb-2 text-neutral-300" {...props}>{children}</h3>
                  ),
                  ul: ({ children, ...props }: any) => (
                    <ul className="list-disc pl-5 mb-2 space-y-1" {...props}>{children}</ul>
                  ),
                  ol: ({ children, ...props }: any) => (
                    <ol className="list-decimal pl-5 mb-2 space-y-1" {...props}>{children}</ol>
                  ),
                  li: ({ children, ...props }: any) => (
                    <li className="text-neutral-300" {...props}>{children}</li>
                  ),
                  blockquote: ({ children, ...props }: any) => (
                    <blockquote className="border-l-4 border-neutral-600 pl-4 italic text-neutral-400 mb-2" {...props}>{children}</blockquote>
                  ),
                  code: ({ inline, children, ...props }: any) => (
                    inline ? (
                      <code className="bg-neutral-700 px-1 py-0.5 rounded text-sm font-mono text-neutral-300" {...props}>{children}</code>
                    ) : (
                      <code className="block bg-neutral-700 p-3 rounded text-sm font-mono text-neutral-300 overflow-x-auto" {...props}>{children}</code>
                    )
                  ),
                  pre: ({ children, ...props }: any) => (
                    <pre className="bg-neutral-700 p-3 rounded overflow-x-auto mb-2" {...props}>{children}</pre>
                  ),
                }}
              >
                {beforeTable}
              </LazyReactMarkdown>
            </Suspense>
          )}

          {/* Render the table */}
          <MarkdownTable content={tableContent} />

          {/* Render content after table */}
          {afterTable && afterTable.trim() && (
            <Suspense fallback={<div>Loading...</div>}>
              <LazyReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children, ...props }: any) => (
                    <p className="mb-2 text-neutral-300" {...props}>{children}</p>
                  ),
                  h1: ({ children, ...props }: any) => (
                    <h1 className="text-2xl font-bold mb-4 text-neutral-100" {...props}>{children}</h1>
                  ),
                  h2: ({ children, ...props }: any) => (
                    <h2 className="text-xl font-semibold mb-3 text-neutral-200" {...props}>{children}</h2>
                  ),
                  h3: ({ children, ...props }: any) => (
                    <h3 className="text-lg font-medium mb-2 text-neutral-300" {...props}>{children}</h3>
                  ),
                  ul: ({ children, ...props }: any) => (
                    <ul className="list-disc pl-5 mb-2 space-y-1" {...props}>{children}</ul>
                  ),
                  ol: ({ children, ...props }: any) => (
                    <ol className="list-decimal pl-5 mb-2 space-y-1" {...props}>{children}</ol>
                  ),
                  li: ({ children, ...props }: any) => (
                    <li className="text-neutral-300" {...props}>{children}</li>
                  ),
                  blockquote: ({ children, ...props }: any) => (
                    <blockquote className="border-l-4 border-neutral-600 pl-4 italic text-neutral-400 mb-2" {...props}>{children}</blockquote>
                  ),
                  code: ({ inline, children, ...props }: any) => (
                    inline ? (
                      <code className="bg-neutral-700 px-1 py-0.5 rounded text-sm font-mono text-neutral-300" {...props}>{children}</code>
                    ) : (
                      <code className="block bg-neutral-700 p-3 rounded text-sm font-mono text-neutral-300 overflow-x-auto" {...props}>{children}</code>
                    )
                  ),
                  pre: ({ children, ...props }: any) => (
                    <pre className="bg-neutral-700 p-3 rounded overflow-x-auto mb-2" {...props}>{children}</pre>
                  ),
                }}
              >
                {afterTable}
              </LazyReactMarkdown>
            </Suspense>
          )}
        </div>
      );
    }
  }

  // If no tables, use regular React Markdown
  return (
    <Suspense fallback={<div className="text-neutral-400">Loading content...</div>}>
      <LazyReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Style other markdown elements to match the theme
          p: ({ children, ...props }: any) => (
            <p className="mb-2 text-neutral-300" {...props}>{children}</p>
          ),
          h1: ({ children, ...props }: any) => (
            <h1 className="text-2xl font-bold mb-4 text-neutral-100" {...props}>{children}</h1>
          ),
          h2: ({ children, ...props }: any) => (
            <h2 className="text-xl font-semibold mb-3 text-neutral-200" {...props}>{children}</h2>
          ),
          h3: ({ children, ...props }: any) => (
            <h3 className="text-lg font-medium mb-2 text-neutral-300" {...props}>{children}</h3>
          ),
          ul: ({ children, ...props }: any) => (
            <ul className="list-disc pl-5 mb-2 space-y-1" {...props}>{children}</ul>
          ),
          ol: ({ children, ...props }: any) => (
            <ol className="list-decimal pl-5 mb-2 space-y-1" {...props}>{children}</ol>
          ),
          li: ({ children, ...props }: any) => (
            <li className="text-neutral-300" {...props}>{children}</li>
          ),
          blockquote: ({ children, ...props }: any) => (
            <blockquote className="border-l-4 border-neutral-600 pl-4 italic text-neutral-400 mb-2" {...props}>{children}</blockquote>
          ),
          code: ({ inline, children, ...props }: any) => (
            inline ? (
              <code className="bg-neutral-700 px-1 py-0.5 rounded text-sm font-mono text-neutral-300" {...props}>{children}</code>
            ) : (
              <code className="block bg-neutral-700 p-3 rounded text-sm font-mono text-neutral-300 overflow-x-auto" {...props}>{children}</code>
            )
          ),
          pre: ({ children, ...props }: any) => (
            <pre className="bg-neutral-700 p-3 rounded overflow-x-auto mb-2" {...props}>{children}</pre>
          ),
        }}
      >
        {cleanedContent}
      </LazyReactMarkdown>
    </Suspense>
  );
};
