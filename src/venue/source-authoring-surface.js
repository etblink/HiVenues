'use strict';

const express = require('express');
const foundation = require('./reference/source-authoring-surface-core');

const QOL_SCRIPT_SUFFIX = '/qol.js';
const QOL_SCRIPT = `'use strict';
(() => {
  const sections = Array.from(document.querySelectorAll('.section[id]'));
  const nav = document.querySelector('.nav');
  const links = Array.from(document.querySelectorAll('.nav a[href^="#section-"]'));
  if (!sections.length || !nav || !links.length) return;

  const preferredLabels = [
    'Basics', 'Contact & visiting', 'Brand', 'Colors', 'Welcome', 'Updates',
    'Programs', 'Equipment', 'Getting started', 'Visit', 'Community', 'Gallery',
    'New member wording', 'Search preview', 'Venue',
  ];
  const rank = new Map(preferredLabels.map((label, index) => [label, index]));
  links
    .sort((left, right) => (rank.get(left.textContent.trim()) ?? 999) - (rank.get(right.textContent.trim()) ?? 999))
    .forEach((link) => nav.appendChild(link));

  function groupStructuredFields() {
    for (const section of sections) {
      const heading = section.querySelector('h2')?.textContent.trim();
      if (heading !== 'Programs' && heading !== 'Equipment') continue;
      const collection = section.querySelector('.collection[data-collection-pointer]');
      const fields = section.querySelector('.fields');
      if (!collection || !fields) continue;
      const names = Array.from(collection.querySelectorAll('.collection-item strong')).map((node) => node.textContent.trim());
      const itemPattern = heading === 'Programs' ? /^Program (\\d+) / : /^Equipment (\\d+) /;
      const grouped = new Map();
      for (const form of Array.from(fields.querySelectorAll(':scope > form.field'))) {
        const label = form.querySelector('label')?.textContent.trim() || '';
        const match = label.match(itemPattern);
        if (!match) continue;
        const index = Number(match[1]) - 1;
        if (!grouped.has(index)) grouped.set(index, []);
        grouped.get(index).push(form);
      }
      for (const [index, forms] of grouped) {
        const details = document.createElement('details');
        details.className = 'item-edit-group';
        const summary = document.createElement('summary');
        const noun = heading === 'Programs' ? 'program' : 'equipment item';
        summary.textContent = 'Edit ' + (names[index] || noun + ' ' + String(index + 1));
        const body = document.createElement('div');
        body.className = 'item-edit-fields';
        for (const form of forms) body.appendChild(form);
        details.append(summary, body);
        fields.appendChild(details);
      }
      if (grouped.size) section.dataset.qolStructured = 'item-disclosure';
    }
  }

  groupStructuredFields();

  const sectionIds = new Set(sections.map((section) => section.id));
  const storageKey = location.pathname + ':active-section';
  const readStored = () => {
    try { return sessionStorage.getItem(storageKey); } catch { return null; }
  };
  const writeStored = (value) => {
    try { sessionStorage.setItem(storageKey, value); } catch { /* Navigation still works without storage. */ }
  };
  const basicsLink = links.find((link) => link.textContent.trim() === 'Basics');
  const fallbackId = basicsLink?.hash.slice(1) || sections[0].id;

  function showSection(requestedId, focusHeading = false) {
    const activeId = sectionIds.has(requestedId) ? requestedId : fallbackId;
    for (const section of sections) section.dataset.qolActive = String(section.id === activeId);
    for (const link of links) {
      if (link.hash === '#' + activeId) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    writeStored(activeId);
    document.documentElement.classList.add('qol-sections');
    if (focusHeading) {
      const heading = document.getElementById(activeId)?.querySelector('h2');
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    }
  }

  showSection(readStored() || location.hash.slice(1) || fallbackId);
  for (const link of links) {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const activeId = link.hash.slice(1);
      showSection(activeId, true);
      history.replaceState(null, '', '#' + activeId);
    });
  }
})();
`;

const QOL_STYLE = `
    html.qol-sections .section { display: none; }
    html.qol-sections .section[data-qol-active="true"] { display: block; }
    html.qol-sections .nav a[aria-current="page"] { background: #292524; border-color: #292524; color: #fff; }
    html.qol-sections .nav { margin-bottom: 4px; }
    html.qol-sections .item-edit-group { border-top: 1px solid #e7e5e4; padding-top: 10px; }
    html.qol-sections .item-edit-group summary { display: flex; width: 100%; align-items: center; justify-content: space-between; background: #fafaf9; color: #292524; }
    html.qol-sections .item-edit-group summary::after { content: 'Show'; color: #57534e; font-size: .85rem; font-weight: 700; }
    html.qol-sections .item-edit-group[open] summary::after { content: 'Hide'; }
    html.qol-sections .item-edit-group:not([open]) > .item-edit-fields { display: none; }
    html.qol-sections .item-edit-group[open] > .item-edit-fields { display: grid; gap: 12px; margin-top: 12px; }
    @media (max-width: 560px) {
      html.qol-sections .preview { width: calc(100% + 24px); margin-left: -12px; max-width: none; border-left: 0; border-right: 0; border-radius: 0; }
    }
`;

function progressiveScriptPath(editorPath) {
  return `${editorPath}${QOL_SCRIPT_SUFFIX}`;
}

function enhanceSourceAuthoringHtml(html, editorPath) {
  const scriptPath = progressiveScriptPath(editorPath);
  return String(html)
    .replace('<html lang="en">', '<html lang="en" data-qol-progressive="section-picker">')
    .replace(
      'Change the words, details, and colors guests will see. Preview first, then keep or undo your changes. Hosting comes later—nothing on this screen publishes or deploys your venue.',
      'Choose what you want to change, work on one section at a time, and check the preview as you go. Hosting comes later—nothing on this screen publishes or deploys your venue.',
    )
    .replace('aria-label="Venue customization sections"', 'aria-label="Choose what to customize"')
    .replaceAll('Preview this change', 'Preview')
    .replace('</style>', `${QOL_STYLE}</style>`)
    .replace('</head>', `<script defer src="${scriptPath}"></script></head>`);
}

function renderSourceAuthoringDocument(options) {
  return enhanceSourceAuthoringHtml(
    foundation.renderSourceAuthoringDocument(options),
    options.editorPath,
  );
}

function createOfflineSourceAuthoringSurface(options = {}) {
  const surface = foundation.createOfflineSourceAuthoringSurface(options);
  const router = express.Router();
  const scriptPath = progressiveScriptPath(surface.editorPath);

  router.get(scriptPath, (req, res) => {
    res.type('application/javascript').send(QOL_SCRIPT);
  });
  router.use((req, res, next) => {
    if (req.method !== 'GET' || req.path !== surface.editorPath) return next();
    const send = res.send.bind(res);
    res.send = (body) => send(typeof body === 'string'
      ? enhanceSourceAuthoringHtml(body, surface.editorPath)
      : body);
    return next();
  });
  router.use(surface.router);

  return Object.freeze({
    ...surface,
    router,
  });
}

module.exports = {
  ...foundation,
  createOfflineSourceAuthoringSurface,
  enhanceSourceAuthoringHtml,
  progressiveScriptPath,
  renderSourceAuthoringDocument,
};
