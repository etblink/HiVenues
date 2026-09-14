'use strict';

const fs = require('node:fs');
const express = require('express');

const CONSEQUENCE_CLASSES = Object.freeze({
  R: 'read-only',
  P: 'public signed action',
  F: 'financial action',
  X: 'configuration authority',
});

const MECHANICS = Object.freeze({
  applaud: Object.freeze({
    id: 'applaud',
    consequenceClass: 'P',
    movesValue: false,
    disclosure: 'This prepares a public Hive vote. It requires posting authority before broadcast.',
  }),
  rsvp_local: Object.freeze({
    id: 'rsvp_local',
    consequenceClass: 'R',
    movesValue: false,
    disclosure: 'This records an accountless RSVP in HiVenues only. It does not purchase a ticket or reserve inventory.',
  }),
  calendar_subscribe: Object.freeze({
    id: 'calendar_subscribe',
    consequenceClass: 'R',
    movesValue: false,
    disclosure: 'This downloads a standard calendar event. No account is required.',
  }),
});

function clone(value) {
  return structuredClone(value);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'host';
}

function compileIntent(input = {}) {
  const name = typeof input.name === 'string' && input.name.trim() ? input.name.trim() : 'Northline Hall';
  const slug = slugify(name);
  const activityTitle = typeof input.activityTitle === 'string' && input.activityTitle.trim()
    ? input.activityTitle.trim()
    : 'Friday Night Assembly';
  const composition = input.composition === 'editorial' ? 'editorial' : 'poster';
  const intent = Object.freeze({
    archetype: 'venue',
    presence: 'physical',
    visitorJobs: Object.freeze(['attend', 'join']),
    feel: composition,
    vocabularyDirection: 'host-native',
  });
  return {
    kind: 'candidate-c-h1-host-graph',
    schemaVersion: 1,
    identity: {
      hostId: `hv-${slug}-001`,
      slug,
      displayName: name,
      timezone: 'America/Los_Angeles',
    },
    facts: {
      tagline: 'A neighborhood room for live sound, late sets, and regulars.',
      presence: {
        mode: 'physical',
        address: '100 Example Avenue, Test City',
      },
    },
    activities: [{
      id: 'activity-friday-001',
      slug: 'friday-night-assembly',
      title: activityTitle,
      description: 'A live set, a small room, and a reason to stay for one more song.',
      temporal: {
        kind: 'OCCURRENCE',
        startAt: '2026-10-23T20:00:00-07:00',
        endAt: '2026-10-23T22:30:00-07:00',
      },
      presence: { kind: 'PHYSICAL_HOST_DEFAULT' },
      lifecycle: 'SCHEDULED',
      publicActions: [
        { id: 'rsvp', mechanic: 'rsvp_local' },
        { id: 'applaud', mechanic: 'applaud' },
        { id: 'calendar', mechanic: 'calendar_subscribe' },
      ],
    }],
    voice: {
      terms: {
        applaud: { label: 'Raise a glass', verbPast: 'Raised a glass' },
        rsvp_local: { label: "I'm coming", verbPast: 'Coming' },
        calendar_subscribe: { label: 'Save the night', verbPast: 'Saved' },
        capacity_meter: { label: 'Your pitcher' },
      },
      nouns: {
        operator: 'host',
        member: 'regular',
        community: 'the room',
      },
    },
    presentation: {
      composition: { familyId: composition, version: 1 },
      arrangement: [
        { id: 'hero', kind: 'hero', enabled: true },
        { id: 'upcoming', kind: 'activity-list', enabled: true, query: { lifecycle: ['SCHEDULED', 'LIVE'] } },
        { id: 'journal', kind: 'journal', enabled: true },
      ],
    },
    bindings: {
      hive: { state: 'planned', account: null },
      video: { state: 'degraded', provider: 'synthetic-video-adapter' },
    },
    intent,
  };
}

function removeProjectionSection(graph, sectionId) {
  const next = clone(graph);
  next.presentation.arrangement = next.presentation.arrangement.filter((section) => section.id !== sectionId);
  return next;
}

