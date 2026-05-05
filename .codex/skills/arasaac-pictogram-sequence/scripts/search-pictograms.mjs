#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const DATA_PATH = path.resolve('data/arasaac-pictograms-slim.json');
process.stdout.on('error', (error) => {
  if (error.code === 'EPIPE') process.exit(0);
  throw error;
});

const args = parseArgs(process.argv.slice(2));
const filters = {
  tag: compileRegex(args.tag),
  category: compileRegex(args.category),
  name: compileRegex(args.name),
};

const records = JSON.parse(await readFile(DATA_PATH, 'utf8'));
if (!Array.isArray(records)) {
  throw new Error(`${DATA_PATH} must contain a JSON array.`);
}

const results = records
  .filter((record) => matchesRecord(record, filters))
  .map((record) => ({
    id: String(record.id),
    name: pickMatchedValue(filters.name, [
      record.chineseName,
      record.englishName,
      ...(record.chineseKeywords || []),
    ]) || record.chineseName || record.englishName || '',
    tag: pickMatchedValue(filters.tag, record.tagsEn || []) || first(record.tagsEn),
    category: pickMatchedValue(filters.category, record.categoriesEn || []) || first(record.categoriesEn),
  }));

process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);

function matchesRecord(record, currentFilters) {
  if (currentFilters.name && !matchesAny(currentFilters.name, [
    record.chineseName,
    record.englishName,
    ...(record.chineseKeywords || []),
  ])) {
    return false;
  }
  if (currentFilters.tag && !matchesAny(currentFilters.tag, record.tagsEn || [])) {
    return false;
  }
  if (currentFilters.category && !matchesAny(currentFilters.category, record.categoriesEn || [])) {
    return false;
  }
  return true;
}

function matchesAny(regex, values) {
  return values.some((value) => value && regex.test(String(value)));
}

function pickMatchedValue(regex, values) {
  if (!regex) return '';
  return values.find((value) => value && regex.test(String(value))) || '';
}

function first(values) {
  return Array.isArray(values) ? values[0] || '' : '';
}

function compileRegex(value) {
  if (!value) return null;
  return new RegExp(String(value).replaceAll('｜', '|'), 'iu');
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
      parsed[key] = '';
    }
  }
  return parsed;
}
