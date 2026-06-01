/**
 * Parse markdown table rows into parties JSON.
 * Usage: node scripts/parse-parties-markdown.js < parties.md > data/digi-khata-parties.json
 */
import fs from 'fs';

const input = fs.readFileSync(0, 'utf8');
const lines = input.split('\n').filter((l) => l.startsWith('|') && !l.includes('---') && !l.includes('Customer Name'));

const parties = [];
for (const line of lines) {
  const cols = line
    .split('|')
    .map((c) => c.trim())
    .filter(Boolean);
  if (cols.length < 5) continue;
  if (cols[0] === '#') continue;

  const num = parseInt(cols[0], 10);
  const name = cols[1];
  const phone = cols[2].replace(/\D/g, '').replace(/^92/, '0');
  const normalizedPhone = phone.startsWith('0') ? phone : `0${phone}`;
  const receivable = cols[3] ? parseInt(cols[3].replace(/,/g, ''), 10) : 0;
  const payable = cols[4] ? parseInt(cols[4].replace(/,/g, ''), 10) : 0;

  if (!name || Number.isNaN(num)) continue;

  let advanceBalance = 0;
  if (receivable > 0) advanceBalance = -receivable;
  else if (payable > 0) advanceBalance = payable;

  parties.push({
    num,
    name,
    phone: normalizedPhone.length >= 11 ? normalizedPhone.slice(0, 11) : normalizedPhone || null,
    advanceBalance,
    receivable: receivable || null,
    payable: payable || null,
  });
}

process.stdout.write(JSON.stringify(parties, null, 2));