function createState(initialGraph) {
  let draft = clone(initialGraph);
  let revision = 1;
  let releases = [{ number: 1, sourceRevision: 1, graph: clone(initialGraph), label: 'Seeded synthetic live release' }];
  let liveReleaseNumber = 1;
  let undoStack = [];
  let directionProposal = null;
  let rsvpCount = 0;
  let applauseCount = 107;
  let pitcher = 82;
  const protectedPaths = new Set();
  const external = {
    hiveRpcAttempts: 0,
    hiveWrites: 0,
    providerWrites: 0,
    payments: 0,
    signingAttempts: 0,
    deployments: 0,
  };
  const internal = {
    draftWrites: 0,
    releaseWrites: 0,
    restores: 0,
    accountlessRsvps: 0,
    simulatedApplause: 0,
  };

  function snapshot() {
    return {
      draft: clone(draft),
      revision,
      releases: clone(releases),
      liveReleaseNumber,
      directionProposal: clone(directionProposal),
      rsvpCount,
      applauseCount,
      pitcher,
      protectedPaths: new Set(protectedPaths),
    };
  }

  function currentLiveGraph() {
    const release = releases.find((candidate) => candidate.number === liveReleaseNumber);
    return release ? clone(release.graph) : null;
  }

  function checkRevision(expectedRevision) {
    return Number(expectedRevision) === revision;
  }

  function editActivityTitle(activityId, title, expectedRevision) {
    if (!checkRevision(expectedRevision)) return { ok: false, reason: 'STALE_REVISION', revision };
    if (typeof title !== 'string' || title.trim().length < 1 || title.length > 160) {
      return { ok: false, reason: 'INVALID_TITLE', revision };
    }
    const index = draft.activities.findIndex((activity) => activity.id === activityId);
    if (index < 0) return { ok: false, reason: 'MISSING_ACTIVITY', revision };
    undoStack.push(clone(draft));
    draft.activities[index].title = title.trim();
    protectedPaths.add(`activity:${activityId}:title`);
    revision += 1;
    internal.draftWrites += 1;
    directionProposal = null;
    return { ok: true, revision, draft: clone(draft) };
  }

  function undo(expectedRevision) {
    if (!checkRevision(expectedRevision)) return { ok: false, reason: 'STALE_REVISION', revision };
    if (undoStack.length === 0) return { ok: false, reason: 'NOTHING_TO_UNDO', revision };
    draft = undoStack.pop();
    revision += 1;
    internal.draftWrites += 1;
    directionProposal = null;
    return { ok: true, revision, draft: clone(draft) };
  }

  function proposeDirection(familyId, expectedRevision) {
    if (!checkRevision(expectedRevision)) return { ok: false, reason: 'STALE_REVISION', revision };
    if (!['poster', 'editorial'].includes(familyId)) return { ok: false, reason: 'INVALID_FAMILY', revision };
    const nextDraft = clone(draft);
    nextDraft.presentation.composition = { familyId, version: 1 };
    directionProposal = {
      id: `direction-${revision}-${familyId}`,
      expectedRevision: revision,
      familyId,
      nextDraft,
      preservedProtectedPaths: [...protectedPaths],
      changes: [{ kind: 'presentation', label: `Composition: ${draft.presentation.composition.familyId} → ${familyId}` }],
    };
    return { ok: true, proposal: clone(directionProposal) };
  }

  function applyDirection(proposalId, expectedRevision) {
    if (!checkRevision(expectedRevision)) return { ok: false, reason: 'STALE_REVISION', revision };
    if (!directionProposal || directionProposal.id !== proposalId || directionProposal.expectedRevision !== revision) {
      return { ok: false, reason: 'STALE_PROPOSAL', revision };
    }
    undoStack.push(clone(draft));
    draft = clone(directionProposal.nextDraft);
    directionProposal = null;
    revision += 1;
    internal.draftWrites += 1;
    return { ok: true, revision, draft: clone(draft) };
  }

  function publish(expectedRevision) {
    if (!checkRevision(expectedRevision)) return { ok: false, reason: 'STALE_REVISION', revision };
    const release = {
      number: releases.length + 1,
      sourceRevision: revision,
      graph: clone(draft),
      label: `Website release ${releases.length + 1}`,
    };
    releases.push(release);
    liveReleaseNumber = release.number;
    internal.releaseWrites += 1;
    return { ok: true, release: clone(release) };
  }

  function restoreToDraft(releaseNumber, expectedRevision) {
    if (!checkRevision(expectedRevision)) return { ok: false, reason: 'STALE_REVISION', revision };
    const release = releases.find((candidate) => candidate.number === Number(releaseNumber));
    if (!release) return { ok: false, reason: 'MISSING_RELEASE', revision };
    undoStack.push(clone(draft));
    draft = clone(release.graph);
    revision += 1;
    internal.draftWrites += 1;
    internal.restores += 1;
    directionProposal = null;
    return { ok: true, revision, draft: clone(draft), liveReleaseNumber };
  }

  function rsvp() {
    rsvpCount += 1;
    internal.accountlessRsvps += 1;
    return { rsvpCount };
  }

  function simulateApplause() {
    applauseCount += 1;
    pitcher = Math.max(0, pitcher - 5);
    internal.simulatedApplause += 1;
    return { applauseCount, pitcher };
  }

  return Object.freeze({
    snapshot,
    currentLiveGraph,
    editActivityTitle,
    undo,
    proposeDirection,
    applyDirection,
    publish,
    restoreToDraft,
    rsvp,
    simulateApplause,
    diagnostics: () => ({ external: { ...external }, internal: { ...internal } }),
  });
}

