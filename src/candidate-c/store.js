'use strict';

const crypto = require('node:crypto');
const { clone, stableDigest, validateHostGraph } = require('./model');
const { seedCandidateCHosts } = require('./fixtures');

function conflict(actualRevision) {
  return { ok: false, reason: 'STALE_REVISION', actualRevision };
}

class CandidateCStore {
  constructor({ hosts = seedCandidateCHosts(), now = Date.now } = {}) {
    this.now = now;
    this.workspaces = new Map();
    this.external = {
      hiveRpcAttempts: 0,
      hiveWrites: 0,
      providerWrites: 0,
      payments: 0,
      signingAttempts: 0,
      deployments: 0,
    };
    this.local = { rsvps: 0 };
    for (const graph of hosts) {
      const validated = validateHostGraph(graph);
      const seedRelease = {
        id: `release-seed-${stableDigest(validated).slice(0, 10)}`,
        draftRevision: 1,
        digest: stableDigest(validated),
        createdAt: new Date(this.now()).toISOString(),
        snapshot: clone(validated),
      };
      this.workspaces.set(validated.identity.slug, {
        revision: 1,
        draft: clone(validated),
        history: [{ revision: 1, label: 'seed', draft: clone(validated) }],
        manualPaths: new Set(),
        releases: [seedRelease],
        liveReleaseId: seedRelease.id,
        proposals: new Map(),
        rsvps: new Map(),
      });
    }
  }

  list() {
    return Array.from(this.workspaces.keys());
  }

  workspace(slug) {
    const workspace = this.workspaces.get(slug);
    if (!workspace) return null;
    return workspace;
  }

  snapshot(slug) {
    const workspace = this.workspace(slug);
    if (!workspace) return null;
    return {
      revision: workspace.revision,
      draft: clone(workspace.draft),
      releases: clone(workspace.releases),
      liveReleaseId: workspace.liveReleaseId,
      manualPaths: [...workspace.manualPaths],
      draftDigest: stableDigest(workspace.draft),
    };
  }

  publicSnapshot(slug) {
    const workspace = this.workspace(slug);
    if (!workspace) return null;
    const release = workspace.releases.find((item) => item.id === workspace.liveReleaseId);
    if (!release) return null;
    return {
      revision: release.draftRevision,
      draft: clone(release.snapshot),
      releases: clone(workspace.releases),
      liveReleaseId: workspace.liveReleaseId,
      manualPaths: [...workspace.manualPaths],
      draftDigest: release.digest,
    };
  }

  diagnostics() {
    return { external: clone(this.external), local: clone(this.local) };
  }

  commit(slug, expectedRevision, label, mutator, manualPaths = []) {
    const workspace = this.workspace(slug);
    if (!workspace) return { ok: false, reason: 'NOT_FOUND' };
    if (Number(expectedRevision) !== workspace.revision) return conflict(workspace.revision);
    const next = clone(workspace.draft);
    mutator(next);
    workspace.draft = validateHostGraph(next);
    workspace.revision += 1;
    for (const path of manualPaths) workspace.manualPaths.add(path);
    workspace.history.push({ revision: workspace.revision, label, draft: clone(workspace.draft) });
    return { ok: true, snapshot: this.snapshot(slug) };
  }

  completeSetup(slug, input, expectedRevision) {
    return this.commit(slug, expectedRevision, 'guided-direction', (draft) => {
      draft.intent.purpose = String(input.purpose || '').trim();
      draft.intent.presenceMaterial = String(input.presenceMaterial || '').trim();
      draft.intent.participation = String(input.participation || '').trim();
      draft.intent.direction = input.direction === 'editorial' ? 'editorial' : 'poster';
      draft.presentation.compositionFamily = draft.intent.direction;
    });
  }

  editTagline(slug, tagline, expectedRevision) {
    return this.commit(slug, expectedRevision, 'edit-tagline', (draft) => {
      draft.facts.tagline = String(tagline || '').trim();
    }, ['facts.tagline']);
  }

  editActivity(slug, activityId, fields, expectedRevision) {
    return this.commit(slug, expectedRevision, 'edit-activity', (draft) => {
      const activity = draft.activities.find((item) => item.id === activityId);
      if (!activity) throw new Error('Activity not found');
      if (fields.title !== undefined) activity.title = String(fields.title).trim();
      if (fields.description !== undefined) activity.description = String(fields.description).trim();
    }, [`activities.${activityId}.title`, `activities.${activityId}.description`]);
  }

  editVoiceTerm(slug, mechanicId, term, expectedRevision) {
    return this.commit(slug, expectedRevision, 'edit-voice-term', (draft) => {
      if (!Object.hasOwn(draft.voice.terms, mechanicId)) throw new Error('Mechanic not available to this host');
      draft.voice.terms[mechanicId] = String(term || '').trim();
    }, [`voice.terms.${mechanicId}`]);
  }

  setFocal(slug, mediaId, x, y, expectedRevision) {
    return this.commit(slug, expectedRevision, 'edit-media-focal', (draft) => {
      const media = draft.media.find((item) => item.id === mediaId);
      if (!media) throw new Error('Media not found');
      media.focal = {
        x: Math.max(0, Math.min(100, Number(x))),
        y: Math.max(0, Math.min(100, Number(y))),
      };
    }, [`media.${mediaId}.focal`]);
  }

