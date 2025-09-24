import React, { Suspense, lazy } from 'react';
import { MarkdownTable } from '@/shared/components/markdown-table';

// Lazy load react-markdown for better performance
const LazyReactMarkdown = lazy(() => import('react-markdown'));

export default function TestPage() {
  const testContent = `| Feature | Description | Impact |
|---------|-------------|--------|
| AI Agents | Autonomous software | High |
| Quantum Computing | Revolutionary tech | Medium |
| Blockchain | Distributed ledger | Low |`;

  const testContentWithTable = `Here's a regular paragraph.

| Feature | Description | Impact |
|---------|-------------|--------|
| AI Agents | Autonomous software | High |
| Quantum Computing | Revolutionary tech | Medium |

And here's another paragraph after the table.`;

  // Custom components for react-markdown
  const markdownComponents = {
    table: ({ children, ...props }: React.HTMLAttributes<HTMLTableElement> & { children: React.ReactNode }) => {
      const tableContent = React.Children.toArray(children)
        .map((child) => (typeof child === 'string' ? child : ''))
        .join('');

      const hasTableSyntax = tableContent.includes('|') && (
        tableContent.includes('---') ||
        tableContent.includes('-|-') ||
        tableContent.includes(':---') ||
        tableContent.includes('---:') ||
        tableContent.includes(':---:')
      );

      if (hasTableSyntax) {
        return <MarkdownTable content={testContent} />;
      }

      return <table {...props}>{children}</table>;
    },
  };

  return (
    <div className="p-8 bg-neutral-900 text-neutral-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Markdown Table Test</h1>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Direct MarkdownTable Component:</h2>
        <MarkdownTable content={testContent} />
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">React Markdown with Table Integration:</h2>
        <div className="prose prose-invert prose-neutral prose-sm max-w-none">
          <Suspense fallback={<div>Loading...</div>}>
            <LazyReactMarkdown components={markdownComponents}>
              {testContentWithTable}
            </LazyReactMarkdown>
          </Suspense>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Raw Content:</h2>
        <pre className="bg-neutral-800 p-4 rounded text-sm overflow-x-auto">
          {testContentWithTable}
        </pre>
      </div>
    </div>
  );
}
