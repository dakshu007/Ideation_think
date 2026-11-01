import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePlayLink, optInUrl, storeUrl } from './playlink.ts';

test('parses the web opt-in link', () => {
  assert.equal(parsePlayLink('https://play.google.com/apps/testing/com.yourname.habits'), 'com.yourname.habits');
  assert.equal(parsePlayLink('  https://play.google.com/apps/testing/com.a.b/  '), 'com.a.b');
});

test('parses the Play Store link', () => {
  assert.equal(parsePlayLink('https://play.google.com/store/apps/details?id=com.x.y&hl=en'), 'com.x.y');
});

test('accepts a bare package name', () => {
  assert.equal(parsePlayLink('in.dev.my_app2'), 'in.dev.my_app2');
});

test('rejects everything else', () => {
  for (const bad of [
    '',
    'hello',
    'com',
    'https://evil.com/apps/testing/com.a.b',
    'https://play.google.com/apps/internaltest/4700000000000',
    'https://play.google.com/store/apps/details?id=not a package',
    'javascript:alert(1)',
    '1com.bad.start',
  ]) {
    assert.equal(parsePlayLink(bad), null, bad);
  }
});

test('builds links', () => {
  assert.equal(optInUrl('com.a.b'), 'https://play.google.com/apps/testing/com.a.b');
  assert.equal(storeUrl('com.a.b'), 'https://play.google.com/store/apps/details?id=com.a.b');
});
