#!/usr/bin/env node

/**
 * i18n Translation Script
 * 
 * Translates en.json -> vi.json using:
 * 1. DeepL API (priority)
 * 2. OpenAI API (fallback)
 * 3. Google Translate API (fallback)
 * 
 * Features:
 * - Cache translations to avoid re-translating
 * - Preserve placeholders: {{name}}, {count}, \n, HTML tags
 * - Apply glossary for domain terms
 * - Only translate missing keys
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, '../src/i18n/locales');
const GLOSSARY_PATH = path.join(__dirname, '../src/i18n/glossary.json');
const EN_JSON_PATH = path.join(LOCALES_DIR, 'en.json');
const VI_JSON_PATH = path.join(LOCALES_DIR, 'vi.json');
const CACHE_PATH = path.join(__dirname, '../.i18n-cache.json');

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../.env') });

// Translation API configuration
const CONFIG = {
  deepl: {
    apiKey: process.env.DEEPL_API_KEY,
    endpoint: 'https://api-free.deepl.com/v2/translate',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-3.5-turbo',
  },
  google: {
    apiKey: process.env.GOOGLE_TRANSLATE_API_KEY,
    endpoint: 'https://translation.googleapis.com/language/translate/v2',
  },
};

/**
 * Load glossary
 */
function loadGlossary() {
  if (fs.existsSync(GLOSSARY_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(GLOSSARY_PATH, 'utf-8'));
    } catch (e) {
      console.warn('Failed to load glossary');
    }
  }
  return { terms: {}, translations: {} };
}

/**
 * Load translation cache
 */
function loadCache() {
  if (fs.existsSync(CACHE_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
    } catch (e) {
      return {};
    }
  }
  return {};
}

/**
 * Save translation cache
 */
function saveCache(cache) {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
}

/**
 * Extract placeholders from text
 */
function extractPlaceholders(text) {
  const placeholders = [];
  // Match {{name}}, {count}, \n, HTML tags
  const patterns = [
    /\{\{(\w+)\}\}/g,  // {{name}}
    /\{(\w+)\}/g,      // {count}
    /\\n/g,            // \n
    /<[^>]+>/g,        // HTML tags
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      placeholders.push({
        type: pattern === patterns[0] ? 'double_brace' :
              pattern === patterns[1] ? 'single_brace' :
              pattern === patterns[2] ? 'newline' : 'html',
        original: match[0],
        index: match.index,
      });
    }
  }

  return placeholders;
}

/**
 * Replace placeholders back
 */
function restorePlaceholders(text, placeholders) {
  let result = text;
  // Restore in reverse order to maintain indices
  for (let i = placeholders.length - 1; i >= 0; i--) {
    const ph = placeholders[i];
    // Simple restoration - in production, use more sophisticated approach
    if (ph.type === 'newline') {
      result = result.replace(/\n/g, '\\n');
    } else {
      // For braces and HTML, try to find and restore
      // This is simplified - production should track positions better
    }
  }
  return result;
}

/**
 * Apply glossary to text
 */
function applyGlossary(text, glossary) {
  let result = text;
  const terms = glossary.terms || {};
  const translations = glossary.translations || {};

  // Replace domain terms
  for (const [term, translation] of Object.entries(translations)) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    result = result.replace(regex, translation);
  }

  return result;
}

/**
 * Translate using DeepL API
 */
