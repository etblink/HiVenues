'use strict';

const path = require('node:path');
const express = require('express');
const request = require('supertest');
const { createApp } = require('../../src/app');
const { createStaticAssetUrl } = require('../../src/release/static-assets');
const { createVenueAuthoringDocument } = require('../../src/venue/authoring');
const { createOfflineNativeAuthoringSurface } = require('../../src/venue/native-authoring-surface');
const { configFrom, logger } = require('./test-app');

const ROOT = path.join(__dirname, '..', '..');
const PUBLIC_ROOT = path.join(ROOT, 'public');
const EDITOR_PATH = '/__hv6/native';

function createHv6NativeEditorFixture(authoringInput) {
  const accepted = createVenueAuthoringDocument(authoringInput);
  const config = configFrom({
    HIVE_WRITE_MODE: 'disabled',
    HIVE_SIGNER_MODE: 'disabled',
    RATE_LIMIT_MAX: '10000',
    SESSION_SECRET: 'hv6-native-editor-session-secret-at-least-32-bytes',
  });
  const rpcPool = {
    calls: [],
    getStatus: () => [],
    async call(api, method) {
      this.calls.push({ api, method });
      throw new Error(`HV-6 native preview forbids Hive RPC: ${api}.${method}`);
    },
  };
  const hiveReadService = {
    calls: [],
    async getOfficialCommunityPosts(options) {
      this.calls.push({ method: 'getOfficialCommunityPosts', options: structuredClone(options) });
      return [];
    },
  };

  const previewApplication = createApp({
    config,
    logger,
    rpcPool,
    hiveReadService,
    venue: accepted.venueContext,
    venuePackage: accepted.venuePackage,
  });
  previewApplication.locals.assetUrl = createStaticAssetUrl(PUBLIC_ROOT);
  previewApplication.locals.currentYear = 2026;

  async function renderPreviewHtml(projection) {
    previewApplication.locals.venue = projection.venueContext;
    previewApplication.locals.venuePackage = projection.venuePackage;
    previewApplication.locals.siteName = projection.siteName;
    previewApplication.locals.business = projection.business;
    previewApplication.locals.communityId = projection.venueContext.hive.communityId;
    previewApplication.locals.threadsContainerAccount = projection.venueContext.hive.threadsContainerAccount;
    const response = await request(previewApplication).get('/').expect(200);
    return response.text;
  }

  const surface = createOfflineNativeAuthoringSurface({
    authoringInput: accepted,
    renderPreviewHtml,
    editorPath: EDITOR_PATH,
  });
  const app = express();
  app.disable('x-powered-by');
  app.use(express.static(PUBLIC_ROOT));
  app.use('/htmx', express.static(path.dirname(require.resolve('htmx.org'))));
  app.use(surface.router);

  return Object.freeze({
    app,
    editorPath: surface.editorPath,
    previewApplication,
    previewPath: surface.previewPath,
    hiveReadService,
    rpcPool,
    session: surface.session,
  });
}

module.exports = {
  createHv6NativeEditorFixture,
};
