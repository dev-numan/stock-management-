#!/usr/bin/env node
/**
 * Preview how the WhatsApp payment reminder image is built.
 *
 * Usage:
 *   npm run preview:reminder
 *   npm run preview:reminder -- 6040 03410111243
 *
 * Outputs:
 *   scripts/output/payment-reminder.html  (open in browser)
 *   scripts/output/payment-reminder.png   (same card as PNG, if puppeteer available)
 *
 * In the mobile app the same card is rendered with PaymentReminderCard.jsx
 * and captured to PNG using react-native-view-shot (ViewShot).
 */

import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { buildReminderCardHtml } from './reminderCardHtml.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, 'output');

const amountDue = Number(process.argv[2] || 6040);
const shopPhone = process.argv[3] || '03410111243';

mkdirSync(OUT_DIR, { recursive: true });

const html = buildReminderCardHtml({ amountDue, shopPhone, date: new Date() });
const htmlPath = join(OUT_DIR, 'payment-reminder.html');
const pngPath = join(OUT_DIR, 'payment-reminder.png');

writeFileSync(htmlPath, html, 'utf8');
console.log('✓ HTML preview:', htmlPath);
console.log('  Open this file in Chrome/Safari to see the card.');

try {
  const { default: nodeHtmlToImage } = await import('node-html-to-image');
  await nodeHtmlToImage({
    output: pngPath,
    html,
    type: 'png',
    puppeteerArgs: {
      defaultViewport: { width: 420, height: 720, deviceScaleFactor: 2 },
      args: ['--no-sandbox', '--font-render-hinting=none'],
    },
  });
  console.log('✓ PNG image:  ', pngPath);
  console.log('\nThis PNG matches what Android sends on WhatsApp.');
} catch (err) {
  if (err.code === 'ERR_MODULE_NOT_FOUND') {
    console.log('\nPNG step skipped (install once): npm install --save-dev node-html-to-image');
  } else {
    console.warn('\nPNG generation failed:', err.message);
    console.log('You can still open the HTML file above in a browser.');
  }
}

console.log(`
How the app creates the image (CustomerDetailScreen):
  1. PaymentReminderCard.jsx draws the card (340px white box, Urdu text, red amount)
  2. It sits off-screen inside <ViewShot ref={...} options={{ format: 'png' }}>
  3. On "WhatsApp reminder" tap → captureRef.current.capture() → PNG file
  4. Android: Intent sends PNG to whatsapp:// chat for customer phone (jid)
  5. iPhone (Expo Go): opens WhatsApp with text only (no image attach via URL)
`);
