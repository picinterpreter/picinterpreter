#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const KEEP_FIELDS = [
  'id',
  'chineseName',
  'englishName',
  'imageUrl300',
  'categoriesEn',
  'tagsEn',
  'chineseKeywords',
];

const args = parseArgs(process.argv.slice(2));
const inputPath = path.resolve(args.input || 'data/arasaac-pictograms.json');
const outputPath = path.resolve(args.output || 'data/arasaac-pictograms-slim.json');

const raw = await readFile(inputPath, 'utf8');
const source = JSON.parse(raw);
const records = Array.isArray(source) ? source : source.records;

if (!Array.isArray(records)) {
  throw new Error(`Expected ${inputPath} to contain an array or a { records: [] } object.`);
}

const slimRecords = records.map((record) =>
  Object.fromEntries(KEEP_FIELDS.map((field) => [field, record[field]]))
);

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(slimRecords, null, 2)}\n`, 'utf8');

console.error(`Read ${records.length} records from ${inputPath}`);
console.error(`Wrote ${slimRecords.length} records to ${outputPath}`);

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
