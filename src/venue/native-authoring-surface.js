'use strict';

const { createHash } = require('node:crypto');
const express = require('express');
const { createVisualAuthoringSession } = require('./visual-authoring-session');

const DEFAULT_EDITOR_PATH = '/__hive_venues/native-authoring';
const SAFE_PREVIEW_ERROR = 'The preview is temporarily unavailable. The accepted venue remains unchanged.';
const SAFE_EDIT_ERROR = 'That change could not be previewed. The accepted venue remains unchanged.';
const SAFE_APPLY_ERROR = 'These changes could not be applied. The accepted venue remains unchanged.';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function humanizeSegment(segment) {
  return segment
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (value) => value.toUpperCase());
}

function fieldLabel(pointer) {
  const exact = {
    '/venueContext/displayName': 'Venue name',
    '/venueContext/business/address': 'Address',
    '/venueContext/business/phone': 'Phone',
    '/venueContext/business/hours': 'Hours',
    '/venueContext/business/websiteUrl': 'Website',
    '/venueContext/business/mapUrl': 'Map link',
    '/venuePackage/brand/logo/src': 'Logo image path',
    '/venuePackage/seo/defaultDescription': 'Search description',
    '/venuePackage/home/hero/lede': 'Hero introduction',
    '/venuePackage/home/hero/footnote': 'Hero note',
    '/venuePackage/home/hero/image/src': 'Hero image path',
    '/venuePackage/home/hero/image/alt': 'Hero image alternative text',
    '/venuePackage/home/hero/image/caption': 'Hero image caption',
    '/venuePackage/onboarding/operatorNoun': 'Venue noun',
    '/venuePackage/onboarding/staffRole': 'Staff role',
  };
  if (exact[pointer]) return exact[pointer];

  const gallery = pointer.match(/^\/venuePackage\/home\/gallery\/items\/(\d+)\/(src|alt|caption)$/);
  if (gallery) {
    const suffix = {
      src: 'image path',
      alt: 'alternative text',
      caption: 'caption',
    }[gallery[2]];
    return `Gallery item ${Number(gallery[1]) + 1} ${suffix}`;
  }

  const segment = pointer.split('/').filter(Boolean).at(-1) || 'field';
  return humanizeSegment(segment);
}

