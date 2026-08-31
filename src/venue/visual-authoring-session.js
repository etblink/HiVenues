'use strict';

const {
  OWNERSHIP,
  applyOrdinaryOperatorEdit,
  buildOwnershipMap,
  createVenueAuthoringDocument,
  ownershipForPath,
  serializeVenueAuthoringReview,
} = require('./authoring');

const SESSION_STATE = Object.freeze({
  CLEAN: 'CLEAN',
  DIRTY: 'DIRTY',
  VALIDATING: 'VALIDATING',
  REJECTED_WITH_BASE_UNCHANGED: 'REJECTED_WITH_BASE_UNCHANGED',
  ACCEPTED: 'ACCEPTED',
  DISCARDED: 'DISCARDED',
});

class VisualAuthoringSessionError extends Error {
  constructor(message) {
    super(`Visual authoring session invalid: ${message}`);
    this.name = 'VisualAuthoringSessionError';
  }
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function decodePointer(pointer) {
  if (typeof pointer !== 'string' || !pointer.startsWith('/') || pointer === '/') {
    throw new VisualAuthoringSessionError('field pointer must identify a document leaf');
  }
  return pointer
    .slice(1)
    .split('/')
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function readAtPointer(document, pointer) {
  let cursor = document;
  for (const segment of decodePointer(pointer)) {
    if (!cursor || typeof cursor !== 'object' || !Object.prototype.hasOwnProperty.call(cursor, segment)) {
      throw new VisualAuthoringSessionError(`field does not exist at ${pointer}`);
    }
    cursor = cursor[segment];
  }
  return cursor;
}

function writeAtPointer(document, pointer, value) {
  const segments = decodePointer(pointer);
  let cursor = document;
  for (const segment of segments.slice(0, -1)) {
    if (!cursor || typeof cursor !== 'object' || !Object.prototype.hasOwnProperty.call(cursor, segment)) {
      throw new VisualAuthoringSessionError(`field does not exist at ${pointer}`);
    }
    cursor = cursor[segment];
  }
  const leaf = segments.at(-1);
  if (!cursor || typeof cursor !== 'object' || !Object.prototype.hasOwnProperty.call(cursor, leaf)) {
    throw new VisualAuthoringSessionError(`field does not exist at ${pointer}`);
  }
  cursor[leaf] = value;
}

function semanticSectionForPointer(pointer) {
  if (pointer === '/venueContext/displayName') return 'identity';
  if (pointer.startsWith('/venueContext/business/')) return 'business';
  if (pointer.startsWith('/venuePackage/brand/')) return 'brand';
  if (pointer.startsWith('/venuePackage/seo/')) return 'seo';
  if (pointer.startsWith('/venuePackage/home/hero/')) return 'hero';
  if (pointer.startsWith('/venuePackage/home/updates/')) return 'updates';
  if (pointer.startsWith('/venuePackage/home/pathways/')) return 'pathways';
  if (pointer.startsWith('/venuePackage/home/visit/')) return 'visit';
  if (pointer.startsWith('/venuePackage/home/community/')) return 'community';
  if (pointer.startsWith('/venuePackage/home/gallery/')) return 'gallery';
  if (pointer.startsWith('/venuePackage/onboarding/')) return 'onboarding';
  return 'venue';
}

function controlKindForPointer(pointer) {
  if (/\/(?:websiteUrl|mapUrl)$/.test(pointer)) return 'url';
  if (/\/src$/.test(pointer)) return 'asset-path';
  if (/\/(?:lede|intro|note|defaultDescription|unavailableBody|emptyBody)$/.test(pointer)) {
    return 'multiline-text';
  }
  return 'text';
}

function editableFieldDescriptors(documentInput) {
  const document = createVenueAuthoringDocument(documentInput);
  const ownership = buildOwnershipMap(document);
  return Object.entries(ownership)
    .filter(([, owner]) => owner === OWNERSHIP.OPERATOR_AUTHORED)
    .map(([pointer]) => Object.freeze({
      pointer,
      ownership: OWNERSHIP.OPERATOR_AUTHORED,
      semanticSection: semanticSectionForPointer(pointer),
      controlKind: controlKindForPointer(pointer),
      value: readAtPointer(document, pointer),
    }))
    .sort((left, right) => left.pointer.localeCompare(right.pointer));
}

function canonicalIfValid(documentInput) {
  try {
    return serializeVenueAuthoringReview(documentInput);
  } catch {
    return null;
  }
}

function createVisualAuthoringSessionInternal(baseInput, applyGate) {
  if (typeof applyGate !== 'function') {
    throw new VisualAuthoringSessionError('apply gate must be a function');
  }

  let accepted = createVenueAuthoringDocument(baseInput);
  let acceptedCanonical = serializeVenueAuthoringReview(accepted);
  let proposal = cloneJson(accepted);
  let state = SESSION_STATE.CLEAN;
  let lastError = null;

  function isDirty() {
    const proposalCanonical = canonicalIfValid(proposal);
    return proposalCanonical === null || proposalCanonical !== acceptedCanonical;
  }

  function refreshDirtyState(preferredCleanState = SESSION_STATE.CLEAN) {
    state = isDirty() ? SESSION_STATE.DIRTY : preferredCleanState;
  }

  function status() {
    return Object.freeze({
      state,
      dirty: isDirty(),
      error: lastError,
    });
  }

  function listEditableFields() {
    const validProposal = createVenueAuthoringDocument(proposal);
    return Object.freeze(editableFieldDescriptors(validProposal));
  }

  // HV-6 intentionally exposes only semantic leaf edits already classified
  // OPERATOR_AUTHORED by HV-5. There is no raw full-document replacement,
  // array-topology, HTML, script, or component-tree mutation channel here.
  // This is especially important for schema-v1 gallery arrays, whose items do
  // not have stable item identities independent of their fixed array indices.
  function edit(pointer, value) {
    const ownership = ownershipForPath(pointer);
    if (ownership !== OWNERSHIP.OPERATOR_AUTHORED) {
      throw new VisualAuthoringSessionError(
        `ordinary visual edit denied at ${pointer} (${ownership || 'UNCLASSIFIED'})`,
      );
    }
    const acceptedOwnership = buildOwnershipMap(accepted)[pointer];
    if (acceptedOwnership !== OWNERSHIP.OPERATOR_AUTHORED) {
      throw new VisualAuthoringSessionError(`field does not exist in the accepted document at ${pointer}`);
    }
    const next = cloneJson(proposal);
    writeAtPointer(next, pointer, value);

    // Keep the visual projection reconstructable after every UI transaction.
    // Invalid values are rejected before they can replace the current proposal;
    // this does not bypass Apply, which still crosses the HV-5 ordinary-edit gate.
    createVenueAuthoringDocument(next);

    proposal = next;
    lastError = null;
    refreshDirtyState();
    return status();
  }

  function previewProjection() {
    const validProposal = createVenueAuthoringDocument(proposal);
    return Object.freeze({
      venueContext: validProposal.venueContext,
      venuePackage: validProposal.venuePackage,
      siteName: validProposal.venueContext.displayName,
      business: validProposal.venueContext.business,
    });
  }

  function apply() {
    state = SESSION_STATE.VALIDATING;
    lastError = null;
    try {
      const nextAccepted = applyGate(accepted, proposal);
      accepted = createVenueAuthoringDocument(nextAccepted);
      acceptedCanonical = serializeVenueAuthoringReview(accepted);
      proposal = cloneJson(accepted);
      state = SESSION_STATE.ACCEPTED;
      return accepted;
    } catch (error) {
      state = SESSION_STATE.REJECTED_WITH_BASE_UNCHANGED;
      lastError = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  function discard() {
    proposal = cloneJson(accepted);
    lastError = null;
    state = SESSION_STATE.DISCARDED;
    return accepted;
  }

  return Object.freeze({
    get acceptedDocument() {
      return accepted;
    },
    get proposalDraft() {
      return Object.freeze(cloneJson(proposal));
    },
    get state() {
      return state;
    },
    apply,
    canonicalAccepted: () => acceptedCanonical,
    canonicalProposal: () => serializeVenueAuthoringReview(proposal),
    discard,
    edit,
    listEditableFields,
    previewProjection,
    status,
  });
}

function createVisualAuthoringSession(baseInput) {
  return createVisualAuthoringSessionInternal(baseInput, applyOrdinaryOperatorEdit);
}

// Test-only proof seam. Ordinary authoring code must use createVisualAuthoringSession,
// which is permanently wired to the real HV-5 gate above. This factory exists only
// so Phase-C tests can force an Apply-time refusal and prove the rejected-state/base-
// unchanged contract without exposing raw proposal replacement or alternate authority
// to the operator-facing surface.
function createVisualAuthoringSessionForTest(baseInput, { applyGate } = {}) {
  return createVisualAuthoringSessionInternal(baseInput, applyGate);
}

module.exports = {
  SESSION_STATE,
  VisualAuthoringSessionError,
  controlKindForPointer,
  createVisualAuthoringSession,
  createVisualAuthoringSessionForTest,
  editableFieldDescriptors,
  semanticSectionForPointer,
};
