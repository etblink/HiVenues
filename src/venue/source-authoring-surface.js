'use strict';

const express = require('express');
const foundation = require('./reference/source-authoring-surface-core');
const { createSourceAuthoringSession } = require('./source-authoring-session');
const {
  DEFAULT_VENUE_SOURCE_FILENAME,
  loadDeploymentAgnosticVenueSourceFile,
  serializeDeploymentAgnosticVenueSourceFile,
} = require('./source-file');

const QOL_SCRIPT_SUFFIX = '/qol.js';
const SAFE_SOURCE_SAVE_PENDING = 'Keep or undo your preview changes before saving the venue file.';
const STUDIO_PROPOSAL_SUFFIX = '/studio-proposal';
const MEDIA_PROPOSAL_SUFFIX = '/media-proposal';
const SAFE_STUDIO_EDIT_ERROR = 'We could not preview those changes. Check the values and try again; your current draft is unchanged.';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function mediaLabel(pointer) {
  if (pointer === '/venuePackage/brand/logo/src') return 'Venue logo';
  if (pointer === '/venuePackage/home/hero/image/src') return 'Welcome image';
  const gallery = pointer.match(/^\/venuePackage\/home\/gallery\/items\/(\d+)\/src$/);
  if (gallery) return `Gallery image ${Number(gallery[1]) + 1}`;
  return 'Venue image';
}

function mediaSection(pointer) {
  if (pointer === '/venuePackage/brand/logo/src') return 'Brand';
  if (pointer === '/venuePackage/home/hero/image/src') return 'Welcome';
  if (pointer.startsWith('/venuePackage/home/gallery/')) return 'Gallery';
  return null;
}

function mediaControls(session, editorPath) {
  if (!session || typeof session.listEditableFields !== 'function') return new Map();
  const groups = new Map();
  for (const field of session.listEditableFields()) {
    if (field.controlKind !== 'asset-path') continue;
    const section = mediaSection(field.pointer);
    if (!section) continue;
    if (!groups.has(section)) groups.set(section, []);
    groups.get(section).push(field);
  }

  const markup = new Map();
  for (const [section, fields] of groups) {
    markup.set(section, `<div class="studio-media" data-studio-media="${escapeHtml(section.toLowerCase())}">
      <div class="studio-media__intro"><strong>${section === 'Brand' ? 'Brand media' : section === 'Welcome' ? 'Hero media' : 'Gallery media'}</strong><span>Use images that belong to this venue release. Changes stay in preview until you keep them.</span></div>
      <div class="studio-media__grid">${fields.map((field) => `<form class="field studio-media-field" method="post" action="${editorPath}${MEDIA_PROPOSAL_SUFFIX}" data-media-pointer="${escapeHtml(field.pointer)}"><input type="hidden" name="pointer" value="${escapeHtml(field.pointer)}"><label>${escapeHtml(mediaLabel(field.pointer))}</label><div class="studio-media__preview"><img src="${escapeHtml(field.value)}" alt="" loading="lazy" decoding="async"><div><input name="value" type="text" value="${escapeHtml(field.value)}" required maxlength="240" aria-label="${escapeHtml(mediaLabel(field.pointer))} image path"><small>Choose an image already included with this venue. Use a path beginning with /.</small></div></div><button type="submit">Preview image</button></form>`).join('')}</div>
    </div>`);
  }
  return markup;
}

function insertSectionMarkup(html, heading, markup) {
  if (!markup) return html;
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const needle = new RegExp(`(<section id="section-[^"]+" class="section"><h2>${escapedHeading}</h2>)`);
  if (needle.test(html)) return html.replace(needle, `$1${markup}`);
  if (heading !== 'Brand') return html;
  return html
    .replace(
      '<nav class="nav" aria-label="Choose what to customize">',
      '<nav class="nav" aria-label="Choose what to customize"><a href="#section-brand-media">Brand</a>',
    )
    .replace(
      '<div class="editor">',
      `<div class="editor"><section id="section-brand-media" class="section"><h2>Brand</h2>${markup}<div class="fields"></div></section>`,
    );
}

