#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const args = parseArgs(process.argv.slice(2));
if (!args.id) {
  throw new Error('Usage: node scripts/get-pictogram-detail.mjs --id <arasaac-id>');
}

const id = String(args.id);
const record = await findRecord(id);
if (!record) {
  throw new Error(`No pictogram found for id ${id}.`);
}

const detail = {
  id: String(record.id),
  name: record.chineseName || record.displayNameZhFallback || record.englishName || '',
  chineseName: record.chineseName || '',
  englishName: record.englishName || '',
  url: record.imageUrl300 || record.imageUrl500 || '',
  imageUrl300: record.imageUrl300 || '',
  imageUrl500: record.imageUrl500 || '',
  arasaacUrl: record.arasaacUrlZh || record.arasaacUrlEn || '',
  category: first(record.categoriesEn),
  categories: record.categoriesEn || [],
  tag: first(record.tagsEn),
  tags: record.tagsEn || [],
  chineseKeywords: record.chineseKeywords || [],
  englishKeywords: record.englishKeywords || [],
  description: describeRecord(record),
};

process.stdout.write(`${JSON.stringify(detail, null, 2)}\n`);

async function findRecord(targetId) {
  const fullPath = path.resolve('data/arasaac-pictograms.json');
  try {
    const source = JSON.parse(await readFile(fullPath, 'utf8'));
    const records = Array.isArray(source) ? source : source.records;
    const found = records?.find((item) => String(item.id) === targetId);
    if (found) return found;
  } catch {
    // Fall through to the slim export below.
  }

  const slimPath = path.resolve('data/arasaac-pictograms-slim.json');
  const slimRecords = JSON.parse(await readFile(slimPath, 'utf8'));
  return slimRecords.find((item) => String(item.id) === targetId);
}

function describeRecord(record) {
  const name = record.chineseName || record.englishName || `ARASAAC ${record.id}`;
  const tags = (record.tagsEn || []).slice(0, 6).join(', ');
  const categories = (record.categoriesEn || []).slice(0, 4).join(', ');
  return [
    `Picture label: ${name}.`,
    categories ? `Categories: ${categories}.` : '',
    tags ? `Tags: ${tags}.` : '',
  ].filter(Boolean).join(' ');
}

function first(values) {
  return Array.isArray(values) ? values[0] || '' : '';
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
