import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const srcDir = new URL('../src/', import.meta.url);
const sources = readdirSync(srcDir)
  .filter((name) => name.endsWith('.js'))
  .map((name) => ({ name, text: readFileSync(new URL(name, srcDir), 'utf8') }));
const UI_MODULES = new Set(['main.js', 'view.js', 'dialogs.js']);

test('shipped code has no eval, Function constructor, innerHTML or console.log', () => {
  assert.ok(sources.length >= 10);
  for (const { name, text } of sources) {
    assert.doesNotMatch(text, /\beval\s*\(|\bnew Function\b|\.innerHTML\b|\.outerHTML\b|console\.log/, name);
  }
});

test('only storage.js touches localStorage and only the UI modules touch the page', () => {
  for (const { name, text } of sources) {
    if (name !== 'storage.js') assert.doesNotMatch(text, /localStorage/, name);
    if (!UI_MODULES.has(name)) assert.doesNotMatch(text, /\b(?:document|window)\s*\./, name);
  }
});

test('the page loads only local files', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const loaded = [...html.matchAll(/<(?:script|link|img)\b[^>]*?\b(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(loaded.includes('style.css') && loaded.includes('src/main.js'));
  for (const url of loaded) assert.doesNotMatch(url, /^(?:https?:)?\/\//, url);
  const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /@import|url\(/);
});
