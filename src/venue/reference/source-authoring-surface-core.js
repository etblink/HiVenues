'use strict';

const express = require('express');
const { createSourceAuthoringSession } = require('../source-authoring-session');

const DEFAULT_SOURCE_EDITOR_PATH = '/__hive_venues/source-authoring';
const SAFE_SOURCE_EDIT_ERROR = 'We could not preview that change. Check the value and try again; your current draft is unchanged.';
const SAFE_SOURCE_APPLY_ERROR = 'We could not keep those changes. Your current draft is unchanged.';
const SAFE_SOURCE_PREVIEW_ERROR = 'The preview is temporarily unavailable. Your current draft is unchanged.';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function humanizeSegment(segment) {
  return String(segment)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (value) => value.toUpperCase());
}

function sectionLabel(section) {
  const labels = {
    identity: 'Basics',
    business: 'Contact & visiting',
    brand: 'Brand',
    theme: 'Colors',
    seo: 'Search preview',
    hero: 'Welcome',
    updates: 'Updates',
    programs: 'Programs',
    'equipment-status': 'Equipment',
    pathways: 'Getting started',
    visit: 'Visit',
    community: 'Community',
    gallery: 'Gallery',
    onboarding: 'New member wording',
    venue: 'Venue',
  };
  return labels[section] || humanizeSegment(section);
}

function fieldLabel(pointer) {
  const exact = {
    '/venueContext/displayName': 'Venue name',
    '/venueContext/business/address': 'Street address',
    '/venueContext/business/phone': 'Phone number',
    '/venueContext/business/hours': 'Opening hours',
    '/venueContext/business/websiteUrl': 'Website',
    '/venueContext/business/mapUrl': 'Directions link',
    '/venuePackage/seo/defaultDescription': 'Short description for search and sharing',
    '/venuePackage/home/hero/lede': 'Welcome message',
    '/venuePackage/home/hero/footnote': 'Welcome note',
    '/venuePackage/home/hero/image/alt': 'Describe the welcome image',
    '/venuePackage/home/hero/image/caption': 'Welcome image caption',
    '/venuePackage/onboarding/operatorNoun': 'What should we call this kind of venue?',
    '/venuePackage/onboarding/staffRole': 'What should we call staff?',
    '/venuePackage/brand/theme/canvas': 'Page background',
    '/venuePackage/brand/theme/surface': 'Card background',
    '/venuePackage/brand/theme/border': 'Borders',
    '/venuePackage/brand/theme/text': 'Main text',
    '/venuePackage/brand/theme/mutedText': 'Secondary text',
    '/venuePackage/brand/theme/accent': 'Accent',
    '/venuePackage/brand/theme/accentHover': 'Accent when highlighted',
  };
  if (exact[pointer]) return exact[pointer];

  const gallery = pointer.match(/^\/venuePackage\/home\/gallery\/items\/(\d+)\/(alt|caption)$/);
  if (gallery) return `Gallery photo ${Number(gallery[1]) + 1} ${gallery[2] === 'alt' ? 'description' : 'caption'}`;
  const program = pointer.match(/^\/venuePackage\/home\/programs\/items\/(\d+)\/(.+)$/);
  if (program) {
    const labels = { title: 'title', startAt: 'starts', endAt: 'ends', description: 'description', accessNote: 'who can attend', state: 'availability', link: 'more information link' };
    return `Program ${Number(program[1]) + 1} ${labels[program[2]] || humanizeSegment(program[2])}`;
  }
  const equipment = pointer.match(/^\/venuePackage\/home\/equipmentStatus\/items\/(\d+)\/(.+)$/);
  if (equipment) {
    const labels = { name: 'name', state: 'availability', note: 'status note', accessNote: 'access note', lastUpdated: 'last updated', group: 'group (optional)' };
    return `Equipment ${Number(equipment[1]) + 1} ${labels[equipment[2]] || humanizeSegment(equipment[2])}`;
  }
  return humanizeSegment(pointer.split('/').filter(Boolean).at(-1) || 'field');
}