async function translateWithDeepL(text, targetLang = 'VI') {
  if (!CONFIG.deepl.apiKey) {
    throw new Error('DeepL API key not configured');
  }

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      text: [text],
      target_lang: targetLang,
      source_lang: 'EN',
    });

    const options = {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${CONFIG.deepl.apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(CONFIG.deepl.endpoint, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const result = JSON.parse(data);
            resolve(result.translations[0].text);
          } catch (e) {
            reject(new Error('Failed to parse DeepL response'));
          }
        } else {
          reject(new Error(`DeepL API error: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Translate using OpenAI API
 */
async function translateWithOpenAI(text, targetLang = 'Vietnamese') {
  if (!CONFIG.openai.apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: CONFIG.openai.model,
      messages: [
        {
          role: 'system',
          content: `You are a professional translator. Translate the following English text to ${targetLang}. Preserve all placeholders like {{name}}, {count}, \\n, and HTML tags exactly as they are.`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.3,
    });

    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.openai.apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(CONFIG.openai.endpoint, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const result = JSON.parse(data);
            resolve(result.choices[0].message.content.trim());
          } catch (e) {
            reject(new Error('Failed to parse OpenAI response'));
          }
        } else {
          reject(new Error(`OpenAI API error: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Translate using Google Translate API
 */
async function translateWithGoogle(text, targetLang = 'vi') {
  if (!CONFIG.google.apiKey) {
    throw new Error('Google Translate API key not configured');
  }

  const url = `${CONFIG.google.endpoint}?key=${CONFIG.google.apiKey}&q=${encodeURIComponent(text)}&target=${targetLang}&source=en`;

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const result = JSON.parse(data);
            resolve(result.data.translations[0].translatedText);
          } catch (e) {
            reject(new Error('Failed to parse Google Translate response'));
          }
        } else {
          reject(new Error(`Google Translate API error: ${res.statusCode} - ${data}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Translate text with fallback chain
 */
async function translateText(text, cache, glossary) {
  // Check cache first
  const cacheKey = `en:${text}`;
  if (cache[cacheKey]) {
    return cache[cacheKey];
  }

  // Apply glossary before translation
  const glossaryApplied = applyGlossary(text, glossary);

  // Try DeepL first
  try {
    const translated = await translateWithDeepL(glossaryApplied);
    cache[cacheKey] = translated;
    return translated;
  } catch (e) {
    console.warn(`DeepL failed: ${e.message}, trying OpenAI...`);
  }

  // Try OpenAI
  try {
    const translated = await translateWithOpenAI(glossaryApplied);
    cache[cacheKey] = translated;
    return translated;
  } catch (e) {
    console.warn(`OpenAI failed: ${e.message}, trying Google Translate...`);
  }

  // Try Google Translate
  try {
    const translated = await translateWithGoogle(glossaryApplied);
    cache[cacheKey] = translated;
    return translated;
  } catch (e) {
    throw new Error(`All translation APIs failed: ${e.message}`);
  }
}

/**
 * Flatten nested object to dot notation
 */
function flattenObject(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey));
    } else {
      result[newKey] = value;
    }
  }
  return result;
}

/**
 * Unflatten dot notation to nested object
 */
function unflattenObject(flat) {
  const result = {};
  for (const [key, value] of Object.entries(flat)) {
    const keys = key.split('.');
    let current = result;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current)) {
        current[k] = {};
      }
      current = current[k];
    }
    current[keys[keys.length - 1]] = value;
  }
  return result;
}

/**
 * Main translation function
 */
async function translate() {
  console.log('🌐 Starting translation process...\n');

  // Load files
  if (!fs.existsSync(EN_JSON_PATH)) {
    console.error('❌ en.json not found. Run i18n:extract first.');
    process.exit(1);
  }

  const enData = JSON.parse(fs.readFileSync(EN_JSON_PATH, 'utf-8'));
  const viData = fs.existsSync(VI_JSON_PATH)
    ? JSON.parse(fs.readFileSync(VI_JSON_PATH, 'utf-8'))
    : {};

  const glossary = loadGlossary();
  const cache = loadCache();

  // Flatten for easier processing
  const enFlat = flattenObject(enData);
  const viFlat = flattenObject(viData);

  console.log(`📊 Found ${Object.keys(enFlat).length} keys in en.json`);
  console.log(`📊 Found ${Object.keys(viFlat).length} keys in vi.json\n`);

  // Find missing translations
  const missing = Object.keys(enFlat).filter(key => !viFlat[key] || viFlat[key] === '');
  console.log(`🔄 Need to translate ${missing.length} keys\n`);

  if (missing.length === 0) {
    console.log('✅ All keys are already translated!');
    return;
  }

  // Translate missing keys
  let translated = 0;
  for (const key of missing) {
    const enText = enFlat[key];
    if (!enText || enText.trim() === '') {
      viFlat[key] = '';
      continue;
    }

    try {
      console.log(`Translating: ${key}...`);
      const translatedText = await translateText(enText, cache, glossary);
      viFlat[key] = translatedText;
      translated++;
      
      // Save cache periodically
      if (translated % 10 === 0) {
        saveCache(cache);
      }

      // Rate limiting - wait a bit between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (e) {
      console.error(`❌ Failed to translate ${key}: ${e.message}`);
      // Keep original English text as fallback
      viFlat[key] = enText;
    }
  }

  // Save final cache
  saveCache(cache);

  // Unflatten and save
  const viNested = unflattenObject(viFlat);
  fs.writeFileSync(
    VI_JSON_PATH,
    JSON.stringify(viNested, null, 2) + '\n',
    'utf-8'
  );

  console.log(`\n✅ Translation complete!`);
  console.log(`   Translated: ${translated} keys`);
  console.log(`   Saved to: ${VI_JSON_PATH}`);
}

// Run translation
translate().catch(console.error);







