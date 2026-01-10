#!/usr/bin/env node

/**
 * i18n Key Extractor
 * 
 * Scans TypeScript/TSX files for i18n usage patterns:
 * - t('key')
 * - t("key")
 * - <Trans i18nKey="key" />
 * 
 * Generates/updates en.json with found keys.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, '../src');
const LOCALES_DIR = path.join(__dirname, '../src/i18n/locales');
const EN_JSON_PATH = path.join(LOCALES_DIR, 'en.json');

// Patterns to match i18n keys
const PATTERNS = [
  // t('key') or t("key")
  /t\(['"]([^'"]+)['"]\)/g,
  // <Trans i18nKey="key" />
  /i18nKey=['"]([^'"]+)['"]/g,
  // useTranslation().t('key')
  /\.t\(['"]([^'"]+)['"]\)/g,
];

/**
 * Extract keys from a file
 */
function extractKeysFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const keys = new Set();

  for (const pattern of PATTERNS) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const key = match[1];
      if (key && !key.includes('${') && !key.includes('`')) {
        keys.add(key);
      }
    }
  }

  return Array.from(keys);
}

/**
 * Convert flat key to nested object
 * Example: "common.save" -> { common: { save: "" } }
 */
function setNestedValue(obj, keyPath, value) {
  const keys = keyPath.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }

  const lastKey = keys[keys.length - 1];
  // Only set if not already exists (preserve existing translations)
  if (!(lastKey in current)) {
    current[lastKey] = value;
  }
}

/**
 * Load existing translations
 */
function loadExistingTranslations() {
  if (fs.existsSync(EN_JSON_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(EN_JSON_PATH, 'utf-8'));
    } catch (e) {
      console.warn('Failed to parse existing en.json, starting fresh');
      return {};
    }
  }
  return {};
}

/**
 * Main extraction function
 */
async function extractKeys() {
  console.log('🔍 Scanning for i18n keys...\n');

  // Find all TS/TSX files
  const files = await glob('**/*.{ts,tsx}', {
    cwd: SRC_DIR,
    ignore: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*', '**/i18n/**'],
  });

  console.log(`Found ${files.length} files to scan\n`);

  const allKeys = new Set();
  const fileKeyMap = new Map();

  // Extract keys from each file
  for (const file of files) {
    const filePath = path.join(SRC_DIR, file);
    const keys = extractKeysFromFile(filePath);
    
    if (keys.length > 0) {
      fileKeyMap.set(file, keys);
      keys.forEach(key => allKeys.add(key));
    }
  }

  console.log(`Found ${allKeys.size} unique keys\n`);

  // Load existing translations
  const existing = loadExistingTranslations();

  // Build new structure
  const newTranslations = { ...existing };

  // Add new keys (preserve existing values)
  for (const key of allKeys) {
    setNestedValue(newTranslations, key, existing[key] || '');
  }

  // Sort keys alphabetically
  function sortObject(obj) {
    const sorted = {};
    Object.keys(obj)
      .sort()
      .forEach(key => {
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          sorted[key] = sortObject(obj[key]);
        } else {
          sorted[key] = obj[key];
        }
      });
    return sorted;
  }

  const sortedTranslations = sortObject(newTranslations);

  // Write to file
  fs.writeFileSync(
    EN_JSON_PATH,
    JSON.stringify(sortedTranslations, null, 2) + '\n',
    'utf-8'
  );

  console.log(`✅ Updated ${EN_JSON_PATH}`);
  console.log(`   Total keys: ${Object.keys(sortedTranslations).length}\n`);

  // Show summary by file
  if (fileKeyMap.size > 0) {
    console.log('📊 Keys found by file:');
    for (const [file, keys] of fileKeyMap.entries()) {
      console.log(`   ${file}: ${keys.length} keys`);
    }
  }
}

// Run extraction
extractKeys().catch(console.error);







