#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const API_ROOT = 'https://api.arasaac.org/api';
const STATIC_ROOT = 'https://static.arasaac.org/pictograms';
const WEB_ROOT = 'https://arasaac.org/pictograms';

const args = parseArgs(process.argv.slice(2));
const outDir = path.resolve(args['out-dir'] || 'data');
const basename = args.basename || 'arasaac-pictograms';
const locales = (args.locales || 'zh,en').split(',').map((locale) => locale.trim()).filter(Boolean);

if (!locales.includes('zh') || !locales.includes('en')) {
  throw new Error('This export expects both zh and en locales so names can be merged.');
}

await mkdir(outDir, { recursive: true });

const localeData = {};
for (const locale of locales) {
  const url = `${API_ROOT}/pictograms/all/${encodeURIComponent(locale)}`;
  console.error(`Fetching ${locale}: ${url}`);
  localeData[locale] = await fetchJson(url);
  console.error(`Fetched ${locale}: ${localeData[locale].length} records`);
}

const byId = new Map();
for (const [locale, pictograms] of Object.entries(localeData)) {
  for (const pictogram of pictograms) {
    const id = Number(pictogram._id);
    if (!Number.isFinite(id)) continue;
    const existing = byId.get(id) || { id, locales: {} };
    existing.locales[locale] = pictogram;
    byId.set(id, existing);
  }
}

const records = Array.from(byId.values())
  .map(({ id, locales: itemLocales }) => buildRecord(id, itemLocales.zh, itemLocales.en))
  .sort((a, b) => a.id - b.id);

const generatedAt = new Date().toISOString();
const jsonOutput = {
  metadata: {
    generatedAt,
    source: 'ARASAAC public API',
    apiRoot: API_ROOT,
    staticRoot: STATIC_ROOT,
    locales,
    count: records.length,
    licenseNote: 'ARASAAC pictograms are published under Creative Commons BY-NC-SA terms. Verify current terms before redistribution or commercial use.',
  },
  records,
};

const jsonPath = path.join(outDir, `${basename}.json`);
const csvPath = path.join(outDir, `${basename}.csv`);

await writeFile(jsonPath, `${JSON.stringify(jsonOutput, null, 2)}\n`, 'utf8');
await writeFile(csvPath, toCsv(records), 'utf8');

console.error(`Wrote ${jsonPath}`);
console.error(`Wrote ${csvPath}`);
console.error(`Total records: ${records.length}`);

function buildRecord(id, zh, en) {
  const source = zh || en || {};
  const zhKeywords = normalizeKeywords(zh?.keywords);
  const enKeywords = normalizeKeywords(en?.keywords);
  const chineseName = firstKeyword(zhKeywords);
  const englishName = firstKeyword(enKeywords);

  return {
    id,
    chineseName,
    englishName,
    displayNameZhFallback: chineseName || englishName,
    imageUrl300: imageUrl(id, 300),
    imageUrl500: imageUrl(id, 500),
    imageUrl2500: imageUrl(id, 2500),
    imageApiUrl500: `${API_ROOT}/pictograms/${id}?url=true&resolution=500`,
    arasaacUrlZh: `${WEB_ROOT}/zh/${id}`,
    arasaacUrlEn: `${WEB_ROOT}/en/${id}`,
    apiUrlZh: `${API_ROOT}/pictograms/zh/${id}`,
    apiUrlEn: `${API_ROOT}/pictograms/en/${id}`,
    categoriesZh: arrayOrEmpty(zh?.categories),
    categoriesEn: arrayOrEmpty(en?.categories),
    tagsZh: arrayOrEmpty(zh?.tags),
    tagsEn: arrayOrEmpty(en?.tags),
    chineseKeywords: zhKeywords.map((keyword) => keyword.keyword).filter(Boolean),
    englishKeywords: enKeywords.map((keyword) => keyword.keyword).filter(Boolean),
    chineseKeywordDetails: zhKeywords,
    englishKeywordDetails: enKeywords,
    synsets: arrayOrEmpty(source.synsets),
    created: source.created || '',
    lastUpdated: latestDate(zh?.lastUpdated, en?.lastUpdated) || source.lastUpdated || '',
    schematic: Boolean(source.schematic),
    sex: Boolean(source.sex),
    violence: Boolean(source.violence),
    aac: Boolean(source.aac),
    aacColor: Boolean(source.aacColor),
    skin: Boolean(source.skin),
    hair: Boolean(source.hair),
    downloads: Number(source.downloads || 0),
    hasChineseData: Boolean(zh),
    hasEnglishData: Boolean(en),
    missingChineseName: !chineseName,
    missingEnglishName: !englishName,
  };
}

function imageUrl(id, resolution) {
  return `${STATIC_ROOT}/${id}/${id}_${resolution}.png`;
}

function normalizeKeywords(keywords) {
  return arrayOrEmpty(keywords).map((keyword) => ({
    keyword: keyword.keyword || '',
    plural: keyword.plural || '',
    meaning: keyword.meaning || '',
    type: keyword.type ?? '',
    hasLocution: Boolean(keyword.hasLocution),
  }));
}

function firstKeyword(keywords) {
  return keywords.find((keyword) => keyword.keyword.trim())?.keyword.trim() || '';
}

function arrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

function latestDate(...dates) {
  const validDates = dates
    .filter(Boolean)
    .map((date) => new Date(date))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());
  return validDates[0]?.toISOString() || '';
}

async function fetchJson(url, retries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'arasaac-pictogram-export/1.0',
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(1000 * attempt);
      }
    }
  }
  throw new Error(`Failed to fetch ${url}: ${lastError.message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toCsv(recordsToWrite) {
  const columns = [
    'id',
    'chineseName',
    'englishName',
    'displayNameZhFallback',
    'imageUrl500',
    'imageUrl300',
    'imageUrl2500',
    'arasaacUrlZh',
    'arasaacUrlEn',
    'apiUrlZh',
    'apiUrlEn',
    'categoriesZh',
    'categoriesEn',
    'tagsZh',
    'tagsEn',
    'chineseKeywords',
    'englishKeywords',
    'synsets',
    'created',
    'lastUpdated',
    'schematic',
    'sex',
    'violence',
    'aac',
    'aacColor',
    'skin',
    'hair',
    'downloads',
    'hasChineseData',
    'hasEnglishData',
    'missingChineseName',
    'missingEnglishName',
  ];

  const lines = [
    columns.join(','),
    ...recordsToWrite.map((record) =>
      columns.map((column) => csvCell(csvValue(record[column]))).join(',')
    ),
  ];

  return `\uFEFF${lines.join('\n')}\n`;
}

function csvValue(value) {
  if (Array.isArray(value)) return value.join('; ');
  if (value === null || value === undefined) return '';
  return String(value);
}

function csvCell(value) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function parseArgs(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (!arg.startsWith('--')) continue;
    const withoutPrefix = arg.slice(2);
    const [key, inlineValue] = withoutPrefix.split('=', 2);
    if (inlineValue !== undefined) {
      parsed[key] = inlineValue;
    } else if (rawArgs[index + 1] && !rawArgs[index + 1].startsWith('--')) {
      parsed[key] = rawArgs[index + 1];
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}
