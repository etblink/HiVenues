'use strict';

const crypto = require('node:crypto');
const { clone, stableDigest, validateHostGraph } = require('./model');
const { seedCandidateCHosts } = require('./fixtures');
const { deriveUrgentClosure, diffGraphPaths, normalizeChange, verifyUrgentOperation, verifyUrgentRelease } = require('./urgent');

const compositionFamilies = new Set(['poster', 'editorial', 'hospitality']);
const releaseKinds = new Set(['full', 'urgent']);
const urgentStates = new Set(['review', 'released']);

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

function prepareUrgentDraftCarry(draft, releaseSnapshot, change, changedPaths) {
  const target = draft.activities.find((item) => item.id === change.activityId);
  const source = releaseSnapshot.activities.find((item) => item.id === change.activityId);
  if (!target || !source) return { ok: false, reason: 'URGENT_CARRY_TARGET_MISSING' };

  const next = clone(draft);
  const nextTarget = next.activities.find((item) => item.id === change.activityId);
  const base = `activities.${change.activityId}`;
  for (const path of changedPaths) {
    if (path === `${base}.lifecycle`) {
      nextTarget.lifecycle = source.lifecycle;
      continue;
    }
    if (path === `${base}.statusNote`) {
      if (Object.hasOwn(source, 'statusNote')) nextTarget.statusNote = source.statusNote;
      else delete nextTarget.statusNote;
      continue;
    }
    return { ok: false, reason: 'URGENT_CARRY_UNSUPPORTED_PATH', path };
  }

  const snapshot = validateHostGraph(next);
  const actualChanged = diffGraphPaths(draft, snapshot);
  const unexpected = actualChanged.filter((path) => !changedPaths.includes(path));
  if (unexpected.length) return { ok: false, reason: 'URGENT_CARRY_SCOPE_MISMATCH', unexpected };
  return { ok: true, snapshot, actualChanged };
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
        kind: 'full',
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
        urgent: new Map(),
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
        urgent: Array.from(workspace.urgent.values()).map((item) => clone(item)),
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
      if (!Array.isArray(record.releases)) {
        throw stateError(`Invalid release history for ${record.slug}.`);
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
        const kind = release.kind === undefined ? 'full' : release.kind;
        if (!releaseKinds.has(kind)) throw stateError(`Invalid release kind for ${record.slug}/${release.id}.`);
        if (kind === 'urgent') {
          if (typeof release.baseReleaseId !== 'string' || !releaseIds.has(release.baseReleaseId) || release.baseReleaseId === release.id) {
            throw stateError(`Urgent release base provenance is invalid for ${record.slug}/${release.id}.`);
          }
          if (typeof release.operationId !== 'string' || !release.operationId) throw stateError(`Urgent release operation provenance is missing for ${record.slug}/${release.id}.`);
          if (!Array.isArray(release.changedPaths) || release.changedPaths.some((item) => typeof item !== 'string')) {
            throw stateError(`Urgent release changed paths are invalid for ${record.slug}/${release.id}.`);
          }
        }
        return { ...clone(release), kind, snapshot: clone(snapshot) };
      });
      if (releases.length === 0) {
        if (record.liveReleaseId !== null) {
          throw stateError(`Unpublished workspace has an invalid live release pointer for ${record.slug}.`);
        }
      } else if (typeof record.liveReleaseId !== 'string' || !releaseIds.has(record.liveReleaseId)) {
        throw stateError(`Live release pointer is invalid for ${record.slug}.`);
      }

      if (!Array.isArray(record.proposals) || !Array.isArray(record.rsvps)) {
        throw stateError(`Candidate C proposal/RSVP state is invalid for ${record.slug}.`);
      }
      const urgentRecords = record.urgent === undefined ? [] : record.urgent;
      if (!Array.isArray(urgentRecords)) throw stateError(`Candidate C urgent operation state is invalid for ${record.slug}.`);
      const urgent = new Map();
      for (const operation of urgentRecords) {
        assertObject(operation, `Invalid urgent operation for ${record.slug}.`);
        if (typeof operation.id !== 'string' || !operation.id || urgent.has(operation.id)) throw stateError(`Invalid urgent operation id for ${record.slug}.`);
        if (!urgentStates.has(operation.state)) throw stateError(`Invalid urgent operation state for ${record.slug}/${operation.id}.`);
        if (typeof operation.baseReleaseId !== 'string' || !releaseIds.has(operation.baseReleaseId)) throw stateError(`Urgent operation base release is unknown for ${record.slug}/${operation.id}.`);
        if (typeof operation.baseDigest !== 'string' || releases.find((item) => item.id === operation.baseReleaseId).digest !== operation.baseDigest) {
          throw stateError(`Urgent operation base digest mismatch for ${record.slug}/${operation.id}.`);
        }
        if (!normalizeChange(operation.change).ok) throw stateError(`Urgent operation change is invalid for ${record.slug}/${operation.id}.`);
        if (typeof operation.createdAt !== 'string' || !operation.createdAt) throw stateError(`Urgent operation timestamp is invalid for ${record.slug}/${operation.id}.`);
        // Closure/proof are derived data: re-derive from the immutable base Release and
        // require exact equality. Shape-only checks are not enough (E-PROVENANCE-1A).
        const baseRelease = releases.find((item) => item.id === operation.baseReleaseId);
        const verified = verifyUrgentOperation(baseRelease, operation);
        if (!verified.ok) {
          throw stateError(`Urgent operation provenance does not re-derive for ${record.slug}/${operation.id}: ${verified.reason}${verified.mismatches ? ` (${verified.mismatches.join(', ')})` : ''}.`);
        }
        if (operation.state === 'released') {
          const release = releases.find((item) => item.id === operation.releaseId);
          if (!release || release.kind !== 'urgent' || release.operationId !== operation.id || release.baseReleaseId !== operation.baseReleaseId) {
            throw stateError(`Released urgent operation provenance mismatch for ${record.slug}/${operation.id}.`);
          }
          const releaseCheck = verifyUrgentRelease(baseRelease, release, verified.derived);
          if (!releaseCheck.ok) throw stateError(`Urgent release provenance does not match its base diff for ${record.slug}/${release.id}: ${releaseCheck.reason}.`);
        }
        urgent.set(operation.id, clone(operation));
      }
      const proposals = new Map();
      for (const proposal of record.proposals) {
        assertObject(proposal, `Invalid proposal for ${record.slug}.`);
        if (typeof proposal.id !== 'string' || !proposal.id || proposals.has(proposal.id)) throw stateError(`Invalid proposal id for ${record.slug}.`);
        if (!Number.isInteger(proposal.baseRevision) || proposal.baseRevision < 1 || proposal.baseRevision > record.revision) throw stateError(`Invalid proposal revision for ${record.slug}.`);
        if (!compositionFamilies.has(proposal.familyId) || !compositionFamilies.has(proposal.currentFamily)) throw stateError(`Invalid proposal family for ${record.slug}.`);
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

      for (const release of releases) {
        if (release.kind !== 'urgent') continue;
        const operation = urgent.get(release.operationId);
        if (!operation || operation.state !== 'released' || operation.releaseId !== release.id) {
          throw stateError(`Urgent release ${record.slug}/${release.id} is not coupled to a released urgent operation.`);
        }
      }

      workspaces.set(record.slug, {
        revision: record.revision,
        draft: clone(draft),
        history,
        manualPaths: new Set(record.manualPaths),
        releases,
        liveReleaseId: record.liveReleaseId,
        proposals,
        urgent,
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
      const direction = compositionFamilies.has(input.direction) ? input.direction : 'poster';
      draft.intent.direction = direction;
      draft.presentation.compositionFamily = direction;
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
    const nextFamily = compositionFamilies.has(familyId) ? familyId : 'poster';
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
      kind: 'full',
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

  editActivityStatus(slug, activityId, lifecycle, statusNote, expectedRevision, expectedDigest) {
    const normalized = normalizeChange({ kind: 'activity-status', activityId, lifecycle, statusNote });
    if (!normalized.ok) return normalized;
    return this.commit(slug, expectedRevision, 'edit-activity-status', (draft) => {
      const activity = draft.activities.find((item) => item.id === normalized.change.activityId);
      if (!activity) throw new Error('Activity not found');
      activity.lifecycle = normalized.change.lifecycle;
      if (normalized.change.statusNote) activity.statusNote = normalized.change.statusNote;
      else delete activity.statusNote;
    }, [`activities.${activityId}.lifecycle`, `activities.${activityId}.statusNote`], expectedDigest);
  }

  liveRelease(workspace) {
    return workspace.releases.find((item) => item.id === workspace.liveReleaseId) || null;
  }

  /**
   * Workstream E: prepare an urgent operation from the live Release. The
   * working draft is deliberately not an input. The operation records the
   * exact live base (id + digest), the declared closure and its proof.
   */
  proposeUrgent(slug, change) {
    const workspace = this.workspace(slug);
    if (!workspace) return { ok: false, reason: 'NOT_FOUND' };
    const live = this.liveRelease(workspace);
    if (!live) return { ok: false, reason: 'NO_LIVE_RELEASE' };
    const derived = deriveUrgentClosure(live.snapshot, change);
    if (!derived.ok) return derived;
    if (!derived.proof.closed) return { ok: false, reason: 'URGENT_CLOSURE_OPEN', proof: derived.proof };
    const operation = {
      id: crypto.randomUUID(),
      state: 'review',
      baseReleaseId: live.id,
      baseDigest: live.digest,
      change: derived.change,
      closure: derived.closure,
      proof: derived.proof,
      createdAt: new Date(this.now()).toISOString(),
    };
    workspace.urgent.set(operation.id, operation);
    return { ok: true, operation: clone(operation) };
  }

  urgentOperation(slug, operationId) {
    const workspace = this.workspace(slug);
    if (!workspace) return null;
    const operation = workspace.urgent.get(operationId);
    return operation ? clone(operation) : null;
  }

  /**
   * Execute a reviewed urgent operation. Fails closed when the live Release
   * moved since review, when the operation was already used, or when the
   * working draft moved (the same status change is carried into the draft as
   * a new revision so the next ordinary Release cannot silently regress it).
   */
  executeUrgent(slug, operationId, expectedLiveReleaseId, expectedRevision, expectedDigest) {
    const workspace = this.workspace(slug);
    if (!workspace) return { ok: false, reason: 'NOT_FOUND' };
    const operation = workspace.urgent.get(operationId);
    if (!operation) return { ok: false, reason: 'URGENT_NOT_FOUND' };
    if (operation.state !== 'review') return { ok: false, reason: 'URGENT_ALREADY_RELEASED', releaseId: operation.releaseId };
    const live = this.liveRelease(workspace);
    if (!live || live.id !== operation.baseReleaseId || live.id !== String(expectedLiveReleaseId || '') || live.digest !== operation.baseDigest) {
      return { ok: false, reason: 'STALE_LIVE_RELEASE', actualLiveReleaseId: live ? live.id : null, actualRevision: workspace.revision };
    }
    const stale = expectedStateConflict(workspace, expectedRevision, expectedDigest);
    if (stale) return stale;

    // Re-derive from the current live snapshot; persisted closure/proof are never the
    // source of Release provenance and must equal the fresh derivation exactly.
    const verified = verifyUrgentOperation(live, operation);
    if (!verified.ok) {
      return { ok: false, reason: verified.reason === 'URGENT_PROVENANCE_MISMATCH' ? 'URGENT_PROVENANCE_MISMATCH' : 'URGENT_CLOSURE_OPEN', detail: verified.mismatches || verified.reason };
    }
    const derived = verified.derived;
    if (derived.closure.changed.length === 0) return { ok: false, reason: 'URGENT_NO_CHANGE' };

    const snapshot = derived.snapshot;
    const carry = workspace.draft.activities.some((item) => item.id === operation.change.activityId)
      ? prepareUrgentDraftCarry(workspace.draft, snapshot, operation.change, derived.closure.changed)
      : null;
    if (carry && !carry.ok) return carry;

    const release = {
      id: `release-${workspace.releases.length + 1}-urgent-${stableDigest(snapshot).slice(0, 10)}`,
      kind: 'urgent',
      baseReleaseId: live.id,
      operationId: operation.id,
      changedPaths: [...derived.closure.changed],
      draftRevision: live.draftRevision,
      digest: stableDigest(snapshot),
      createdAt: new Date(this.now()).toISOString(),
      snapshot: clone(snapshot),
    };
    workspace.releases.push(release);
    workspace.liveReleaseId = release.id;

    let carried = false;
    if (carry) {
      const committed = this.commit(slug, workspace.revision, `urgent-carry:${release.id}`, (draft) => {
        draft.activities = clone(carry.snapshot.activities);
      }, [...derived.closure.changed], undefined);
      carried = committed.ok === true;
    }

    operation.state = 'released';
    operation.releaseId = release.id;
    operation.releasedAt = release.createdAt;
    return { ok: true, release: clone(release), operation: clone(operation), carried, snapshot: this.snapshot(slug) };
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