  moveSection(slug, sectionId, delta, expectedRevision) {
    return this.commit(slug, expectedRevision, 'move-section', (draft) => {
      const index = draft.presentation.arrangement.indexOf(sectionId);
      if (index < 0) throw new Error('Section not found');
      const nextIndex = Math.max(0, Math.min(draft.presentation.arrangement.length - 1, index + Number(delta)));
      if (nextIndex === index) return;
      const [section] = draft.presentation.arrangement.splice(index, 1);
      draft.presentation.arrangement.splice(nextIndex, 0, section);
    }, ['presentation.arrangement']);
  }

  proposeDirection(slug, familyId, expectedRevision) {
    const workspace = this.workspace(slug);
    if (!workspace) return { ok: false, reason: 'NOT_FOUND' };
    if (Number(expectedRevision) !== workspace.revision) return conflict(workspace.revision);
    const nextFamily = familyId === 'editorial' ? 'editorial' : 'poster';
    const proposal = {
      id: crypto.randomUUID(),
      baseRevision: workspace.revision,
      familyId: nextFamily,
      preservedPaths: [...workspace.manualPaths],
      currentFamily: workspace.draft.presentation.compositionFamily,
      createdAt: new Date(this.now()).toISOString(),
    };
    workspace.proposals.set(proposal.id, proposal);
    return { ok: true, proposal: clone(proposal) };
  }

  proposal(slug, proposalId) {
    const workspace = this.workspace(slug);
    if (!workspace) return null;
    const proposal = workspace.proposals.get(proposalId);
    return proposal ? clone(proposal) : null;
  }

  applyDirection(slug, proposalId, expectedRevision) {
    const workspace = this.workspace(slug);
    if (!workspace) return { ok: false, reason: 'NOT_FOUND' };
    const proposal = workspace.proposals.get(proposalId);
    if (!proposal) return { ok: false, reason: 'PROPOSAL_NOT_FOUND' };
    if (proposal.baseRevision !== workspace.revision || Number(expectedRevision) !== workspace.revision) {
      return conflict(workspace.revision);
    }
    const result = this.commit(slug, expectedRevision, 'apply-direction', (draft) => {
      draft.presentation.compositionFamily = proposal.familyId;
      draft.intent.direction = proposal.familyId;
    });
    if (result.ok) workspace.proposals.delete(proposalId);
    return result;
  }

  undo(slug, expectedRevision) {
    const workspace = this.workspace(slug);
    if (!workspace) return { ok: false, reason: 'NOT_FOUND' };
    if (Number(expectedRevision) !== workspace.revision) return conflict(workspace.revision);
    if (workspace.history.length < 2) return { ok: false, reason: 'NOTHING_TO_UNDO' };
    const previous = workspace.history[workspace.history.length - 2];
    workspace.draft = clone(previous.draft);
    workspace.revision += 1;
    workspace.history.push({ revision: workspace.revision, label: 'undo', draft: clone(workspace.draft) });
    return { ok: true, snapshot: this.snapshot(slug) };
  }

  createRelease(slug, expectedRevision) {
    const workspace = this.workspace(slug);
    if (!workspace) return { ok: false, reason: 'NOT_FOUND' };
    if (Number(expectedRevision) !== workspace.revision) return conflict(workspace.revision);
    const snapshot = clone(workspace.draft);
    const release = {
      id: `release-${workspace.releases.length + 1}-${stableDigest(snapshot).slice(0, 10)}`,
      draftRevision: workspace.revision,
      digest: stableDigest(snapshot),
      createdAt: new Date(this.now()).toISOString(),
      snapshot,
    };
    workspace.releases.push(release);
    workspace.liveReleaseId = release.id;
    return { ok: true, release: clone(release), snapshot: this.snapshot(slug) };
  }

  restoreRelease(slug, releaseId, expectedRevision) {
    const workspace = this.workspace(slug);
    if (!workspace) return { ok: false, reason: 'NOT_FOUND' };
    if (Number(expectedRevision) !== workspace.revision) return conflict(workspace.revision);
    const release = workspace.releases.find((item) => item.id === releaseId);
    if (!release) return { ok: false, reason: 'RELEASE_NOT_FOUND' };
    workspace.draft = clone(release.snapshot);
    workspace.revision += 1;
    workspace.history.push({
      revision: workspace.revision,
      label: `restore:${release.id}`,
      draft: clone(workspace.draft),
    });
    return { ok: true, snapshot: this.snapshot(slug) };
  }

  recordRsvp(slug, activityId, name) {
    const workspace = this.workspace(slug);
    if (!workspace) return { ok: false, reason: 'NOT_FOUND' };
    const activity = workspace.draft.activities.find((item) => item.id === activityId);
    if (!activity) return { ok: false, reason: 'ACTIVITY_NOT_FOUND' };
    const id = crypto.randomUUID();
    workspace.rsvps.set(id, {
      id,
      activityId,
      name: String(name || 'Guest').trim().slice(0, 80) || 'Guest',
      createdAt: new Date(this.now()).toISOString(),
    });
    this.local.rsvps += 1;
    return { ok: true, id };
  }
}

module.exports = { CandidateCStore };
