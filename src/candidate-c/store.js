'use strict';

const crypto = require('node:crypto');
const { clone, stableDigest, validateHostGraph } = require('./model');
const { seedCandidateCHosts } = require('./fixtures');

function conflict(actualRevision) {
  return { ok: false, reason: 'STALE_REVISION', actualRevision };
}

function digestConflict(workspace) {
  return {
    ok: false,
    reason: 'STALE_DIGEST',
    actualRevision: workspace.revision,
    actualDigest: stableDigest(workspace.draft),
  };
}

function expectedStateConflict(workspace, expectedRevision, expectedDigest) {
  if (Number(expectedRevision) !== workspace.revision) return conflict(workspace.revision);
  if (expectedDigest !== undefined && expectedDigest !== null && expectedDigest !== '') {
    if (String(expectedDigest).toLowerCase() !== stableDigest(workspace.draft)) return digestConflict(workspace);
  }
  return null;
}

function stateError(message) {
  const error = new Error(message);
  error.code = 'CANDIDATE_C_INVALID_PERSISTED_STATE';
  return error;
}

function assertObject(value, message) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw stateError(message);
}

class CandidateCStore {
  constructor({ hosts = seedCandidateCHosts(), now = Date.now, state = null } = {}) {
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

    if (state) {
      this.importState(state);
      return;
    }

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

  static fromState(state, options = {}) {
    return new CandidateCStore({ ...options, state });
  }

  exportState() {
    return {
      external: clone(this.external),
      local: clone(this.local),
      workspaces: Array.from(this.workspaces.entries()).map(([slug, workspace]) => ({
        slug,
        revision: workspace.revision,
        draft: clone(workspace.draft),
        history: clone(workspace.history),
        manualPaths: [...workspace.manualPaths],
        releases: clone(workspace.releases),
        liveReleaseId: workspace.liveReleaseId,
        proposals: Array.from(workspace.proposals.values()).map((item) => clone(item)),
        rsvps: Array.from(workspace.rsvps.values()).map((item) => clone(item)),
      })),
    };
  }

  importState(state) {
    assertObject(state, 'Candidate C persisted state must be an object.');
    if (!Array.isArray(state.workspaces) || state.workspaces.length === 0) {
      throw stateError('Candidate C persisted state must contain workspaces.');
    }
    assertObject(state.external, 'Candidate C persisted diagnostics are missing.');
    assertObject(state.local, 'Candidate C persisted local diagnostics are missing.');

    const workspaces = new Map();
    let rsvpCount = 0;
    for (const record of state.workspaces) {
      assertObject(record, 'Candidate C workspace record must be an object.');
      if (typeof record.slug !== 'string' || !record.slug) throw stateError('Candidate C workspace slug is invalid.');
      if (workspaces.has(record.slug)) throw stateError(`Duplicate Candidate C workspace: ${record.slug}`);
      if (!Number.isInteger(record.revision) || record.revision < 1) throw stateError(`Invalid revision for ${record.slug}.`);

      const draft = validateHostGraph(record.draft);
      if (draft.identity.slug !== record.slug) throw stateError(`Workspace identity mismatch for ${record.slug}.`);
      if (!Array.isArray(record.history) || record.history.length !== record.revision) {
        throw stateError(`History/revision mismatch for ${record.slug}.`);
      }
      const history = record.history.map((entry, index) => {
        assertObject(entry, `Invalid history entry for ${record.slug}.`);
        const expectedRevision = index + 1;
        if (entry.revision !== expectedRevision || typeof entry.label !== 'string') {
          throw stateError(`Non-contiguous history for ${record.slug}.`);
        }
        return { revision: entry.revision, label: entry.label, draft: clone(validateHostGraph(entry.draft)) };
      });
      if (stableDigest(history[history.length - 1].draft) !== stableDigest(draft)) {
        throw stateError(`Current draft/history mismatch for ${record.slug}.`);
      }

      if (!Array.isArray(record.manualPaths) || record.manualPaths.some((item) => typeof item !== 'string')) {
        throw stateError(`Invalid manual paths for ${record.slug}.`);
      }
      if (!Array.isArray(record.releases) || record.releases.length === 0) {
        throw stateError(`Missing release history for ${record.slug}.`);
      }
      const releaseIds = new Set();
      const releases = record.releases.map((release) => {
        assertObject(release, `Invalid release for ${record.slug}.`);
        if (typeof release.id !== 'string' || !release.id || releaseIds.has(release.id)) {
          throw stateError(`Invalid or duplicate release id for ${record.slug}.`);
        }
        releaseIds.add(release.id);
        if (!Number.isInteger(release.draftRevision) || release.draftRevision < 1 || release.draftRevision > record.revision) {
          throw stateError(`Invalid release revision for ${record.slug}.`);
        }
        const snapshot = validateHostGraph(release.snapshot);
        if (snapshot.identity.slug !== record.slug || stableDigest(snapshot) !== release.digest) {
          throw stateError(`Release provenance mismatch for ${record.slug}/${release.id}.`);
        }
        if (typeof release.createdAt !== 'string' || !release.createdAt) throw stateError(`Invalid release timestamp for ${record.slug}.`);
        return { ...clone(release), snapshot: clone(snapshot) };
      });
      if (typeof record.liveReleaseId !== 'string' || !releaseIds.has(record.liveReleaseId)) {
        throw stateError(`Live release pointer is invalid for ${record.slug}.`);
      }

      if (!Array.isArray(record.proposals) || !Array.isArray(record.rsvps)) {
        throw stateError(`Candidate C proposal/RSVP state is invalid for ${record.slug}.`);
      }
      const proposals = new Map();
      for (const proposal of record.proposals) {
        assertObject(proposal, `Invalid proposal for ${record.slug}.`);
        if (typeof proposal.id !== 'string' || !proposal.id || proposals.has(proposal.id)) throw stateError(`Invalid proposal id for ${record.slug}.`);
        if (!Number.isInteger(proposal.baseRevision) || proposal.baseRevision < 1 || proposal.baseRevision > record.revision) throw stateError(`Invalid proposal revision for ${record.slug}.`);
        if (!['poster', 'editorial'].includes(proposal.familyId) || !['poster', 'editorial'].includes(proposal.currentFamily)) throw stateError(`Invalid proposal family for ${record.slug}.`);
        if (!Array.isArray(proposal.preservedPaths)) throw stateError(`Invalid proposal provenance for ${record.slug}.`);
        proposals.set(proposal.id, clone(proposal));
      }
      const rsvps = new Map();
      for (const rsvp of record.rsvps) {
        assertObject(rsvp, `Invalid RSVP for ${record.slug}.`);
        if (typeof rsvp.id !== 'string' || !rsvp.id || rsvps.has(rsvp.id)) throw stateError(`Invalid RSVP id for ${record.slug}.`);
        if (typeof rsvp.activityId !== 'string' || typeof rsvp.name !== 'string' || typeof rsvp.createdAt !== 'string') throw stateError(`Invalid RSVP record for ${record.slug}.`);
        rsvps.set(rsvp.id, clone(rsvp));
      }
      rsvpCount += rsvps.size;

      workspaces.set(record.slug, {
        revision: record.revision,
        draft: clone(draft),
        history,
        manualPaths: new Set(record.manualPaths),
        releases,
        liveReleaseId: record.liveReleaseId,
        proposals,
        rsvps,
      });
    }

    const externalKeys = ['hiveRpcAttempts', 'hiveWrites', 'providerWrites', 'payments', 'signingAttempts', 'deployments'];
    for (const key of externalKeys) {
      if (!Number.isInteger(state.external[key]) || state.external[key] < 0) throw stateError(`Invalid external diagnostic: ${key}.`);
    }
    if (!Number.isInteger(state.local.rsvps) || state.local.rsvps !== rsvpCount) {
      throw stateError('Candidate C persisted RSVP diagnostics do not match RSVP records.');
    }

    this.workspaces = workspaces;
    this.external = clone(state.external);
    this.local = clone(state.local);
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

  commit(slug, expectedRevision, label, mutator, manualPaths = [], expectedDigest) {
    const workspace = this.workspace(slug);
    if (!workspace) return { ok: false, reason: 'NOT_FOUND' };
    const stale = expectedStateConflict(workspace, expectedRevision, expectedDigest);
    if (stale) return stale;
    const next = clone(workspace.draft);
    mutator(next);
    workspace.draft = validateHostGraph(next);
    workspace.revision += 1;
    for (const path of manualPaths) workspace.manualPaths.add(path);
    workspace.history.push({ revision: workspace.revision, label, draft: clone(workspace.draft) });
    return { ok: true, snapshot: this.snapshot(slug) };
  }

  completeSetup(slug, input, expectedRevision, expectedDigest) {
    return this.commit(slug, expectedRevision, 'guided-direction', (draft) => {
      draft.intent.purpose = String(input.purpose || '').trim();
      draft.intent.presenceMaterial = String(input.presenceMaterial || '').trim();
      draft.intent.participation = String(input.participation || '').trim();
      draft.intent.direction = input.direction === 'editorial' ? 'editorial' : 'poster';
      draft.presentation.compositionFamily = draft.intent.direction;
    }, [], expectedDigest);
  }

  editTagline(slug, tagline, expectedRevision, expectedDigest) {
    return this.commit(slug, expectedRevision, 'edit-tagline', (draft) => {
      draft.facts.tagline = String(tagline || '').trim();
    }, ['facts.tagline'], expectedDigest);
  }

  editActivity(slug, activityId, fields, expectedRevision, expectedDigest) {
    return this.commit(slug, expectedRevision, 'edit-activity', (draft) => {
      const activity = draft.activities.find((item) => item.id === activityId);
      if (!activity) throw new Error('Activity not found');
      if (fields.title !== undefined) activity.title = String(fields.title).trim();
      if (fields.description !== undefined) activity.description = String(fields.description).trim();
    }, [`activities.${activityId}.title`, `activities.${activityId}.description`], expectedDigest);
  }

  editVoiceTerm(slug, mechanicId, term, expectedRevision, expectedDigest) {
    return this.commit(slug, expectedRevision, 'edit-voice-term', (draft) => {
      if (!Object.hasOwn(draft.voice.terms, mechanicId)) throw new Error('Mechanic not available to this host');
      draft.voice.terms[mechanicId] = String(term || '').trim();
    }, [`voice.terms.${mechanicId}`], expectedDigest);
  }

  setFocal(slug, mediaId, x, y, expectedRevision, expectedDigest) {
    return this.commit(slug, expectedRevision, 'edit-media-focal', (draft) => {
      const media = draft.media.find((item) => item.id === mediaId);
      if (!media) throw new Error('Media not found');
      media.focal = {
        x: Math.max(0, Math.min(100, Number(x))),
        y: Math.max(0, Math.min(100, Number(y))),
      };
    }, [`media.${mediaId}.focal`], expectedDigest);
  }

  moveSection(slug, sectionId, delta, expectedRevision, expectedDigest) {
    return this.commit(slug, expectedRevision, 'move-section', (draft) => {
      const index = draft.presentation.arrangement.indexOf(sectionId);
      if (index < 0) throw new Error('Section not found');
      const nextIndex = Math.max(0, Math.min(draft.presentation.arrangement.length - 1, index + Number(delta)));
      if (nextIndex === index) return;
      const [section] = draft.presentation.arrangement.splice(index, 1);
      draft.presentation.arrangement.splice(nextIndex, 0, section);
    }, ['presentation.arrangement'], expectedDigest);
  }

  proposeDirection(slug, familyId, expectedRevision, expectedDigest) {
    const workspace = this.workspace(slug);
    if (!workspace) return { ok: false, reason: 'NOT_FOUND' };
    const stale = expectedStateConflict(workspace, expectedRevision, expectedDigest);
    if (stale) return stale;
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

  applyDirection(slug, proposalId, expectedRevision, expectedDigest) {
    const workspace = this.workspace(slug);
    if (!workspace) return { ok: false, reason: 'NOT_FOUND' };
    const proposal = workspace.proposals.get(proposalId);
    if (!proposal) return { ok: false, reason: 'PROPOSAL_NOT_FOUND' };
    const stale = expectedStateConflict(workspace, expectedRevision, expectedDigest);
    if (proposal.baseRevision !== workspace.revision || stale) return stale || conflict(workspace.revision);
    const result = this.commit(slug, expectedRevision, 'apply-direction', (draft) => {
      draft.presentation.compositionFamily = proposal.familyId;
      draft.intent.direction = proposal.familyId;
    }, [], expectedDigest);
    if (result.ok) workspace.proposals.delete(proposalId);
    return result;
  }

  undo(slug, expectedRevision, expectedDigest) {
    const workspace = this.workspace(slug);
    if (!workspace) return { ok: false, reason: 'NOT_FOUND' };
    const stale = expectedStateConflict(workspace, expectedRevision, expectedDigest);
    if (stale) return stale;
    if (workspace.history.length < 2) return { ok: false, reason: 'NOTHING_TO_UNDO' };
    const previous = workspace.history[workspace.history.length - 2];
    workspace.draft = clone(previous.draft);
    workspace.revision += 1;
    workspace.history.push({ revision: workspace.revision, label: 'undo', draft: clone(workspace.draft) });
    return { ok: true, snapshot: this.snapshot(slug) };
  }

  createRelease(slug, expectedRevision, expectedDigest) {
    const workspace = this.workspace(slug);
    if (!workspace) return { ok: false, reason: 'NOT_FOUND' };
    const stale = expectedStateConflict(workspace, expectedRevision, expectedDigest);
    if (stale) return stale;
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

  restoreRelease(slug, releaseId, expectedRevision, expectedDigest) {
    const workspace = this.workspace(slug);
    if (!workspace) return { ok: false, reason: 'NOT_FOUND' };
    const stale = expectedStateConflict(workspace, expectedRevision, expectedDigest);
    if (stale) return stale;
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