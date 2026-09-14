'use strict';

const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { compileIntent } = require('./candidate-c-h1-spike');

const CLIENT_PATH = path.join(__dirname, 'candidate-c-h1b-client.js');

function clone(value) { return structuredClone(value); }
function esc(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function seedGraph() {
  const graph = compileIntent({ name: 'Northline Hall', activityTitle: 'Friday Night Assembly', composition: 'poster' });
  graph.kind = 'candidate-c-h1b-host-graph';
  graph.schemaVersion = 2;
  graph.intent = {
    purpose: 'Bring people together around live music',
    presenceMaterial: 'Warm, tactile, neighborhood room',
    direction: 'poster',
    participation: 'Come through, save the night, raise a glass',
  };
  graph.media = [{ id: 'media-hero-001', kind: 'image', src: '/candidate-c/media.svg', alt: 'Synthetic stage-light study', focal: { x: 50, y: 45 } }];
  graph.presentation.arrangement = [
    { id: 'hero', kind: 'hero', enabled: true },
    { id: 'upcoming', kind: 'activity-list', enabled: true },
    { id: 'media', kind: 'media', enabled: true },
    { id: 'journal', kind: 'journal', enabled: true },
  ];
  return graph;
}

function createState(initial = seedGraph()) {
  let draft = clone(initial);
  let revision = 1;
  let undoStack = [];
  let directionProposal = null;
  const protectedPaths = new Set();
  const external = { hiveRpcAttempts: 0, hiveWrites: 0, providerWrites: 0, payments: 0, signingAttempts: 0, deployments: 0 };
  const internal = { draftWrites: 0, setupWrites: 0, reorderWrites: 0, focalWrites: 0, directionWrites: 0, conflicts: 0 };

  function snapshot() {
    return { draft: clone(draft), revision, directionProposal: clone(directionProposal), protectedPaths: [...protectedPaths] };
  }
  function check(expectedRevision) { return Number(expectedRevision) === revision; }
  function commit(mutator, kind) {
    undoStack.push(clone(draft));
    mutator(draft);
    revision += 1;
    internal.draftWrites += 1;
    if (kind && Object.hasOwn(internal, kind)) internal[kind] += 1;
    directionProposal = null;
    return { ok: true, revision, draft: clone(draft) };
  }
  function stale() { internal.conflicts += 1; return { ok: false, reason: 'STALE_REVISION', revision }; }

  function completeSetup(input, expectedRevision) {
    if (!check(expectedRevision)) return stale();
    const family = input.direction === 'editorial' ? 'editorial' : 'poster';
    return commit((next) => {
      next.intent = {
        purpose: String(input.purpose || '').trim() || next.intent.purpose,
        presenceMaterial: String(input.presenceMaterial || '').trim() || next.intent.presenceMaterial,
        direction: family,
        participation: String(input.participation || '').trim() || next.intent.participation,
      };
      next.presentation.composition = { familyId: family, version: 1 };
    }, 'setupWrites');
  }

  function editActivityTitle(activityId, title, expectedRevision) {
    if (!check(expectedRevision)) return stale();
    const activity = draft.activities.find((item) => item.id === activityId);
    if (!activity || !String(title).trim()) return { ok: false, reason: 'INVALID_ACTIVITY', revision };
    protectedPaths.add(`activity:${activityId}:title`);
    return commit((next) => { next.activities.find((item) => item.id === activityId).title = String(title).trim(); });
  }

  function editTagline(tagline, expectedRevision) {
    if (!check(expectedRevision)) return stale();
    if (!String(tagline).trim()) return { ok: false, reason: 'INVALID_TAGLINE', revision };
    protectedPaths.add('host:facts:tagline');
    return commit((next) => { next.facts.tagline = String(tagline).trim(); });
  }

  function proposeDirection(familyId, expectedRevision) {
    if (!check(expectedRevision)) return stale();
    if (!['poster', 'editorial'].includes(familyId)) return { ok: false, reason: 'INVALID_FAMILY', revision };
    const proposed = clone(draft);
    proposed.presentation.composition = { familyId, version: 1 };
    proposed.intent.direction = familyId;
    const taglineSuggestion = familyId === 'editorial'
      ? 'Stories, late sets, and the people who make the room matter.'
      : 'A neighborhood room for live sound, late sets, and regulars.';
    const taglineProtected = protectedPaths.has('host:facts:tagline');
    if (!taglineProtected) proposed.facts.tagline = taglineSuggestion;
    directionProposal = {
      id: `direction-${revision}-${familyId}`,
      expectedRevision: revision,
      familyId,
      nextDraft: proposed,
      preserved: [...protectedPaths],
      proposed: [
        `Composition ${draft.presentation.composition.familyId} → ${familyId}`,
        taglineProtected ? 'Tagline preserved because you edited it manually' : 'Tagline updated to match the new direction',
      ],
    };
    return { ok: true, proposal: clone(directionProposal) };
  }

  function applyDirection(proposalId, expectedRevision) {
    if (!check(expectedRevision)) return stale();
    if (!directionProposal || directionProposal.id !== proposalId || directionProposal.expectedRevision !== revision) {
      return { ok: false, reason: 'STALE_PROPOSAL', revision };
    }
    const next = clone(directionProposal.nextDraft);
    return commit((draftGraph) => Object.assign(draftGraph, next), 'directionWrites');
  }

  function cancelDirection() { directionProposal = null; return { ok: true, revision }; }

  function reorder(sectionId, beforeId, expectedRevision) {
    if (!check(expectedRevision)) return stale();
    const current = draft.presentation.arrangement;
    if (!current.some((section) => section.id === sectionId) || sectionId === beforeId) return { ok: false, reason: 'INVALID_REORDER', revision };
    return commit((next) => {
      const list = next.presentation.arrangement;
      const from = list.findIndex((section) => section.id === sectionId);
      const [section] = list.splice(from, 1);
      const target = beforeId === '__end__' ? list.length : list.findIndex((item) => item.id === beforeId);
      list.splice(target < 0 ? list.length : target, 0, section);
    }, 'reorderWrites');
  }

  function move(sectionId, delta, expectedRevision) {
    if (!check(expectedRevision)) return stale();
    const list = draft.presentation.arrangement;
    const from = list.findIndex((section) => section.id === sectionId);
    const to = Math.max(0, Math.min(list.length - 1, from + Number(delta)));
    if (from < 0 || from === to) return { ok: false, reason: 'INVALID_MOVE', revision };
    const beforeId = delta > 0 ? (list[to + 1]?.id || '__end__') : list[to].id;
    return reorder(sectionId, beforeId, expectedRevision);
  }

  function setFocal(mediaId, x, y, expectedRevision) {
    if (!check(expectedRevision)) return stale();
    const media = draft.media.find((item) => item.id === mediaId);
    const nx = Number(x); const ny = Number(y);
    if (!media || !Number.isFinite(nx) || !Number.isFinite(ny) || nx < 0 || nx > 100 || ny < 0 || ny > 100) {
      return { ok: false, reason: 'INVALID_FOCAL', revision };
    }
    return commit((next) => { next.media.find((item) => item.id === mediaId).focal = { x: Math.round(nx), y: Math.round(ny) }; }, 'focalWrites');
  }

  function undo(expectedRevision) {
    if (!check(expectedRevision)) return stale();
    if (!undoStack.length) return { ok: false, reason: 'NOTHING_TO_UNDO', revision };
    draft = undoStack.pop();
    revision += 1;
    internal.draftWrites += 1;
    directionProposal = null;
    return { ok: true, revision, draft: clone(draft) };
  }

  return Object.freeze({ snapshot, completeSetup, editActivityTitle, editTagline, proposeDirection, applyDirection, cancelDirection, reorder, move, setFocal, undo, diagnostics: () => ({ external: { ...external }, internal: { ...internal } }) });
}

function sectionLabel(section) {
  return ({ hero: 'First impression', upcoming: 'Happenings', media: 'Atmosphere', journal: 'From the room' })[section.id] || section.id;
}

function renderSection(graph, section) {
  if (section.id === 'hero') return `<section id="hero" class="hero"><p class="eyebrow">${esc(graph.intent.presenceMaterial)}</p><h1>${esc(graph.identity.displayName)}</h1><p id="canvas-tagline">${esc(graph.facts.tagline)}</p><button class="edit-chip" data-select-resource="host:tagline" data-panel-id="panel-tagline">Edit first impression</button></section>`;
  if (section.id === 'upcoming') {
    const activity = graph.activities[0];
    return `<section id="upcoming"><p class="eyebrow">Coming through</p><article id="activity-card-${esc(activity.id)}"><h2>${esc(activity.title)}</h2><p>${esc(activity.description)}</p><button class="edit-chip" data-selected-id="activity:${esc(activity.id)}" data-select-resource="activity:${esc(activity.id)}" data-panel-id="panel-activity">Edit happening</button></article></section>`;
  }
  if (section.id === 'media') {
    const media = graph.media[0];
    return `<section id="media"><p class="eyebrow">Atmosphere</p><div class="media-stage" style="--fx:${media.focal.x}%;--fy:${media.focal.y}%"><img src="${esc(media.src)}" alt="${esc(media.alt)}"><span class="focal-dot" aria-hidden="true"></span></div><button class="edit-chip" data-select-resource="media:${esc(media.id)}" data-panel-id="panel-media">Adjust image focus</button></section>`;
  }
  return '<section id="journal"><p class="eyebrow">From the room</p><h2>Soundcheck note</h2><p>The room opens at seven. Come early and stay late.</p></section>';
}

function renderCanvas(graph) {
  const sections = graph.presentation.arrangement.filter((section) => section.enabled).map((section) => renderSection(graph, section)).join('');
  if (graph.presentation.composition.familyId === 'editorial') {
    return `<main id="studio-canvas" class="canvas editorial" data-composition="editorial"><div class="editorial-mast"><span>Northline journal</span><strong>${esc(graph.identity.displayName)}</strong></div><div class="editorial-columns">${sections}</div></main>`;
  }
  return `<main id="studio-canvas" class="canvas poster" data-composition="poster"><div class="poster-frame">${sections}</div></main>`;
}

function renderStatus(snapshot, oob = false) {
  return `<p id="draft-status" data-revision="${snapshot.revision}" class="status"${oob ? ' hx-swap-oob="outerHTML"' : ''}>Draft revision ${snapshot.revision} · server owned</p>`;
}

function renderActivityPanel(snapshot, oob = false) {
  const activity = snapshot.draft.activities[0];
  return `<section id="panel-activity" data-context-panel${oob ? ' hx-swap-oob="outerHTML"' : ''}><h2 tabindex="-1">Edit happening</h2><form method="post" action="/studio/activity-title" hx-post="/studio/activity-title" hx-target="#panel-activity" hx-swap="outerHTML"><input type="hidden" name="activityId" value="${esc(activity.id)}"><input type="hidden" name="expectedRevision" value="${snapshot.revision}"><label>Title<input name="title" value="${esc(activity.title)}"></label><button>Save</button></form></section>`;
}

function renderTaglinePanel(snapshot, oob = false) {
  return `<section id="panel-tagline" data-context-panel hidden${oob ? ' hx-swap-oob="outerHTML"' : ''}><h2 tabindex="-1">Edit first impression</h2><form method="post" action="/studio/tagline" hx-post="/studio/tagline" hx-target="#panel-tagline" hx-swap="outerHTML"><input type="hidden" name="expectedRevision" value="${snapshot.revision}"><label>Tagline<textarea name="tagline">${esc(snapshot.draft.facts.tagline)}</textarea></label><button>Save</button></form></section>`;
}

function renderSectionOrder(snapshot, oob = false) {
  const rows = snapshot.draft.presentation.arrangement.map((section, index, all) => `<li data-drop-before="${esc(section.id)}"><span draggable="true" data-drag-section="${esc(section.id)}" aria-label="Drag ${esc(sectionLabel(section))}">↕</span><strong>${esc(sectionLabel(section))}</strong><form method="post" action="/studio/move" hx-post="/studio/move" hx-target="#section-order" hx-swap="outerHTML"><input type="hidden" name="sectionId" value="${esc(section.id)}"><input type="hidden" name="delta" value="-1"><input type="hidden" name="expectedRevision" value="${snapshot.revision}"><button ${index === 0 ? 'disabled' : ''}>Up</button></form><form method="post" action="/studio/move" hx-post="/studio/move" hx-target="#section-order" hx-swap="outerHTML"><input type="hidden" name="sectionId" value="${esc(section.id)}"><input type="hidden" name="delta" value="1"><input type="hidden" name="expectedRevision" value="${snapshot.revision}"><button ${index === all.length - 1 ? 'disabled' : ''}>Down</button></form></li>`).join('');
  return `<section id="section-order"${oob ? ' hx-swap-oob="outerHTML"' : ''}><h2>Page order</h2><p>Drag, or use the keyboard-friendly buttons.</p><ol>${rows}<li class="drop-end" data-drop-before="__end__">Drop at end</li></ol></section>`;
}

function renderMediaPanel(snapshot, oob = false) {
  const media = snapshot.draft.media[0];
  return `<section id="panel-media" data-context-panel hidden${oob ? ' hx-swap-oob="outerHTML"' : ''}><h2 tabindex="-1">Adjust image focus</h2><div id="focal-preview" class="focal-preview" data-server-x="${media.focal.x}" data-server-y="${media.focal.y}" style="--fx:${media.focal.x}%;--fy:${media.focal.y}%"><img src="${esc(media.src)}" alt=""><span class="focal-dot" aria-hidden="true"></span></div><form id="focal-form" method="post" action="/studio/focal" hx-post="/studio/focal" hx-target="#panel-media" hx-swap="outerHTML"><input type="hidden" name="mediaId" value="${esc(media.id)}"><input type="hidden" name="x" value="${media.focal.x}"><input type="hidden" name="y" value="${media.focal.y}"><input type="hidden" name="expectedRevision" value="${snapshot.revision}"><button>Commit focus</button><button type="button" class="secondary" data-cancel-focal>Cancel preview</button></form></section>`;
}

function renderContextSheet(snapshot) {
  return `<aside id="context-sheet" class="context-sheet" data-open="false"><button class="sheet-close" type="button" data-close-context aria-label="Close editor">×</button>${renderActivityPanel(snapshot)}${renderTaglinePanel(snapshot)}${renderMediaPanel(snapshot)}</aside>`;
}

function renderStudio(snapshot) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Candidate C Phase 1B Studio</title><script src="/candidate-c/htmx.js" defer></script><script src="/candidate-c/h1b-client.js" defer></script><style>${STYLES}</style></head><body data-selected-resource=""><header class="top"><strong>HiVenues Studio</strong>${renderStatus(snapshot)}<nav><a href="/studio/setup">Direction</a><a href="#section-order">Page order</a></nav></header><div id="conflict" role="alert" aria-live="assertive"></div><div class="workspace"><aside class="rail"><p class="eyebrow">Your world</p><strong>${esc(snapshot.draft.identity.displayName)}</strong><a href="#studio-canvas">Page</a><a href="#section-order">Sections</a><a href="/studio/setup">Direction</a>${renderSectionOrder(snapshot)}</aside><section class="canvas-wrap">${renderCanvas(snapshot.draft)}</section>${renderContextSheet(snapshot)}</div></body></html>`;
}

function renderSetup(snapshot) {
  const intent = snapshot.draft.intent;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Direction · HiVenues</title><style>${STYLES}</style></head><body><main class="setup"><p class="eyebrow">Guided direction</p><h1>Shape the world, not the widgets.</h1><form method="post" action="/studio/setup"><input type="hidden" name="expectedRevision" value="${snapshot.revision}"><fieldset><legend>1 · Purpose</legend><label>What brings people here?<textarea name="purpose">${esc(intent.purpose)}</textarea></label></fieldset><fieldset><legend>2 · Presence & material</legend><label>How should it feel?<textarea name="presenceMaterial">${esc(intent.presenceMaterial)}</textarea></label></fieldset><fieldset><legend>3 · Direction</legend><label><input type="radio" name="direction" value="poster" ${intent.direction === 'poster' ? 'checked' : ''}> Poster / night-life</label><label><input type="radio" name="direction" value="editorial" ${intent.direction === 'editorial' ? 'checked' : ''}> Editorial / story-led</label></fieldset><fieldset><legend>4 · Participation</legend><label>What should visitors do?<textarea name="participation">${esc(intent.participation)}</textarea></label></fieldset><button>Save direction</button></form><p><a href="/studio">Back to Studio</a></p></main></body></html>`;
}