function activityById(graph, activityId) {
  return graph.activities.find((activity) => activity.id === activityId) || null;
}

function activityBySlug(graph, slug) {
  return graph.activities.find((activity) => activity.slug === slug) || null;
}

function formatTemporal(graph, activity) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: graph.identity.timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return formatter.format(new Date(activity.temporal.startAt));
}

function mechanicTerm(graph, mechanicId) {
  return graph.voice.terms[mechanicId]?.label || mechanicId;
}

function renderActivityCard(graph, activity, options = {}) {
  const oob = options.oob ? ' hx-swap-oob="outerHTML"' : '';
  return `<article id="activity-card-${escapeHtml(activity.id)}" class="activity-card" data-resource-id="${escapeHtml(activity.id)}"${oob}>
    <p class="eyebrow">${escapeHtml(formatTemporal(graph, activity))}</p>
    <h3><a href="/activities/${escapeHtml(activity.slug)}">${escapeHtml(activity.title)}</a></h3>
    <p>${escapeHtml(activity.description)}</p>
  </article>`;
}

function renderCompositionMain(graph, { draft = false } = {}) {
  const activities = graph.activities.map((activity) => renderActivityCard(graph, activity)).join('');
  const activitySectionEnabled = graph.presentation.arrangement.some((section) => section.id === 'upcoming' && section.enabled);
  const activitySection = activitySectionEnabled
    ? `<section id="upcoming" aria-labelledby="upcoming-heading"><h2 id="upcoming-heading">Tonight & next</h2>${activities}</section>`
    : '';
  if (graph.presentation.composition.familyId === 'editorial') {
    return `<main id="site-main" class="composition editorial" data-composition="editorial">
      <header class="editorial-masthead"><p class="kicker">${draft ? 'Draft · ' : ''}Northline journal</p><h1>${escapeHtml(graph.identity.displayName)}</h1><p>${escapeHtml(graph.facts.tagline)}</p></header>
      <div class="editorial-grid"><article class="editorial-feature"><h2>Tonight belongs to the room.</h2><p>Music, people, and a place worth returning to.</p></article>${activitySection}</div>
    </main>`;
  }
  return `<main id="site-main" class="composition poster" data-composition="poster">
    <section class="poster-hero" aria-labelledby="poster-title"><p class="kicker">${draft ? 'Draft · ' : ''}Doors open</p><h1 id="poster-title">${escapeHtml(graph.identity.displayName)}</h1><p>${escapeHtml(graph.facts.tagline)}</p></section>
    <div class="poster-bill">${activitySection}</div>
  </main>`;
}

function renderJournal(page = 1) {
  const entries = [
    ['Soundcheck note', 'The room opens at seven.'],
    ['From behind the bar', 'A new late set was added.'],
    ['Sunday reset', 'Thanks for filling the room.'],
    ['Next month', 'Two new dates land next week.'],
  ];
  const pageSize = 2;
  const start = (page - 1) * pageSize;
  const visible = entries.slice(start, start + pageSize);
  const next = start + pageSize < entries.length ? page + 1 : null;
  const items = visible.map(([title, body]) => `<article><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></article>`).join('');
  return `<section id="journal" aria-labelledby="journal-heading"><h2 id="journal-heading">From the room</h2>${items}${next ? `<a href="/journal?page=${next}" hx-get="/journal?page=${next}" hx-target="#journal" hx-swap="outerHTML">More updates</a>` : ''}</section>`;
}

function jsonLdFor(graph, activity = null) {
  const value = activity
    ? {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: activity.title,
        startDate: activity.temporal.startAt,
        endDate: activity.temporal.endAt,
        eventStatus: 'https://schema.org/EventScheduled',
        location: { '@type': 'Place', name: graph.identity.displayName, address: graph.facts.presence.address },
      }
    : {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: graph.identity.displayName,
        url: `https://${graph.identity.slug}.example/`,
      };
  return JSON.stringify(value).replaceAll('<', '\u003c');
}