const QOL_SCRIPT = `'use strict';
(() => {
  const sections = Array.from(document.querySelectorAll('.section[id]'));
  const nav = document.querySelector('.nav');
  const links = Array.from(document.querySelectorAll('.nav a[href^="#section-"]'));
  if (!sections.length || !nav || !links.length) return;

  const editorPath = location.pathname;
  const preferredLabels = [
    'Basics', 'Brand', 'Colors', 'Welcome', 'Gallery', 'Updates', 'Programs',
    'Equipment', 'Getting started', 'Visit', 'Community', 'Contact & visiting',
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

  const stageDefinitions = [
    { id: 'brand', label: 'Brand', sections: ['Basics', 'Brand', 'Colors', 'Welcome', 'Gallery'] },
    { id: 'page', label: 'Page', sections: ['Updates', 'Programs', 'Equipment', 'Getting started', 'Visit', 'Community'] },
    { id: 'details', label: 'Details', sections: ['Contact & visiting', 'New member wording', 'Search preview', 'Venue'] },
    { id: 'review', label: 'Review', sections: [] },
  ];
  const sectionStage = new Map();
  for (const stage of stageDefinitions) for (const label of stage.sections) sectionStage.set(label, stage.id);

  const stageNav = document.querySelector('[data-studio-stage-nav]');
  const stageButtons = Array.from(document.querySelectorAll('button[data-studio-stage]'));
  const reviewPanel = document.querySelector('[data-studio-review]');
  const editor = document.querySelector('.editor');
  const preview = document.querySelector('.preview');
  const viewButtons = Array.from(document.querySelectorAll('button[data-studio-view]'));
  const sectionIds = new Set(sections.map((section) => section.id));
  const storageKey = location.pathname + ':active-section';
  const stageStorageKey = location.pathname + ':active-stage';
  const readStored = (key) => { try { return sessionStorage.getItem(key); } catch { return null; } };
  const writeStored = (key, value) => { try { sessionStorage.setItem(key, value); } catch { /* Progressive enhancement remains optional. */ } };

  function stageForSection(sectionId) {
    const label = links.find((link) => link.hash === '#' + sectionId)?.textContent.trim();
    return sectionStage.get(label) || 'details';
  }

  function linksForStage(stageId) {
    return links.filter((link) => stageForSection(link.hash.slice(1)) === stageId);
  }

  function showSection(requestedId, focusHeading = false) {
    const activeStage = document.documentElement.dataset.studioActiveStage || 'brand';
    const stageLinks = linksForStage(activeStage);
    const fallbackId = stageLinks[0]?.hash.slice(1) || sections[0].id;
    const activeId = sectionIds.has(requestedId) && stageForSection(requestedId) === activeStage ? requestedId : fallbackId;
    for (const section of sections) section.dataset.qolActive = String(section.id === activeId);
    for (const link of links) {
      if (link.hash === '#' + activeId) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    writeStored(storageKey, activeId);
    document.documentElement.classList.add('qol-sections');
    if (focusHeading) {
      const heading = document.getElementById(activeId)?.querySelector('h2');
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    }
  }

  function showStage(stageId, focus = false) {
    const stage = stageDefinitions.find((entry) => entry.id === stageId) || stageDefinitions[0];
    document.documentElement.dataset.studioActiveStage = stage.id;
    writeStored(stageStorageKey, stage.id);
    for (const button of stageButtons) button.setAttribute('aria-current', String(button.dataset.studioStage === stage.id));
    for (const link of links) link.hidden = stage.id === 'review' || stageForSection(link.hash.slice(1)) !== stage.id;
    nav.hidden = stage.id === 'review';
    if (reviewPanel) reviewPanel.hidden = stage.id !== 'review';
    if (editor) editor.hidden = stage.id === 'review';
    if (stage.id !== 'review') {
      const remembered = readStored(storageKey);
      showSection(remembered && stageForSection(remembered) === stage.id ? remembered : linksForStage(stage.id)[0]?.hash.slice(1), focus);
    }
    if (focus && stageNav) stageNav.focus({ preventScroll: true });
  }

  for (const button of stageButtons) button.addEventListener('click', () => showStage(button.dataset.studioStage, false));
  for (const link of links) {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const activeId = link.hash.slice(1);
      showSection(activeId, true);
      history.replaceState(null, '', '#' + activeId);
    });
  }

  async function previewStage() {
    const stageId = document.documentElement.dataset.studioActiveStage || 'brand';
    const stageSections = sections.filter((section) => {
      const heading = section.querySelector('h2')?.textContent.trim() || '';
      return sectionStage.get(heading) === stageId;
    });
    const params = new URLSearchParams();
    for (const form of stageSections.flatMap((section) => Array.from(section.querySelectorAll('form.field')))) {
      const pointer = form.querySelector('input[name="pointer"]')?.value;
      const control = form.querySelector('[name="value"]');
      if (!pointer || !control) continue;
      params.append('pointer', pointer);
      params.append('value', control.value);
    }
    if (!params.getAll('pointer').length) return;
    const post = document.createElement('form');
    post.method = 'post';
    post.action = editorPath + '${STUDIO_PROPOSAL_SUFFIX}';
    post.hidden = true;
    for (const [name, value] of params) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      post.appendChild(input);
    }
    document.body.appendChild(post);
    post.submit();
  }

  for (const section of sections) {
    for (const button of section.querySelectorAll('form.field > button[type="submit"]')) button.classList.add('studio-field-fallback');
    const heading = section.querySelector('h2')?.textContent.trim() || '';
    const stageId = sectionStage.get(heading);
    if (!stageId) continue;
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'studio-preview-stage';
    action.textContent = 'Preview ' + (stageDefinitions.find((entry) => entry.id === stageId)?.label || 'changes');
    action.addEventListener('click', previewStage);
    section.appendChild(action);
  }

  function setView(view) {
    document.documentElement.dataset.studioActiveView = view === 'preview' ? 'preview' : 'edit';
    for (const button of viewButtons) button.setAttribute('aria-pressed', String(button.dataset.studioView === document.documentElement.dataset.studioActiveView));
    if (view === 'preview' && preview) preview.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  for (const button of viewButtons) button.addEventListener('click', () => setView(button.dataset.studioView));

  const initialSection = location.hash.slice(1) || readStored(storageKey);
  const initialStage = initialSection && sectionIds.has(initialSection) ? stageForSection(initialSection) : readStored(stageStorageKey) || 'brand';
  showStage(initialStage, false);
  setView('edit');
})();
`;

