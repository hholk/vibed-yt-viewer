import React from 'react';

interface MarkdownTableProps {
  content: string;
  className?: string;
}

export const MarkdownTable: React.FC<MarkdownTableProps> = ({ content, className = '' }) => {
  console.log('MarkdownTable called with content:', content); // Debug log
  
  // Function to detect if content contains a markdown table
  const containsTable = (text: string): boolean => {
    const lines = text.split('\n').map(line => line.trim());
    const tableStartIndex = lines.findIndex(line => line.includes('|') && line.match(/^\s*\|.*\|\s*$/));
    if (tableStartIndex === -1) return false;

    // Check if there's a separator row (with dashes)
    const separatorIndex = lines.findIndex((line, index) =>
      index > tableStartIndex &&
      line.includes('|') &&
      line.match(/^\s*\|[\s\-:|]+\|\s*$/)
    );

    return separatorIndex !== -1;
  };

  // Function to parse markdown table
  const parseMarkdownTable = (text: string) => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const tableStartIndex = lines.findIndex(line => line.includes('|') && line.match(/^\s*\|.*\|\s*$/));

    if (tableStartIndex === -1) return null;

    const headerLine = lines[tableStartIndex];
    const separatorLine = lines[tableStartIndex + 1];

    // Check if separator line exists and contains dashes
    if (!separatorLine || !separatorLine.match(/^\s*\|[\s\-:|]+\|\s*$/)) {
      return null;
    }

    // Parse headers
    const headers = headerLine
      .split('|')
      .map(cell => cell.trim())
      .filter(cell => cell.length > 0);

    // Parse data rows
    const rows: string[][] = [];
    for (let i = tableStartIndex + 2; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('|') && line.match(/^\s*\|.*\|\s*$/)) {
        const row = line
          .split('|')
          .map(cell => cell.trim())
          .filter(cell => cell.length > 0);
        if (row.length === headers.length) {
          rows.push(row);
        }
      } else {
        break; // Stop at first non-table line
      }
    }

    return { headers, rows };
  };

  if (!containsTable(content)) {
    console.log('No table found in content, returning null'); // Debug log
    return null; // Return null if no table found, let parent handle as regular markdown
  }

  const tableData = parseMarkdownTable(content);

  if (!tableData) {
    console.log('Table parsing failed'); // Debug log
    return null; // Return null if parsing failed
  }

  const { headers, rows } = tableData;
  console.log('Table successfully parsed:', { headers, rows }); // Debug log

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full border-collapse border border-neutral-600 bg-neutral-800/50 rounded-lg overflow-hidden">
        <thead className="bg-neutral-700/80">
          <tr>
            {headers.map((header, index) => (
              <th
                key={index}
                className="border border-neutral-600 px-4 py-3 text-left text-sm font-semibold text-neutral-200 first:rounded-tl-lg last:rounded-tr-lg"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-600">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-neutral-700/30 transition-colors">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="border border-neutral-600 px-4 py-3 text-sm text-neutral-300"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MarkdownTable;