function renderDocument(graph, { title, canonicalPath, main, activity = null, draft = false }) {
  const canonical = `https://${graph.identity.slug}.example${canonicalPath}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(title)} · ${escapeHtml(graph.identity.displayName)}</title>
    <meta name="description" content="${escapeHtml(graph.facts.tagline)}">
    <link rel="canonical" href="${escapeHtml(canonical)}">
    <script type="application/ld+json">${jsonLdFor(graph, activity)}</script>
    <script src="/candidate-c/htmx.js" defer></script>
    <style>${BASE_STYLES}</style>
  </head><body data-draft="${draft ? 'true' : 'false'}"><header class="site-header"><a href="/">${escapeHtml(graph.identity.displayName)}</a><nav aria-label="Primary"><a href="/#upcoming">What's on</a><a href="/#journal">Journal</a><a href="/studio">Studio</a></nav></header>${main}</body></html>`;
}

function renderPublicHome(graph, { draft = false } = {}) {
  const main = `${renderCompositionMain(graph, { draft })}${renderJournal(1)}`;
  return renderDocument(graph, { title: draft ? 'Draft preview' : 'Home', canonicalPath: '/', main, draft });
}

function renderProviderState(graph) {
  if (graph.bindings.video.state === 'degraded') {
    return '<section class="provider-state" data-provider-state="degraded"><h2>Watch later</h2><p>Live video is temporarily unavailable. Show details and accountless actions remain available.</p></section>';
  }
  return '<section class="provider-state" data-provider-state="available"><h2>Watch</h2><p>Video is available.</p></section>';
}

function renderActionPanel(graph, activity, snapshot) {
  const rsvp = mechanicTerm(graph, 'rsvp_local');
  const applaud = mechanicTerm(graph, 'applaud');
  const calendar = mechanicTerm(graph, 'calendar_subscribe');
  return `<section aria-labelledby="take-part"><h2 id="take-part">Take part</h2>
    <form method="post" action="/activities/${escapeHtml(activity.slug)}/rsvp" hx-post="/activities/${escapeHtml(activity.slug)}/rsvp" hx-target="#action-receipt" hx-swap="innerHTML"><button type="submit">${escapeHtml(rsvp)}</button></form>
    <a class="button" href="/activities/${escapeHtml(activity.slug)}/applause/review" hx-get="/activities/${escapeHtml(activity.slug)}/applause/review" hx-target="#action-receipt">${escapeHtml(applaud)}</a>
    <a class="button secondary" href="/activities/${escapeHtml(activity.slug)}.ics">${escapeHtml(calendar)}</a>
    <p><span id="applause-count">${snapshot.applauseCount}</span> glasses raised · <span id="pitcher">${snapshot.pitcher}%</span> ${escapeHtml(graph.voice.terms.capacity_meter.label)}</p>
    <div id="action-receipt" role="status" aria-live="polite"></div>
  </section>`;
}

function renderActivityDetail(graph, activity, snapshot, { draft = false } = {}) {
  const main = `<main class="activity-detail"><p class="eyebrow">${escapeHtml(formatTemporal(graph, activity))}</p><h1>${escapeHtml(activity.title)}</h1><p>${escapeHtml(activity.description)}</p>
    <section aria-labelledby="where"><h2 id="where">Where</h2><address>${escapeHtml(graph.facts.presence.address)}</address></section>
    ${renderActionPanel(graph, activity, snapshot)}${renderProviderState(graph)}
  </main>`;
  return renderDocument(graph, { title: activity.title, canonicalPath: `/activities/${activity.slug}`, main, activity, draft });
}

function renderDraftStatus(snapshot, options = {}) {
  const oob = options.oob ? ' hx-swap-oob="outerHTML"' : '';
  return `<p id="draft-status" class="status" role="status"${oob}>Saved to draft · Revision ${snapshot.revision} · Live release ${snapshot.liveReleaseNumber}</p>`;
}

function renderActivityInspector(snapshot, activityId, options = {}) {
  const activity = activityById(snapshot.draft, activityId);
  const oob = options.oob ? ' hx-swap-oob="outerHTML"' : '';
  if (!activity) return `<section id="activity-inspector"${oob}><p>Activity not found.</p></section>`;
  return `<section id="activity-inspector" class="inspector"${oob}><p class="eyebrow">Edit Activity everywhere</p><h2>${escapeHtml(activity.title)}</h2>
    <form method="post" action="/studio/activity-title" hx-post="/studio/activity-title" hx-target="#activity-inspector" hx-swap="outerHTML">
      <input type="hidden" name="activityId" value="${escapeHtml(activity.id)}"><input type="hidden" name="expectedRevision" value="${snapshot.revision}">
      <label>Title<input name="title" value="${escapeHtml(activity.title)}" required maxlength="160"></label><button type="submit">Save title</button>
    </form>
    <form method="post" action="/studio/undo" hx-post="/studio/undo" hx-target="#activity-inspector" hx-swap="outerHTML"><input type="hidden" name="activityId" value="${escapeHtml(activity.id)}"><input type="hidden" name="expectedRevision" value="${snapshot.revision}"><button class="secondary" type="submit">Undo last draft change</button></form>
  </section>`;
}

