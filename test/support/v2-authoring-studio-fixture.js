'use strict';

const crypto = require('node:crypto');
const { URLSearchParams } = require('node:url');

const path = require('node:path');
const express = require('express');
const {
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
} = require('../../src/venue/v2/authoring-transaction');
const {
  MAX_MANAGED_IMAGE_BYTES,
  inspectManagedImage,
} = require('../../src/venue/managed-assets');
const {
  renderV2AuthoringStudioSurface,
  V2AuthoringStudioError,
} = require('../../src/venue/v2/studio-authoring');
const {
  renderV2EventDetail,
  renderV2Page,
  renderV2PublicStylesheet,
  renderV2ThemeStylesheet,
} = require('../../src/venue/v2/renderer');
const {
  REFERENCE_FACTORIES,
} = require('./v2-renderer-fixture');

const PUBLIC_ROOT = path.join(__dirname, '..', '..', 'public');
const SAFE_V2_AUTHORING_STUDIO_ERROR =
  'The requested authoring action was rejected. Return to the Studio and choose an available editable field.';

const SYNTHETIC_ASSETS = Object.freeze({
  'restaurant-logo.svg': ['Harbor & Hearth · logo', '#f3eadf', '#211a16'],
  'restaurant-dining.svg': ['Harbor & Hearth · dining room', '#a76e43', '#fffaf3'],
  'restaurant-private.svg': ['Harbor & Hearth · private dining', '#d7c2a9', '#2b211b'],
  'restaurant-plate.svg': ['Harbor & Hearth · seasonal plate', '#6d7462', '#fffaf3'],
  'music-logo.svg': ['Northline Hall · logo', '#111525', '#ff6a78'],
  'music-stage.svg': ['Northline Hall · stage', '#171d31', '#8fd4ff'],
  'music-poster-one.svg': ['The Static Lights · poster', '#351728', '#ff929d'],
  'music-poster-two.svg': ['Signal / Noise · poster', '#102b3c', '#8fd4ff'],
});

function syntheticSvg(label, background, foreground) {
  const safe = String(label).replace(/[<>&'"]/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000" role="img" aria-label="${safe}">
  <rect width="1600" height="1000" fill="${background}"/>
  <circle cx="1240" cy="210" r="320" fill="${foreground}" opacity=".08"/>
  <circle cx="300" cy="860" r="420" fill="${foreground}" opacity=".06"/>
  <text x="110" y="170" fill="${foreground}" font-family="system-ui,sans-serif" font-size="58" font-weight="700">${safe}</text>
  <text x="112" y="235" fill="${foreground}" opacity=".72" font-family="system-ui,sans-serif" font-size="28">Synthetic HiVenues reference artwork</text>
</svg>`;
}

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
  const allowed = new Set(['nodeId', 'fieldId', 'viewport']);
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

function createV2AuthoringStudioFixture(sourceInput) {
  const sourceFactory = typeof sourceInput === 'function' ? sourceInput : () => sourceInput;
  const openingSource = sourceFactory();
  let session = createV2AuthoringSession(openingSource);
  let proposal = null;
  const app = express();
  const diagnostics = {
    requests: 0,
    authoringGets: 0,
    previewGets: 0,
    mutationRequests: 0,
    proposals: 0,
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
    propose: '/studio-authoring/propose',
    reorder: '/studio-authoring/reorder',
    add: '/studio-authoring/add',
    remove: '/studio-authoring/remove',
    theme: '/studio-authoring/theme',
    media: '/studio-authoring/media',
    mediaImport: '/studio-authoring/media-import',
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
    const inspected = inspectManagedImage(bytes);
    const digestSha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    const assetId = 'local-image-' + digestSha256;
    const asset = source.media.assets.find((candidate) => candidate.id === assetId);
    if (!asset) return null;
    return {
      src: asset.src,
      bytes,
      mediaType: inspected.mediaType,
    };
  }

  function syncEphemeralMedia() {
    ephemeralMedia.clear();
    const source = currentPreviewSource();
    for (const entry of session.history.slice(0, session.historyIndex)) {
      const payload = commandMediaPayload(entry.command, source);
      if (payload) ephemeralMedia.set(payload.src, payload);
    }
    const proposalPayload = commandMediaPayload(proposal?.command, source);
    if (proposalPayload) ephemeralMedia.set(proposalPayload.src, proposalPayload);
    diagnostics.ephemeralMediaEntries = ephemeralMedia.size;
    diagnostics.ephemeralMediaBytes = [...ephemeralMedia.values()]
      .reduce((sum, payload) => sum + payload.bytes.length, 0);
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
      error instanceof V2AuthoringTransactionError
      || error instanceof V2AuthoringStudioError
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
        new Set(['nodeId', 'fieldId', 'viewport']),
        new Set(['fieldId']),
      );
      if (!proposal) throw new V2AuthoringStudioError('there is no active proposal to apply');
      const acceptedProposal = proposal;
      session = applyV2AuthoringProposal(session, acceptedProposal);
      proposal = null;
      diagnostics.applies += 1;
      syncEphemeralMedia();
      if (acceptedProposal.command.type === 'REMOVE_COMPONENT') {
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
        new Set(['nodeId', 'fieldId', 'viewport']),
        new Set(['fieldId']),
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
        new Set(['nodeId', 'fieldId', 'viewport']),
        new Set(['fieldId']),
      );
      if (proposal) throw new V2AuthoringStudioError('discard or apply the preview before undo');
      session = undoV2AuthoringSession(session);
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
        new Set(['nodeId', 'fieldId', 'viewport']),
        new Set(['fieldId']),
      );
      if (proposal) throw new V2AuthoringStudioError('discard or apply the preview before redo');
      session = redoV2AuthoringSession(session);
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

  app.get('/__hivenues-v2/session-media/:filename', (request, response) => {
    const payload = ephemeralMedia.get(request.path);
    if (!payload) {
      response.status(404).type('text/plain').send('Session media not found.');
      return;
    }
    response.set('Cache-Control', 'no-store');
    response.type(payload.mediaType).send(payload.bytes);
  });

  app.use(express.static(PUBLIC_ROOT, { fallthrough: true, index: false }));
  app.get('/fixtures/v2-renderer/:asset', (request, response) => {
    const spec = SYNTHETIC_ASSETS[request.params.asset];
    if (!spec) {
      response.status(404).type('text/plain').send('Fixture asset not found.');
      return;
    }
    response.type('image/svg+xml').send(syntheticSvg(...spec));
  });

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
  });
}

function createReferenceV2AuthoringStudioFixture(referenceId) {
  const factory = REFERENCE_FACTORIES[referenceId];
  if (!factory) throw new TypeError(`Unknown v2 authoring Studio reference: ${referenceId}`);
  return createV2AuthoringStudioFixture(factory);
}

module.exports = {
  SAFE_V2_AUTHORING_STUDIO_ERROR,
  createReferenceV2AuthoringStudioFixture,
  createV2AuthoringStudioFixture,
};