function fieldHelp(field) {
  if (field.controlKind === 'datetime-offset') return 'Include the time zone so guests see the correct local time. Example: 2026-09-10 18:00 -07:00.';
  if (field.controlKind === 'color') return 'Choose a color; HiVenues will reject combinations that are hard to read.';
  if (field.controlKind === 'optional-url') return 'Optional. Use a secure https:// link.';
  if (field.pointer.endsWith('/alt')) return 'Briefly describe what is in the image for people using screen readers.';
  return '';
}

function friendlyDateTime(value) {
  const match = String(value ?? '').match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::00)?(Z|[+-]\d{2}:\d{2})$/);
  return match ? `${match[1]} ${match[2]} ${match[3]}` : String(value ?? '');
}

function normalizeDateTimeInput(value) {
  const trimmed = String(value ?? '').trim();
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::(\d{2}))?\s*(Z|[+-]\d{2}:\d{2})$/);
  if (!match) return trimmed;
  return `${match[1]}T${match[2]}:${match[3] || '00'}${match[4]}`;
}

function inputFor(field, id) {
  const required = field.required ? ' required' : '';
  const common = `id="${id}" name="value"${required} maxlength="1200"`;
  const value = field.controlKind === 'datetime-offset' ? friendlyDateTime(field.value) : field.value ?? '';
  if (field.controlKind === 'multiline-text') return `<textarea ${common} rows="4">${escapeHtml(value)}</textarea>`;
  if (field.controlKind === 'select') {
    const options = field.options.map((option) => `<option value="${escapeHtml(option)}"${option === field.value ? ' selected' : ''}>${escapeHtml(humanizeSegment(option))}</option>`).join('');
    return `<select ${common}>${options}</select>`;
  }
  if (field.controlKind === 'color') return `<input ${common} type="color" value="${escapeHtml(value)}">`;
  const type = field.controlKind === 'url' || field.controlKind === 'optional-url' ? 'url' : 'text';
  return `<input ${common} type="${type}" value="${escapeHtml(value)}">`;
}

function simpleEditableFields(session) {
  return session.listEditableFields().filter((field) => field.controlKind !== 'asset-path');
}