const QOL_STYLE = `
    html.qol-sections .section { display: none; }
    html.qol-sections .section[data-qol-active="true"] { display: block; }
    html.qol-sections .nav a[hidden] { display: none !important; }
    html.qol-sections .nav a[aria-current="page"] { background: #292524; border-color: #292524; color: #fff; }
    html.qol-sections .nav { margin-bottom: 4px; }
    html.qol-sections .item-edit-group { border-top: 1px solid #e7e5e4; padding-top: 10px; }
    html.qol-sections .item-edit-group summary { display: flex; width: 100%; align-items: center; justify-content: space-between; background: #fafaf9; color: #292524; }
    html.qol-sections .item-edit-group summary::after { content: 'Show'; color: #57534e; font-size: .85rem; font-weight: 700; }
    html.qol-sections .item-edit-group[open] summary::after { content: 'Hide'; }
    html.qol-sections .item-edit-group:not([open]) > .item-edit-fields { display: none; }
    html.qol-sections .item-edit-group[open] > .item-edit-fields { display: grid; gap: 12px; margin-top: 12px; }
    html.qol-sections .studio-field-fallback { display: none; }
    .studio-topline { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin: 0 0 12px; color: #57534e; font-size: .92rem; }
    .studio-topline strong { color: #292524; }
    .studio-stage-nav { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: 12px 0; }
    .studio-stage-nav button { min-width: 0; background: white; color: #292524; border-color: #d6d3d1; text-align: left; display: flex; align-items: center; gap: 9px; }
    .studio-stage-nav button[aria-current="true"] { background: #292524; color: white; border-color: #292524; }
    .studio-stage-nav__number { display: inline-grid; place-items: center; flex: 0 0 28px; width: 28px; height: 28px; border-radius: 999px; border: 1px solid currentColor; font-size: .8rem; font-weight: 800; }
    .studio-view-toggle { display: none; grid-template-columns: 1fr 1fr; gap: 6px; padding: 5px; background: white; border: 1px solid #d6d3d1; border-radius: 12px; margin: 10px 0; }
    .studio-view-toggle button { background: transparent; color: #292524; border-color: transparent; }
    .studio-view-toggle button[aria-pressed="true"] { background: #292524; color: white; }
    .source-save { min-height: 44px; display: inline-flex; align-items: center; border: 1px solid #292524; border-radius: 10px; padding: 10px 14px; background: white; color: #292524; font-weight: 700; text-decoration: none; }
    .source-save:focus-visible { outline: 3px solid currentColor; outline-offset: 3px; }
    .source-save--disabled { border-color: #a8a29e; color: #57534e; background: #f5f5f4; }
    .studio-workflow { background: #fff; border: 1px solid #d6d3d1; border-radius: 14px; padding: 10px 12px; }
    .studio-workflow__state { display: flex; gap: 8px; flex-wrap: wrap; margin: 0; padding: 0; list-style: none; }
    .studio-workflow__state li { display: inline-flex; align-items: center; gap: 6px; color: #57534e; font-size: .86rem; }
    .studio-workflow__state li::before { content: ''; width: 8px; height: 8px; border-radius: 999px; background: #a8a29e; }
    .studio-workflow__state li[data-active="true"] { color: #1c1917; font-weight: 800; }
    .studio-workflow__state li[data-active="true"]::before { background: #1c1917; }
    .studio-media { border: 1px solid #e7e5e4; border-radius: 14px; padding: 12px; margin-bottom: 14px; background: #fafaf9; }
    .studio-media__intro { display: grid; gap: 3px; margin-bottom: 12px; }
    .studio-media__intro span { color: #57534e; font-size: .9rem; line-height: 1.45; }
    .studio-media__grid { display: grid; gap: 12px; }
    .studio-media-field { border-top: 0 !important; padding-top: 0 !important; }
    .studio-media__preview { display: grid; grid-template-columns: 92px minmax(0, 1fr); align-items: center; gap: 12px; }
    .studio-media__preview img { width: 92px; height: 72px; border-radius: 10px; object-fit: cover; border: 1px solid #d6d3d1; background: white; }
    .studio-preview-stage { width: 100%; margin-top: 14px; }
    .studio-review { background: white; border: 1px solid #d6d3d1; border-radius: 16px; padding: 18px; margin-bottom: 14px; }
    .studio-review h2 { margin: 0 0 6px; font-size: 1.3rem; }
    .studio-review p { margin: 0 0 12px; color: #57534e; }
    .studio-review__steps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    .studio-review__steps div { border: 1px solid #e7e5e4; border-radius: 12px; padding: 12px; }
    .studio-review__steps strong { display: block; margin-bottom: 4px; }
    .nav { flex-wrap: wrap !important; overflow: visible !important; }
    @media (max-width: 900px) {
      .studio-view-toggle { display: grid; position: sticky; top: 8px; z-index: 20; box-shadow: 0 8px 24px rgba(28,25,23,.12); }
      html[data-studio-active-view="edit"] .preview { display: none; }
      html[data-studio-active-view="preview"] .editor, html[data-studio-active-view="preview"] .studio-review { display: none !important; }
      html[data-studio-active-view="preview"] .preview { display: block; }
      .studio-stage-nav { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .studio-review__steps { grid-template-columns: 1fr; }
    }
    @media (max-width: 560px) {
      html.qol-sections .preview { width: calc(100% + 24px); margin-left: -12px; max-width: none; border-left: 0; border-right: 0; border-radius: 0; }
      .studio-stage-nav { grid-template-columns: 1fr 1fr; }
      .studio-stage-nav button { font-size: .9rem; padding: 8px 10px; }
      .studio-media__preview { grid-template-columns: 68px minmax(0, 1fr); }
      .studio-media__preview img { width: 68px; height: 60px; }
    }
`;

