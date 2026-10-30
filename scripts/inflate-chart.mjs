import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, 'chart_chunks');
const parts = readdirSync(dir).filter((f) => f.endsWith('.txt')).sort();
if (parts.length === 0) {
  console.warn('[inflate-chart] no chunks found — leaving existing CandleChart.ts');
  process.exit(0);
}
const b64 = parts.map((f) => readFileSync(join(dir, f), 'utf8')).join('');
const src = Buffer.from(b64, 'base64').toString('utf8');
const out = join(here, '../src/chart/CandleChart.ts');
writeFileSync(out, src);
console.log('[inflate-chart] wrote', out, '(' + src.length + ' bytes)');