function renderStudio(snapshot, activityId = 'activity-friday-001') {
  const activity = activityById(snapshot.draft, activityId) || snapshot.draft.activities[0];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HiVenues Studio · ${escapeHtml(snapshot.draft.identity.displayName)}</title><script src="/candidate-c/htmx.js" defer></script><style>${BASE_STYLES}${STUDIO_STYLES}</style></head>
  <body><header class="studio-top"><div><strong>HiVenues Studio</strong><span> · ${escapeHtml(snapshot.draft.identity.displayName)}</span></div>${renderDraftStatus(snapshot)}<nav><a href="/preview">Preview</a><a href="/studio/release-review">Review release</a></nav></header>
  <div class="studio-shell"><aside><nav aria-label="Studio"><a href="#page">Page</a><a href="#activities">Activities</a><a href="#site">Site</a></nav><section id="site"><h2>Site</h2><form method="post" action="/studio/direction/propose"><input type="hidden" name="expectedRevision" value="${snapshot.revision}"><label>Direction<select name="familyId"><option value="poster"${snapshot.draft.presentation.composition.familyId === 'poster' ? ' selected' : ''}>Poster</option><option value="editorial"${snapshot.draft.presentation.composition.familyId === 'editorial' ? ' selected' : ''}>Editorial</option></select></label><button type="submit">Review direction change</button></form><p><a href="/studio/history">History</a></p></section></aside>
  <section class="studio-canvas" id="page" aria-label="Draft canvas">${renderCompositionMain(snapshot.draft, { draft: true })}</section>
  <aside id="activities">${renderActivityInspector(snapshot, activity.id)}</aside></div></body></html>`;
}

function renderCoherentEditFragments(snapshot, activityId) {
  const activity = activityById(snapshot.draft, activityId);
  return `${renderActivityInspector(snapshot, activityId)}${renderActivityCard(snapshot.draft, activity, { oob: true })}${renderDraftStatus(snapshot, { oob: true })}<div id="activity-preview-title" hx-swap-oob="outerHTML">${escapeHtml(activity.title)}</div>`;
}

function renderConflict(snapshot) {
  return `<section id="conflict" role="alert"><h2>A newer draft is available</h2><p>Your edit was not applied. The server is at revision ${snapshot.revision}. Reload this field before trying again.</p><a href="/studio">Reload Studio</a></section>${renderDraftStatus(snapshot, { oob: true })}`;
}

function renderDirectionReview(snapshot) {
  const proposal = snapshot.directionProposal;
  if (!proposal) return '<main><h1>No direction proposal</h1><p><a href="/studio">Back to Studio</a></p></main>';
  const activity = snapshot.draft.activities[0];
  return `<main><h1>Review direction</h1><p>${escapeHtml(proposal.changes[0].label)}</p><p>Your Activity title stays protected: <strong>${escapeHtml(activity.title)}</strong>.</p><form method="post" action="/studio/direction/apply"><input type="hidden" name="proposalId" value="${escapeHtml(proposal.id)}"><input type="hidden" name="expectedRevision" value="${snapshot.revision}"><button type="submit">Apply direction</button></form><p><a href="/studio">Cancel</a></p></main>`;
}

function renderReleaseReview(snapshot) {
  const live = snapshot.releases.find((release) => release.number === snapshot.liveReleaseNumber);
  const currentTitle = snapshot.draft.activities[0].title;
  const liveTitle = live?.graph.activities[0].title || 'None';
  return `<main><h1>Review website release</h1><p>Reviewed draft revision <strong>${snapshot.revision}</strong>.</p><ul><li>Activity title: ${escapeHtml(liveTitle)} → ${escapeHtml(currentTitle)}</li><li>Composition: ${escapeHtml(live?.graph.presentation.composition.familyId || 'none')} → ${escapeHtml(snapshot.draft.presentation.composition.familyId)}</li></ul><p>This publishes the HiVenues website snapshot only. It does not post to Hive, sign, transfer funds, mutate providers, or deploy production infrastructure.</p><form method="post" action="/studio/publish"><input type="hidden" name="expectedRevision" value="${snapshot.revision}"><button type="submit">Publish website changes</button></form><p><a href="/studio">Back</a></p></main>`;
}

function renderHistory(snapshot) {
  const list = snapshot.releases.map((release) => `<li>Release ${release.number} · source revision ${release.sourceRevision}${release.number === snapshot.liveReleaseNumber ? ' · LIVE' : ''}<form method="post" action="/studio/restore"><input type="hidden" name="releaseNumber" value="${release.number}"><input type="hidden" name="expectedRevision" value="${snapshot.revision}"><button type="submit">Restore to draft</button></form></li>`).join('');
  return `<main><h1>Website history</h1><ol>${list}</ol><p>Restoring creates a new draft revision. The live website does not change until a later publish.</p><a href="/studio">Back</a></main>`;
}

function fullStudioTask(snapshot, main, title) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} · HiVenues Studio</title><style>${BASE_STYLES}</style></head><body>${renderDraftStatus(snapshot)}${main}</body></html>`;
}