function slugifyItemId(label) {
  const slug = String(label ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
  return slug || 'item';
}

function generatedItemId(collection, label) {
  const used = new Set(collection.items.map((item) => item.id));
  const base = slugifyItemId(label);
  if (!used.has(base)) return base;
  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${base.slice(0, Math.max(2, 77 - String(suffix).length))}-${suffix}`;
    if (!used.has(candidate)) return candidate;
  }
  throw new Error('Unable to generate a unique item id');
}

function collectionAddFields(collection) {
  if (collection.kind === 'programs') {
    return `
      <label>Program title<input name="title" required maxlength="240"></label>
      <label>Starts<input name="startAt" required placeholder="2026-09-10 18:00 -07:00"><small>Include the time zone, as shown in the example.</small></label>
      <label>Ends<input name="endAt" required placeholder="2026-09-10 19:00 -07:00"></label>
      <label>Description<textarea name="description" required rows="3" maxlength="1200"></textarea></label>
      <label>Who can attend?<textarea name="accessNote" required rows="2" maxlength="240"></textarea></label>
      <label>Availability<select name="state" required><option value="scheduled">Scheduled</option><option value="full">Full</option><option value="cancelled">Cancelled</option></select></label>
      <label>More information link (optional)<input name="link" type="url" maxlength="240" placeholder="https://"></label>`;
  }
  return `
    <label>Equipment or area name<input name="name" required maxlength="240"></label>
    <label>Availability<select name="state" required><option value="available">Available</option><option value="limited">Limited</option><option value="maintenance">Maintenance</option><option value="offline">Offline</option></select></label>
    <label>Status note<textarea name="note" required rows="2" maxlength="240"></textarea></label>
    <label>Access note<textarea name="accessNote" required rows="2" maxlength="240"></textarea></label>
    <label>Last updated<input name="lastUpdated" required placeholder="2026-09-09 16:30 -07:00"><small>Include the time zone, as shown in the example.</small></label>
    <label>Group (optional)<input name="group" maxlength="240"></label>`;
}

function collectionMarkup(collection, editorPath) {
  const noun = collection.kind === 'programs' ? 'program' : 'equipment item';
  const rows = collection.items.length ? collection.items.map((item) => `
      <li class="collection-item"><strong>${escapeHtml(item.label)}</strong><div class="collection-actions">
          ${collection.kind === 'equipment-status' ? `
          <form method="post" action="${editorPath}/collection"><input type="hidden" name="pointer" value="${escapeHtml(collection.pointer)}"><input type="hidden" name="itemId" value="${escapeHtml(item.id)}"><button class="secondary compact" name="operation" value="move-up" type="submit" aria-label="Move ${escapeHtml(item.label)} up">Move up</button></form>
          <form method="post" action="${editorPath}/collection"><input type="hidden" name="pointer" value="${escapeHtml(collection.pointer)}"><input type="hidden" name="itemId" value="${escapeHtml(item.id)}"><button class="secondary compact" name="operation" value="move-down" type="submit" aria-label="Move ${escapeHtml(item.label)} down">Move down</button></form>` : ''}
          <form method="post" action="${editorPath}/collection"><input type="hidden" name="pointer" value="${escapeHtml(collection.pointer)}"><input type="hidden" name="itemId" value="${escapeHtml(item.id)}"><button class="secondary compact" name="operation" value="remove" type="submit">Remove</button></form>
        </div></li>`).join('') : '<li class="collection-empty">Nothing here yet.</li>';
  return `
    <div class="collection" data-collection-pointer="${escapeHtml(collection.pointer)}">
      <div class="collection-heading"><strong>${escapeHtml(sectionLabel(collection.kind))}</strong><span>${collection.count} of ${collection.maxItems}</span></div>
      <ul>${rows}</ul>
      <details><summary>Add ${escapeHtml(noun)}</summary>
        <form method="post" action="${editorPath}/collection" class="add-form"><input type="hidden" name="pointer" value="${escapeHtml(collection.pointer)}"><input type="hidden" name="operation" value="add">${collectionAddFields(collection)}<button type="submit">Add to preview</button></form>
      </details>
    </div>`;
}

function renderSourceAuthoringDocument({ session, notice, editorPath, previewPath }) {
  const fields = simpleEditableFields(session);
  const collections = session.listEditableCollections();
  const groups = new Map();
  for (const field of fields) {
    if (!groups.has(field.semanticSection)) groups.set(field.semanticSection, []);
    groups.get(field.semanticSection).push(field);
  }
  for (const collection of collections) if (!groups.has(collection.kind)) groups.set(collection.kind, []);
  const collectionBySection = new Map(collections.map((collection) => [collection.kind, collection]));
  const status = session.status();
  const dirtyText = status.dirty ? 'You have preview changes' : 'Draft is up to date';
  const noticeMarkup = notice ? `<p class="notice" role="status">${escapeHtml(notice.text)}</p>` : '';
  const entries = Array.from(groups.entries());
  const navigation = entries.map(([section], index) => `<a href="#section-${index}">${escapeHtml(sectionLabel(section))}</a>`).join('');
  const sections = entries.map(([section, sectionFields], sectionIndex) => {
    const controls = sectionFields.map((field, fieldIndex) => {
      const id = `field-${sectionIndex}-${fieldIndex}`;
      const help = fieldHelp(field);
      return `
        <form class="field" method="post" action="${editorPath}/proposal" data-field-pointer="${escapeHtml(field.pointer)}"><input type="hidden" name="pointer" value="${escapeHtml(field.pointer)}"><label for="${id}">${escapeHtml(fieldLabel(field.pointer))}</label>${inputFor(field, id)}${help ? `<small>${escapeHtml(help)}</small>` : ''}<button type="submit">Preview this change</button></form>`;
    }).join('');
    const collection = collectionBySection.get(section);
    return `<section id="section-${sectionIndex}" class="section"><h2>${escapeHtml(sectionLabel(section))}</h2>${collection ? collectionMarkup(collection, editorPath) : ''}<div class="fields">${controls}</div></section>`;
  }).join('');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Customize your venue — ${escapeHtml(session.previewProjection().siteName)}</title><style>
    :root { font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #1c1917; background: #f5f5f4; } * { box-sizing: border-box; } body { margin: 0; } a { color: inherit; }
    button, input, textarea, select, summary { font: inherit; min-height: 44px; } button, summary { border: 1px solid #292524; border-radius: 10px; padding: 10px 14px; background: #292524; color: white; cursor: pointer; } button.secondary, summary { background: white; color: #292524; } button.compact { font-size: .9rem; }
    button:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible, summary:focus-visible, a:focus-visible { outline: 3px solid currentColor; outline-offset: 3px; }
    input, textarea, select { width: 100%; border: 1px solid #a8a29e; border-radius: 10px; padding: 10px 12px; background: white; color: #1c1917; } input[type="color"] { min-height: 52px; padding: 5px; } textarea { resize: vertical; } small { display: block; color: #57534e; line-height: 1.4; }
    .shell { max-width: 1500px; margin: 0 auto; padding: 20px; } .intro { display: flex; gap: 18px; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; } .intro h1 { margin: 0 0 8px; font-size: clamp(1.6rem, 3vw, 2.5rem); } .intro p { margin: 0; max-width: 70ch; color: #57534e; } .status { border: 1px solid #d6d3d1; background: white; border-radius: 999px; padding: 8px 12px; white-space: nowrap; } .notice { border: 1px solid #a8a29e; border-radius: 10px; background: white; padding: 12px 14px; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; } .actions form, .collection-actions form { margin: 0; } .nav { display: flex; gap: 8px; overflow-x: auto; padding: 4px 0 12px; } .nav a { min-height: 44px; display: inline-flex; align-items: center; background: white; border: 1px solid #d6d3d1; border-radius: 999px; padding: 8px 12px; text-decoration: none; white-space: nowrap; }
    .layout { display: grid; grid-template-columns: minmax(320px, .9fr) minmax(420px, 1.2fr); gap: 18px; align-items: start; } .editor { display: grid; gap: 14px; } .section { background: white; border: 1px solid #d6d3d1; border-radius: 16px; padding: 16px; } .section h2 { margin: 0 0 12px; font-size: 1.2rem; } .fields { display: grid; gap: 12px; } .field { display: grid; gap: 7px; border-top: 1px solid #e7e5e4; padding-top: 12px; } .field:first-child { border-top: 0; padding-top: 0; } .field label { font-weight: 700; } .field button { justify-self: start; }
    .collection { border: 1px solid #e7e5e4; border-radius: 12px; padding: 12px; margin-bottom: 14px; } .collection-heading { display: flex; justify-content: space-between; gap: 12px; } .collection ul { list-style: none; padding: 0; margin: 10px 0; display: grid; gap: 8px; } .collection-item { display: flex; justify-content: space-between; gap: 12px; align-items: center; border: 1px solid #e7e5e4; border-radius: 10px; padding: 10px; } .collection-actions { display: flex; flex-wrap: wrap; gap: 6px; } .collection-empty { color: #57534e; } details { margin-top: 10px; } .add-form { margin-top: 10px; display: grid; gap: 10px; } .add-form label { display: grid; gap: 5px; font-weight: 600; }
    .preview { position: sticky; top: 16px; background: white; border: 1px solid #d6d3d1; border-radius: 16px; overflow: hidden; } .preview header { padding: 12px 14px; border-bottom: 1px solid #e7e5e4; } .preview header strong { display: block; } .preview header span { color: #57534e; font-size: .9rem; } iframe { display: block; width: 100%; min-height: 760px; border: 0; background: white; }
    @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } .preview { position: static; order: 1; } .editor { order: 2; } iframe { min-height: 620px; } } @media (max-width: 560px) { .shell { padding: 12px; } .intro { display: block; } .status { display: inline-block; margin-top: 12px; } .collection-item { align-items: flex-start; flex-direction: column; } }
  </style></head><body><main class="shell"><div class="intro"><div><h1>Customize your venue</h1><p>Change the words, details, and colors guests will see. Preview first, then keep or undo your changes. Hosting comes later—nothing on this screen publishes or deploys your venue.</p></div><span class="status">${escapeHtml(dirtyText)}</span></div>${noticeMarkup}<div class="actions"><form method="post" action="${editorPath}/apply"><button type="submit">Keep changes</button></form><form method="post" action="${editorPath}/discard"><button class="secondary" type="submit">Undo preview changes</button></form></div><nav class="nav" aria-label="Venue customization sections">${navigation}</nav><div class="layout"><div class="editor">${sections}</div><section class="preview" aria-label="Venue preview"><header><strong>Preview</strong><span>This is how the current draft looks. It is not live.</span></header><iframe title="Venue preview" src="${escapeHtml(previewPath)}"></iframe></section></div></main></body></html>`;
}

function collectionFromBody(session, pointer, body) {
  const collection = session.listEditableCollections().find((entry) => entry.pointer === pointer);
  if (!collection) throw new Error('Unknown collection');
  if (collection.kind === 'programs') return { id: generatedItemId(collection, body.title), title: body.title, startAt: normalizeDateTimeInput(body.startAt), endAt: normalizeDateTimeInput(body.endAt), description: body.description, accessNote: body.accessNote, state: body.state, link: body.link || null };
  return { id: generatedItemId(collection, body.name), name: body.name, state: body.state, note: body.note, accessNote: body.accessNote, lastUpdated: normalizeDateTimeInput(body.lastUpdated), group: body.group || null };
}

function createOfflineSourceAuthoringSurface({ sourceInput, renderPreviewHtml, editorPath = DEFAULT_SOURCE_EDITOR_PATH } = {}) {
  if (typeof renderPreviewHtml !== 'function') throw new TypeError('renderPreviewHtml must be a function');
  const session = createSourceAuthoringSession(sourceInput);
  const router = express.Router();
  const previewPath = `${editorPath}/preview`;
  let notice = null;
  router.use(express.urlencoded({ extended: false, limit: '64kb' }));
  router.get(editorPath, (req, res) => { res.type('html').send(renderSourceAuthoringDocument({ session, notice, editorPath, previewPath })); notice = null; });
  router.get(previewPath, async (req, res) => { try { res.type('html').send(await renderPreviewHtml(session.previewProjection())); } catch { res.status(503).type('text').send(SAFE_SOURCE_PREVIEW_ERROR); } });
  router.post(`${editorPath}/proposal`, (req, res) => { try { const field = session.listEditableFields().find((entry) => entry.pointer === req.body.pointer); if (!field || field.controlKind === 'asset-path') throw new Error('Field unavailable in simple editor'); const value = field.controlKind === 'datetime-offset' ? normalizeDateTimeInput(req.body.value) : req.body.value; session.edit(req.body.pointer, value); notice = { text: 'Preview updated. Keep the changes when you are happy with them.' }; } catch { notice = { text: SAFE_SOURCE_EDIT_ERROR }; } res.redirect(303, editorPath); });
  router.post(`${editorPath}/collection`, (req, res) => { try { const { pointer, operation, itemId } = req.body; if (operation === 'add') session.addCollectionItem(pointer, collectionFromBody(session, pointer, req.body)); else if (operation === 'remove') session.removeCollectionItem(pointer, itemId); else if (operation === 'move-up') session.moveCollectionItem(pointer, itemId, 'up'); else if (operation === 'move-down') session.moveCollectionItem(pointer, itemId, 'down'); else throw new Error('Unsupported collection operation'); notice = { text: 'Preview updated. Keep the changes when you are happy with them.' }; } catch { notice = { text: SAFE_SOURCE_EDIT_ERROR }; } res.redirect(303, editorPath); });
  router.post(`${editorPath}/apply`, (req, res) => { try { session.apply(); notice = { text: 'Changes kept for this editing session. Nothing has been published or deployed.' }; } catch { notice = { text: SAFE_SOURCE_APPLY_ERROR }; } res.redirect(303, editorPath); });
  router.post(`${editorPath}/discard`, (req, res) => { session.discard(); notice = { text: 'Preview changes undone.' }; res.redirect(303, editorPath); });
  return Object.freeze({ editorPath, previewPath, router, session });
}

module.exports = { DEFAULT_SOURCE_EDITOR_PATH, SAFE_SOURCE_APPLY_ERROR, SAFE_SOURCE_EDIT_ERROR, SAFE_SOURCE_PREVIEW_ERROR, createOfflineSourceAuthoringSurface, generatedItemId, normalizeDateTimeInput, renderSourceAuthoringDocument, simpleEditableFields };
