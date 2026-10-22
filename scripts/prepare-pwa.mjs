import { readFile, writeFile } from 'node:fs/promises';

const indexPath = new URL('../dist-web/index.html', import.meta.url);
let html = await readFile(indexPath, 'utf8');

const tags = [
  '<link rel="manifest" href="/manifest.json">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
  '<meta name="apple-mobile-web-app-title" content="余量">',
  '<link rel="apple-touch-icon" href="/icons/icon-192.png">',
].filter((tag) => !html.includes(tag));

if (tags.length) {
  html = html.replace('</head>', `  ${tags.join('\n  ')}\n</head>`);
  await writeFile(indexPath, html, 'utf8');
}

console.log('PWA metadata prepared');
