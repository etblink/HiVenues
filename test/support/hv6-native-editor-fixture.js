'use strict';

const path = require('node:path');
const express = require('express');
const request = require('supertest');
const { createApp } = require('../../src/app');
const { createStaticAssetUrl } = require('../../src/release/static-assets');
const { createVisualAuthoringSession } = require('../../src/venue/visual-authoring-session');
const { configFrom, logger } = require('./test-app');

const ROOT = path.join(__dirname, '..', '..');
const PUBLIC_ROOT = path.join(ROOT, 'public');
const EDITOR_PATH = '/__hv6/native';
const PREVIEW_PATH = '/__hv6/native/preview';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function humanizePointer(pointer) {
  const segment = pointer.split('/').filter(Boolean).at(-1) || 'field';
  return segment
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (value) => value.toUpperCase());
}

function sectionLabel(section) {
  return section
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function previewCoverage(section) {
  if (section === 'onboarding') return 'Rendered on another product surface; editable here but not visible in this home-page preview.';
  if (section === 'seo') return 'Rendered in document metadata rather than visible page copy.';
  return 'Visible in the real home-page application preview when its current state is present.';
}

function inputFor(field, id) {
  const common = `id="${id}" name="value" required maxlength="1200"`;
  if (field.controlKind === 'multiline-text') {
    return `<textarea ${common} rows="4">${escapeHtml(field.value)}</textarea>`;
  }
  const type = field.controlKind === 'url' ? 'url' : 'text';
  return `<input ${common} type="${type}" value="${escapeHtml(field.value)}">`;
}

function renderEditorDocument({ session, notice, venueLabel }) {
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

  const sectionMarkup = Array.from(groups.entries(), ([section, sectionFields], sectionIndex) => {
    const controls = sectionFields.map((field, fieldIndex) => {
      const id = `field-${sectionIndex}-${fieldIndex}`;
      return `
        <form class="field-card" method="post" action="${EDITOR_PATH}/proposal" data-field-pointer="${escapeHtml(field.pointer)}">
          <input type="hidden" name="pointer" value="${escapeHtml(field.pointer)}">
          <label for="${id}">${escapeHtml(humanizePointer(field.pointer))}</label>
          ${inputFor(field, id)}
          <div class="field-card__footer">
            <code>${escapeHtml(field.pointer)}</code>
            <button type="submit">Update preview</button>
          </div>
        </form>`;
    }).join('');
    return `
      <section class="editor-section" aria-labelledby="section-${sectionIndex}">
        <header>
          <div>
            <p class="eyebrow">Semantic section</p>
            <h2 id="section-${sectionIndex}">${escapeHtml(sectionLabel(section))}</h2>
          </div>
          <p>${escapeHtml(previewCoverage(section))}</p>
        </header>
        <div class="field-stack">${controls}</div>
      </section>`;
  }).join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>HV-6 Native Visual Authoring Evaluation — ${escapeHtml(venueLabel)}</title>
  <style>
    :root { font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #18181b; background: #f5f5f4; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    button, input, textarea { font: inherit; }
    button, input, textarea { min-height: 44px; }
    button { border: 1px solid #292524; border-radius: 10px; padding: 10px 14px; background: #292524; color: white; cursor: pointer; }
    button:focus-visible, input:focus-visible, textarea:focus-visible, a:focus-visible { outline: 3px solid currentColor; outline-offset: 3px; }
    input, textarea { width: 100%; border: 1px solid #a8a29e; border-radius: 10px; padding: 10px 12px; background: white; color: #18181b; }
    textarea { resize: vertical; }
    code { overflow-wrap: anywhere; color: #57534e; }
    .skip-link { position: absolute; left: 12px; top: -60px; z-index: 10; background: white; padding: 10px; }
    .skip-link:focus { top: 12px; }
    .shell { max-width: 1680px; margin: 0 auto; padding: 18px; }
    .topbar { display: flex; gap: 16px; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
    .topbar h1 { margin: 0 0 6px; font-size: clamp(1.35rem, 2vw, 2rem); }
    .topbar p { margin: 0; max-width: 70ch; color: #57534e; }
    .status { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: flex-end; }
    .status span { border: 1px solid #d6d3d1; border-radius: 999px; padding: 8px 10px; background: white; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .actions form { margin: 0; }
    .actions .secondary { background: white; color: #292524; }
    .notice { margin: 0 0 16px; padding: 12px 14px; border: 1px solid #a8a29e; border-radius: 10px; background: white; }
    .notice--error { border-color: #991b1b; }
    .workspace { display: grid; grid-template-columns: minmax(340px, 0.82fr) minmax(0, 1.18fr); gap: 18px; align-items: start; }
    .inspector { min-width: 0; }
    .preview { position: sticky; top: 14px; min-width: 0; }
    .preview-card, .editor-section { border: 1px solid #d6d3d1; border-radius: 14px; background: white; box-shadow: 0 1px 2px rgb(0 0 0 / 0.06); }
    .preview-card { overflow: hidden; }
    .preview-card__head { padding: 12px 14px; border-bottom: 1px solid #e7e5e4; display: flex; justify-content: space-between; gap: 12px; align-items: center; }
    .preview-card__head p { margin: 0; color: #57534e; }
    iframe { display: block; width: 100%; height: min(78vh, 920px); border: 0; background: white; }
    .editor-section { margin-bottom: 14px; padding: 14px; }
    .editor-section > header { display: grid; grid-template-columns: minmax(150px, 0.55fr) minmax(0, 1.45fr); gap: 12px; padding-bottom: 12px; border-bottom: 1px solid #e7e5e4; }
    .editor-section h2, .editor-section p { margin: 0; }
    .editor-section header > p { color: #57534e; font-size: 0.92rem; }
    .eyebrow { text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.72rem; color: #78716c; margin-bottom: 3px !important; }
    .field-stack { display: grid; gap: 12px; padding-top: 12px; }
    .field-card { display: grid; gap: 7px; padding: 12px; border: 1px solid #e7e5e4; border-radius: 12px; background: #fafaf9; }
    .field-card label { font-weight: 650; }
    .field-card__footer { display: flex; justify-content: space-between; gap: 10px; align-items: center; }
    .field-card__footer code { font-size: 0.72rem; }
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
        <p class="eyebrow">HV-6 Candidate B · evaluation only</p>
        <h1>Semantic inspector + real application preview</h1>
        <p>Every control is derived from HV-5 operator ownership. Updating a field changes only the ephemeral proposal. Apply is a separate HV-5-gated acceptance action; Discard rebuilds from the accepted document.</p>
      </div>
      <div class="status" aria-label="Authoring status">
        <span data-session-state>${escapeHtml(status.state)}</span>
        <span data-dirty-state>${status.dirty ? 'Unsaved proposal' : 'Accepted state'}</span>
        <div class="actions">
          <form method="post" action="${EDITOR_PATH}/apply"><button data-action="apply" type="submit">Apply proposal</button></form>
          <form method="post" action="${EDITOR_PATH}/discard"><button class="secondary" data-action="discard" type="submit">Discard changes</button></form>
        </div>
      </div>
    </header>
    ${noticeMarkup}
    <div class="workspace">
      <div class="inspector" id="editor-fields">${sectionMarkup}</div>
      <aside class="preview" aria-label="Live visual context">
        <div class="preview-card">
          <div class="preview-card__head">
            <div><strong>${escapeHtml(venueLabel)}</strong><p>Rendered by the existing Hive-Venues application path.</p></div>
            <span aria-hidden="true">↗</span>
          </div>
          <iframe title="Real Hive-Venues home-page preview" src="${PREVIEW_PATH}"></iframe>
        </div>
      </aside>
    </div>
  </main>
</body>
</html>`;
}

function createHv6NativeEditorFixture(authoringInput) {
  const session = createVisualAuthoringSession(authoringInput);
  const config = configFrom({
    HIVE_WRITE_MODE: 'disabled',
    HIVE_SIGNER_MODE: 'disabled',
    RATE_LIMIT_MAX: '10000',
    SESSION_SECRET: 'hv6-native-editor-session-secret-at-least-32-bytes',
  });
  const rpcPool = {
    calls: [],
    getStatus: () => [],
    async call(api, method) {
      this.calls.push({ api, method });
      throw new Error(`HV-6 native preview forbids Hive RPC: ${api}.${method}`);
    },
  };
  const hiveReadService = {
    calls: [],
    async getOfficialCommunityPosts(options) {
      this.calls.push({ method: 'getOfficialCommunityPosts', options: structuredClone(options) });
      return [];
    },
  };
  let notice = null;

  const initialProjection = session.previewProjection();
  const previewApplication = createApp({
    config,
    logger,
    rpcPool,
    hiveReadService,
    venue: initialProjection.venueContext,
    venuePackage: initialProjection.venuePackage,
  });
  previewApplication.locals.assetUrl = createStaticAssetUrl(PUBLIC_ROOT);
  previewApplication.locals.currentYear = 2026;

  function bindPreviewProjection() {
    const projection = session.previewProjection();
    previewApplication.locals.venue = projection.venueContext;
    previewApplication.locals.venuePackage = projection.venuePackage;
    previewApplication.locals.siteName = projection.siteName;
    previewApplication.locals.business = projection.business;
    previewApplication.locals.communityId = projection.venueContext.hive.communityId;
    previewApplication.locals.threadsContainerAccount = projection.venueContext.hive.threadsContainerAccount;
    return projection;
  }

  async function renderPreview() {
    bindPreviewProjection();
    const response = await request(previewApplication).get('/').expect(200);
    return response.text;
  }

  const app = express();
  app.disable('x-powered-by');
  app.use(express.urlencoded({ extended: false, limit: '32kb' }));
  app.use(express.static(PUBLIC_ROOT));
  app.use('/htmx', express.static(path.dirname(require.resolve('htmx.org'))));

  app.get(EDITOR_PATH, (req, res) => {
    res.set('Cache-Control', 'no-store');
    const projection = session.previewProjection();
    const currentNotice = notice;
    notice = null;
    res.type('html').send(renderEditorDocument({
      session,
      notice: currentNotice,
      venueLabel: projection.siteName,
    }));
  });

  app.post(`${EDITOR_PATH}/proposal`, (req, res) => {
    const pointer = typeof req.body.pointer === 'string' ? req.body.pointer : '';
    const value = typeof req.body.value === 'string' ? req.body.value : '';
    try {
      session.edit(pointer, value);
      notice = { kind: 'success', text: `Preview updated for ${pointer}. The accepted document is unchanged.` };
    } catch (error) {
      notice = { kind: 'error', text: error instanceof Error ? error.message : String(error) };
    }
    res.redirect(303, EDITOR_PATH);
  });

  app.post(`${EDITOR_PATH}/apply`, (req, res) => {
    try {
      session.apply();
      notice = { kind: 'success', text: 'Proposal accepted through the HV-5 ordinary-operator edit gate.' };
    } catch (error) {
      notice = { kind: 'error', text: error instanceof Error ? error.message : String(error) };
    }
    res.redirect(303, EDITOR_PATH);
  });

  app.post(`${EDITOR_PATH}/discard`, (req, res) => {
    session.discard();
    notice = { kind: 'success', text: 'Unsaved proposal discarded; preview rebuilt from accepted state.' };
    res.redirect(303, EDITOR_PATH);
  });

  app.get(PREVIEW_PATH, async (req, res, next) => {
    try {
      res.set('Cache-Control', 'no-store');
      res.type('html').send(await renderPreview());
    } catch (error) {
      next(error);
    }
  });

  return {
    app,
    editorPath: EDITOR_PATH,
    previewApplication,
    previewPath: PREVIEW_PATH,
    hiveReadService,
    rpcPool,
    session,
  };
}

module.exports = {
  createHv6NativeEditorFixture,
};
