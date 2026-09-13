'use strict';

const fs = require('node:fs');
const { URLSearchParams } = require('node:url');

const path = require('node:path');
const express = require('express');
const {
  ADD_RESOURCE,
  REMOVE_RESOURCE,
  MOVE_RESOURCE,
  SET_MENU_FIELD,
  getV2ResourceListContext,
  proposeV2AuthoringCommand,
  BEFORE_COMPONENT,
  END_OF_PAGE,
  IMPORT_LOCAL_HERO_MEDIA,
  applyV2AuthoringProposal,
  createV2AuthoringSession,
  discardV2AuthoringProposal,
  proposeV2AddComponent,
  proposeV2ImportLocalHeroMedia,
  proposeV2MoveComponent,
  proposeV2RemoveComponent,
  proposeV2SetField,
  proposeV2SetMediaUsageAsset,
  proposeV2SetThemeRecipe,
  redoV2AuthoringSession,
  undoV2AuthoringSession,
  V2AuthoringTransactionError,
} = require('./authoring-transaction');
const {
  MAX_MANAGED_IMAGE_BYTES,
  deriveManagedImage,
  managedAssetFilenameFromSourcePath,
  resolveManagedAssetFile,
} = require('../managed-assets');
const {
  V2WorkspaceCheckpointError,
  inspectV2WorkspaceCheckpoint,
  saveV2WorkspaceCheckpoint,
} = require('./workspace-checkpoint');
const {
  renderV2AuthoringStudioSurface,
  V2AuthoringStudioError,
} = require('./studio-authoring');
const {
  createV2ReadOnlyStudioModel,
  V2ReadOnlyStudioError,
} = require('./studio-read-only');
const {
  V2VenueSourceError,
} = require('./source');
const {
  renderV2EventDetail,
  renderV2Page,
  renderV2PublicStylesheet,
  renderV2ThemeStylesheet,
} = require('./renderer');
const PUBLIC_ROOT = path.join(__dirname, '..', '..', '..', 'public');
const SAFE_V2_AUTHORING_STUDIO_ERROR =
  'The requested authoring action was rejected. Return to the Studio and choose an available editable field.';