function progressiveScriptPath(editorPath) {
  return `${editorPath}${QOL_SCRIPT_SUFFIX}`;
}

function venueSourceDownloadPath(editorPath) {
  return `${editorPath}/${DEFAULT_VENUE_SOURCE_FILENAME}`;
}

function studioStatusMarkup({ dirty = false, state = '' } = {}) {
  const kept = !dirty && (state === 'ACCEPTED' || state === 'CLEAN');
  return `<div class="studio-workflow" role="group" aria-label="Editing status"><ul class="studio-workflow__state"><li data-active="${String(!dirty)}">Draft ${kept ? 'ready' : 'base'}</li><li data-active="${String(dirty)}">Preview ${dirty ? 'has changes' : 'clear'}</li><li data-active="false">Venue file saved when downloaded</li></ul></div>`;
}

function stageNavMarkup() {
  return `<nav class="studio-stage-nav" data-studio-stage-nav aria-label="Venue Studio steps" tabindex="-1"><button type="button" data-studio-stage="brand"><span class="studio-stage-nav__number">1</span><span>Brand</span></button><button type="button" data-studio-stage="page"><span class="studio-stage-nav__number">2</span><span>Page</span></button><button type="button" data-studio-stage="details"><span class="studio-stage-nav__number">3</span><span>Details</span></button><button type="button" data-studio-stage="review"><span class="studio-stage-nav__number">4</span><span>Review</span></button></nav>`;
}