function icsFor(graph, activity) {
  function stamp(value) {
    return new Date(value).toISOString().replaceAll('-', '').replaceAll(':', '').replace(/\.\d{3}Z$/, 'Z');
  }
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//HiVenues Candidate C H1 Spike//EN', 'BEGIN:VEVENT', `UID:${activity.id}@hivenues.local`, `DTSTART:${stamp(activity.temporal.startAt)}`, `DTEND:${stamp(activity.temporal.endAt)}`, `SUMMARY:${activity.title.replaceAll(',', '\\,')}`, `LOCATION:${graph.facts.presence.address.replaceAll(',', '\\,')}`, 'END:VEVENT', 'END:VCALENDAR', ''].join('\r\n');
}

function createCandidateCH1Spike(options = {}) {
  const source = compileIntent(options.intent);
  const state = createState(source);
  const app = express();
  app.use(express.urlencoded({ extended: false }));

  app.get('/candidate-c/htmx.js', (_request, response) => {
    const filename = require.resolve('htmx.org');
    response.type('application/javascript').send(fs.readFileSync(filename, 'utf8'));
  });

  app.get('/', (_request, response) => {
    response.type('html').send(renderPublicHome(state.currentLiveGraph()));
  });

  app.get('/preview', (_request, response) => {
    response.type('html').send(renderPublicHome(state.snapshot().draft, { draft: true }));
  });

  app.get('/activities/:slug.ics', (request, response) => {
    const graph = state.currentLiveGraph();
    const activity = activityBySlug(graph, request.params.slug);
    if (!activity) return response.status(404).type('text').send('Activity not found');
    return response.type('text/calendar').send(icsFor(graph, activity));
  });

  app.get('/activities/:slug', (request, response) => {
    const graph = state.currentLiveGraph();
    const activity = activityBySlug(graph, request.params.slug);
    if (!activity) return response.status(404).type('text').send('Activity not found');
    return response.type('html').send(renderActivityDetail(graph, activity, state.snapshot()));
  });

  app.get('/preview/activities/:slug', (request, response) => {
    const snapshot = state.snapshot();
    const activity = activityBySlug(snapshot.draft, request.params.slug);
    if (!activity) return response.status(404).type('text').send('Activity not found');
    return response.type('html').send(renderActivityDetail(snapshot.draft, activity, snapshot, { draft: true }));
  });

  app.post('/activities/:slug/rsvp', (request, response) => {
    const graph = state.currentLiveGraph();
    const activity = activityBySlug(graph, request.params.slug);
    if (!activity) return response.status(404).type('text').send('Activity not found');
    const result = state.rsvp();
    const receipt = `<p><strong>You're on the local list.</strong> ${escapeHtml(MECHANICS.rsvp_local.disclosure)} RSVP count: ${result.rsvpCount}.</p>`;
    if (request.get('HX-Request') === 'true') return response.type('html').send(receipt);
    return response.status(303).set('Location', `/activities/${activity.slug}?rsvp=1`).send('');
  });

  app.get('/activities/:slug/applause/review', (request, response) => {
    const graph = state.currentLiveGraph();
    const activity = activityBySlug(graph, request.params.slug);
    if (!activity) return response.status(404).type('text').send('Activity not found');
    const review = `<section class="consequence-review"><h2>${escapeHtml(mechanicTerm(graph, 'applaud'))}</h2><p>${escapeHtml(MECHANICS.applaud.disclosure)}</p><p><strong>Spike safety:</strong> confirmation below is simulated. No signer opens and nothing is broadcast.</p><form method="post" action="/activities/${escapeHtml(activity.slug)}/applause/confirm" hx-post="/activities/${escapeHtml(activity.slug)}/applause/confirm" hx-target="#action-receipt"><button type="submit">Simulate Hive vote</button></form></section>`;
    if (request.get('HX-Request') === 'true') return response.type('html').send(review);
    return response.type('html').send(renderDocument(graph, { title: 'Action consequence', canonicalPath: `/activities/${activity.slug}`, main: `<main>${review}</main>`, activity }));
  });

  app.post('/activities/:slug/applause/confirm', (request, response) => {
    const graph = state.currentLiveGraph();
    const activity = activityBySlug(graph, request.params.slug);
    if (!activity) return response.status(404).type('text').send('Activity not found');
    const result = state.simulateApplause();
    const receipt = `<p><strong>Simulation only.</strong> ${escapeHtml(graph.voice.terms.applaud.verbPast)}. No Hive write occurred.</p><span id="applause-count" hx-swap-oob="outerHTML">${result.applauseCount}</span><span id="pitcher" hx-swap-oob="outerHTML">${result.pitcher}%</span>`;
    if (request.get('HX-Request') === 'true') return response.type('html').send(receipt);
    return response.type('html').send(renderDocument(graph, { title: 'Simulation receipt', canonicalPath: `/activities/${activity.slug}`, main: `<main>${receipt}<p><a href="/activities/${escapeHtml(activity.slug)}">Back to Activity</a></p></main>`, activity }));
  });

  app.get('/journal', (request, response) => {
    const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1);
    const fragment = renderJournal(page);
    if (request.get('HX-Request') === 'true') return response.type('html').send(fragment);
    const graph = state.currentLiveGraph();
    return response.type('html').send(renderDocument(graph, { title: 'Journal', canonicalPath: `/journal?page=${page}`, main: `<main>${fragment}</main>` }));
  });

  app.get('/studio', (request, response) => {
    response.set('Cache-Control', 'no-store').type('html').send(renderStudio(state.snapshot(), request.query.activityId));
  });

  app.post('/studio/activity-title', (request, response) => {
    const result = state.editActivityTitle(request.body.activityId, request.body.title, request.body.expectedRevision);
    if (!result.ok) {
      const snapshot = state.snapshot();
      if (result.reason === 'STALE_REVISION') {
        const conflict = renderConflict(snapshot);
        if (request.get('HX-Request') === 'true') return response.status(409).type('html').send(conflict);
        return response.status(409).type('html').send(fullStudioTask(snapshot, conflict, 'Draft conflict'));
      }
      return response.status(400).type('text').send(result.reason);
    }
    if (request.get('HX-Request') === 'true') return response.type('html').send(renderCoherentEditFragments(state.snapshot(), request.body.activityId));
    return response.status(303).set('Location', `/studio?activityId=${encodeURIComponent(request.body.activityId)}`).send('');
  });

  app.post('/studio/undo', (request, response) => {
    const result = state.undo(request.body.expectedRevision);
    if (!result.ok) return response.status(result.reason === 'STALE_REVISION' ? 409 : 400).type('text').send(result.reason);
    if (request.get('HX-Request') === 'true') return response.type('html').send(renderCoherentEditFragments(state.snapshot(), request.body.activityId));
    return response.status(303).set('Location', `/studio?activityId=${encodeURIComponent(request.body.activityId)}`).send('');
  });

  app.post('/studio/direction/propose', (request, response) => {
    const result = state.proposeDirection(request.body.familyId, request.body.expectedRevision);
    if (!result.ok) return response.status(result.reason === 'STALE_REVISION' ? 409 : 400).type('text').send(result.reason);
    const snapshot = state.snapshot();
    return response.type('html').send(fullStudioTask(snapshot, renderDirectionReview(snapshot), 'Review direction'));
  });

  app.post('/studio/direction/apply', (request, response) => {
    const result = state.applyDirection(request.body.proposalId, request.body.expectedRevision);
    if (!result.ok) return response.status(result.reason.includes('STALE') ? 409 : 400).type('text').send(result.reason);
    return response.status(303).set('Location', '/studio').send('');
  });

  app.get('/studio/release-review', (_request, response) => {
    const snapshot = state.snapshot();
    response.type('html').send(fullStudioTask(snapshot, renderReleaseReview(snapshot), 'Review release'));
  });

  app.post('/studio/publish', (request, response) => {
    const result = state.publish(request.body.expectedRevision);
    if (!result.ok) return response.status(409).type('text').send(result.reason);
    return response.status(303).set('Location', `/studio/history?published=${result.release.number}`).send('');
  });

  app.get('/studio/history', (_request, response) => {
    const snapshot = state.snapshot();
    response.type('html').send(fullStudioTask(snapshot, renderHistory(snapshot), 'History'));
  });

  app.post('/studio/restore', (request, response) => {
    const result = state.restoreToDraft(request.body.releaseNumber, request.body.expectedRevision);
    if (!result.ok) return response.status(result.reason === 'STALE_REVISION' ? 409 : 400).type('text').send(result.reason);
    return response.status(303).set('Location', '/studio/history?restored=1').send('');
  });

  return Object.freeze({
    app,
    source: clone(source),
    state,
    diagnostics: state.diagnostics,
    compileIntent,
    removeProjectionSection,
    mechanics: MECHANICS,
    consequenceClasses: CONSEQUENCE_CLASSES,
    renderCompositionMain,
  });
}