function sectionLabel(section) {
  return section
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function previewCoverage(section) {
  if (section === 'onboarding') {
    return 'Used on onboarding surfaces; editable here but not visible in the home-page preview.';
  }
  if (section === 'seo') return 'Used in document metadata rather than visible page copy.';
  return 'Visible in the real home-page preview when its current state is present.';
}

function controlKindLabel(kind) {
  if (kind === 'asset-path') return 'Local image path';
  if (kind === 'multiline-text') return 'Long text';
  if (kind === 'url') return 'Web address';
  return 'Text';
}

function inputFor(field, id) {
  const common = `id="${id}" name="value" required maxlength="1200"`;
  if (field.controlKind === 'multiline-text') {
    return `<textarea ${common} rows="4">${escapeHtml(field.value)}</textarea>`;
  }
  const type = field.controlKind === 'url' ? 'url' : 'text';
  return `<input ${common} type="${type}" value="${escapeHtml(field.value)}">`;
}

function proposalToken(session) {
  return createHash('sha256').update(session.canonicalProposal()).digest('hex').slice(0, 16);
}

function renderNativeAuthoringDocument({ session, notice, venueLabel, editorPath, previewPath }) {
  const fields = session.listEditableFields();
  const groups = new Map();
  for (const field of fields) {
    if (!groups.has(field.semanticSection)) groups.set(field.semanticSection, []);
    groups.get(field.semanticSection).push(field);
  }
  const status = session.status();
  const noticeMarkup = notice
    ? `<p class="notice notice--${escapeHtml(notice.kind)}" role="status">${escapeHtml(notice.text)}</p>`
    : '';

  const groupEntries = Array.from(groups.entries());
  const sectionNavigation = groupEntries
    .map(([section], index) => `<a href="#section-${index}">${escapeHtml(sectionLabel(section))}</a>`)
    .join('');

  const sectionMarkup = groupEntries.map(([section, sectionFields], sectionIndex) => {
    const controls = sectionFields.map((field, fieldIndex) => {
      const id = `field-${sectionIndex}-${fieldIndex}`;
      return `
        <form class="field-card" method="post" action="${editorPath}/proposal" data-field-pointer="${escapeHtml(field.pointer)}">
          <input type="hidden" name="pointer" value="${escapeHtml(field.pointer)}">
          <label for="${id}">${escapeHtml(fieldLabel(field.pointer))}</label>
          ${inputFor(field, id)}
          <div class="field-card__footer">
            <span class="field-meta">${escapeHtml(controlKindLabel(field.controlKind))} · Operator-owned</span>
            <button type="submit">Update preview</button>
          </div>
        </form>`;
    }).join('');
    return `
      <section class="editor-section" id="section-${sectionIndex}" aria-labelledby="section-heading-${sectionIndex}">
        <header>
          <div>
            <p class="eyebrow">Editable section</p>
            <h2 id="section-heading-${sectionIndex}">${escapeHtml(sectionLabel(section))}</h2>
          </div>
          <p>${escapeHtml(previewCoverage(section))}</p>
        </header>
        <div class="field-stack">${controls}</div>
      </section>`;
  }).join('');

  const token = proposalToken(session);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Hive-Venues Native Authoring Foundation — ${escapeHtml(venueLabel)}</title>
  <style>
    :root { font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #18181b; background: #f5f5f4; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    button, input, textarea { font: inherit; min-height: 44px; }
    button { border: 1px solid #292524; border-radius: 10px; padding: 10px 14px; background: #292524; color: white; cursor: pointer; }
    button:focus-visible, input:focus-visible, textarea:focus-visible, a:focus-visible { outline: 3px solid currentColor; outline-offset: 3px; }
    input, textarea { width: 100%; border: 1px solid #a8a29e; border-radius: 10px; padding: 10px 12px; background: white; color: #18181b; }
    textarea { resize: vertical; }
    .skip-link { position: absolute; left: 12px; top: -60px; z-index: 10; background: white; padding: 10px; }
    .skip-link:focus { top: 12px; }
    .shell { max-width: 1680px; margin: 0 auto; padding: 18px; }
    .topbar { display: flex; gap: 16px; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
    .topbar h1 { margin: 0 0 6px; font-size: clamp(1.35rem, 2vw, 2rem); }
    .topbar p { margin: 0; max-width: 70ch; color: #57534e; }
    .status { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: flex-end; }
    .status > span { border: 1px solid #d6d3d1; border-radius: 999px; padding: 8px 10px; background: white; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .actions form { margin: 0; }
    .actions .secondary { background: white; color: #292524; }
    .notice { margin: 0 0 16px; padding: 12px 14px; border: 1px solid #a8a29e; border-radius: 10px; background: white; }
    .notice--error { border-color: #991b1b; }
    .workspace { display: grid; grid-template-columns: minmax(340px, 0.82fr) minmax(0, 1.18fr); gap: 18px; align-items: start; }
    .inspector { min-width: 0; }
    .section-nav { display: flex; gap: 8px; flex-wrap: wrap; margin: 0 0 14px; padding: 12px; border: 1px solid #d6d3d1; border-radius: 14px; background: white; }
    .section-nav a { min-height: 44px; display: inline-flex; align-items: center; padding: 8px 11px; border: 1px solid #d6d3d1; border-radius: 999px; color: #292524; text-decoration: none; }
    .preview { position: sticky; top: 14px; min-width: 0; }
    .preview-card, .editor-section { border: 1px solid #d6d3d1; border-radius: 14px; background: white; box-shadow: 0 1px 2px rgb(0 0 0 / 0.06); }
    .preview-card { overflow: hidden; }
    .preview-card__head { padding: 12px 14px; border-bottom: 1px solid #e7e5e4; display: flex; justify-content: space-between; gap: 12px; align-items: center; }
    .preview-card__head p { margin: 0; color: #57534e; }
    iframe { display: block; width: 100%; height: min(78vh, 920px); border: 0; background: white; }
    .editor-section { margin-bottom: 14px; padding: 14px; scroll-margin-top: 16px; }
    .editor-section > header { display: grid; grid-template-columns: minmax(150px, 0.55fr) minmax(0, 1.45fr); gap: 12px; padding-bottom: 12px; border-bottom: 1px solid #e7e5e4; }
    .editor-section h2, .editor-section p { margin: 0; }
    .editor-section header > p { color: #57534e; font-size: 0.92rem; }
    .eyebrow { text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.72rem; color: #78716c; margin-bottom: 3px !important; }
    .field-stack { display: grid; gap: 12px; padding-top: 12px; }
    .field-card { display: grid; gap: 7px; padding: 12px; border: 1px solid #e7e5e4; border-radius: 12px; background: #fafaf9; }
    .field-card label { font-weight: 650; }
    .field-card__footer { display: flex; justify-content: space-between; gap: 10px; align-items: center; }
    .field-meta { color: #57534e; font-size: 0.82rem; }
    @media (max-width: 860px) {
      .shell { padding: 12px; }
      .topbar, .workspace { display: block; }
      .status { justify-content: flex-start; margin-top: 12px; }
      .preview { position: static; margin-bottom: 14px; }
      .workspace { display: flex; flex-direction: column; }
      .preview { order: -1; width: 100%; }
      iframe { height: 64vh; min-height: 520px; }
      .editor-section > header { grid-template-columns: 1fr; }
      .field-card__footer { align-items: stretch; flex-direction: column; }
    }
  </style>
</head>
<body>
  <a class="skip-link" href="#editor-fields">Skip to editable fields</a>
  <main class="shell">
    <header class="topbar">
      <div>
        <p class="eyebrow">HV-6 selected native foundation · source only</p>
        <h1>Semantic inspector + real application preview</h1>
        <p>Choose an editable section, update only venue-owned content, and review it in the real application. Preview updates remain unsaved until Apply; Discard restores the accepted document.</p>
      </div>
      <div class="status" aria-label="Authoring status">
        <span data-session-state>${escapeHtml(status.state)}</span>
        <span data-dirty-state>${status.dirty ? 'Unsaved proposal' : 'Accepted state'}</span>
        <div class="actions">
          <form method="post" action="${editorPath}/apply"><button data-action="apply" type="submit">Apply proposal</button></form>
          <form method="post" action="${editorPath}/discard"><button class="secondary" data-action="discard" type="submit">Discard changes</button></form>
        </div>
      </div>
    </header>
    ${noticeMarkup}
    <div class="workspace">
      <div class="inspector" id="editor-fields">
        <nav class="section-nav" aria-label="Editable sections">${sectionNavigation}</nav>
        ${sectionMarkup}
      </div>
      <aside class="preview" aria-label="Live visual context">
        <div class="preview-card">
          <div class="preview-card__head">
            <div><strong>${escapeHtml(venueLabel)}</strong><p>Rendered by the existing Hive-Venues application path.</p></div>
            <span aria-hidden="true">↗</span>
          </div>
          <iframe title="Real Hive-Venues home-page preview" src="${previewPath}?proposal=${token}"></iframe>
        </div>
      </aside>
    </div>
  </main>
</body>
</html>`;
}

function createOfflineNativeAuthoringSurface({
  authoringInput,
  renderPreviewHtml,
  editorPath = DEFAULT_EDITOR_PATH,
} = {}) {
  if (typeof renderPreviewHtml !== 'function') {
    throw new TypeError('renderPreviewHtml must be a function');
  }
  if (typeof editorPath !== 'string' || !editorPath.startsWith('/') || editorPath.endsWith('/')) {
    throw new TypeError('editorPath must be an absolute path without a trailing slash');
  }

  const previewPath = `${editorPath}/preview`;
  const session = createVisualAuthoringSession(authoringInput);
  const router = express.Router();
  let notice = null;

  router.use(express.urlencoded({ extended: false, limit: '32kb' }));

  router.get(editorPath, (req, res) => {
    res.set('Cache-Control', 'no-store');
    const projection = session.previewProjection();
    const currentNotice = notice;
    notice = null;
    res.type('html').send(renderNativeAuthoringDocument({
      session,
      notice: currentNotice,
      venueLabel: projection.siteName,
      editorPath,
      previewPath,
    }));
  });

  router.post(`${editorPath}/proposal`, (req, res) => {
    const pointer = typeof req.body.pointer === 'string' ? req.body.pointer : '';
    const value = typeof req.body.value === 'string' ? req.body.value : '';
    try {
      session.edit(pointer, value);
      notice = {
        kind: 'success',
        text: `${fieldLabel(pointer)} preview updated. The accepted document is unchanged.`,
      };
    } catch {
      notice = { kind: 'error', text: SAFE_EDIT_ERROR };
    }
    res.redirect(303, editorPath);
  });

  router.post(`${editorPath}/apply`, (req, res) => {
    try {
      session.apply();
      notice = {
        kind: 'success',
        text: 'Proposal accepted through the HV-5 ordinary-operator edit gate.',
      };
    } catch {
      notice = { kind: 'error', text: SAFE_APPLY_ERROR };
    }
    res.redirect(303, editorPath);
  });

  router.post(`${editorPath}/discard`, (req, res) => {
    session.discard();
    notice = {
      kind: 'success',
      text: 'Unsaved proposal discarded; preview rebuilt from accepted state.',
    };
    res.redirect(303, editorPath);
  });

  router.get(previewPath, async (req, res) => {
    try {
      const html = await renderPreviewHtml(session.previewProjection());
      if (typeof html !== 'string') throw new TypeError('preview renderer must return HTML text');
      res.set('Cache-Control', 'no-store');
      res.type('html').send(html);
    } catch {
      res.status(503).type('html').send(
        `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Preview unavailable</title></head><body><main><p>${escapeHtml(SAFE_PREVIEW_ERROR)}</p></main></body></html>`,
      );
    }
  });

  return Object.freeze({
    editorPath,
    previewPath,
    router,
    session,
  });
}

module.exports = {
  DEFAULT_EDITOR_PATH,
  SAFE_APPLY_ERROR,
  SAFE_EDIT_ERROR,
  SAFE_PREVIEW_ERROR,
  createOfflineNativeAuthoringSurface,
};