function plainStrings(value, label, allowed, optional = new Set()) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new V2AuthoringStudioError(`${label} must be a plain object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new V2AuthoringStudioError(`${label} must be a plain object`);
  }

  const keys = Object.keys(value);
  if (keys.some((key) => !allowed.has(key))) {
    throw new V2AuthoringStudioError(`${label} contains unsupported keys`);
  }
  const result = {};
  for (const key of allowed) {
    if (!Object.hasOwn(value, key)) {
      if (optional.has(key)) continue;
      throw new V2AuthoringStudioError(`${label} is missing ${key}`);
    }
    if (typeof value[key] !== 'string') {
      throw new V2AuthoringStudioError(`${label} values must be scalar strings`);
    }
    result[key] = value[key];
  }
  return result;
}

function queryObject(request) {
  const allowed = new Set(['nodeId', 'fieldId', 'viewport', 'menuEntry']);
  const keys = Object.keys(request.query);
  if (keys.some((key) => !allowed.has(key))) {
    throw new V2AuthoringStudioError('query contains unsupported keys');
  }
  const result = {};
  for (const key of keys) {
    const value = request.query[key];
    if (typeof value !== 'string' || value.length === 0) {
      throw new V2AuthoringStudioError('query values must be non-empty scalar strings');
    }
    result[key] = value;
  }
  return result;
}

function selectionRedirect(response, body) {
  const query = new URLSearchParams({
    nodeId: body.nodeId,
    viewport: body.viewport,
  });
  if (body.fieldId) query.set('fieldId', body.fieldId);
  if (body.menuEntry) query.set('menuEntry', body.menuEntry);
  response.redirect(303, `/studio-authoring?${query.toString()}`);
}

function parseMoveDestinationForm(value) {
  if (value === END_OF_PAGE) return { kind: END_OF_PAGE };
  const prefix = `${BEFORE_COMPONENT}:`;
  if (!value.startsWith(prefix)) {
    throw new V2AuthoringStudioError('component destination is invalid');
  }
  const beforeComponentId = value.slice(prefix.length);
  if (!beforeComponentId || beforeComponentId.includes(':') || beforeComponentId.length > 80) {
    throw new V2AuthoringStudioError('component destination is invalid');
  }
  return { kind: BEFORE_COMPONENT, beforeComponentId };
}

function createV2AuthoringStudioApp(sourceInput, options = {}) {
  const fsImpl = options.fsImpl || fs;
  const workspaceDirectory = options.workspaceDirectory || null;
  const checkpoint = workspaceDirectory
    ? inspectV2WorkspaceCheckpoint({ workspaceDirectory, fsImpl })
    : null;
  const sourceFactory = typeof sourceInput === 'function' ? sourceInput : () => sourceInput;
  const openingSource = sourceInput === undefined
    ? checkpoint?.source
    : sourceFactory();
  if (!openingSource) {
    throw new V2AuthoringStudioError('workspace has no persisted v2 source to reopen');
  }
  let session = createV2AuthoringSession(openingSource);
  let proposal = null;
  let persistedDigest = checkpoint?.persistedDigest || null;
  const persistedMediaPaths = new Set(
    checkpoint?.source?.media?.assets
      ?.map((asset) => asset.src)
      .filter((src) => src.startsWith('/venue-assets/'))
      || [],
  );
  const app = express();
  const diagnostics = {
    requests: 0,
    authoringGets: 0,
    previewGets: 0,
    mutationRequests: 0,
    proposals: 0,
    resourceScalarProposalRequests: 0,
    applies: 0,
    discards: 0,
    undos: 0,
    redos: 0,
    persistentWrites: 0,
    hiveRpcAttempts: 0,
    hiveWrites: 0,
    localMediaImportRequests: 0,
    ephemeralMediaEntries: 0,
    ephemeralMediaBytes: 0,
    saveRequests: 0,
    saveSuccesses: 0,
    saveFailures: 0,
  };

  app.disable('x-powered-by');
  app.use((request, _response, next) => {
    diagnostics.requests += 1;
    if (!['GET', 'HEAD'].includes(request.method)) diagnostics.mutationRequests += 1;
    next();
  });
  app.use(express.urlencoded({
    extended: false,
    limit: '8kb',
    parameterLimit: 16,
  }));

  const actionPaths = Object.freeze({
    menu: '/studio-authoring/menu-field',
    propose: '/studio-authoring/propose',
    resource: '/studio-authoring/resource',
    resourceLifecycle: '/studio-authoring/resource-lifecycle',
    reorder: '/studio-authoring/reorder',
    add: '/studio-authoring/add',
    remove: '/studio-authoring/remove',
    theme: '/studio-authoring/theme',
    media: '/studio-authoring/media',
    mediaImport: '/studio-authoring/media-import',
    save: '/studio-authoring/save-workspace',
    apply: '/studio-authoring/apply',
    discard: '/studio-authoring/discard',
    undo: '/studio-authoring/undo',
    redo: '/studio-authoring/redo',
  });

  app.use(['/studio-authoring', '/studio-authoring-preview'], (_request, response, next) => {
    response.set('Cache-Control', 'no-store');
    next();
  });

  function currentPreviewSource() {
    return proposal ? proposal.previewSource : session.draftSource;
  }

  const ephemeralMedia = new Map();

  function commandMediaPayload(command, source) {
    if (!command || command.type !== IMPORT_LOCAL_HERO_MEDIA) return null;
    const bytes = Buffer.from(command.bytesBase64, 'base64');
    const derived = deriveManagedImage(bytes);
    const assetId = 'local-image-' + derived.digestSha256;
    const asset = source.media.assets.find((candidate) => candidate.id === assetId);
    if (!asset) return null;
    if (
      asset.src !== derived.sourcePath
      || asset.width !== derived.width
      || asset.height !== derived.height
    ) {
      throw new V2AuthoringStudioError('session media history no longer matches derived managed identity');
    }
    return {
      src: asset.src,
      bytes,
      mediaType: derived.mediaType,
    };
  }

  function syncEphemeralMedia() {
    ephemeralMedia.clear();
    const source = currentPreviewSource();
    for (const entry of session.history.slice(0, session.historyIndex)) {
      const payload = commandMediaPayload(entry.command, source);
      if (payload && !persistedMediaPaths.has(payload.src)) {
        ephemeralMedia.set(payload.src, payload);
      }
    }
    const proposalPayload = commandMediaPayload(proposal?.command, source);
    if (proposalPayload && !persistedMediaPaths.has(proposalPayload.src)) {
      ephemeralMedia.set(proposalPayload.src, proposalPayload);
    }
    diagnostics.ephemeralMediaEntries = ephemeralMedia.size;
    diagnostics.ephemeralMediaBytes = [...ephemeralMedia.values()]
      .reduce((sum, payload) => sum + payload.bytes.length, 0);
  }

  function persistenceState() {
    if (!workspaceDirectory) return Object.freeze({ enabled: false });
    return Object.freeze({
      enabled: true,
      persistedDigest,
      isPersisted: persistedDigest === session.draftDigest,
      sourceFilename: 'venue-source-v2.json',
    });
  }

  function mediaBytesForSave() {
    return new Map(
      [...ephemeralMedia.entries()].map(([sourcePath, payload]) => [
        sourcePath,
        { bytes: payload.bytes },
      ]),
    );
  }

  function previewOptions() {
    return {
      basePath: '/studio-authoring-preview/site',
      stylesheetHref: '/__hivenues-v2/styles.css',
      themeStylesheetHref: '/__hivenues-v2/theme.css',
      eventBasePath: '/events',
      capabilityPaths: {
        community: '/community',
        transaction: '/pay',
      },
    };
  }

  function handleAuthoringError(error, response) {
    if (
      error instanceof V2ReadOnlyStudioError
      || error instanceof V2AuthoringTransactionError
      || error instanceof V2AuthoringStudioError
      || error instanceof V2WorkspaceCheckpointError
      || error instanceof V2VenueSourceError
    ) {
      response.status(400).type('text/plain').send(SAFE_V2_AUTHORING_STUDIO_ERROR);
      return true;
    }
    return false;
  }

  function requireNoActiveProposal() {
    if (proposal) {
      throw new V2AuthoringStudioError(
        'apply or discard the active proposal before starting another proposal',
      );
    }
  }

  app.get('/studio-authoring', (request, response) => {
    diagnostics.authoringGets += 1;
    try {
      response.type('html').send(renderV2AuthoringStudioSurface({
        session,
        proposal,
        query: queryObject(request),
        studioPath: '/studio-authoring',
        actionPaths,
        persistence: persistenceState(),
        previewPathForPage(page) {
          return `/studio-authoring-preview/page/${encodeURIComponent(page.id)}`;
        },
      }));
    } catch (error) {
      if (handleAuthoringError(error, response)) return;
      throw error;
    }
  });

  app.post(actionPaths.propose, (request, response) => {
    try {
      requireNoActiveProposal();
      const body = plainStrings(
        request.body,
        'proposal form',
        new Set(['nodeId', 'fieldId', 'viewport', 'expectedDraftDigest', 'value']),
      );
      proposal = proposeV2SetField(session, {
        schemaVersion: 1,
        type: 'SET_FIELD',
        target: {
          nodeId: body.nodeId,
          fieldId: body.fieldId,
        },
        payload: {
          value: body.value,
        },
        expectedDraftDigest: body.expectedDraftDigest,
      });
      diagnostics.proposals += 1;
      selectionRedirect(response, body);
    } catch (error) {
      if (handleAuthoringError(error, response)) return;
      throw error;
    }
  });

  app.post(actionPaths.resourceLifecycle, (request, response) => {
    try {
      requireNoActiveProposal();
      const baseKeys = ['nodeId', 'viewport', 'expectedDraftDigest', 'operation'];
      const selected = createV2ReadOnlyStudioModel(session.draftSource, {
        nodeId: request.body.nodeId, viewport: request.body.viewport,
      });
      const context = getV2ResourceListContext(session.draftSource, {
        nodeId: `component:${selected.selectedEntry.componentId}`,
      });
      const operation = request.body.operation;
      if (![ADD_RESOURCE, MOVE_RESOURCE, REMOVE_RESOURCE].includes(operation)) {
        throw new V2AuthoringStudioError('unsupported resource operation');
      }
      const fields = context.resourceKind === 'equipment' ? ['name', 'note', 'accessNote', 'lastUpdated']
        : context.resourceKind === 'events' ? ['title', 'description', 'startAt', 'endAt']
          : ['title', 'description', 'accessNote', 'startAt', 'endAt'];
      const extraKeys = operation === ADD_RESOURCE ? [...fields, 'utcOffset']
        : operation === MOVE_RESOURCE ? ['resourceId', 'destination'] : ['resourceId', 'confirmation'];
      const body = plainStrings(request.body, 'resource lifecycle form', new Set([...baseKeys, ...extraKeys]));
      const command = {
        schemaVersion: 1, type: operation, target: { nodeId: `component:${context.componentId}` },
        expectedDraftDigest: body.expectedDraftDigest,
      };
      if (operation === ADD_RESOURCE) {
        if (selected.selectedEntry.kind === 'resource-reference') {
          throw new V2AuthoringStudioError('select a list to add a resource');
        }
        if (!/^[+-]\d{2}:\d{2}$/.test(body.utcOffset)) throw new V2AuthoringStudioError('invalid UTC offset');
        command.payload = Object.fromEntries(fields.map((key) => [key,
          ['startAt', 'endAt', 'lastUpdated'].includes(key) ? `${body[key]}${body.utcOffset}` : body[key],
        ]));
      } else {
        if (selected.selectedEntry.kind !== 'resource-reference'
          || selected.selectedEntry.nodeId !== `resource:${context.resourceKind}:${body.resourceId}`) {
          throw new V2AuthoringStudioError('resource operation does not match selected occurrence');
        }
        command.target.resourceId = body.resourceId;
        if (operation === MOVE_RESOURCE) command.destination = body.destination;
        else {
          const item = context.items.find((entry) => entry.id === body.resourceId);
          if (!item || body.confirmation !== item.label) throw new V2AuthoringStudioError('confirm the current resource name');
        }
      }
      proposal = proposeV2AuthoringCommand(session, command);
      diagnostics.proposals += 1;
      selectionRedirect(response, { nodeId: body.nodeId, viewport: body.viewport });
    } catch (error) {
      if (handleAuthoringError(error, response)) return;
      throw error;
    }
  });

  app.post(actionPaths.menu, (request, response) => {
    try {
      requireNoActiveProposal();
      const body = plainStrings(request.body, 'menu field form', new Set([
        'nodeId', 'resourceNodeId', 'sectionId', 'itemId', 'fieldId', 'viewport', 'expectedDraftDigest', 'value',
      ]));
      const selected = createV2ReadOnlyStudioModel(session.draftSource, { nodeId: body.nodeId, viewport: body.viewport });
      if (selected.selectedEntry.kind !== 'resource-reference' || selected.selectedEntry.nodeId !== body.resourceNodeId) {
        throw new V2AuthoringStudioError('menu target does not match selected resource occurrence');
      }
      proposal = proposeV2AuthoringCommand(session, {
        schemaVersion: 1, type: SET_MENU_FIELD,
        target: { nodeId: body.resourceNodeId, sectionId: body.sectionId || null, itemId: body.itemId || null, fieldId: body.fieldId },
        payload: { value: body.value.trim() || null }, expectedDraftDigest: body.expectedDraftDigest,
      });
      diagnostics.proposals += 1;
      selectionRedirect(response, { nodeId: body.nodeId, viewport: body.viewport, menuEntry: proposal.resolvedTarget.menuEntryId });
    } catch (error) {
      if (handleAuthoringError(error, response)) return;
      throw error;
    }
  });

  app.post(actionPaths.resource, (request, response) => {
    try {
      requireNoActiveProposal();
      const body = plainStrings(
        request.body,
        'resource field form',
        new Set([
          'nodeId',
          'resourceNodeId',
          'fieldId',
          'viewport',
          'expectedDraftDigest',
          'value',
        ]),
      );
      const selected = createV2ReadOnlyStudioModel(session.draftSource, {
        nodeId: body.nodeId,
        viewport: body.viewport,
      });
      if (selected.selectedEntry.kind !== 'resource-reference'
        || selected.selectedEntry.nodeId !== body.resourceNodeId) {
        throw new V2AuthoringStudioError(
          'resource target does not match the selected semantic resource reference',
        );
      }
      proposal = proposeV2SetField(session, {
        schemaVersion: 1,
        type: 'SET_FIELD',
        target: {
          nodeId: body.resourceNodeId,
          fieldId: body.fieldId,
        },
        payload: {
          value: body.value,
        },
        expectedDraftDigest: body.expectedDraftDigest,
      });
      diagnostics.proposals += 1;
      diagnostics.resourceScalarProposalRequests += 1;
      selectionRedirect(response, {
        nodeId: body.nodeId,
        viewport: body.viewport,
        fieldId: '',
      });
    } catch (error) {
      if (handleAuthoringError(error, response)) return;
      throw error;
    }
  });

  app.post(actionPaths.reorder, (request, response) => {
    try {
      requireNoActiveProposal();
      const body = plainStrings(
        request.body,
        'reorder form',
        new Set(['nodeId', 'viewport', 'expectedDraftDigest', 'destination']),
      );
      proposal = proposeV2MoveComponent(session, {
        schemaVersion: 1,
        type: 'MOVE_COMPONENT',
        target: { nodeId: body.nodeId },
        destination: parseMoveDestinationForm(body.destination),
        expectedDraftDigest: body.expectedDraftDigest,
      });
      diagnostics.proposals += 1;
      selectionRedirect(response, { ...body, fieldId: '' });
    } catch (error) {
      if (handleAuthoringError(error, response)) return;
      throw error;
    }
  });
  app.post(actionPaths.add, (request, response) => {
    try {
      requireNoActiveProposal();
      const body = plainStrings(
        request.body,
        'add component form',
        new Set(['nodeId', 'viewport', 'expectedDraftDigest', 'catalogItemId', 'destination']),
      );
      proposal = proposeV2AddComponent(session, {
        schemaVersion: 1,
        type: 'ADD_COMPONENT',
        target: { nodeId: body.nodeId },
        catalogItemId: body.catalogItemId,
        destination: parseMoveDestinationForm(body.destination),
        expectedDraftDigest: body.expectedDraftDigest,
      });
      diagnostics.proposals += 1;
      selectionRedirect(response, { ...body, fieldId: '' });
    } catch (error) {
      if (handleAuthoringError(error, response)) return;
      throw error;
    }
  });

  app.post(actionPaths.remove, (request, response) => {
    try {
      requireNoActiveProposal();
      const body = plainStrings(
        request.body,
        'remove component form',
        new Set(['nodeId', 'viewport', 'expectedDraftDigest']),
      );
      proposal = proposeV2RemoveComponent(session, {
        schemaVersion: 1,
        type: 'REMOVE_COMPONENT',
        target: { nodeId: body.nodeId },
        expectedDraftDigest: body.expectedDraftDigest,
      });
      diagnostics.proposals += 1;
      selectionRedirect(response, { ...body, fieldId: '' });
    } catch (error) {
      if (handleAuthoringError(error, response)) return;
      throw error;
    }
  });
  app.post(
    actionPaths.mediaImport,
    express.raw({ type: () => true, limit: MAX_MANAGED_IMAGE_BYTES + 1 }),
    (request, response) => {
      try {
        requireNoActiveProposal();
        const body = plainStrings(
          request.query,
          'local media import query',
          new Set([
            'nodeId',
            'mediaSlot',
            'alt',
            'decorative',
            'viewport',
            'expectedDraftDigest',
          ]),
          new Set(['alt']),
        );
        if (!['true', 'false'].includes(body.decorative)) {
          throw new V2AuthoringStudioError('local media decorative value is invalid');
        }
        if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
          throw new V2AuthoringStudioError('local media bytes are missing');
        }
        const decorative = body.decorative === 'true';
        proposal = proposeV2ImportLocalHeroMedia(session, {
          schemaVersion: 1,
          type: IMPORT_LOCAL_HERO_MEDIA,
          target: { nodeId: body.nodeId },
          slot: body.mediaSlot,
          bytesBase64: request.body.toString('base64'),
          alt: decorative && body.alt === undefined ? null : body.alt,
          decorative,
          expectedDraftDigest: body.expectedDraftDigest,
        });
        diagnostics.proposals += 1;
        diagnostics.localMediaImportRequests += 1;
        syncEphemeralMedia();
        response.status(204).end();
      } catch (error) {
        if (handleAuthoringError(error, response)) return;
        throw error;
      }
    },
  );

  app.post(actionPaths.save, (request, response) => {
    try {
      if (!workspaceDirectory) {
        throw new V2AuthoringStudioError('workspace persistence is not enabled');
      }
      requireNoActiveProposal();
      const body = plainStrings(
        request.body,
        'save workspace form',
        new Set([
          'nodeId',
          'fieldId',
          'menuEntry',
          'viewport',
          'expectedDraftDigest',
          'expectedPersistedDigest',
        ]),
        new Set(['fieldId', 'menuEntry']),
      );
      diagnostics.saveRequests += 1;
      const savedPaths = [...ephemeralMedia.keys()];
      const saved = saveV2WorkspaceCheckpoint({
        workspaceDirectory,
        sourceInput: session.draftSource,
        expectedDraftDigest: body.expectedDraftDigest,
        expectedPersistedDigest: body.expectedPersistedDigest,
        mediaBytes: mediaBytesForSave(),
        fsImpl,
      });
      persistedDigest = saved.persistedDigest;
      for (const sourcePath of savedPaths) persistedMediaPaths.add(sourcePath);
      diagnostics.persistentWrites += 1 + saved.createdMediaPaths.length;
      diagnostics.saveSuccesses += 1;
      syncEphemeralMedia();
      selectionRedirect(response, body);
    } catch (error) {
      diagnostics.saveFailures += 1;
      if (handleAuthoringError(error, response)) return;
      throw error;
    }
  });

  app.post(actionPaths.media, (request, response) => {
    try {
      requireNoActiveProposal();
      const body = plainStrings(
        request.body,
        'media form',
        new Set([
          'nodeId',
          'mediaSlot',
          'assetId',
          'alt',
          'decorative',
          'viewport',
          'expectedDraftDigest',
        ]),
        new Set(['alt']),
      );
      if (!['true', 'false'].includes(body.decorative)) {
        throw new V2AuthoringStudioError('media decorative value is invalid');
      }
      const decorative = body.decorative === 'true';
      proposal = proposeV2SetMediaUsageAsset(session, {
        schemaVersion: 1,
        type: 'SET_MEDIA_USAGE_ASSET',
        target: { nodeId: body.nodeId },
        slot: body.mediaSlot,
        assetId: body.assetId,
        alt: decorative && (body.alt === undefined || body.alt === '') ? null : body.alt,
        decorative,
        expectedDraftDigest: body.expectedDraftDigest,
      });
      diagnostics.proposals += 1;
      selectionRedirect(response, { ...body, fieldId: '' });
    } catch (error) {
      if (handleAuthoringError(error, response)) return;
      throw error;
    }
  });

  app.post(actionPaths.theme, (request, response) => {
    try {
      requireNoActiveProposal();
      const body = plainStrings(
        request.body,
        'theme recipe form',
        new Set([
          'themeNodeId',
          'dimension',
          'recipeId',
          'nodeId',
          'fieldId',
          'viewport',
          'expectedDraftDigest',
        ]),
        new Set(['fieldId']),
      );
      proposal = proposeV2SetThemeRecipe(session, {
        schemaVersion: 1,
        type: 'SET_THEME_RECIPE',
        target: { nodeId: body.themeNodeId },
        dimension: body.dimension,
        recipeId: body.recipeId,
        expectedDraftDigest: body.expectedDraftDigest,
      });
      diagnostics.proposals += 1;
      selectionRedirect(response, {
        nodeId: body.nodeId,
        fieldId: body.fieldId || '',
        viewport: body.viewport,
      });
    } catch (error) {
      if (handleAuthoringError(error, response)) return;
      throw error;
    }
  });

  app.post(actionPaths.apply, (request, response) => {
    try {
      const body = plainStrings(
        request.body,
        'apply form',
        new Set(['nodeId', 'fieldId', 'viewport', 'menuEntry']),
        new Set(['fieldId', 'menuEntry']),
      );
      if (!proposal) throw new V2AuthoringStudioError('there is no active proposal to apply');
      const acceptedProposal = proposal;
      session = applyV2AuthoringProposal(session, acceptedProposal);
      proposal = null;
      diagnostics.applies += 1;
      syncEphemeralMedia();
      if ([ADD_RESOURCE, MOVE_RESOURCE, REMOVE_RESOURCE].includes(acceptedProposal.command.type)) {
        selectionRedirect(response, {
          nodeId: `component:${acceptedProposal.resolvedTarget.componentId}`, viewport: body.viewport,
        });
      } else if (acceptedProposal.command.type === 'REMOVE_COMPONENT') {
        selectionRedirect(response, {
          nodeId: `page:${acceptedProposal.resolvedTarget.pageId}`,
          viewport: body.viewport,
          fieldId: '',
        });
      } else {
        selectionRedirect(response, body);
      }
    } catch (error) {
      if (handleAuthoringError(error, response)) return;
      throw error;
    }
  });

  app.post(actionPaths.discard, (request, response) => {
    try {
      const body = plainStrings(
        request.body,
        'discard form',
        new Set(['nodeId', 'fieldId', 'viewport', 'menuEntry']),
        new Set(['fieldId', 'menuEntry']),
      );
      if (!proposal) throw new V2AuthoringStudioError('there is no active proposal to discard');
      session = discardV2AuthoringProposal(session, proposal);
      proposal = null;
      diagnostics.discards += 1;
      syncEphemeralMedia();
      selectionRedirect(response, body);
    } catch (error) {
      if (handleAuthoringError(error, response)) return;
      throw error;
    }
  });

  app.post(actionPaths.undo, (request, response) => {
    try {
      const body = plainStrings(
        request.body,
        'undo form',
        new Set(['nodeId', 'fieldId', 'viewport', 'menuEntry']),
        new Set(['fieldId', 'menuEntry']),
      );
      if (proposal) throw new V2AuthoringStudioError('discard or apply the preview before undo');
      const historyCommand = session.history[session.historyIndex - 1]?.command;
      session = undoV2AuthoringSession(session);
      if ([ADD_RESOURCE, REMOVE_RESOURCE, MOVE_RESOURCE].includes(historyCommand?.type)) {
        body.nodeId = historyCommand.target.nodeId; body.fieldId = ''; delete body.menuEntry;
      }
      diagnostics.undos += 1;
      syncEphemeralMedia();
      selectionRedirect(response, { ...body, fieldId: body.fieldId || '' });
    } catch (error) {
      if (handleAuthoringError(error, response)) return;
      throw error;
    }
  });

  app.post(actionPaths.redo, (request, response) => {
    try {
      const body = plainStrings(
        request.body,
        'redo form',
        new Set(['nodeId', 'fieldId', 'viewport', 'menuEntry']),
        new Set(['fieldId', 'menuEntry']),
      );
      if (proposal) throw new V2AuthoringStudioError('discard or apply the preview before redo');
      const historyCommand = session.history[session.historyIndex]?.command;
      session = redoV2AuthoringSession(session);
      if ([ADD_RESOURCE, REMOVE_RESOURCE, MOVE_RESOURCE].includes(historyCommand?.type)) {
        body.nodeId = historyCommand.target.nodeId; body.fieldId = ''; delete body.menuEntry;
      }
      diagnostics.redos += 1;
      syncEphemeralMedia();
      selectionRedirect(response, { ...body, fieldId: body.fieldId || '' });
    } catch (error) {
      if (handleAuthoringError(error, response)) return;
      throw error;
    }
  });

  function sendPreviewPage(response, pageId) {
    diagnostics.previewGets += 1;
    try {
      response.type('html').send(renderV2Page(
        currentPreviewSource(),
        { ...previewOptions(), pageId },
      ));
    } catch (error) {
      response.status(404).type('text/plain').send(error.message);
    }
  }

  app.get('/studio-authoring-preview/page/:pageId', (request, response) => {
    sendPreviewPage(response, request.params.pageId);
  });
  app.get('/studio-authoring-preview/site/', (_request, response) => {
    sendPreviewPage(response, currentPreviewSource().site.homePageId);
  });
  app.get('/studio-authoring-preview/site/events/:eventSlug', (request, response) => {
    diagnostics.previewGets += 1;
    try {
      response.type('html').send(renderV2EventDetail(
        currentPreviewSource(),
        request.params.eventSlug,
        previewOptions(),
      ));
    } catch (error) {
      response.status(404).type('text/plain').send(error.message);
    }
  });
  app.get('/studio-authoring-preview/site/:pageSlug', (request, response, next) => {
    if (request.params.pageSlug === '__hivenues-v2') return next();
    const source = currentPreviewSource();
    const page = source.site.pages.find((candidate) => candidate.slug === request.params.pageSlug);
    if (!page) {
      response.status(404).type('text/plain').send('Preview page not found.');
      return;
    }
    sendPreviewPage(response, page.id);
  });
  app.get('/studio-authoring-preview/site/__hivenues-v2/styles.css', (_request, response) => {
    response.type('text/css').send(renderV2PublicStylesheet());
  });
  app.get('/studio-authoring-preview/site/__hivenues-v2/theme.css', (_request, response) => {
    response.type('text/css').send(renderV2ThemeStylesheet(currentPreviewSource()));
  });

  app.get('/venue-assets/:filename', (request, response) => {
    const payload = ephemeralMedia.get(request.path);
    if (payload) {
      response.set('Cache-Control', 'no-store');
      response.type(payload.mediaType).send(payload.bytes);
      return;
    }
    if (!workspaceDirectory) {
      response.status(404).type('text/plain').send('Managed venue asset not found.');
      return;
    }
    try {
      const sourcePath = '/venue-assets/' + request.params.filename;
      managedAssetFilenameFromSourcePath(sourcePath, { allowStarter: true });
      const filename = resolveManagedAssetFile(workspaceDirectory, sourcePath, { allowStarter: true });
      const stat = fsImpl.lstatSync(filename);
      if (!stat.isFile() || stat.isSymbolicLink()) {
        throw new V2AuthoringStudioError('managed venue asset is not a regular file');
      }
      const extension = path.extname(filename).toLowerCase();
      const mediaType = extension === '.png'
        ? 'image/png'
        : extension === '.jpg'
          ? 'image/jpeg'
          : extension === '.gif'
            ? 'image/gif'
            : extension === '.svg'
              ? 'image/svg+xml'
              : 'application/octet-stream';
      response.set('Cache-Control', 'no-store');
      response.type(mediaType).send(fsImpl.readFileSync(filename));
    } catch {
      response.status(404).type('text/plain').send('Managed venue asset not found.');
    }
  });

  app.use(express.static(PUBLIC_ROOT, { fallthrough: true, index: false }));
  app.use((error, _request, response, next) => {
    if (error?.type === 'entity.too.large') {
      response.status(413).type('text/plain').send(SAFE_V2_AUTHORING_STUDIO_ERROR);
      return;
    }
    next(error);
  });

  app.use('/studio-authoring-preview', (request, response, next) => {
    if (['GET', 'HEAD'].includes(request.method)) return next();
    response.status(405).set('Allow', 'GET, HEAD').type('text/plain').send('Authoring preview accepts GET and HEAD only.');
  });

  return Object.freeze({
    app,
    openingSource,
    session() {
      return session;
    },
    proposal() {
      return proposal;
    },
    diagnostics() {
      return Object.freeze({ ...diagnostics });
    },
    persistence() {
      return persistenceState();
    },
    workspaceDirectory,
  });
}

function createV2AuthoringStudioWorkspaceApp({ workspaceDirectory, fsImpl = fs } = {}) {
  return createV2AuthoringStudioApp(undefined, { workspaceDirectory, fsImpl });
}

module.exports = {
  SAFE_V2_AUTHORING_STUDIO_ERROR,
  createV2AuthoringStudioApp,
  createV2AuthoringStudioWorkspaceApp,
};
