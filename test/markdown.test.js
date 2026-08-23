'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const storedXssCorpus = require('./fixtures/stored-xss.json');
const { plainTextExcerpt, renderMarkdown } = require('../src/content/markdown');

function fragment(html) {
  return new JSDOM(`<!doctype html><body>${html}</body>`);
}

function assertNoMathMarkupInAttributes(input) {
  const html = renderMarkdown(input);
  const dom = fragment(html);
  try {
    assert.equal(dom.window.document.querySelectorAll('math').length, 0, input);
    assert.doesNotMatch(html, /\uE000HIVEBARMATH\d+TOKEN\uE001/u, input);
    for (const element of dom.window.document.querySelectorAll('*')) {
      for (const attribute of element.attributes) {
        assert.doesNotMatch(attribute.name, /^hb-math/i, input);
        assert.doesNotMatch(attribute.value, /<\/?(?:span|div|math)\b|hb-math/i, input);
      }
    }
  } finally {
    dom.window.close();
  }
}

test('renders useful Markdown while stripping active content and unsafe schemes', () => {
  const html = renderMarkdown(
    '# Hello\n\n<script>alert(1)</script>\n\n[secure](https://example.com) [plain](http://example.com) [bad](javascript:alert(1))',
  );

  assert.match(html, /<h1>Hello<\/h1>/);
  assert.match(html, /href="https:\/\/example\.com"/);
  assert.match(html, /rel="nofollow noopener noreferrer"/);
  assert.doesNotMatch(html, /<script/i);
  assert.doesNotMatch(html, /href="javascript:/i);
  assert.doesNotMatch(html, /href="http:\/\//i);
});

test('allows only HTTPS image sources and applies lazy loading', () => {
  const html = renderMarkdown('![safe](https://images.hive.blog/example.png) ![unsafe](http://example.com/a.png)');

  assert.match(html, /src="https:\/\/images\.hive\.blog\/example\.png"/);
  assert.match(html, /loading="lazy"/);
  assert.doesNotMatch(html, /src="http:\/\//i);
});

test('restores generated math only in text-node context', () => {
  const html = renderMarkdown('<a href="https://example.com/$x$" title="$x$">Body $y$</a>');
  const dom = fragment(html);
  try {
    const link = dom.window.document.querySelector('a');
    assert.ok(link);
    assert.equal(link.querySelectorAll('math').length, 1);
    assert.match(link.innerHTML, /class="hb-math hb-math--inline"/);
    assert.doesNotMatch(link.getAttribute('href') || '', /hb-math|<math|<span/i);
    assert.doesNotMatch(link.getAttribute('title') || '', /hb-math|<math|<span/i);
    assert.doesNotMatch(html, /\uE000HIVEBARMATH\d+TOKEN\uE001/u);
  } finally {
    dom.window.close();
  }
});

test('never restores math markup through sanitized link or image attributes', () => {
  const attributeContexts = [
    '[click](https://example.com "title $x$")',
    '![$x$](https://images.hive.blog/a.png)',
    '<a href="https://example.com/$x$">click</a>',
    '<img src="https://example.com/$x$.png">',
    '<a href="https://example.com/" title="$x$">x</a>',
    '<img src="https://example.com/a.png" alt="$x$">',
    '<a href="https://example.com/\\[x\\]">z</a>',
  ];

  for (const input of attributeContexts) assertNoMathMarkupInAttributes(input);
});

test('revalidates attribute values after math sentinels are neutralized', () => {
  const html = renderMarkdown('<a href="java$x$script:alert(1)">blocked</a>');
  const dom = fragment(html);
  try {
    const link = dom.window.document.querySelector('a');
    assert.ok(link);
    assert.equal(link.hasAttribute('href'), false);
    assert.doesNotMatch(html, /href="javascript:/i);
  } finally {
    dom.window.close();
  }
});

test('creates bounded plain-text excerpts', () => {
  assert.equal(plainTextExcerpt('**Hello** [world](https://example.com)', 20), 'Hello world');
  assert.equal(plainTextExcerpt('abcdefghijklmnopqrstuvwxyz', 10), 'abcdefghi…');
  assert.equal(plainTextExcerpt(null), '');
});

test('blocks the stored-XSS regression corpus in executable contexts', () => {
  for (const payload of storedXssCorpus) {
    const html = renderMarkdown(payload);
    const renderedTags = (html.match(/<[^>]+>/g) || []).join(' ');
    assert.doesNotMatch(
      html,
      /<(?:script|svg|math|iframe|object|embed|form|input|button|style|link|meta|video|audio|source)\b/i,
      payload,
    );
    assert.doesNotMatch(renderedTags, /\son[a-z]+\s*=/i, payload);
    assert.doesNotMatch(
      renderedTags,
      /(?:href|src)\s*=\s*["'](?:javascript|vbscript|data|file|http):/i,
      payload,
    );
    assert.doesNotMatch(renderedTags, /(?:href|src)\s*=\s*["']\/\//i, payload);
  }
});
