import { readFile, writeFile } from 'fs/promises';
import { glob } from 'glob';
import { join } from 'path';

// Match both single-line (//) and multi-line (/* */) comments
const commentPatterns = [
  // Single-line comments
  /\/\/[^\n]*/g,
  // Multi-line comments
  /\/\*[\s\S]*?\*\//g
];

async function removeComments(filePath: string) {
  try {
    const content = await readFile(filePath, 'utf-8');
    let newContent = content;
    
    // Remove all comment patterns
    commentPatterns.forEach(pattern => {
      newContent = newContent.replace(pattern, '');
    });
    
    // Remove multiple consecutive empty lines
    newContent = newContent.replace(/\n{3,}/g, '\n\n');
    
    if (newContent !== content) {
      await writeFile(filePath, newContent, 'utf-8');
      console.log(`Processed: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

async function main() {
  const files = await glob('src/**/*.{ts,tsx,js,jsx}', { ignore: ['**/node_modules/**'] });
  
  console.log(`Found ${files.length} files to process...`);
  
  for (const file of files) {
    await removeComments(file);
  }
  
  console.log('Comment removal complete!');
}

main().catch(console.error);
