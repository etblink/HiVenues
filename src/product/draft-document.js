'use strict';

const sanitizeHtml = require('sanitize-html');
const { buildViewModel } = require('./present');
const { disclosureFor, mechanicRegistry } = require('./model');
const { territoryLocals, surfacePage } = require('./territory-router');

// This is a rendering seam, not a second host model. Both consumers resolve
// exactly one server snapshot and use the existing visitor templates.
function draftPage(snapshot, { role = 'home', resourceSlug = null, previewRouteBase } = {}) {
  if (!snapshot) return null;
  const view = { ...buildViewModel(snapshot), draftPreview: true, studio: false, previewRouteBase };
  if (role === 'home') return { template: view.family.publicTemplate, locals: { ...view, pageTitle: view.graph.identity.displayName + ' — draft preview' } };
  if (role === 'activity-detail') {
    const activity = view.activities.find((item) => item.slug === resourceSlug);
    return activity ? { template: view.family.activityTemplate, locals: { ...view, activity, pageTitle: activity.title + ' — ' + view.graph.identity.displayName + ' — draft preview' } } : null;
  }
  if (role === 'consequence') {
    const mechanic = mechanicRegistry[resourceSlug];
    if (!mechanic) return null;
    const term = view.graph.voice.terms[mechanic.id] || mechanic.id;
    return { template: 'hivenues/consequence', locals: { ...view, mechanic, term, disclosure: disclosureFor(mechanic.id, view.graph), pageTitle: term + ' — ' + view.graph.identity.displayName + ' — draft preview' } };
  }
  return surfacePage(snapshot, role, resourceSlug, { draftPreview: true, previewRouteBase });
}

function documentInventory(snapshot, previewRouteBase) {
  const view = territoryLocals(snapshot, { draftPreview: true, previewRouteBase });
  const actions = Object.keys(mechanicRegistry).map((id) => ({
    key: 'consequence:' + id, role: 'consequence', resourceSlug: id,
    label: view.graph.voice.terms[id] || id,
    path: previewRouteBase + '/consequence/' + encodeURIComponent(id),
  }));
  const surfaces = view.territory.surfaces.map((item) => item.resourceSlug
    ? { ...item, path: item.path.slice(0, -item.resourceSlug.length) + encodeURIComponent(item.resourceSlug) }
    : item);
  return [...surfaces, ...actions];
}

function documentUrl(path, snapshot) {
  return path + '?document=1&revision=' + snapshot.revision + '&digest=' + encodeURIComponent(snapshot.draftDigest);
}

const DOCUMENT_CSP = [
  "default-src 'none'", "script-src 'none'", "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:", "font-src 'self'", "connect-src 'none'",
  "form-action 'none'", "base-uri 'none'", "object-src 'none'", "frame-src 'none'",
  "frame-ancestors 'self'", 'sandbox allow-same-origin',
].join('; ');

function privateDocumentHeaders(res, snapshot) {
  res.set({
    'Cache-Control': 'no-store',
    'Content-Security-Policy': DOCUMENT_CSP,
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'X-HiVenues-Draft-Revision': String(snapshot.revision),
    'X-HiVenues-Draft-Digest': snapshot.draftDigest,
  });
}

// Render first, then restrict execution/navigation capability without creating
// a parallel composition. CSS, text, ordering and semantic elements stay intact.
// This adapter is private-only. Public/ordinary Preview output never passes here.
function restrictDocument(html, snapshot, previewRouteBase) {
  const decodePath = (value) => { try { return decodeURIComponent(value); } catch (_) { return null; } };
  const pages = new Map(documentInventory(snapshot, previewRouteBase).map((item) => [decodePath(item.path), item.path]));
  return '<!DOCTYPE html>\n' + sanitizeHtml(html, {
    allowedTags: false,
    allowedAttributes: false,
    allowVulnerableTags: true,
    parseStyleAttributes: false,
    exclusiveFilter: (frame) => ['script', 'iframe', 'object', 'embed', 'base'].includes(frame.tag)
      || (frame.tag === 'meta' && 'http-equiv' in frame.attribs),
    transformTags: {
      '*': (tagName, input) => {
        const attribs = { ...input };
        for (const name of Object.keys(attribs)) {
          if (/^on/i.test(name) || /^(hx-|data-hx-)/i.test(name)
            || ['action', 'formaction', 'formtarget', 'target', 'ping', 'download', 'srcdoc'].includes(name)) delete attribs[name];
        }
        if (['button', 'input', 'select', 'textarea'].includes(tagName)) attribs.disabled = '';
        if (tagName === 'form') attribs['aria-disabled'] = 'true';
        if (tagName === 'a' || tagName === 'area') {
          const href = attribs.href || '';
          if (href.startsWith('#')) {
            // Same-document anchors remain ordinary keyboard-accessible links.
          } else if (pages.has(decodePath(href.split('#')[0]))) {
            const hash = href.includes('#') ? href.slice(href.indexOf('#')) : '';
            attribs.href = documentUrl(pages.get(decodePath(href.split('#')[0])), snapshot) + hash;
          } else {
            // Retain link styling/focusability, but no protocol handler, external
            // visit, calendar download or live-route navigation can be invoked.
            attribs.href = '#';
            attribs['aria-disabled'] = 'true';
          }
        }
        return { tagName, attribs };
      },
    },
  });
}

function renderDraftPage(req, res, snapshot, options = {}) {
  if (!snapshot) return res.sendStatus(404);
  const documentOnly = options.documentOnly === true;
  const base = res.locals.previewRouteBase || '/hivenues/studio/' + encodeURIComponent(snapshot.draft.identity.slug) + '/preview';
  if (documentOnly) {
    privateDocumentHeaders(res, snapshot);
    if (String(req.query.revision) !== String(snapshot.revision) || req.query.digest !== snapshot.draftDigest) {
      return res.status(409).type('text/plain').send('DRAFT_DOCUMENT_STALE: reload the proof to review the current draft.');
    }
  }
  const page = draftPage(snapshot, { ...options, previewRouteBase: base });
  if (!page) return res.sendStatus(404);
  if (!documentOnly) return res.render(page.template, page.locals);
  return res.render(page.template, { ...page.locals, pageTitle: page.locals.pageTitle.replace(/ — draft preview$/, ''), privateDraftDocument: true, operator: null }, (error, html) => {
    if (error) return res.status(500).type('text/plain').send('DRAFT_DOCUMENT_RENDER_FAILED');
    return res.type('html').send(restrictDocument(html, snapshot, base));
  });
}

module.exports = { DOCUMENT_CSP, documentInventory, documentUrl, draftPage, privateDocumentHeaders, renderDraftPage, restrictDocument };