function viewToggleMarkup() {
  return `<div class="studio-view-toggle" role="group" aria-label="Editor view"><button type="button" data-studio-view="edit" aria-pressed="true">Edit</button><button type="button" data-studio-view="preview" aria-pressed="false">Preview venue</button></div>`;
}

function reviewMarkup() {
  return `<section class="studio-review" data-studio-review hidden><h2>Review your venue</h2><p>The preview is the real application renderer. Nothing here publishes or deploys the venue.</p><div class="studio-review__steps"><div><strong>1. Check the preview</strong><span>Review the venue on desktop and mobile.</span></div><div><strong>2. Keep preview changes</strong><span>Keep only the changes you want in this draft.</span></div><div><strong>3. Save the venue file</strong><span>Download the durable venue source when the draft is ready.</span></div></div></section>`;
}

function enhanceSourceAuthoringHtml(html, editorPath, { dirty = false, state = '', session = null, notice = null } = {}) {
  const scriptPath = progressiveScriptPath(editorPath);
  const sourceFilePath = venueSourceDownloadPath(editorPath);
  const saveControl = dirty
    ? '<span class="source-save source-save--disabled" aria-disabled="true">Keep changes to save</span>'
    : `<a class="source-save" href="${sourceFilePath}" download="${DEFAULT_VENUE_SOURCE_FILENAME}">Save venue file</a>`;
  const media = mediaControls(session, editorPath);
  let enhanced = String(html)
    .replace('<html lang="en">', '<html lang="en" data-qol-progressive="section-picker" data-studio-active-view="edit" data-studio-active-stage="brand">')
    .replace('<h1>Customize your venue</h1>', '<p class="studio-topline"><strong>Venue Studio</strong><span>Shape the brand, page, and venue details with a live preview.</span></p><h1>Customize your venue</h1>')
    .replace(
      'Change the words, details, and colors guests will see. Preview first, then keep or undo your changes. Hosting comes later—nothing on this screen publishes or deploys your venue.',
      'Make this venue recognizably yours. Work through four simple steps, preview the real venue as you go, then keep and save only what you want. Hosting comes later—nothing on this screen publishes or deploys your venue.',
    )
    .replace('aria-label="Venue customization sections"', 'aria-label="Choose what to customize"')
    .replaceAll('Preview this change', 'Preview')
    .replace('Keep changes</button>', 'Keep changes in draft</button>')
    .replace(
      '</form></div><nav class="nav" aria-label="Choose what to customize">',
      `</form>${saveControl}</div>${studioStatusMarkup({ dirty, state })}${viewToggleMarkup()}${stageNavMarkup()}<nav class="nav" aria-label="Choose what to customize">`,
    )
    .replace('<div class="layout"><div class="editor">', `<div class="layout"><div>${reviewMarkup()}<div class="editor">`)
    .replace('</div><section class="preview" aria-label="Venue preview">', '</div></div><section class="preview" aria-label="Venue preview">')
    .replace('</style>', `${QOL_STYLE}</style>`)
    .replace('</head>', `<script defer src="${scriptPath}"></script></head>`);

  enhanced = insertSectionMarkup(enhanced, 'Brand', media.get('Brand'));
  enhanced = insertSectionMarkup(enhanced, 'Welcome', media.get('Welcome'));
  enhanced = insertSectionMarkup(enhanced, 'Gallery', media.get('Gallery'));
  if (notice?.text) {
    const noticeClass = notice.kind === 'error' ? 'notice studio-notice studio-notice--error' : 'notice studio-notice';
    enhanced = enhanced.replace('<div class="actions">', `<p class="${noticeClass}" role="status">${escapeHtml(notice.text)}</p><div class="actions">`);
  }
  return enhanced;
}