function renderDirectionReview(snapshot) {
  const proposal = snapshot.directionProposal;
  if (!proposal) return '<main><h1>No direction proposal</h1><a href="/studio">Back</a></main>';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Review direction</title><style>${STYLES}</style></head><body><main class="setup"><p class="eyebrow">Reversible direction</p><h1>Review what changes</h1><h2>Proposed</h2><ul>${proposal.proposed.map((item) => `<li>${esc(item)}</li>`).join('')}</ul><h2>Preserved</h2><ul>${proposal.preserved.length ? proposal.preserved.map((item) => `<li>${esc(item)}</li>`).join('') : '<li>No protected granular edits yet.</li>'}</ul><div class="preview-card">${renderCanvas(proposal.nextDraft)}</div><form method="post" action="/studio/direction/apply"><input type="hidden" name="proposalId" value="${esc(proposal.id)}"><input type="hidden" name="expectedRevision" value="${snapshot.revision}"><button>Apply direction</button></form><form method="post" action="/studio/direction/cancel"><button class="secondary">Cancel</button></form></main></body></html>`;
}

function conflict(snapshot) {
  return `<section tabindex="-1" id="conflict-message"><h2>A newer draft exists</h2><p>Your change was not applied. Server revision ${snapshot.revision} wins.</p><a href="/studio">Reload Studio</a></section>${renderStatus(snapshot, true)}`;
}

function coherent(snapshot, primary, extras = []) { return [primary, ...extras, renderStatus(snapshot, true)].join(''); }

function createCandidateCH1BSpike() {
  const state = createState();
  const app = express();
  app.use(express.urlencoded({ extended: false }));

  app.get('/candidate-c/htmx.js', (_req, res) => res.type('application/javascript').send(fs.readFileSync(require.resolve('htmx.org/dist/htmx.min.js'), 'utf8')));
  app.get('/candidate-c/h1b-client.js', (_req, res) => res.type('application/javascript').send(fs.readFileSync(CLIENT_PATH, 'utf8')));
  app.get('/candidate-c/media.svg', (_req, res) => res.type('image/svg+xml').send('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 700"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#120f17"/><stop offset=".5" stop-color="#7c2d12"/><stop offset="1" stop-color="#f59e0b"/></linearGradient></defs><rect width="1200" height="700" fill="url(#g)"/><circle cx="790" cy="240" r="150" fill="#fff" opacity=".12"/><path d="M0 580 Q400 420 1200 600 V700 H0Z" fill="#000" opacity=".55"/></svg>'));

  app.get('/studio', (_req, res) => res.type('html').send(renderStudio(state.snapshot())));
  app.get('/studio/setup', (_req, res) => res.type('html').send(renderSetup(state.snapshot())));
  app.post('/studio/setup', (req, res) => {
    const result = state.completeSetup(req.body, req.body.expectedRevision);
    if (!result.ok) return res.status(409).type('html').send(conflict(state.snapshot()));
    return res.status(303).set('Location', '/studio').send('');
  });
  app.post('/studio/activity-title', (req, res) => {
    const result = state.editActivityTitle(req.body.activityId, req.body.title, req.body.expectedRevision);
    if (!result.ok) return res.status(result.reason === 'STALE_REVISION' ? 409 : 400).type('html').send(conflict(state.snapshot()));
    const snapshot = state.snapshot();
    const activity = snapshot.draft.activities[0];
    const card = `<article id="activity-card-${esc(activity.id)}" hx-swap-oob="outerHTML"><h2>${esc(activity.title)}</h2><p>${esc(activity.description)}</p><button class="edit-chip" data-selected-id="activity:${esc(activity.id)}" data-select-resource="activity:${esc(activity.id)}" data-panel-id="panel-activity">Edit happening</button></article>`;
    return res.type('html').send(coherent(snapshot, renderActivityPanel(snapshot), [card]));
  });
  app.post('/studio/tagline', (req, res) => {
    const result = state.editTagline(req.body.tagline, req.body.expectedRevision);
    if (!result.ok) return res.status(result.reason === 'STALE_REVISION' ? 409 : 400).type('html').send(conflict(state.snapshot()));
    const snapshot = state.snapshot();
    return res.type('html').send(coherent(snapshot, renderTaglinePanel(snapshot), [`<p id="canvas-tagline" hx-swap-oob="outerHTML">${esc(snapshot.draft.facts.tagline)}</p>`]));
  });
  app.post('/studio/direction/propose', (req, res) => {
    const result = state.proposeDirection(req.body.familyId, req.body.expectedRevision);
    if (!result.ok) return res.status(result.reason === 'STALE_REVISION' ? 409 : 400).type('html').send(conflict(state.snapshot()));
    return res.status(303).set('Location', '/studio/direction/review').send('');
  });
  app.get('/studio/direction/review', (_req, res) => res.type('html').send(renderDirectionReview(state.snapshot())));
  app.post('/studio/direction/apply', (req, res) => {
    const result = state.applyDirection(req.body.proposalId, req.body.expectedRevision);
    if (!result.ok) return res.status(result.reason === 'STALE_REVISION' ? 409 : 400).type('html').send(conflict(state.snapshot()));
    return res.status(303).set('Location', '/studio').send('');
  });
  app.post('/studio/direction/cancel', (_req, res) => { state.cancelDirection(); return res.status(303).set('Location', '/studio').send(''); });
  app.post('/studio/reorder', (req, res) => {
    const result = state.reorder(req.body.sectionId, req.body.beforeId, req.body.expectedRevision);
    if (!result.ok) return res.status(result.reason === 'STALE_REVISION' ? 409 : 400).type('html').send(conflict(state.snapshot()));
    const snapshot = state.snapshot();
    return res.type('html').send(coherent(snapshot, renderSectionOrder(snapshot), [`${renderCanvas(snapshot.draft).replace('<main ', '<main hx-swap-oob="outerHTML" ' )}`]));
  });
  app.post('/studio/move', (req, res) => {
    const result = state.move(req.body.sectionId, req.body.delta, req.body.expectedRevision);
    if (!result.ok) return res.status(result.reason === 'STALE_REVISION' ? 409 : 400).type('html').send(conflict(state.snapshot()));
    const snapshot = state.snapshot();
    return res.type('html').send(coherent(snapshot, renderSectionOrder(snapshot), [`${renderCanvas(snapshot.draft).replace('<main ', '<main hx-swap-oob="outerHTML" ')}`]));
  });
  app.post('/studio/focal', (req, res) => {
    const result = state.setFocal(req.body.mediaId, req.body.x, req.body.y, req.body.expectedRevision);
    if (!result.ok) return res.status(result.reason === 'STALE_REVISION' ? 409 : 400).type('html').send(conflict(state.snapshot()));
    const snapshot = state.snapshot();
    return res.type('html').send(coherent(snapshot, renderMediaPanel(snapshot), [`${renderCanvas(snapshot.draft).replace('<main ', '<main hx-swap-oob="outerHTML" ')}`]));
  });
  app.post('/studio/undo', (req, res) => {
    const result = state.undo(req.body.expectedRevision);
    if (!result.ok) return res.status(result.reason === 'STALE_REVISION' ? 409 : 400).type('html').send(conflict(state.snapshot()));
    return res.status(303).set('Location', '/studio').send('');
  });

  const clientSource = fs.readFileSync(CLIENT_PATH, 'utf8');
  return Object.freeze({
    app,
    state,
    diagnostics: state.diagnostics,
    clientInventory: {
      files: [{ path: 'test/support/candidate-c-h1b-client.js', lines: clientSource.trimEnd().split(/\r?\n/).length, responsibilities: ['selection', 'drag-intent', 'focal-preview', '409-swap-policy', 'focus-restoration'], durableStateMirror: false }],
      durableClientStore: false,
    },
    transport: { durableStateOwner: 'server', durableClientState: false, targetedSwapRegionsPerOrdinaryEdit: 1, oobRegionsPerOrdinaryEdit: 2 },
  });
}

const STYLES = `:root{font-family:Inter,system-ui,sans-serif;color:#20221f;background:#eef0ec}*{box-sizing:border-box}body{margin:0}a{color:inherit}.top{position:sticky;top:0;z-index:5;display:flex;gap:1rem;align-items:center;justify-content:space-between;padding:1rem 1.25rem;background:#fff;border-bottom:1px solid #d8dcd4}.top nav{display:flex;gap:1rem}.status{margin:0;color:#657067}.workspace{display:grid;grid-template-columns:230px minmax(0,1fr) 330px;min-height:calc(100vh - 70px)}.rail,.context-sheet{padding:1rem;background:#fff}.rail{display:grid;align-content:start;gap:.8rem;border-right:1px solid #d8dcd4}.rail a{padding:.5rem;border-radius:.5rem}.canvas-wrap{padding:2rem;background:#e5e9e2;overflow:auto}.canvas{max-width:980px;margin:auto;background:#f7f0df;box-shadow:0 18px 50px #0002}.canvas section{padding:clamp(1.5rem,4vw,4rem);border-bottom:1px solid #bcb6aa}.poster .hero{min-height:420px;display:grid;align-content:end;background:#241313;color:#fff}.poster .hero h1{font:700 clamp(3rem,9vw,7rem)/.9 Georgia,serif;margin:.15em 0}.editorial{background:#f7f4ed}.editorial-mast{display:flex;justify-content:space-between;padding:1rem 2rem;border-bottom:3px solid #222}.editorial-columns{display:grid;grid-template-columns:1.2fr .8fr}.editorial-columns #hero{grid-column:1/-1}.eyebrow{text-transform:uppercase;letter-spacing:.12em;font-size:.72rem;font-weight:800}.edit-chip,button{font:inherit;min-height:44px;padding:.65rem 1rem;border:0;border-radius:999px;background:#243d2f;color:#fff;font-weight:700;cursor:pointer}.secondary{background:#e1e6df;color:#243d2f}input,textarea,select{width:100%;font:inherit;padding:.7rem;border:1px solid #abb4aa;border-radius:.6rem;background:#fff}textarea{min-height:90px}.context-sheet{border-left:1px solid #d8dcd4}.context-sheet section[hidden]{display:none}.sheet-close{float:right;background:#e1e6df;color:#243d2f}.media-stage,.focal-preview{position:relative;overflow:hidden;min-height:220px;border-radius:1rem;background:#111}.media-stage img,.focal-preview img{width:100%;height:100%;min-height:220px;object-fit:cover;object-position:var(--fx) var(--fy);display:block}.focal-dot{position:absolute;left:var(--fx);top:var(--fy);width:18px;height:18px;border:3px solid #fff;border-radius:50%;transform:translate(-50%,-50%);box-shadow:0 0 0 2px #000}.rail ol{list-style:none;padding:0;display:grid;gap:.5rem}.rail li{display:grid;grid-template-columns:auto 1fr auto auto;gap:.35rem;align-items:center;padding:.4rem;border:1px solid #d8dcd4;border-radius:.6rem}.rail li form{margin:0}.rail li button{min-height:34px;padding:.3rem .55rem}.drop-end{min-height:38px;border-style:dashed!important}.setup{max-width:780px;margin:3rem auto;padding:0 1rem}.setup fieldset{border:1px solid #d8dcd4;border-radius:1rem;padding:1rem;margin:1rem 0;background:#fff}.preview-card{border:1px solid #d8dcd4;padding:1rem;margin:1rem 0;background:#e5e9e2}#conflict{position:relative;z-index:10}#conflict-message{padding:1rem;background:#fff2cc;border-bottom:1px solid #e7c767}h2[tabindex="-1"]:focus{outline:3px solid #56755f}.context-sheet[data-open="true"]{display:block}@media(max-width:900px){.top{align-items:flex-start;flex-direction:column}.workspace{display:block}.rail{display:none}.canvas-wrap{padding:.75rem;min-height:100vh}.context-sheet{position:fixed;left:0;right:0;bottom:0;z-index:20;max-height:72vh;overflow:auto;border:0;border-top:1px solid #d8dcd4;border-radius:1.25rem 1.25rem 0 0;box-shadow:0 -16px 40px #0003;display:none}.editorial-columns{grid-template-columns:1fr}.canvas section{padding:1.5rem}.poster .hero{min-height:360px}}`;

module.exports = { seedGraph, createState, createCandidateCH1BSpike, renderCanvas, renderStudio };