const BASE_STYLES = `:root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#171717;background:#f7f4ee}*{box-sizing:border-box}body{margin:0}a{color:inherit}button,.button,input,select{font:inherit}.site-header,.studio-top{display:flex;gap:1rem;align-items:center;justify-content:space-between;padding:1rem 1.25rem;border-bottom:1px solid #d6d3d1;background:#fff}.site-header nav,.studio-top nav{display:flex;gap:.8rem;flex-wrap:wrap}.composition{max-width:1180px;margin:0 auto;padding:clamp(2rem,6vw,6rem) 1.25rem}.poster-hero{min-height:48vh;display:grid;align-content:end;border-bottom:3px solid currentColor}.poster-hero h1{font-size:clamp(3.4rem,10vw,8rem);line-height:.88;margin:.2em 0}.poster-bill{display:grid;grid-template-columns:1fr 1fr;gap:2rem;padding-top:2rem}.editorial-masthead{max-width:760px}.editorial-masthead h1{font-family:Georgia,serif;font-size:clamp(3rem,8vw,6rem);font-weight:400;margin:.2em 0}.editorial-grid{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:4rem;margin-top:4rem}.editorial-feature{font-family:Georgia,serif;font-size:1.4rem}.activity-card{padding:1rem 0;border-top:1px solid #a8a29e}.eyebrow,.kicker{letter-spacing:.08em;text-transform:uppercase;font-size:.75rem;font-weight:800}.activity-detail,#journal{max-width:760px;margin:0 auto;padding:3rem 1.25rem}.activity-detail h1{font-size:clamp(2.6rem,8vw,5rem)}form{display:grid;gap:.65rem;margin:.8rem 0}button,.button{display:inline-flex;min-height:44px;align-items:center;justify-content:center;padding:.7rem 1rem;border:0;border-radius:999px;background:#171717;color:#fff;font-weight:700;text-decoration:none;cursor:pointer}.secondary{background:#e7e5e4;color:#171717}input,select{min-height:44px;padding:.65rem;border:1px solid #a8a29e;border-radius:.5rem;background:#fff}.provider-state,.consequence-review{padding:1rem;margin-top:1.5rem;border:1px solid #d6d3d1;border-radius:1rem;background:#fff}.status{margin:0;color:#57534e}@media(max-width:720px){.poster-bill,.editorial-grid{grid-template-columns:1fr}.site-header{align-items:flex-start;flex-direction:column}}`;

const STUDIO_STYLES = `.studio-shell{display:grid;grid-template-columns:220px minmax(0,1fr) 320px;min-height:calc(100vh - 74px)}.studio-shell>aside{padding:1rem;background:#fff;border-right:1px solid #e7e5e4}.studio-shell>aside:last-child{border-right:0;border-left:1px solid #e7e5e4}.studio-shell aside nav{display:grid;gap:.5rem}.studio-canvas{overflow:auto;background:#e7e5e4;padding:1.25rem}.studio-canvas .composition{background:#f7f4ee;box-shadow:0 12px 40px rgba(0,0,0,.12)}.inspector{display:grid;gap:.75rem}@media(max-width:900px){.studio-shell{grid-template-columns:1fr}.studio-shell>aside{border:0;border-bottom:1px solid #e7e5e4}.studio-shell>aside:last-child{border:0;border-top:1px solid #e7e5e4}.studio-canvas{order:-1}.studio-top{align-items:flex-start;flex-direction:column}}`;

module.exports = {
  compileIntent,
  createCandidateCH1Spike,
  removeProjectionSection,
};