function renderSourceAuthoringDocument(options) {
  return enhanceSourceAuthoringHtml(
    foundation.renderSourceAuthoringDocument(options),
    options.editorPath,
    {
      dirty: options.session?.status?.().dirty === true,
      state: options.session?.status?.().state || '',
      session: options.session,
    },
  );
}

function createOfflineSourceAuthoringSurface(options = {}) {
  const surface = foundation.createOfflineSourceAuthoringSurface(options);
  const router = express.Router();
  const scriptPath = progressiveScriptPath(surface.editorPath);
  const sourceFilePath = venueSourceDownloadPath(surface.editorPath);
  let studioNotice = null;

  router.use(express.urlencoded({ extended: false, limit: '64kb' }));
  router.get(scriptPath, (req, res) => {
    res.type('application/javascript').send(QOL_SCRIPT);
  });
  router.get(sourceFilePath, (req, res) => {
    if (surface.session.status().dirty) {
      res.status(409).type('text').send(SAFE_SOURCE_SAVE_PENDING);
      return;
    }
    res
      .attachment(DEFAULT_VENUE_SOURCE_FILENAME)
      .type('application/json')
      .send(serializeDeploymentAgnosticVenueSourceFile(surface.session.acceptedSource));
  });

  function normalizeForField(field, value) {
    return field.controlKind === 'datetime-offset' ? foundation.normalizeDateTimeInput(value) : value;
  }

  function applyStudioProposal(pointersInput, valuesInput) {
    const pointers = toArray(pointersInput);
    const values = toArray(valuesInput);
    if (!pointers.length || pointers.length !== values.length) throw new Error('Studio proposal is incomplete');
    const probe = createSourceAuthoringSession(surface.session.proposalDraft);
    const edits = [];
    for (let index = 0; index < pointers.length; index += 1) {
      const pointer = String(pointers[index] ?? '');
      const field = probe.listEditableFields().find((entry) => entry.pointer === pointer);
      if (!field) throw new Error('Field unavailable');
      const value = normalizeForField(field, values[index]);
      probe.edit(pointer, value);
      edits.push({ pointer, value });
    }
    for (const edit of edits) surface.session.edit(edit.pointer, edit.value);
  }

  router.post(`${surface.editorPath}${STUDIO_PROPOSAL_SUFFIX}`, (req, res) => {
    try {
      applyStudioProposal(req.body.pointer, req.body.value);
      studioNotice = { kind: 'success', text: 'Preview updated. Review the venue, then keep the changes you want.' };
    } catch {
      studioNotice = { kind: 'error', text: SAFE_STUDIO_EDIT_ERROR };
    }
    res.redirect(303, surface.editorPath);
  });

  router.post(`${surface.editorPath}${MEDIA_PROPOSAL_SUFFIX}`, (req, res) => {
    try {
      applyStudioProposal(req.body.pointer, req.body.value);
      studioNotice = { kind: 'success', text: 'Image updated in preview. Keep the change when it looks right.' };
    } catch {
      studioNotice = { kind: 'error', text: SAFE_STUDIO_EDIT_ERROR };
    }
    res.redirect(303, surface.editorPath);
  });

  router.use((req, res, next) => {
    if (req.method !== 'GET' || req.path !== surface.editorPath) return next();
    const send = res.send.bind(res);
    res.send = (body) => {
      const notice = studioNotice;
      studioNotice = null;
      return send(typeof body === 'string'
        ? enhanceSourceAuthoringHtml(body, surface.editorPath, {
          dirty: surface.session.status().dirty,
          state: surface.session.status().state,
          session: surface.session,
          notice,
        })
        : body);
    };
    return next();
  });
  router.use(surface.router);

  return Object.freeze({
    ...surface,
    router,
    sourceFilePath,
  });
}

function createOfflineSourceAuthoringSurfaceFromFile({
  sourceFilename,
  ...options
} = {}) {
  const sourceInput = loadDeploymentAgnosticVenueSourceFile(sourceFilename);
  return createOfflineSourceAuthoringSurface({
    ...options,
    sourceInput,
  });
}

module.exports = {
  ...foundation,
  createOfflineSourceAuthoringSurface,
  createOfflineSourceAuthoringSurfaceFromFile,
  enhanceSourceAuthoringHtml,
  progressiveScriptPath,
  renderSourceAuthoringDocument,
  SAFE_SOURCE_SAVE_PENDING,
  SAFE_STUDIO_EDIT_ERROR,
  venueSourceDownloadPath,
};
