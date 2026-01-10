#!/usr/bin/env node

/**
 * Scan for hard-coded strings in TS/TSX files
 * Helps identify text that should be moved to i18n
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, '../src');

// Common words that are likely hard-coded UI text
const UI_KEYWORDS = [
  'Save', 'Cancel', 'Delete', 'Edit', 'View', 'Create', 'Update',
  'Add', 'Remove', 'Search', 'Filter', 'Submit', 'Confirm',
  'Loading', 'Error', 'Success', 'Required', 'Optional',
  'Name', 'Email', 'Password', 'Status', 'Date', 'Time',
  'Actions', 'No data', 'No results', 'Try again',
];

// Patterns to detect hard-coded strings
const PATTERNS = [
  // JSX text content: >Text here<
  />([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)</g,
  // Placeholder attributes
  /placeholder=['"`]([^'"`]{3,})['"`]/g,
  // Title attributes
  /title=['"`]([^'"`]{3,})['"`]/g,
  // Label text
  /label=['"`]([^'"`]{3,})['"`]/g,
  // Button text
  /<Button[^>]*>([A-Z][^<]{2,})<\/Button>/g,
  // Modal/Dialog titles
  /title:\s*['"`]([^'"`]{3,})['"`]/g,
  // Message text
  /message\.(success|error|warning|info)\(['"`]([^'"`]{3,})['"`]\)/g,
];

// Files to ignore
const IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/*.test.*',
  '**/*.spec.*',
  '**/i18n/**',
  '**/*.d.ts',
];

async function scanFiles() {
  console.log('🔍 Scanning for hard-coded strings...\n');

  const files = await glob('**/*.{ts,tsx}', {
    cwd: SRC_DIR,
    ignore: IGNORE_PATTERNS,
  });

  const issues = [];

  for (const file of files) {
    const filePath = path.join(SRC_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Skip if file already uses i18n extensively
    const hasI18n = content.includes('useTranslation') || 
                    content.includes('t(') || 
                    content.includes('i18n');
    
    // Skip test files and type definitions
    if (file.includes('.test.') || file.includes('.spec.') || file.includes('.d.ts')) {
      continue;
    }

    for (const pattern of PATTERNS) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      
      while ((match = regex.exec(content)) !== null) {
        const text = match[1] || match[2] || match[0];
        
        // Filter out common false positives
        if (
          text &&
          text.length > 2 &&
          !text.match(/^(className|id|key|value|type|name|href|src|onClick|onChange|onSubmit)$/i) &&
          !text.match(/^[a-z]+$/i) && // Single word lowercase
          !text.match(/^\d+$/) && // Numbers
          !text.match(/^[{}[\]]+$/) && // Brackets
          !text.match(/^[.,;:!?]+$/) && // Punctuation
          !text.includes('${') && // Template literals
          !text.includes('import') && // Import statements
          !text.includes('export') && // Export statements
          !text.includes('function') && // Function keywords
          !text.includes('const ') && // Const declarations
          !text.includes('let ') && // Let declarations
          !text.includes('var ') && // Var declarations
          !hasI18n // Skip if file already uses i18n
        ) {
          const line = content.substring(0, match.index).split('\n').length;
          issues.push({
            file,
            line,
            text: text.substring(0, 60),
            pattern: pattern.source.substring(0, 40),
          });
        }
      }
    }
  }

  if (issues.length > 0) {
    console.log(`⚠️  Found ${issues.length} potential hard-coded strings:\n`);
    
    // Group by file
    const byFile = {};
    issues.forEach(issue => {
      if (!byFile[issue.file]) {
        byFile[issue.file] = [];
      }
      byFile[issue.file].push(issue);
    });

    // Print grouped results
    for (const [file, fileIssues] of Object.entries(byFile)) {
      console.log(`\n📄 ${file}:`);
      fileIssues.forEach(({ line, text }) => {
        console.log(`   Line ${line}: "${text}"`);
      });
    }

    console.log(`\n💡 Tip: Replace these with t('namespace:key') from i18n\n`);
  } else {
    console.log('✅ No hard-coded strings found! All text is using i18n.\n');
  }

  return issues.length;
}

// Run scan
scanFiles()
  .then(count => {
    process.exit(count > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('Error scanning files:', error);
    process.exit(1);
  });







